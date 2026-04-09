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
import { formatCurrency, formatDate } from '@/lib/format';
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
  AlertTriangle,
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
import { useLanguage } from '@/contexts/LanguageContext';

const statusKeys: Record<StatusDistribuicao, string> = {
  ENVIADA_AO_CONTADOR: 'status.ENVIADA_AO_CONTADOR',
  APROVADA: 'status.APROVADA',
  AJUSTE_SOLICITADO: 'status.AJUSTE_SOLICITADO',
  CANCELADA: 'status.CANCELADA',
};

const statusClassNames: Record<StatusDistribuicao, string> = {
  ENVIADA_AO_CONTADOR: 'status-recebida',
  APROVADA: 'status-aprovada',
  AJUSTE_SOLICITADO: 'status-ajuste-solicitado',
  CANCELADA: 'status-cancelada',
};

export default function DistribuicoesPage() {
  const { isAdmin, clienteId, isImpersonating, userRole } = useAuth();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { data: clientes } = useClientes();
  const queryClienteId = isAdmin ? null : clienteId;
  const { data: socios } = useSocios(queryClienteId);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusDistribuicao | null>(null);
  const [selectedSocioId, setSelectedSocioId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batchUpdate = useBatchUpdateStatus();
  
  const filterClienteId = isAdmin ? selectedClienteId : clienteId;
  const { data: distribuicoes, isLoading } = useDistribuicoes(
    filterClienteId
  );
  const [search, setSearch] = useState('');
  const [viewingDistribuicao, setViewingDistribuicao] = useState<string | null>(null);


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
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
        <div className="page-header">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('distributions.title')}</h1>
            <p className="text-muted-foreground">
              {isAdmin ? t('distributions.subtitle') : t('distributions.clientSubtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setIsExportOpen(true)}>
                  <Download className="h-4 w-4" />
                  {t('distributions.export')}
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
                        toast.error(t('distributions.selectSentStatus'));
                        return;
                      }
                      batchUpdate.mutate(
                        { ids: enviadasIds, status: 'APROVADA', userId: user.id },
                        { onSuccess: () => setSelectedIds(new Set()) }
                      );
                    }}
                  >
                    {batchUpdate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                    {t('distributions.batchApprove') || 'Aprovar selecionadas'} ({selectedIds.size})
                  </Button>
                )}
              </>
            )}
            {!isAdmin && (
              <Link to="/distribuicoes/nova">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('distributions.new')}
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="text-lg">{t('distributions.list')}</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {isAdmin && (
                  <Select
                    value={selectedClienteId || 'all'}
                    onValueChange={(v) => setSelectedClienteId(v === 'all' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('distributions.filterByClient')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('distributions.allClients')}</SelectItem>
                      {clientes?.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select
                  value={selectedStatus || 'all'}
                  onValueChange={(v) => setSelectedStatus(v === 'all' ? null : (v as StatusDistribuicao))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('distributions.filterByStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('distributions.allStatuses')}</SelectItem>
                    {Object.keys(statusKeys).map((key) => (
                      <SelectItem key={key} value={key}>
                        {t(statusKeys[key as StatusDistribuicao])}
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
                      <SelectValue placeholder={t('distributions.filterByPartner')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('distributions.allPartners')}</SelectItem>
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
                    placeholder={t('distributions.search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDistribuicoes && filteredDistribuicoes.length > 0 ? (
              <>
                {/* Mobile card layout */}
                <div className="space-y-3 sm:hidden">
                  {filteredDistribuicoes.map((dist) => (
                    <div key={dist.id} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-accent" />
                          </div>
                          <span className="font-mono text-sm truncate">{dist.recibo_numero}</span>
                        </div>
                        <DistribuicaoActions
                          distribuicao={dist}
                          isAdmin={isAdmin}
                          onView={() => setViewingDistribuicao(dist.id)}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isAdmin ? dist.cliente?.razao_social : dist.itens?.map((item) => item.socio?.nome).filter(Boolean).join(', ')}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold money-value text-sm">{formatCurrency(Number(dist.valor_total))}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadgeWithHistory distribuicaoId={dist.id} status={dist.status} isAdmin={isAdmin} isRealAdmin={userRole?.role === 'admin'} />
                        <span className="text-xs text-muted-foreground">{formatDate(dist.data_distribuicao)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table layout */}
                <div className="rounded-md border overflow-x-auto hidden sm:block">
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
                              <span className="text-xs font-medium">{t('distributions.selectAll')}</span>
                            </label>
                          </TableHead>
                        )}
                        <TableHead>{t('distributions.receipt')}</TableHead>
                        {isAdmin && <TableHead className="hidden md:table-cell">{t('distributions.client')}</TableHead>}
                        <TableHead>{t('distributions.date')}</TableHead>
                        <TableHead className="text-right">{t('distributions.value')}</TableHead>
                        {!isAdmin && <TableHead className="hidden md:table-cell">{t('distributions.partners')}</TableHead>}
                        <TableHead>{t('distributions.status')}</TableHead>
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
                              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                                <FileText className="h-4 w-4 text-accent" />
                              </div>
                              <div>
                                <span className="font-mono text-sm">{dist.recibo_numero}</span>
                                <p className="text-xs text-muted-foreground md:hidden">{isAdmin ? dist.cliente?.razao_social : dist.itens?.map((item) => item.socio?.nome).filter(Boolean).join(', ')}</p>
                              </div>
                            </div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="font-medium hidden md:table-cell">{dist.cliente?.razao_social}</TableCell>
                          )}
                          <TableCell>{formatDate(dist.data_distribuicao)}</TableCell>
                          <TableCell className="text-right font-semibold money-value">{formatCurrency(Number(dist.valor_total))}</TableCell>
                          {!isAdmin && (
                            <TableCell className="text-sm hidden md:table-cell">{dist.itens?.map((item) => item.socio?.nome).filter(Boolean).join(', ') || '—'}</TableCell>
                          )}
                          <TableCell>
                            <StatusBadgeWithHistory distribuicaoId={dist.id} status={dist.status} isAdmin={isAdmin} isRealAdmin={userRole?.role === 'admin'} />
                          </TableCell>
                          <TableCell>
                            <DistribuicaoActions distribuicao={dist} isAdmin={isAdmin} onView={() => setViewingDistribuicao(dist.id)} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="empty-state py-12">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t('distributions.noResults')}</p>
                {!isAdmin && (
                  <Link to="/distribuicoes/nova">
                    <Button variant="outline" className="mt-4 gap-2">
                      <Plus className="h-4 w-4" />
                      {t('distributions.registerFirst')}
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
  const { t } = useLanguage();
  const className = statusClassNames[status] || '';
  const label = t(statusKeys[status]) || status;

  return (
    <Badge variant="outline" className={cn('text-xs', className)}>
      {label}
    </Badge>
  );
}

function StatusBadgeWithHistory({ distribuicaoId, status, isAdmin, isRealAdmin = false }: { distribuicaoId: string; status: StatusDistribuicao; isAdmin: boolean; isRealAdmin?: boolean }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [historico, setHistorico] = useState<{ id: string; status_novo: string; observacao: string | null; created_at: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingId(null);
    }
    if (isOpen && !historico) {
      setLoading(true);
      const { data } = await supabase
        .from('distribuicao_historico')
        .select('id, status_novo, observacao, created_at')
        .eq('distribuicao_id', distribuicaoId)
        .order('created_at', { ascending: false })
        .limit(10);
      setHistorico(data || []);
      setLoading(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('distribuicao_historico')
      .update({ observacao: editValue || null })
      .eq('id', id);
    if (error) {
      toast.error('Erro ao editar observação');
    } else {
      setHistorico(prev => prev?.map(h => h.id === id ? { ...h, observacao: editValue || null } : h) || null);
      toast.success('Observação atualizada!');
    }
    setEditingId(null);
    setSaving(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button className="cursor-pointer">
          <StatusBadge status={status} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="p-3 border-b">
          <p className="font-semibold text-sm">{t('distributions.statusHistory')}</p>
        </div>
        <div className="max-h-60 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : !historico || historico.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3">{t('distributions.noHistory')}</p>
          ) : (
            <div className="divide-y">
              {historico.map((h) => {
                const cfg = statusClassNames[h.status_novo as StatusDistribuicao];
                const isEditing = editingId === h.id;
                return (
                  <div key={h.id} className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={cn('text-xs', cfg)}>
                        {t(statusKeys[h.status_novo as StatusDistribuicao]) || h.status_novo}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(h.created_at)}</span>
                    </div>
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <Textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="text-xs min-h-[50px]"
                          placeholder="Observação..."
                        />
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditingId(null)}>
                            Cancelar
                          </Button>
                          <Button size="sm" className="h-6 text-xs px-2" onClick={() => handleSaveEdit(h.id)} disabled={saving}>
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {h.observacao && (
                          <p className="text-sm text-muted-foreground bg-muted/50 rounded px-2 py-1 italic">
                            {h.observacao}
                          </p>
                        )}
                        {isAdmin && (
                          <button
                            className="text-xs text-primary hover:underline"
                            onClick={() => { setEditingId(h.id); setEditValue(h.observacao || ''); }}
                          >
                            {h.observacao ? 'Editar observação' : 'Adicionar observação'}
                          </button>
                        )}
                      </>
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
  const { t, language } = useLanguage();
  const updateStatus = useUpdateDistribuicaoStatus();
  const deleteDistribuicao = useDeleteDistribuicao();
  const [downloading, setDownloading] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<StatusDistribuicao | null>(null);
  const [observacao, setObservacao] = useState('');

  const handleDownloadPdf = useCallback(async () => {
    setDownloading(true);
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      const { data, error } = await supabase.functions.invoke('gerar-recibo-pdf', {
        body: { distribuicao_id: distribuicao.id, lang: language, mobile: isMobile },
      });

      if (error) throw error;

      const html = typeof data === 'string' ? data : await new Response(data).text();
      const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      // On mobile, use a download link instead of window.open + print
      if (isMobile) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `recibo-${distribuicao.recibo_numero || distribuicao.id}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const w = window.open(url, '_blank');
        if (w) {
          w.onload = () => {
            URL.revokeObjectURL(url);
            setTimeout(() => w.print(), 500);
          };
        }
      }
    } catch (err: any) {
      toast.error(t('distributions.errorGenerating') + ': ' + (err.message || 'erro desconhecido'));
    } finally {
      setDownloading(false);
    }
  }, [distribuicao.id, language]);

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
              {t('distributions.viewDetails')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadPdf} disabled={downloading}>
              <Download className="mr-2 h-4 w-4" />
              {downloading ? t('distributions.generating') : t('distributions.downloadPdf')}
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                {Object.keys(statusKeys).map((key) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => openStatusDialog(key as StatusDistribuicao)}
                    disabled={distribuicao.status === key || updateStatus.isPending}
                  >
                    {t('distributions.markAs')} {t(statusKeys[key as StatusDistribuicao])}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {!isAdmin && distribuicao.status === 'ENVIADA_AO_CONTADOR' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate(`/distribuicoes/editar/${distribuicao.id}`)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {t('distributions.edit') || 'Editar'}
                </DropdownMenuItem>
              </>
            )}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('distributions.deleteDistribution')}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('distributions.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('distributions.deleteConfirmMsg')} {distribuicao.recibo_numero}{t('distributions.deleteConfirmSuffix')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDistribuicao.mutate(distribuicao.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDistribuicao.isPending ? t('distributions.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status change dialog with observation */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('distributions.changeStatus')}</DialogTitle>
            <DialogDescription>
              {t('distributions.changeTo')} <strong>{pendingStatus ? t(statusKeys[pendingStatus]) : ''}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="observacao">{t('distributions.observationOptional')}</Label>
              <Textarea
                id="observacao"
                placeholder={t('distributions.addObservation')}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={confirmStatusChange} disabled={updateStatus.isPending}>
                {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('common.confirm')}
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
  const { t, language } = useLanguage();
  const { data: distribuicoes } = useDistribuicoes();
  const distribuicao = distribuicoes?.find((d) => d.id === distribuicaoId);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    if (!distribuicaoId) return;
    setDownloading(true);
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      const { data, error } = await supabase.functions.invoke('gerar-recibo-pdf', {
        body: { distribuicao_id: distribuicaoId, lang: language, mobile: isMobile },
      });
      if (error) throw error;
      const html = typeof data === 'string' ? data : await new Response(data).text();
      const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
      const url = URL.createObjectURL(blob);

      if (isMobile) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `recibo-${distribuicaoId}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const w = window.open(url, '_blank');
        if (w) {
          w.onload = () => {
            URL.revokeObjectURL(url);
            setTimeout(() => w.print(), 500);
          };
        }
      }
    } catch (err: any) {
      toast.error(t('distributions.errorGenerating') + ': ' + (err.message || 'erro desconhecido'));
    } finally {
      setDownloading(false);
    }
  }, [distribuicaoId, language]);

  if (!distribuicao) {
    return null;
  }

  return (
    <Dialog open={!!distribuicaoId} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              {t('distributions.distributionTitle')} {distribuicao.recibo_numero}
            </DialogTitle>
            <DialogDescription>
              {t('distributions.distributionDetails')}
            </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('distributions.distributionDate')}</p>
              <p className="font-medium">{formatDate(distribuicao.data_distribuicao)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('distributions.status')}</p>
              <StatusBadge status={distribuicao.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('distributions.paymentMethod')}</p>
              <p className="font-medium">{distribuicao.forma_pagamento}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">{t('distributions.partnerAllocation')}</p>
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
            <p className="text-sm text-muted-foreground">{t('distributions.requester')}</p>
            <p className="font-medium">{distribuicao.solicitante_nome}</p>
            <p className="text-sm text-muted-foreground">{distribuicao.solicitante_email}</p>
          </div>

          <Button onClick={handleDownloadPdf} disabled={downloading} className="w-full gap-2">
            <Download className="h-4 w-4" />
            {downloading ? t('distributions.generating') : t('distributions.downloadPdf')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
