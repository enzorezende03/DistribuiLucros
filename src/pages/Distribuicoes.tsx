import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExportDistribuicoesDialog } from '@/components/ExportDistribuicoesDialog';
import { Textarea } from '@/components/ui/textarea';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDistribuicoes, useUpdateDistribuicaoStatus, useDeleteDistribuicao, useBatchUpdateStatus, type StatusDistribuicao } from '@/hooks/useDistribuicoes';
import { useSocios } from '@/hooks/useSocios';
import { useClientes } from '@/hooks/useClientes';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatCompetencia, formatDate, getCompetenciaAnterior } from '@/lib/format';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  Loader2,
  Download,
  Eye,
  MoreHorizontal,
  Trash2,
  CheckSquare,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const statusConfig: Record<StatusDistribuicao, { label: string; className: string }> = {
  ENVIADA_AO_CONTADOR: { label: 'Enviada ao Contador', className: 'status-recebida' },
  RECEBIDA: { label: 'Recebida', className: 'status-recebida' },
  EM_VALIDACAO: { label: 'Em validação', className: 'status-em-validacao' },
  APROVADA: { label: 'Aprovada', className: 'status-aprovada' },
  AJUSTE_SOLICITADO: { label: 'Ajuste solicitado', className: 'status-ajuste-solicitado' },
  CANCELADA: { label: 'Cancelada', className: 'status-cancelada' },
};

