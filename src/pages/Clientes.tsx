import { useState } from 'react';
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
  Users,
  ChevronDown,
  ChevronRight,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function ClientesPage() {
  const { data: clientes, isLoading } = useClientes();
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteCliente, setDeleteCliente] = useState<Cliente | null>(null);
  const [expandedCliente, setExpandedCliente] = useState<string | null>(null);

  const filteredClientes = clientes?.filter(
    (cliente) =>
      cliente.razao_social.toLowerCase().includes(search.toLowerCase()) ||
      cliente.cnpj.includes(search.replace(/\D/g, ''))
  );

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6">
        <div className="page-header">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie os clientes e seus sócios
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              setEditingCliente(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Lista de Clientes</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CNPJ..."
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
                <p className="text-muted-foreground">Nenhum cliente encontrado</p>
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={() => {
                    setEditingCliente(null);
                    setIsFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar primeiro cliente
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
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{deleteCliente?.razao_social}"?
              Esta ação não pode ser desfeita e todos os dados relacionados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <DeleteClienteButton cliente={deleteCliente} onDone={() => setDeleteCliente(null)} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
              <div className="min-w-0">
                <p className="font-medium truncate">{cliente.razao_social}</p>
                <p className="text-sm text-muted-foreground font-mono">{formatCNPJ(cliente.cnpj)}</p>
              </div>
            </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-3 shrink-0">
            <Badge
              variant={cliente.status === 'ativo' ? 'default' : 'secondary'}
              className={cliente.status === 'ativo' ? 'bg-success text-success-foreground' : ''}
            >
              {cliente.status === 'ativo' ? 'Ativo' : 'Suspenso'}
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
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-3">
            <SociosSection clienteId={cliente.id} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ─── Sócios Section (inside each client) ───────────────────────────────

function SociosSection({ clienteId }: { clienteId: string }) {
  const { data: socios, isLoading } = useSocios(clienteId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
  const [deleteSocio, setDeleteSocio] = useState<Socio | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-accent" />
          Sócios
        </h4>
        <Button
          size="sm"
          variant="outline"
          className="gap-1 h-7 text-xs"
          onClick={() => {
            setEditingSocio(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="h-3 w-3" />
          Novo Sócio
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : socios && socios.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Percentual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {socios.map((socio) => (
                <TableRow key={socio.id}>
                  <TableCell className="font-medium">{socio.nome}</TableCell>
                  <TableCell className="font-mono text-sm">{formatCPF(socio.cpf)}</TableCell>
                  <TableCell>{socio.percentual ? `${socio.percentual}%` : '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={socio.ativo ? 'default' : 'secondary'}
                      className={socio.ativo ? 'bg-success text-success-foreground' : ''}
                    >
                      {socio.ativo ? 'Ativo' : 'Inativo'}
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
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteSocio(socio)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
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
        <p className="text-sm text-muted-foreground py-2">Nenhum sócio cadastrado.</p>
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
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o sócio "{deleteSocio?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <DeleteSocioButton socio={deleteSocio} onDone={() => setDeleteSocio(null)} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Delete Buttons ─────────────────────────────────────────────────────

function DeleteClienteButton({ cliente, onDone }: { cliente: Cliente | null; onDone: () => void }) {
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
      Excluir
    </AlertDialogAction>
  );
}

function DeleteSocioButton({ socio, onDone }: { socio: Socio | null; onDone: () => void }) {
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
      Excluir
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
  const createCliente = useCreateCliente();
  const updateCliente = useUpdateCliente();
  const isEditing = !!cliente;

  const [formData, setFormData] = useState<CreateClienteData>({
    razao_social: '',
    cnpj: '',
    email_responsavel: '',
    email_copia: '',
    telefone: '',
    status: 'ativo',
  });

  useState(() => {
    if (open && cliente) {
      setFormData({
        razao_social: cliente.razao_social,
        cnpj: formatCNPJ(cliente.cnpj),
        email_responsavel: cliente.email_responsavel,
        email_copia: cliente.email_copia || '',
        telefone: cliente.telefone || '',
        status: cliente.status,
      });
    } else if (open) {
      setFormData({
        razao_social: '',
        cnpj: '',
        email_responsavel: '',
        email_copia: '',
        telefone: '',
        status: 'ativo',
      });
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
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      cnpj: unmask(formData.cnpj),
      telefone: formData.telefone ? unmask(formData.telefone) : undefined,
      email_copia: formData.email_copia || undefined,
    };

    if (isEditing) {
      await updateCliente.mutateAsync({ id: cliente.id, ...data });
    } else {
      await createCliente.mutateAsync(data);
    }

    onOpenChange(false);
    setFormData({
      razao_social: '',
      cnpj: '',
      email_responsavel: '',
      email_copia: '',
      telefone: '',
      status: 'ativo',
    });
  };

  const isPending = createCliente.isPending || updateCliente.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do cliente'
              : 'Preencha os dados do novo cliente'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="razao_social">Razão Social *</Label>
            <Input
              id="razao_social"
              value={formData.razao_social}
              onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input
              id="cnpj"
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: maskCNPJ(e.target.value) })}
              placeholder="00.000.000/0000-00"
              maxLength={18}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_responsavel">E-mail do Responsável *</Label>
            <Input
              id="email_responsavel"
              type="email"
              value={formData.email_responsavel}
              onChange={(e) => setFormData({ ...formData, email_responsavel: e.target.value })}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_copia">E-mail Cópia</Label>
            <Input
              id="email_copia"
              type="email"
              value={formData.email_copia}
              onChange={(e) => setFormData({ ...formData, email_copia: e.target.value })}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
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
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: StatusCliente) => setFormData({ ...formData, status: value })}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Cadastrar'}
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
      cpf: unmask(formData.cpf),
      percentual: formData.percentual ? parseFloat(formData.percentual) : undefined,
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
          <DialogTitle>{isEditing ? 'Editar Sócio' : 'Novo Sócio'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do sócio' : 'Preencha os dados do novo sócio'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
              placeholder="000.000.000-00"
              maxLength={14}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="percentual">Percentual de Participação (%)</Label>
            <Input
              id="percentual"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.percentual}
              onChange={(e) => setFormData({ ...formData, percentual: e.target.value })}
              placeholder="Ex: 50"
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="ativo">Ativo</Label>
            <Switch
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
