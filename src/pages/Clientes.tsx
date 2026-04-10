import { useState } from 'react';
import { useMovimentacoesLucros, useCreateMovimentacao } from '@/hooks/useMovimentacoesLucros';
import { formatCurrency, formatDate } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ImportDialog } from '@/components/ImportDialog';
import { Textarea } from '@/components/ui/textarea';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useClientes,
  useCreateCliente,
  useUpdateCliente,
  useDeleteCliente,
  type Cliente,
  type CreateClienteData,
  type StatusCliente,
  type TagCliente,
} from '@/hooks/useClientes';
import {
  useSocios,
  useCreateSocio,
  useUpdateSocio,
  useDeleteSocio,
  type Socio,
  type CreateSocioData,
} from '@/hooks/useSocios';
import { formatCNPJ, maskCNPJ, formatCPF, maskCPF, maskPhone, unmask } from '@/lib/format';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  MoreHorizontal,
  FileSpreadsheet,
  Users,
  ChevronDown,
  ChevronRight,
  Link2,
  X,
  Ban,
  Power,
  TrendingUp,
  Upload,
  FileText,
  ExternalLink,
  Archive,
  KeyRound,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function ClientesPage() {
  const { data: clientes, isLoading } = useClientes();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteCliente, setDeleteCliente] = useState<Cliente | null>(null);
  const [archiveCliente, setArchiveCliente] = useState<Cliente | null>(null);
  const [archiveMotivo, setArchiveMotivo] = useState('');
  const [expandedCliente, setExpandedCliente] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const updateCliente = useUpdateCliente();

  const filteredClientes = clientes?.filter(
    (cliente) =>
      cliente.razao_social.toLowerCase().includes(search.toLowerCase()) ||
      cliente.cnpj.includes(search.replace(/\D/g, ''))
  );

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
        <div className="page-header">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('clients.title')}</h1>
            <p className="text-muted-foreground">{t('clients.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsImportOpen(true)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t('clients.import')}
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                setEditingCliente(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t('clients.new')}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <CardTitle className="text-lg">{t('clients.list')}</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('clients.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClientes && filteredClientes.length > 0 ? (
              <div className="space-y-2">
                {filteredClientes.map((cliente) => (
                  <ClienteRow
                    key={cliente.id}
                    cliente={cliente}
                    isExpanded={expandedCliente === cliente.id}
                    onToggleExpand={() =>
                      setExpandedCliente(expandedCliente === cliente.id ? null : cliente.id)
                    }
                    onEdit={() => {
                      setEditingCliente(cliente);
                      setIsFormOpen(true);
                    }}
                    onDelete={() => setDeleteCliente(cliente)}
                    onArchive={() => setArchiveCliente(cliente)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state py-12">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t('clients.noResults')}</p>
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={() => {
                    setEditingCliente(null);
                    setIsFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  {t('clients.registerFirst')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ClienteFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        cliente={editingCliente}
      />

      <AlertDialog open={!!deleteCliente} onOpenChange={() => setDeleteCliente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.confirmDeleteMsg')} "{deleteCliente?.razao_social}"?
              {' '}{t('clients.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <DeleteClienteButton cliente={deleteCliente} onDone={() => setDeleteCliente(null)} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Dialog */}
      <Dialog open={!!archiveCliente} onOpenChange={() => { setArchiveCliente(null); setArchiveMotivo(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivar Cliente</DialogTitle>
            <DialogDescription>
              Deseja arquivar o cliente <strong>{archiveCliente?.razao_social}</strong>? Informe o motivo do arquivamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-arquivamento">Motivo *</Label>
            <Textarea
              id="motivo-arquivamento"
              placeholder="Informe o motivo do arquivamento..."
              value={archiveMotivo}
              onChange={(e) => setArchiveMotivo(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setArchiveCliente(null); setArchiveMotivo(''); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!archiveCliente || !archiveMotivo.trim()) return;
                await updateCliente.mutateAsync({
                  id: archiveCliente.id,
                  status: 'arquivado' as StatusCliente,
                  motivo_arquivamento: archiveMotivo.trim(),
                });
                setArchiveCliente(null);
                setArchiveMotivo('');
              }}
              disabled={!archiveMotivo.trim() || updateCliente.isPending}
            >
              {updateCliente.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Arquivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </SidebarLayout>
  );
}

// ─── Cliente Row with expandable Sócios ────────────────────────────────

interface ClienteRowProps {
  cliente: Cliente;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
}

function ClienteRow({ cliente, isExpanded, onToggleExpand, onEdit, onDelete, onArchive }: ClienteRowProps) {
  const { t } = useLanguage();
  const updateCliente = useUpdateCliente();
  const [resetSenhaOpen, setResetSenhaOpen] = useState(false);
  const [resetSenhaLoading, setResetSenhaLoading] = useState(false);

  const handleResetSenha = async () => {
    setResetSenhaLoading(true);
    try {
      const cnpjEmail = 'cnpj_' + cliente.cnpj.replace(/\D/g, '') + '@distribuilucros.app';
      const { data: userData } = await supabase.rpc('find_user_by_email', { _email: cnpjEmail });
      if (!userData || userData.length === 0) {
        toast.error('Nenhum usuário encontrado para este cliente.');
        return;
      }
      const userId = userData[0].user_id;
      const res = await supabase.functions.invoke('manage-admin', {
        body: { action: 'reset_password', user_id: userId },
      });
      if (res.error) throw res.error;
      const resData = res.data as any;
      if (resData?.error) throw new Error(resData.error);
      toast.success('Senha resetada! O cliente deverá criar uma nova senha no próximo acesso.');
    } catch (err: any) {
      toast.error('Erro ao resetar senha: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setResetSenhaLoading(false);
      setResetSenhaOpen(false);
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className="rounded-lg border">
        <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-3 flex-1 text-left">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex items-center gap-2">
                <div>
                  <p className="font-medium truncate">{cliente.razao_social}</p>
                  <p className="text-sm text-muted-foreground font-mono">{formatCNPJ(cliente.cnpj)}</p>
                </div>
                <Badge variant="outline" className={
                  cliente.tag === '2M_SAUDE'
                    ? 'border-blue-500/50 text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400'
                    : 'border-orange-500/50 text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400'
                }>
                  {cliente.tag === '2M_SAUDE' ? '2M Saúde' : '2M Contabilidade'}
                </Badge>
                {cliente.ata_registrada && (
                  <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400">
                    Ata Registrada
                  </Badge>
                )}
              </div>
            </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-3 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={cliente.status === 'ativo' ? 'default' : 'secondary'}
                    className={
                      cliente.status === 'ativo'
                        ? 'bg-success text-success-foreground'
                        : cliente.status === 'arquivado'
                        ? 'bg-muted text-muted-foreground'
                        : ''
                    }
                  >
                    {cliente.status === 'ativo'
                      ? t('clients.active')
                      : cliente.status === 'arquivado'
                      ? 'Arquivado'
                      : t('clients.suspended')}
                  </Badge>
                </TooltipTrigger>
                {cliente.status === 'arquivado' && cliente.motivo_arquivamento && (
                  <TooltipContent>
                    <p className="max-w-xs">Motivo: {cliente.motivo_arquivamento}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('common.edit')}
                </DropdownMenuItem>
                {cliente.status !== 'arquivado' ? (
                  <DropdownMenuItem className="text-amber-600" onClick={onArchive}>
                    <Archive className="mr-2 h-4 w-4" />
                    Arquivar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-green-600"
                    onClick={() => updateCliente.mutate({ id: cliente.id, status: 'ativo' as StatusCliente, motivo_arquivamento: '' })}
                  >
                    <Power className="mr-2 h-4 w-4" />
                    Desarquivar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('common.delete')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setResetSenhaOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Resetar Senha
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-3 space-y-6">
            <SociosSection clienteId={cliente.id} />
            {cliente.ata_registrada && (
              <LucrosAcumuladosSection clienteId={cliente.id} saldoAtual={cliente.saldo_lucros_acumulados} />
            )}
          </div>
        </CollapsibleContent>
      </div>

      {/* Reset Password Dialog */}
      <AlertDialog open={resetSenhaOpen} onOpenChange={setResetSenhaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
            <AlertDialogDescription>
              A senha do cliente <strong>{cliente.razao_social}</strong> será redefinida para a senha padrão. O cliente deverá criar uma nova senha no próximo acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetSenha} disabled={resetSenhaLoading}>
              {resetSenhaLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
}

// ─── Sócios Section (inside each client) ───────────────────────────────

function SociosSection({ clienteId }: { clienteId: string }) {
  const { t } = useLanguage();
  const { data: socios, isLoading } = useSocios(clienteId);
  const updateSocio = useUpdateSocio();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
  const [deleteSocio, setDeleteSocio] = useState<Socio | null>(null);
  const [deactivateSocio, setDeactivateSocio] = useState<Socio | null>(null);
  const [deactivateSocioMotivo, setDeactivateSocioMotivo] = useState('');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-accent" />
          {t('clients.partners')}
        </h4>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : socios && socios.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('partners.name')}</TableHead>
                 <TableHead className="hidden sm:table-cell">{t('partners.cpf')}</TableHead>
                 <TableHead className="hidden sm:table-cell">{t('partners.percentage')}</TableHead>
                 <TableHead>{t('partners.status')}</TableHead>
                 <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {socios.map((socio) => (
                <TableRow key={socio.id}>
                  <TableCell className="font-medium">{socio.nome}</TableCell>
                  <TableCell className="font-mono text-sm hidden sm:table-cell">{formatCPF(socio.cpf)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{socio.percentual ? `${socio.percentual}%` : '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={socio.ativo ? 'default' : 'secondary'}
                      className={socio.ativo ? 'bg-success text-success-foreground' : ''}
                    >
                      {socio.ativo ? t('partners.active') : t('partners.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingSocio(socio);
                            setIsFormOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        {socio.ativo ? (
                          <DropdownMenuItem
                            className="text-amber-600"
                            onClick={() => setDeactivateSocio(socio)}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Desativar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-green-600"
                            onClick={() => updateSocio.mutate({ id: socio.id, ativo: true })}
                          >
                            <Power className="mr-2 h-4 w-4" />
                            Reativar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteSocio(socio)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-2">{t('clients.noPartners')}</p>
      )}

      <SocioFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        socio={editingSocio}
        clienteId={clienteId}
      />

      <AlertDialog open={!!deleteSocio} onOpenChange={() => setDeleteSocio(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('partners.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('partners.confirmDeleteMsg')} "{deleteSocio?.nome}"? {t('partners.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <DeleteSocioButton socio={deleteSocio} onDone={() => setDeleteSocio(null)} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Socio Dialog */}
      <Dialog open={!!deactivateSocio} onOpenChange={() => { setDeactivateSocio(null); setDeactivateSocioMotivo(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar Sócio</DialogTitle>
            <DialogDescription>
              Deseja desativar o sócio <strong>{deactivateSocio?.nome}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-desativacao-socio">Justificativa *</Label>
            <Textarea
              id="motivo-desativacao-socio"
              placeholder="Informe o motivo da desativação..."
              value={deactivateSocioMotivo}
              onChange={(e) => setDeactivateSocioMotivo(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeactivateSocio(null); setDeactivateSocioMotivo(''); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deactivateSocio || !deactivateSocioMotivo.trim()) return;
                await updateSocio.mutateAsync({ id: deactivateSocio.id, ativo: false });
                setDeactivateSocio(null);
                setDeactivateSocioMotivo('');
              }}
              disabled={!deactivateSocioMotivo.trim() || updateSocio.isPending}
            >
              {updateSocio.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Lucros Acumulados Section ───────────────────────────────────────────

function LucrosAcumuladosSection({ clienteId, saldoAtual }: { clienteId: string; saldoAtual: number }) {
  const { data: movimentacoes, isLoading } = useMovimentacoesLucros(clienteId);
  const createMovimentacao = useCreateMovimentacao();
  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');

  const handleSubmit = async () => {
    if (!valor || !descricao.trim()) return;
    await createMovimentacao.mutateAsync({
      cliente_id: clienteId,
      tipo,
      valor: Number(valor),
      descricao: descricao.trim(),
    });
    setShowForm(false);
    setValor('');
    setDescricao('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          Lucros Acumulados (Ata Registrada)
        </h4>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-emerald-600">
            Saldo: {formatCurrency(saldoAtual)}
          </span>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Movimentação
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as 'ENTRADA' | 'SAIDA')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTRADA">Entrada (Crédito)</SelectItem>
                  <SelectItem value="SAIDA">Saída (Débito)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Ajuste de saldo inicial"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!valor || !descricao.trim() || createMovimentacao.isPending}
            >
              {createMovimentacao.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Registrar
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : movimentacoes && movimentacoes.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell className="text-sm">{formatDate(mov.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant={mov.tipo === 'ENTRADA' ? 'default' : 'secondary'}
                      className={mov.tipo === 'ENTRADA' ? 'bg-emerald-600 text-white' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}
                    >
                      {mov.tipo === 'ENTRADA' ? '+ Entrada' : '- Saída'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{mov.descricao}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(mov.valor)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(mov.saldo_posterior)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-2">Nenhuma movimentação registrada.</p>
      )}
    </div>
  );
}

// ─── Delete Buttons ─────────────────────────────────────────────────────

function DeleteClienteButton({ cliente, onDone }: { cliente: Cliente | null; onDone: () => void }) {
  const { t } = useLanguage();
  const deleteCliente = useDeleteCliente();

  const handleDelete = async () => {
    if (!cliente) return;
    await deleteCliente.mutateAsync(cliente.id);
    onDone();
  };

  return (
    <AlertDialogAction
      onClick={handleDelete}
      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      disabled={deleteCliente.isPending}
    >
      {deleteCliente.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {t('common.delete')}
    </AlertDialogAction>
  );
}

function DeleteSocioButton({ socio, onDone }: { socio: Socio | null; onDone: () => void }) {
  const { t } = useLanguage();
  const deleteSocio = useDeleteSocio();

  const handleDelete = async () => {
    if (!socio) return;
    await deleteSocio.mutateAsync(socio.id);
    onDone();
  };

  return (
    <AlertDialogAction
      onClick={handleDelete}
      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      disabled={deleteSocio.isPending}
    >
      {deleteSocio.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {t('common.delete')}
    </AlertDialogAction>
  );
}

// ─── Cliente Form Dialog ────────────────────────────────────────────────

interface ClienteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente | null;
}

function ClienteFormDialog({ open, onOpenChange, cliente }: ClienteFormDialogProps) {
  const { t } = useLanguage();
  const createCliente = useCreateCliente();
  const updateCliente = useUpdateCliente();
  const isEditing = !!cliente;
  const [fetchingCnpj, setFetchingCnpj] = useState(false);
  const [ataFile, setAtaFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<CreateClienteData>({
    razao_social: '',
    cnpj: '',
    email_responsavel: '',
    email_copia: '',
    telefone: '',
    status: 'ativo',
    tag: '2M_CONTABILIDADE',
    ata_registrada: false,
    saldo_lucros_acumulados: 0,
  });

  const [socios, setSocios] = useState<{ nome: string; cpf: string; percentual: string }[]>([
    { nome: '', cpf: '', percentual: '' },
  ]);

  const handleFetchCnpj = async () => {
    const cnpjClean = unmask(formData.cnpj);
    if (cnpjClean.length !== 14) {
      toast.error('Digite um CNPJ válido com 14 dígitos.');
      return;
    }
    setFetchingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`);
      if (!res.ok) throw new Error('CNPJ não encontrado');
      const data = await res.json();

      const telefone = data.ddd_telefone_1
        ? unmask(String(data.ddd_telefone_1))
        : '';

      setFormData((prev) => ({
        ...prev,
        razao_social: data.razao_social || prev.razao_social,
        telefone: telefone ? maskPhone(telefone) : prev.telefone,
      }));

      if (data.qsa && data.qsa.length > 0) {
        const newSocios = data.qsa.map((s: any) => ({
          nome: s.nome_socio || '',
          cpf: '',
          percentual: '',
        }));
        setSocios(newSocios);
      }

      toast.success('Dados importados da Receita Federal!');
    } catch {
      toast.error('Não foi possível consultar o CNPJ. Verifique e tente novamente.');
    } finally {
      setFetchingCnpj(false);
    }
  };

  useState(() => {
    if (open && cliente) {
      setFormData({
        razao_social: cliente.razao_social,
        cnpj: formatCNPJ(cliente.cnpj),
        email_responsavel: cliente.email_responsavel,
        email_copia: cliente.email_copia || '',
        telefone: cliente.telefone || '',
        status: cliente.status,
        tag: cliente.tag || '2M_CONTABILIDADE',
        ata_registrada: cliente.ata_registrada || false,
        saldo_lucros_acumulados: cliente.saldo_lucros_acumulados || 0,
      });
    } else if (open) {
      setFormData({
        razao_social: '',
        cnpj: '',
        email_responsavel: '',
        email_copia: '',
        telefone: '',
        status: 'ativo',
        tag: '2M_CONTABILIDADE',
        ata_registrada: false,
        saldo_lucros_acumulados: 0,
      });
      setSocios([{ nome: '', cpf: '', percentual: '' }]);
    }
  });

  if (open && cliente && formData.razao_social !== cliente.razao_social) {
    setFormData({
      razao_social: cliente.razao_social,
      cnpj: formatCNPJ(cliente.cnpj),
      email_responsavel: cliente.email_responsavel,
      email_copia: cliente.email_copia || '',
      telefone: cliente.telefone || '',
      status: cliente.status,
      tag: cliente.tag || '2M_CONTABILIDADE',
      ata_registrada: cliente.ata_registrada || false,
      saldo_lucros_acumulados: cliente.saldo_lucros_acumulados || 0,
    });
  }

  const addSocio = () => {
    setSocios([...socios, { nome: '', cpf: '', percentual: '' }]);
  };

  const removeSocio = (index: number) => {
    if (socios.length <= 1) return;
    setSocios(socios.filter((_, i) => i !== index));
  };

  const updateSocio = (index: number, field: string, value: string) => {
    const updated = [...socios];
    updated[index] = { ...updated[index], [field]: value };
    setSocios(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing) {
      const validSocios = socios.filter((s) => s.nome.trim());
      if (validSocios.length === 0) {
        toast.error(t('clients.partnerRequired'));
        return;
      }
    }

    const data = {
      ...formData,
      cnpj: unmask(formData.cnpj),
      telefone: formData.telefone ? unmask(formData.telefone) : undefined,
      email_responsavel: formData.email_responsavel || undefined,
      email_copia: formData.email_copia || undefined,
    };

    let createdCliente: any;
    if (isEditing) {
      if (ataFile) {
        const ext = ataFile.name.split('.').pop();
        const filePath = `${cliente.id}/ata.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('atas').upload(filePath, ataFile, { upsert: true });
        if (uploadErr) {
          toast.error('Erro ao enviar ata: ' + uploadErr.message);
          return;
        }
        const { data: urlData } = supabase.storage.from('atas').getPublicUrl(filePath);
        (data as any).ata_url = urlData.publicUrl;
      }

      const oldSaldo = Number(cliente.saldo_lucros_acumulados) || 0;
      const newSaldo = Number(data.saldo_lucros_acumulados) || 0;
      await updateCliente.mutateAsync({ id: cliente.id, ...data });

      if (data.ata_registrada && newSaldo !== oldSaldo) {
        const diff = newSaldo - oldSaldo;
        try {
          await supabase.from('movimentacoes_lucros').insert({
            cliente_id: cliente.id,
            tipo: diff > 0 ? 'ENTRADA' : 'SAIDA',
            valor: Math.abs(diff),
            saldo_anterior: oldSaldo,
            saldo_posterior: newSaldo,
            descricao: diff > 0 ? 'Ajuste de saldo - Entrada manual' : 'Ajuste de saldo - Saída manual',
          });
        } catch (e) {
          console.error('Erro ao registrar movimentação:', e);
        }
      }
    } else {
      const validSocios = socios
        .filter((s) => s.nome.trim())
        .map((s) => ({
          nome: s.nome.trim(),
          cpf: s.cpf ? unmask(s.cpf) : '',
          percentual: s.percentual ? parseFloat(s.percentual) : undefined,
        }));

      createdCliente = await createCliente.mutateAsync({ ...data, socios: validSocios });

      if (ataFile && createdCliente?.id) {
        const ext = ataFile.name.split('.').pop();
        const filePath = `${createdCliente.id}/ata.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('atas').upload(filePath, ataFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('atas').getPublicUrl(filePath);
          await supabase.from('clientes').update({ ata_url: urlData.publicUrl } as any).eq('id', createdCliente.id);
        }
      }

      if (createdCliente?.id) {
        try {
          const cnpjDigits = unmask(formData.cnpj);
          const internalEmail = `cnpj_${cnpjDigits}@distribuilucros.app`;
          const { data: fnData, error: fnError } = await supabase.functions.invoke('manage-admin', {
            body: {
              action: 'create',
              email: internalEmail,
              password: '2mCliente',
              role: 'cliente',
              cliente_ids: [createdCliente.id],
            },
          });
          if (fnError || fnData?.error) {
            toast.error('Cliente criado, mas erro ao criar acesso: ' + (fnData?.error || fnError?.message));
          } else {
            toast.success('Acesso ao portal criado com sucesso!');
          }
        } catch (err: any) {
          toast.error('Cliente criado, mas erro ao criar acesso: ' + err.message);
        }
      }
    }

    onOpenChange(false);
    setFormData({
      razao_social: '',
      cnpj: '',
      email_responsavel: '',
      email_copia: '',
      telefone: '',
      status: 'ativo',
      tag: '2M_CONTABILIDADE',
      ata_registrada: false,
      saldo_lucros_acumulados: 0,
    });
    setSocios([{ nome: '', cpf: '', percentual: '' }]);
    setAtaFile(null);
  };

  const isPending = createCliente.isPending || updateCliente.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('clients.editClient') : t('clients.newClient')}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('clients.updateInfo')
              : t('clients.fillData')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="razao_social">{t('clients.corporateNameLabel')}</Label>
            <Input
              id="razao_social"
              value={formData.razao_social}
              onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">{t('clients.cnpjLabel')}</Label>
            <div className="flex gap-2">
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: maskCNPJ(e.target.value) })}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                required
                disabled={isPending || fetchingCnpj}
                className="flex-1"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleFetchCnpj}
                      disabled={isPending || fetchingCnpj || unmask(formData.cnpj).length !== 14}
                    >
                      {fetchingCnpj ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Consultar CNPJ na Receita Federal</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">{t('clients.phoneLabel')}</Label>
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
              placeholder="(00) 00000-0000"
              maxLength={15}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t('clients.statusLabel')}</Label>
            <Select
              value={formData.status}
              onValueChange={(value: StatusCliente) => setFormData({ ...formData, status: value })}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">{t('clients.active')}</SelectItem>
                <SelectItem value="suspenso">{t('clients.suspended')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tag">Empresa</Label>
            <Select
              value={formData.tag || '2M_CONTABILIDADE'}
              onValueChange={(value: TagCliente) => setFormData({ ...formData, tag: value })}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2M_CONTABILIDADE">2M Contabilidade</SelectItem>
                <SelectItem value="2M_SAUDE">2M Saúde</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Ata Registrada</Label>
              <Switch
                checked={formData.ata_registrada || false}
                onCheckedChange={(v) => setFormData({ ...formData, ata_registrada: v })}
                disabled={isPending}
              />
            </div>
            {formData.ata_registrada && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="saldo_lucros">Saldo de Lucros Acumulados (R$)</Label>
                  <Input
                    id="saldo_lucros"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.saldo_lucros_acumulados || 0}
                    onChange={(e) => setFormData({ ...formData, saldo_lucros_acumulados: parseFloat(e.target.value) || 0 })}
                    disabled={isPending}
                    placeholder="0,00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Saldo disponível para distribuição sem incidência de IR. Este valor será controlado a cada distribuição registrada.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Anexar Ata</Label>
                  {isEditing && cliente.ata_url && !ataFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <a
                        href={cliente.ata_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        Ver ata anexada <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="ata-file"
                      className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      {ataFile ? ataFile.name : (isEditing && cliente.ata_url ? 'Substituir arquivo' : 'Selecionar arquivo')}
                    </label>
                    <input
                      id="ata-file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      onChange={(e) => setAtaFile(e.target.files?.[0] || null)}
                      disabled={isPending}
                    />
                    {ataFile && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAtaFile(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: PDF, JPG, PNG, DOC, DOCX
                  </p>
                </div>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  {t('clients.partnersRequired')}
                </Label>
                <Button type="button" size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={addSocio} disabled={isPending}>
                  <Plus className="h-3 w-3" />
                  {t('clients.addPartner')}
                </Button>
              </div>

              {socios.map((socio, index) => (
                <div key={index} className="rounded-md border p-3 space-y-2 relative">
                  {socios.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSocio(index)}
                      disabled={isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <p className="text-xs font-medium text-muted-foreground">{t('clients.partnerNumber')} {index + 1}</p>
                  <div>
                      <Input
                        placeholder={t('clients.fullNamePlaceholder')}
                        value={socio.nome}
                        onChange={(e) => updateSocio(index, 'nome', e.target.value)}
                        disabled={isPending}
                      />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isEditing && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-accent" />
                <Label className="text-base font-semibold">Acesso ao Portal</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Ao cadastrar, será criado automaticamente o acesso ao portal com o CNPJ como login e senha padrão "2mCliente". O usuário deverá alterá-la no primeiro acesso.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? t('common.save') : t('partners.register')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sócio Form Dialog ──────────────────────────────────────────────────

interface SocioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  socio: Socio | null;
  clienteId: string;
}

function SocioFormDialog({ open, onOpenChange, socio, clienteId }: SocioFormDialogProps) {
  const { t } = useLanguage();
  const createSocio = useCreateSocio();
  const updateSocio = useUpdateSocio();
  const isEditing = !!socio;

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    percentual: '',
    ativo: true,
  });

  if (open && socio && formData.nome !== socio.nome) {
    setFormData({
      nome: socio.nome,
      cpf: formatCPF(socio.cpf),
      percentual: socio.percentual?.toString() || '',
      ativo: socio.ativo,
    });
  }

  if (open && !socio && formData.nome !== '') {
    setFormData({
      nome: '',
      cpf: '',
      percentual: '',
      ativo: true,
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateSocioData = {
      cliente_id: clienteId,
      nome: formData.nome,
      cpf: formData.cpf ? unmask(formData.cpf) : '',
      ativo: formData.ativo,
    };

    if (isEditing) {
      await updateSocio.mutateAsync({ id: socio.id, ...data });
    } else {
      await createSocio.mutateAsync(data);
    }

    onOpenChange(false);
    setFormData({ nome: '', cpf: '', percentual: '', ativo: true });
  };

  const isPending = createSocio.isPending || updateSocio.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('partners.editPartner') : t('partners.newPartner')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('partners.updateInfo') : t('partners.fillData')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">{t('partners.fullName')} *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="ativo">{t('partners.active')}</Label>
            <Switch
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? t('common.save') : t('partners.register')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
