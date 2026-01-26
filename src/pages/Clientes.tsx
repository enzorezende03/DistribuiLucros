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
  DialogTrigger,
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
import { formatCNPJ, maskCNPJ, maskPhone, unmask } from '@/lib/format';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  MoreHorizontal,
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

export default function ClientesPage() {
  const { data: clientes, isLoading } = useClientes();
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteCliente, setDeleteCliente] = useState<Cliente | null>(null);

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
              Gerencie os clientes cadastrados no sistema
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClientes.map((cliente) => (
                      <TableRow key={cliente.id} className="table-row-interactive">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{cliente.razao_social}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatCNPJ(cliente.cnpj)}
                        </TableCell>
                        <TableCell>{cliente.email_responsavel}</TableCell>
                        <TableCell>
                          <Badge
                            variant={cliente.status === 'ativo' ? 'default' : 'secondary'}
                            className={cliente.status === 'ativo' ? 'bg-success text-success-foreground' : ''}
                          >
                            {cliente.status === 'ativo' ? 'Ativo' : 'Suspenso'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingCliente(cliente);
                                  setIsFormOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteCliente(cliente)}
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
            <DeleteButton cliente={deleteCliente} onDone={() => setDeleteCliente(null)} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarLayout>
  );
}

function DeleteButton({ cliente, onDone }: { cliente: Cliente | null; onDone: () => void }) {
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

  // Reset form when dialog opens/closes or cliente changes
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

  // Update form when cliente changes
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
