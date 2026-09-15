import { useState, useCallback, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Upload, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocios } from '@/hooks/useSocios';
import { useDistribuicoes, useCreateDistribuicao } from '@/hooks/useDistribuicoes';
import { formatCurrency } from '@/lib/format';
import {
  readSpreadsheet,
  mapearLinhas,
  sugerirColunas,
  competenciaFromData,
  type SheetData,
  type LinhaImportada,
} from '@/lib/importDistribuicoesPlanilha';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'upload' | 'map' | 'review' | 'done';

function formatDataBr(iso: string | null) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function ImportDistribuicoesDialog({ open, onOpenChange }: Props) {
  const { clienteId, user } = useAuth();
  const { data: socios } = useSocios(clienteId);
  const { data: distribuicoes } = useDistribuicoes(clienteId);
  const createDistribuicao = useCreateDistribuicao();

  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [reading, setReading] = useState(false);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [startRow, setStartRow] = useState(1);
  const [colData, setColData] = useState<number>(-1);
  const [colValor, setColValor] = useState<number>(-1);
  const [colSocio, setColSocio] = useState<number>(-1);
  const [linhas, setLinhas] = useState<LinhaImportada[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultado, setResultado] = useState({ criados: 0, ignorados: 0 });

  const sheet = sheets[sheetIndex];
  const colCount = useMemo(
    () => (sheet ? sheet.rows.reduce((max, r) => Math.max(max, r.length), 0) : 0),
    [sheet]
  );

  const sociosMatch = useMemo(
    () => (socios || []).map((s) => ({
      id: s.id,
      nome: s.nome,
      cpf: s.cpf || '',
      ativo: s.ativo,
      data_entrada: s.data_entrada,
      data_saida: s.data_saida,
    })),
    [socios]
  );

  const existentes = useMemo(() => {
    const out: { data: string; socioId: string; valor: number }[] = [];
    (distribuicoes || []).forEach((d) => {
      if (d.status === 'CANCELADA') return;
      (d.itens || []).forEach((it) => {
        out.push({ data: d.data_distribuicao, socioId: it.socio_id, valor: Number(it.valor) });
      });
    });
    return out;
  }, [distribuicoes]);

  const reset = useCallback(() => {
    setStep('upload');
    setSheets([]);
    setSheetIndex(0);
    setStartRow(1);
    setColData(-1);
    setColValor(-1);
    setColSocio(-1);
    setLinhas([]);
    setProgress(0);
    setResultado({ criados: 0, ignorados: 0 });
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleClose = (value: boolean) => {
    if (!value && !saving) reset();
    if (!saving) onOpenChange(value);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setReading(true);
    try {
      const parsed = await readSpreadsheet(file);
      const withData = parsed.filter((s) => s.rows.length > 0);
      if (withData.length === 0) {
        toast.error('Não encontramos informações nesse arquivo.');
        return;
      }
      setSheets(withData);
      setSheetIndex(0);
      const header = withData[0].rows[0] || [];
      const sug = sugerirColunas(header);
      setColData(sug.data);
      setColValor(sug.valor);
      setColSocio(sug.socio);
      setStartRow(1);
      setStep('map');
    } catch (err: any) {
      toast.error('Não foi possível ler o arquivo: ' + (err?.message || 'formato não suportado'));
    } finally {
      setReading(false);
    }
  };

  const handleSheetChange = (value: string) => {
    const idx = Number(value);
    setSheetIndex(idx);
    const header = sheets[idx]?.rows[0] || [];
    const sug = sugerirColunas(header);
    setColData(sug.data);
    setColValor(sug.valor);
    setColSocio(sug.socio);
    setStartRow(1);
  };

  const columnLabel = (index: number) => {
    const header = (sheet?.rows[0] || [])[index] || '';
    const letter = String.fromCharCode(65 + (index % 26));
    return header ? `${letter} — ${header}` : `Coluna ${letter}`;
  };

  const handleContinuarMapeamento = () => {
    if (colData < 0 || colValor < 0 || colSocio < 0) {
      toast.error('Indique as colunas de data, valor e sócio.');
      return;
    }
    if (!sheet) return;
    const mapped = mapearLinhas({
      rows: sheet.rows,
      startRow: Math.max(0, startRow),
      colData,
      colValor,
      colSocio,
      socios: sociosMatch,
      existentes,
    });
    if (mapped.length === 0) {
      toast.error('Nenhuma linha com informações a partir dessa linha inicial.');
      return;
    }
    setLinhas(mapped);
    setStep('review');
  };

  const setSocioManual = (rowIndex: number, socioId: string) => {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.rowIndex !== rowIndex) return l;
        const socio = sociosMatch.find((s) => s.id === socioId);
        const erros = l.erros.filter(
          (e) => !e.startsWith('Sócio') && !e.startsWith('Data anterior') && !e.startsWith('Data posterior')
        );
        if (socio && l.data) {
          if (socio.data_entrada && l.data < socio.data_entrada) erros.push('Data anterior à entrada do sócio na empresa');
          if (socio.data_saida && l.data > socio.data_saida) erros.push('Data posterior à saída do sócio da empresa');
        }
        return { ...l, socioId, erros, incluir: erros.length === 0 };
      })
    );
  };

  const toggleLinha = (rowIndex: number, value: boolean) => {
    setLinhas((prev) =>
      prev.map((l) => (l.rowIndex === rowIndex ? { ...l, incluir: value && l.erros.length === 0 } : l))
    );
  };

  const linhasValidas = linhas.filter((l) => l.incluir && l.data && l.socioId && l.valor);
  const totalValidas = linhasValidas.reduce((sum, l) => sum + (l.valor || 0), 0);

  const handleImportar = async () => {
    if (!clienteId || linhasValidas.length === 0) return;
    setSaving(true);
    setProgress(0);
    let criados = 0;
    try {
      for (const linha of linhasValidas) {
        await createDistribuicao.mutateAsync({
          cliente_id: clienteId,
          competencia: competenciaFromData(linha.data!),
          data_distribuicao: linha.data!,
          valor_total: linha.valor!,
          forma_pagamento: 'TRANSFERENCIA',
          natureza: 'LUCRO',
          solicitante_nome: user?.user_metadata?.full_name || user?.email || 'Cliente',
          solicitante_email: user?.email || '',
          itens: [{ socio_id: linha.socioId!, valor: linha.valor! }],
        });
        criados++;
        setProgress(criados);
      }
      setResultado({ criados, ignorados: linhas.length - criados });
      setStep('done');
    } catch (err: any) {
      toast.error('A importação parou: ' + (err?.message || 'erro desconhecido'));
      setResultado({ criados, ignorados: linhas.length - criados });
      setStep('done');
    } finally {
      setSaving(false);
    }
  };

  const previewRows = (sheet?.rows || []).slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar planilha de lucros
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Envie sua planilha de controle (Excel ou CSV). Depois você indica onde estão a data, o valor e o sócio.'}
            {step === 'map' && 'Indique em qual coluna está cada informação.'}
            {step === 'review' && 'Confira as linhas antes de registrar.'}
            {step === 'done' && 'Importação finalizada.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aceitamos arquivos .xlsx, .xls e .csv
              </p>
              <Input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                className="max-w-sm mx-auto"
                disabled={reading}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {reading && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Lendo a planilha...
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              A planilha pode ter qualquer formato: cada linha deve trazer uma data, um valor e o nome (ou CPF/CNPJ) do sócio.
            </p>
          </div>
        )}

        {step === 'map' && sheet && (
          <div className="space-y-4">
            {sheets.length > 1 && (
              <div className="space-y-2">
                <Label>Aba da planilha</Label>
                <Select value={String(sheetIndex)} onValueChange={handleSheetChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sheets.map((s, i) => (
                      <SelectItem key={s.name + i} value={String(i)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-3">
              {([
                ['Data', colData, setColData],
                ['Valor', colValor, setColValor],
                ['Sócio', colSocio, setColSocio],
              ] as const).map(([label, value, setter]) => (
                <div key={label} className="space-y-2">
                  <Label>{label}</Label>
                  <Select value={value >= 0 ? String(value) : ''} onValueChange={(v) => setter(Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Escolha a coluna" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: colCount }).map((_, i) => (
                        <SelectItem key={i} value={String(i)}>{columnLabel(i)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="space-y-2 max-w-xs">
              <Label>Os dados começam na linha</Label>
              <Input
                type="number"
                min={1}
                value={startRow + 1}
                onChange={(e) => setStartRow(Math.max(0, (Number(e.target.value) || 1) - 1))}
              />
              <p className="text-xs text-muted-foreground">
                Use 2 quando a primeira linha for o título das colunas.
              </p>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {Array.from({ length: colCount }).map((_, i) => (
                      <TableHead key={i} className="whitespace-nowrap">
                        {String.fromCharCode(65 + (i % 26))}
                        {colData === i && <Badge variant="secondary" className="ml-2">Data</Badge>}
                        {colValor === i && <Badge variant="secondary" className="ml-2">Valor</Badge>}
                        {colSocio === i && <Badge variant="secondary" className="ml-2">Sócio</Badge>}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, ri) => (
                    <TableRow key={ri}>
                      <TableCell className="text-muted-foreground">{ri + 1}</TableCell>
                      {Array.from({ length: colCount }).map((_, ci) => (
                        <TableCell key={ci} className="whitespace-nowrap text-sm">{row[ci] || ''}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <span><strong>{linhas.length}</strong> linhas lidas</span>
              <span className="text-emerald-600"><strong>{linhasValidas.length}</strong> prontas para registrar</span>
              <span className="text-muted-foreground">Total: <strong>{formatCurrency(totalValidas)}</strong></span>
            </div>

            {linhas.some((l) => l.erros.length > 0) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Algumas linhas precisam de atenção. Corrija o sócio quando possível — as demais não serão registradas.
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg overflow-x-auto max-h-[45vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Linha</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Sócio</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((l) => (
                    <TableRow key={l.rowIndex} className={l.erros.length > 0 ? 'bg-destructive/5' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={l.incluir}
                          disabled={l.erros.length > 0}
                          onCheckedChange={(v) => toggleLinha(l.rowIndex, !!v)}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{l.rowIndex + 1}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {l.data ? formatDataBr(l.data) : <span className="text-destructive">{l.dataOriginal || '—'}</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {l.valor !== null && l.valor > 0
                          ? formatCurrency(l.valor)
                          : <span className="text-destructive">{l.valorOriginal || '—'}</span>}
                      </TableCell>
                      <TableCell className="min-w-[200px]">
                        {l.socioId ? (
                          sociosMatch.find((s) => s.id === l.socioId)?.nome
                        ) : (
                          <Select value="" onValueChange={(v) => setSocioManual(l.rowIndex, v)}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder={l.socioOriginal || 'Escolher sócio'} />
                            </SelectTrigger>
                            <SelectContent>
                              {sociosMatch.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-xs space-y-1">
                        {l.erros.map((e) => (
                          <div key={e} className="text-destructive">{e}</div>
                        ))}
                        {l.avisos.map((a) => (
                          <div key={a} className="text-amber-600">{a}</div>
                        ))}
                        {l.erros.length === 0 && l.avisos.length === 0 && (
                          <span className="text-emerald-600">Ok</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {saving && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando {progress} de {linhasValidas.length}...
              </p>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-3 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600" />
            <p className="text-lg font-semibold">{resultado.criados} lançamentos registrados</p>
            {resultado.ignorados > 0 && (
              <p className="text-sm text-muted-foreground">{resultado.ignorados} linhas não foram registradas.</p>
            )}
            <p className="text-sm text-muted-foreground">Os lançamentos foram enviados para análise da 2M.</p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'map' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
              <Button onClick={handleContinuarMapeamento}>Continuar</Button>
            </>
          )}
          {step === 'review' && (
            <>
              <Button variant="outline" disabled={saving} onClick={() => setStep('map')}>Voltar</Button>
              <Button disabled={saving || linhasValidas.length === 0} onClick={handleImportar}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Registrar {linhasValidas.length} lançamentos
              </Button>
            </>
          )}
          {(step === 'upload' || step === 'done') && (
            <Button variant={step === 'done' ? 'default' : 'outline'} onClick={() => handleClose(false)}>
              {step === 'done' ? 'Fechar' : 'Cancelar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