export default function DistribuicoesPage() {
  const { isAdmin, clienteId } = useAuth();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const competenciaParam = searchParams.get('competencia');
  const { data: clientes } = useClientes();
  const queryClienteId = isAdmin ? null : clienteId;
  const { data: socios } = useSocios(queryClienteId);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [selectedCompetencia, setSelectedCompetencia] = useState<string | null>(competenciaParam);
  const [selectedStatus, setSelectedStatus] = useState<StatusDistribuicao | null>(null);
  const [selectedSocioId, setSelectedSocioId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batchUpdate = useBatchUpdateStatus();
  
  const filterClienteId = isAdmin ? selectedClienteId : clienteId;
  const { data: distribuicoes, isLoading } = useDistribuicoes(
    filterClienteId,
    selectedCompetencia || undefined
  );
  const [search, setSearch] = useState('');
  const [viewingDistribuicao, setViewingDistribuicao] = useState<string | null>(null);

  // Gerar opções de competência (últimos 12 meses)
  const competenciaOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  let filteredDistribuicoes = distribuicoes;
  if (selectedStatus) {
    filteredDistribuicoes = filteredDistribuicoes?.filter((d) => d.status === selectedStatus);
  }
  if (selectedSocioId) {
    filteredDistribuicoes = filteredDistribuicoes?.filter((d) =>
      d.itens?.some((item) => item.socio_id === selectedSocioId)
    );
  }
  if (search) {
    filteredDistribuicoes = filteredDistribuicoes?.filter(
      (d) =>
        d.recibo_numero?.toLowerCase().includes(search.toLowerCase()) ||
        d.cliente?.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
        d.itens?.some((item) => item.socio?.nome?.toLowerCase().includes(search.toLowerCase()))
    );
  }

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6">
        <div className="page-header">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Distribuições</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'Gerencie todas as distribuições de lucros' : 'Suas distribuições de lucros'}
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setIsExportOpen(true)}>
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
                {selectedIds.size > 0 && (
                  <Button
                    className="gap-2"
                    disabled={batchUpdate.isPending}
                    onClick={() => {
                      if (!user?.id) return;
                      const enviadasIds = Array.from(selectedIds).filter(id => {
                        const d = filteredDistribuicoes?.find(dist => dist.id === id);
                        return d?.status === 'ENVIADA_AO_CONTADOR';
                      });
                      if (enviadasIds.length === 0) {
                        toast.error('Selecione distribuições com status "Enviada ao Contador"');
                        return;
                      }
                      batchUpdate.mutate(
                        { ids: enviadasIds, status: 'RECEBIDA', userId: user.id },
                        { onSuccess: () => setSelectedIds(new Set()) }
                      );
                    }}
                  >
                    {batchUpdate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                    Confirmar Recebimento ({selectedIds.size})
                  </Button>
                )}
              </>
            )}
            {!isAdmin && (
              <Link to="/distribuicoes/nova">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Distribuição
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="text-lg">Lista de Distribuições</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {isAdmin && (
                  <Select
                    value={selectedClienteId || 'all'}
                    onValueChange={(v) => setSelectedClienteId(v === 'all' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      {clientes?.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select
                  value={selectedCompetencia || 'all'}
                  onValueChange={(v) => setSelectedCompetencia(v === 'all' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por competência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as competências</SelectItem>
                    {competenciaOptions.map((comp) => (
                      <SelectItem key={comp} value={comp}>
                        {formatCompetencia(comp)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedStatus || 'all'}
                  onValueChange={(v) => setSelectedStatus(v === 'all' ? null : (v as StatusDistribuicao))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {Object.entries(statusConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isAdmin && socios && socios.length > 0 && (
                  <Select
                    value={selectedSocioId || 'all'}
                    onValueChange={(v) => setSelectedSocioId(v === 'all' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por sócio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os sócios</SelectItem>
                      {socios.filter(s => s.ativo).map((socio) => (
                        <SelectItem key={socio.id} value={socio.id}>
                          {socio.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDistribuicoes && filteredDistribuicoes.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && (
                        <TableHead className="w-[160px]">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filteredDistribuicoes!.length > 0 && filteredDistribuicoes!.every((d) => selectedIds.has(d.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(new Set(filteredDistribuicoes!.map((d) => d.id)));
                                } else {
                                  setSelectedIds(new Set());
                                }
                              }}
                              className="h-4 w-4 rounded border-input"
                            />
                            <span className="text-xs font-medium">Selecionar Todos</span>
                          </label>
                        </TableHead>
                      )}
                      <TableHead>Recibo</TableHead>
                      {isAdmin && <TableHead>Cliente</TableHead>}
                      <TableHead>Competência</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      {!isAdmin && <TableHead>Sócio(s)</TableHead>}
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDistribuicoes.map((dist) => (
                      <TableRow key={dist.id} className="table-row-interactive">
                        {isAdmin && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(dist.id)}
                              onChange={(e) => {
                                const next = new Set(selectedIds);
                                if (e.target.checked) next.add(dist.id);
                                else next.delete(dist.id);
                                setSelectedIds(next);
                              }}
                              className="h-4 w-4 rounded border-input"
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-accent" />
                            </div>
                            <span className="font-mono text-sm">{dist.recibo_numero}</span>
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="font-medium">
                            {dist.cliente?.razao_social}
                          </TableCell>
                        )}
                        <TableCell>{formatCompetencia(dist.competencia)}</TableCell>
                        <TableCell>{formatDate(dist.data_distribuicao)}</TableCell>
                        <TableCell className="text-right font-semibold money-value">
                          {formatCurrency(Number(dist.valor_total))}
                        </TableCell>
                        {!isAdmin && (
                          <TableCell className="text-sm">
                            {dist.itens?.map((item) => item.socio?.nome).filter(Boolean).join(', ') || '—'}
                          </TableCell>
                        )}
                        <TableCell>
                          <StatusBadgeWithHistory distribuicaoId={dist.id} status={dist.status} isAdmin={isAdmin} />
                        </TableCell>
                        <TableCell>
                          <DistribuicaoActions
                            distribuicao={dist}
                            isAdmin={isAdmin}
                            onView={() => setViewingDistribuicao(dist.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="empty-state py-12">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhuma distribuição encontrada</p>
                {!isAdmin && (
                  <Link to="/distribuicoes/nova">
                    <Button variant="outline" className="mt-4 gap-2">
                      <Plus className="h-4 w-4" />
                      Registrar primeira distribuição
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DistribuicaoDetailDialog
        distribuicaoId={viewingDistribuicao}
        onClose={() => setViewingDistribuicao(null)}
        isAdmin={isAdmin}
      />

      <ExportDistribuicoesDialog open={isExportOpen} onOpenChange={setIsExportOpen} />
    </SidebarLayout>
  );
}

function StatusBadge({ status }: { status: StatusDistribuicao }) {
  const config = statusConfig[status] || { label: status, className: '' };

  return (
    <Badge variant="outline" className={cn('text-xs', config.className)}>
      {config.label}
    </Badge>
  );
}

function StatusBadgeWithHistory({ distribuicaoId, status, isAdmin }: { distribuicaoId: string; status: StatusDistribuicao; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [historico, setHistorico] = useState<{ status_novo: string; observacao: string | null; created_at: string }[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !historico) {
      setLoading(true);
      const { data } = await supabase
        .from('distribuicao_historico')
        .select('status_novo, observacao, created_at')
        .eq('distribuicao_id', distribuicaoId)
        .order('created_at', { ascending: false })
        .limit(10);
      setHistorico(data || []);
      setLoading(false);
    }
  };

  if (isAdmin) {
    return <StatusBadge status={status} />;
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button className="cursor-pointer">
          <StatusBadge status={status} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <p className="font-semibold text-sm">Histórico de Status</p>
        </div>
        <div className="max-h-60 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : !historico || historico.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3">Nenhum histórico disponível.</p>
          ) : (
            <div className="divide-y">
              {historico.map((h, i) => {
                const cfg = statusConfig[h.status_novo as StatusDistribuicao];
                return (
                  <div key={i} className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={cn('text-xs', cfg?.className)}>
                        {cfg?.label || h.status_novo}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(h.created_at)}</span>
                    </div>
                    {h.observacao && (
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded px-2 py-1 italic">
                        {h.observacao}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface DistribuicaoActionsProps {
  distribuicao: {
    id: string;
    recibo_numero: string | null;
    recibo_pdf_url: string | null;
    status: StatusDistribuicao;
  };
  isAdmin: boolean;
  onView: () => void;
}

function DistribuicaoActions({ distribuicao, isAdmin, onView }: DistribuicaoActionsProps) {
  const { user } = useAuth();
  const updateStatus = useUpdateDistribuicaoStatus();
  const deleteDistribuicao = useDeleteDistribuicao();
  const [downloading, setDownloading] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<StatusDistribuicao | null>(null);
  const [observacao, setObservacao] = useState('');

  const handleDownloadPdf = useCallback(async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-recibo-pdf', {
        body: { distribuicao_id: distribuicao.id },
      });

      if (error) throw error;

      const html = typeof data === 'string' ? data : await new Response(data).text();
      const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) {
        w.onload = () => {
          URL.revokeObjectURL(url);
          setTimeout(() => w.print(), 500);
        };
      }
    } catch (err: any) {
      toast.error('Erro ao gerar recibo: ' + (err.message || 'erro desconhecido'));
    } finally {
      setDownloading(false);
    }
  }, [distribuicao.id]);

  const openStatusDialog = (status: StatusDistribuicao) => {
    setPendingStatus(status);
    setObservacao('');
    setStatusDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus || !user?.id) return;
    await updateStatus.mutateAsync({
      id: distribuicao.id,
      status: pendingStatus,
      observacao: observacao || undefined,
      userId: user.id,
    });
    setStatusDialogOpen(false);
    setPendingStatus(null);
    setObservacao('');
  };

  const canDelete = !isAdmin && distribuicao.status === 'ENVIADA_AO_CONTADOR';

  return (
    <>
      <AlertDialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadPdf} disabled={downloading}>
              <Download className="mr-2 h-4 w-4" />
              {downloading ? 'Gerando...' : 'Baixar Recibo PDF'}
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => openStatusDialog(key as StatusDistribuicao)}
                    disabled={distribuicao.status === key || updateStatus.isPending}
                  >
                    Marcar como: {label}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir distribuição
                  </DropdownMenuItem>
                </AlertDialogTrigger>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir distribuição?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a distribuição {distribuicao.recibo_numero}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDistribuicao.mutate(distribuicao.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDistribuicao.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status change dialog with observation */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Status</DialogTitle>
            <DialogDescription>
              Alterar para: <strong>{pendingStatus ? statusConfig[pendingStatus]?.label : ''}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="observacao">Observação (opcional)</Label>
              <Textarea
                id="observacao"
                placeholder="Adicione uma observação se necessário..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmStatusChange} disabled={updateStatus.isPending}>
                {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface DistribuicaoDetailDialogProps {
  distribuicaoId: string | null;
  onClose: () => void;
  isAdmin: boolean;
}

function DistribuicaoDetailDialog({ distribuicaoId, onClose, isAdmin }: DistribuicaoDetailDialogProps) {
  const { data: distribuicoes } = useDistribuicoes();
  const distribuicao = distribuicoes?.find((d) => d.id === distribuicaoId);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    if (!distribuicaoId) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-recibo-pdf', {
        body: { distribuicao_id: distribuicaoId },
      });
      if (error) throw error;
      const html = typeof data === 'string' ? data : await new Response(data).text();
      const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) {
        w.onload = () => {
          URL.revokeObjectURL(url);
          setTimeout(() => w.print(), 500);
        };
      }
    } catch (err: any) {
      toast.error('Erro ao gerar recibo: ' + (err.message || 'erro desconhecido'));
    } finally {
      setDownloading(false);
    }
  }, [distribuicaoId]);

  if (!distribuicao) {
    return null;
  }

  return (
    <Dialog open={!!distribuicaoId} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Distribuição {distribuicao.recibo_numero}
          </DialogTitle>
          <DialogDescription>
            Detalhes da distribuição de lucros
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Competência</p>
              <p className="font-medium">{formatCompetencia(distribuicao.competencia)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data da Distribuição</p>
              <p className="font-medium">{formatDate(distribuicao.data_distribuicao)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <StatusBadge status={distribuicao.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
              <p className="font-medium">{distribuicao.forma_pagamento}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Rateio por Sócio</p>
            <div className="space-y-2">
              {distribuicao.itens?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{item.socio?.nome}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      CPF: {item.socio?.cpf}
                    </p>
                  </div>
                  <p className="font-semibold money-value">
                    {formatCurrency(Number(item.valor))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <p className="text-lg font-semibold">Total</p>
            <p className="text-2xl font-bold money-value text-accent">
              {formatCurrency(Number(distribuicao.valor_total))}
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">Solicitante</p>
            <p className="font-medium">{distribuicao.solicitante_nome}</p>
            <p className="text-sm text-muted-foreground">{distribuicao.solicitante_email}</p>
          </div>

          <Button onClick={handleDownloadPdf} disabled={downloading} className="w-full gap-2">
            <Download className="h-4 w-4" />
            {downloading ? 'Gerando...' : 'Baixar Recibo PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
