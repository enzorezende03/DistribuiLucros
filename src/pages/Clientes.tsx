import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ImportDialog } from '@/components/ImportDialog';
import { useUserClientes, useUserAllClientes, useLinkUserByEmail, useUnlinkUserFromCliente, useApproveUserCliente, useDeactivateUserCliente, useReactivateUserCliente } from '@/hooks/useUserClientes';
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
  const [expandedCliente, setExpandedCliente] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

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
}

function ClienteRow({ cliente, isExpanded, onToggleExpand, onEdit, onDelete }: ClienteRowProps) {
  const { t } = useLanguage();
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
              </div>
            </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-3 shrink-0">
            <Badge
              variant={cliente.status === 'ativo' ? 'default' : 'secondary'}
              className={cliente.status === 'ativo' ? 'bg-success text-success-foreground' : ''}
            >
              {cliente.status === 'ativo' ? t('clients.active') : t('clients.suspended')}
            </Badge>
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
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-3 space-y-6">
            <SociosSection clienteId={cliente.id} />
            <UsuariosVinculadosSection clienteId={cliente.id} />
          </div>
        </CollapsibleContent>
      </div>
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

// ─── Usuários Vinculados Section ─────────────────────────────────────────

function UsuariosVinculadosSection({ clienteId }: { clienteId: string }) {
  const { t } = useLanguage();
  const { data: links, isLoading } = useUserClientes(clienteId);
  const approveUser = useApproveUserCliente();
  const unlinkUser = useUnlinkUserFromCliente();
  const deactivateUser = useDeactivateUserCliente();

  const [deactivateLink, setDeactivateLink] = useState<{ id: string; nome?: string } | null>(null);
  const [deleteLink, setDeleteLink] = useState<{ id: string; nome?: string } | null>(null);
  const [deactivateMotivo, setDeactivateMotivo] = useState('');

  const pendingLinks = links?.filter(l => !l.aprovado) || [];
  const approvedLinks = links?.filter(l => l.aprovado) || [];

  const handleDeactivate = async () => {
    if (!deactivateLink || !deactivateMotivo.trim()) return;
    await deactivateUser.mutateAsync({ id: deactivateLink.id, clienteId, motivo: deactivateMotivo.trim() });
    setDeactivateLink(null);
    setDeactivateMotivo('');
  };

  const handleDelete = async () => {
    if (!deleteLink) return;
    await unlinkUser.mutateAsync({ id: deleteLink.id, clienteId });
    setDeleteLink(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="h-4 w-4 text-accent" />
          {t('clients.linkedUsers')}
        </h4>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Pending approvals */}
          {pendingLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
                <Loader2 className="h-3 w-3" />
                {t('clients.pendingApproval')} ({pendingLinks.length})
              </p>
              {pendingLinks.map((link) => (
                <div key={link.id} className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 text-sm">
                  <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-xs border-amber-500 text-amber-700 dark:text-amber-400">
                        {t('clients.pending')}
                      </Badge>
                      <span className="truncate font-medium">{link.nome || link.email || link.user_id}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => approveUser.mutate({ id: link.id, clienteId })}
                        disabled={approveUser.isPending}
                      >
                        {approveUser.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        {t('clients.approve')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                        onClick={() => unlinkUser.mutate({ id: link.id, clienteId })}
                        disabled={unlinkUser.isPending}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Approved users */}
          {approvedLinks.length > 0 ? (
            <div className="space-y-2">
              {approvedLinks.map((link) => (
                <UserLinkedRow
                  key={link.id}
                  link={link}
                  clienteId={clienteId}
                  onDeactivate={() => setDeactivateLink({ id: link.id, nome: link.nome || link.email })}
                  onDelete={() => setDeleteLink({ id: link.id, nome: link.nome || link.email })}
                />
              ))}
            </div>
          ) : pendingLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t('clients.noLinkedUsers')}</p>
          ) : null}
        </div>
      )}

      {/* Deactivate Dialog */}
      <Dialog open={!!deactivateLink} onOpenChange={() => { setDeactivateLink(null); setDeactivateMotivo(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar Usuário</DialogTitle>
            <DialogDescription>
              Deseja desativar o acesso de <strong>{deactivateLink?.nome}</strong>? O usuário não poderá acessar os dados da empresa enquanto estiver desativado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-desativacao">Justificativa *</Label>
            <Textarea
              id="motivo-desativacao"
              placeholder="Informe o motivo da desativação..."
              value={deactivateMotivo}
              onChange={(e) => setDeactivateMotivo(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeactivateLink(null); setDeactivateMotivo(''); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={!deactivateMotivo.trim() || deactivateUser.isPending}
            >
              {deactivateUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteLink} onOpenChange={() => setDeleteLink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Vínculo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o vínculo de <strong>{deleteLink?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={unlinkUser.isPending}
            >
              {unlinkUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── User Linked Row with companies ─────────────────────────────────────

function UserLinkedRow({ link, clienteId, onDeactivate, onDelete }: {
  link: { id: string; user_id: string; email?: string; nome?: string; ativo?: boolean; motivo_desativacao?: string | null };
  clienteId: string;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const { data: allClientes } = useUserAllClientes(link.user_id);
  const reactivateUser = useReactivateUserCliente();
  const [expanded, setExpanded] = useState(false);
  
  const otherClientes = allClientes?.filter((c) => c.cliente_id !== clienteId) || [];
  const isInactive = link.ativo === false;

  return (
    <div className={`rounded-md border text-sm ${isInactive ? 'opacity-60 border-dashed' : ''}`}>
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate font-medium">{link.nome || link.email || link.user_id}</span>
          {isInactive && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs border-destructive text-destructive">
                    <Ban className="h-3 w-3 mr-1" />
                    Desativado
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Motivo: {link.motivo_desativacao || 'Não informado'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {otherClientes.length > 0 && (
            <Badge variant="outline" className="text-xs shrink-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
              <Building2 className="h-3 w-3 mr-1" />
              +{otherClientes.length} {t('distributions.companies')}
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isInactive ? (
              <DropdownMenuItem
                onClick={() => reactivateUser.mutate({ id: link.id, clienteId })}
                className="text-green-600"
              >
                <Power className="h-4 w-4 mr-2" />
                Reativar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onDeactivate} className="text-amber-600">
                <Ban className="h-4 w-4 mr-2" />
                Desativar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded && otherClientes.length > 0 && (
        <div className="border-t px-3 py-2 space-y-1 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground mb-1">{t('clients.alsoLinkedTo')}</p>
          {otherClientes.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <span>{c.clientes?.razao_social}</span>
              <span className="text-muted-foreground font-mono">{c.clientes?.cnpj ? formatCNPJ(c.clientes.cnpj) : ''}</span>
            </div>
          ))}
        </div>
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

  const [formData, setFormData] = useState<CreateClienteData>({
    razao_social: '',
    cnpj: '',
    email_responsavel: '',
    email_copia: '',
    telefone: '',
    status: 'ativo',
    tag: '2M_CONTABILIDADE',
  });

  const [socios, setSocios] = useState<{ nome: string; cpf: string; percentual: string }[]>([
    { nome: '', cpf: '', percentual: '' },
  ]);

  const [criarAcesso, setCriarAcesso] = useState(false);
  const [acessoEmail, setAcessoEmail] = useState('');
  const [acessoSenha, setAcessoSenha] = useState('');

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

      // Import QSA (sócios)
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
      await updateCliente.mutateAsync({ id: cliente.id, ...data });
    } else {
      const validSocios = socios
        .filter((s) => s.nome.trim())
        .map((s) => ({
          nome: s.nome.trim(),
          cpf: s.cpf ? unmask(s.cpf) : '',
          percentual: s.percentual ? parseFloat(s.percentual) : undefined,
        }));

      createdCliente = await createCliente.mutateAsync({ ...data, socios: validSocios });

      // Create portal access if requested
      if (criarAcesso && acessoEmail.trim() && acessoSenha.trim() && createdCliente?.id) {
        try {
          const { data: fnData, error: fnError } = await supabase.functions.invoke('manage-admin', {
            body: {
              action: 'create',
              email: acessoEmail.trim(),
              password: acessoSenha.trim(),
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
    });
    setSocios([{ nome: '', cpf: '', percentual: '' }]);
    setCriarAcesso(false);
    setAcessoEmail('');
    setAcessoSenha('');
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
            <Label htmlFor="email_responsavel">{t('clients.emailResponsible')}</Label>
            <Input
              id="email_responsavel"
              type="email"
              value={formData.email_responsavel}
              onChange={(e) => setFormData({ ...formData, email_responsavel: e.target.value })}
              disabled={isPending}
            />
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
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-accent" />
                  Acesso ao Portal
                </Label>
                <Switch
                  checked={criarAcesso}
                  onCheckedChange={setCriarAcesso}
                  disabled={isPending}
                />
              </div>

              {criarAcesso && (
                <div className="space-y-2">
                  <div className="space-y-2">
                    <Label htmlFor="acesso_email">E-mail de acesso</Label>
                    <Input
                      id="acesso_email"
                      type="email"
                      placeholder="usuario@email.com"
                      value={acessoEmail}
                      onChange={(e) => setAcessoEmail(e.target.value)}
                      required={criarAcesso}
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acesso_senha">Senha</Label>
                    <Input
                      id="acesso_senha"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={acessoSenha}
                      onChange={(e) => setAcessoSenha(e.target.value)}
                      required={criarAcesso}
                      minLength={6}
                      disabled={isPending}
                    />
                  </div>
                </div>
              )}
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
