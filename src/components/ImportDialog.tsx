import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Download, Upload, Loader2, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { unmask } from '@/lib/format';

interface ParsedClient {
  razao_social: string;
  cnpj: string;
  email_responsavel: string;
  email_copia?: string;
  telefone?: string;
  socios: {
    nome: string;
    cpf: string;
    percentual?: number;
  }[];
  errors: string[];
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [importResult, setImportResult] = useState({ success: 0, errors: 0 });

  const resetState = useCallback(() => {
    setParsedClients([]);
    setStep('upload');
    setImportResult({ success: 0, errors: 0 });
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleClose = useCallback((open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  }, [onOpenChange, resetState]);

  const downloadTemplate = useCallback(() => {
    const data = [
      {
        razao_social: 'Empresa ABC Ltda',
        cnpj: '12345678000190',
        email_responsavel: 'contato@empresa.com',
        email_copia: '',
        telefone: '',
        socio_nome: 'João da Silva',
        socio_cpf: '12345678901',
        socio_percentual: 60,
      },
      {
        razao_social: 'Empresa ABC Ltda',
        cnpj: '12345678000190',
        email_responsavel: 'contato@empresa.com',
        email_copia: '',
        telefone: '',
        socio_nome: 'Maria Santos',
        socio_cpf: '98765432100',
        socio_percentual: 40,
      },
      {
        razao_social: 'Outra Empresa SA',
        cnpj: '98765432000110',
        email_responsavel: 'admin@outra.com',
        email_copia: 'copia@outra.com',
        telefone: '11999990000',
        socio_nome: 'Carlos Pereira',
        socio_cpf: '11122233344',
        socio_percentual: 100,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'modelo_importacao_clientes.xlsx');
  }, []);

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

        const clientMap = new Map<string, ParsedClient>();

        for (const row of rows) {
          const cnpj = unmask(String(row.cnpj || ''));
          const razaoSocial = String(row.razao_social || '').trim();

          if (!razaoSocial || !cnpj) continue;

          if (!clientMap.has(cnpj)) {
            const errors: string[] = [];
            if (cnpj.length !== 14) errors.push('CNPJ inválido');
            if (!String(row.email_responsavel || '').trim()) errors.push('E-mail obrigatório');

            clientMap.set(cnpj, {
              razao_social: razaoSocial,
              cnpj,
              email_responsavel: String(row.email_responsavel || '').trim(),
              email_copia: String(row.email_copia || '').trim() || undefined,
              telefone: row.telefone ? unmask(String(row.telefone)) : undefined,
              socios: [],
              errors,
            });
          }

          const client = clientMap.get(cnpj)!;
          const socioNome = String(row.socio_nome || '').trim();
          const socioCpf = unmask(String(row.socio_cpf || ''));

          if (socioNome && socioCpf) {
            if (socioCpf.length !== 11) {
              client.errors.push(`CPF inválido para ${socioNome}`);
            }
            client.socios.push({
              nome: socioNome,
              cpf: socioCpf,
              percentual: row.socio_percentual ? parseFloat(String(row.socio_percentual)) : undefined,
            });
          }
        }

        setParsedClients(Array.from(clientMap.values()));
        setStep('preview');
      } catch {
        toast.error('Erro ao ler o arquivo. Verifique o formato.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const handleImport = useCallback(async () => {
    setImporting(true);
    let success = 0;
    let errors = 0;

    for (const client of parsedClients) {
      if (client.errors.length > 0) {
        errors++;
        continue;
      }

      try {
        const { data: inserted, error } = await supabase
          .from('clientes')
          .insert({
            razao_social: client.razao_social,
            cnpj: client.cnpj,
            email_responsavel: client.email_responsavel,
            email_copia: client.email_copia || null,
            telefone: client.telefone || null,
          })
          .select()
          .single();

        if (error) throw error;

        if (client.socios.length > 0) {
          const sociosData = client.socios.map((s) => ({
            cliente_id: inserted.id,
            nome: s.nome,
            cpf: s.cpf,
            percentual: s.percentual ?? null,
          }));

          const { error: sociosError } = await supabase
            .from('socios')
            .insert(sociosData);

          if (sociosError) throw sociosError;
        }

        success++;
      } catch (err: any) {
        console.error('Import error:', err);
        errors++;
      }
    }

    setImportResult({ success, errors });
    setStep('done');
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ['clientes'] });
    queryClient.invalidateQueries({ queryKey: ['socios'] });
  }, [parsedClients, queryClient]);

  const validClients = parsedClients.filter((c) => c.errors.length === 0);
  const invalidClients = parsedClients.filter((c) => c.errors.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-accent" />
            Importar Clientes e Sócios
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Envie um arquivo Excel (.xlsx ou .xls) com os dados dos clientes e sócios.'}
            {step === 'preview' && 'Confira os dados antes de importar.'}
            {step === 'done' && 'Importação concluída.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">Arraste um arquivo Excel ou clique para selecionar</p>
                <p className="text-sm text-muted-foreground">
                  Formatos aceitos: .xlsx ou .xls
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                Selecionar Arquivo
              </Button>
            </div>

            <div className="flex items-center justify-center">
              <Button variant="link" className="gap-2 text-sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4" />
                Baixar modelo de planilha
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 overflow-auto space-y-4 py-2">
            <div className="flex gap-3">
              <Badge variant="default" className="bg-success text-success-foreground">
                {validClients.length} válido(s)
              </Badge>
              {invalidClients.length > 0 && (
                <Badge variant="destructive">{invalidClients.length} com erro(s)</Badge>
              )}
              <span className="text-sm text-muted-foreground ml-auto">
                Total de sócios: {parsedClients.reduce((s, c) => s + c.socios.length, 0)}
              </span>
            </div>

            <div className="rounded-md border overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Sócios</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedClients.map((client, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{client.razao_social}</TableCell>
                      <TableCell className="font-mono text-sm">{client.cnpj}</TableCell>
                      <TableCell>
                        {client.socios.length > 0
                          ? client.socios.map((s) => s.nome).join(', ')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {client.errors.length > 0 ? (
                          <span className="text-destructive text-xs">{client.errors.join('; ')}</span>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
            <div>
              <p className="text-lg font-semibold">Importação concluída!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {importResult.success} cliente(s) importado(s) com sucesso
                {importResult.errors > 0 && `, ${importResult.errors} com erro`}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={resetState}>
                Voltar
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || validClients.length === 0}
                className="gap-2"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {importing ? 'Importando...' : `Importar ${validClients.length} cliente(s)`}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
