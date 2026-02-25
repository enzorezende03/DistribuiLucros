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
  useSocios,
  useCreateSocio,
  useUpdateSocio,
  useDeleteSocio,
  type Socio,
  type CreateSocioData,
} from '@/hooks/useSocios';
import { useClientes } from '@/hooks/useClientes';
import { formatCPF, maskCPF, unmask } from '@/lib/format';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Users,
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
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SociosPage() {
  const { t } = useLanguage();
  const { data: clientes } = useClientes();
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const { data: socios, isLoading } = useSocios(selectedClienteId);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
  const [deleteSocio, setDeleteSocio] = useState<Socio | null>(null);

  const filteredSocios = socios?.filter(
    (socio) =>
      socio.nome.toLowerCase().includes(search.toLowerCase()) ||
      socio.cpf.includes(search.replace(/\D/g, ''))
  );

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="page-header">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('partners.title')}</h1>
            <p className="text-muted-foreground">{t('partners.subtitle')}</p>
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              setEditingSocio(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Novo Sócio
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Lista de Sócios</CardTitle>
              <div className="flex flex-col sm:flex-row gap-4">
                <Select
                  value={selectedClienteId || 'all'}
                  onValueChange={(v) => setSelectedClienteId(v === 'all' ? null : v)}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
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
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou CPF..."
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
            ) : filteredSocios && filteredSocios.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden sm:table-cell">CPF</TableHead>
                      <TableHead className="hidden sm:table-cell">Percentual</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSocios.map((socio) => (
                      <TableRow key={socio.id} className="table-row-interactive">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-accent" />
                            </div>
                            <span className="font-medium">{socio.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm hidden sm:table-cell">
                          {formatCPF(socio.cpf)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {socio.percentual ? `${socio.percentual}%` : '-'}
                        </TableCell>
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
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
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
              <div className="empty-state py-12">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {selectedClienteId
                    ? 'Nenhum sócio encontrado para este cliente'
                    : 'Nenhum sócio cadastrado'}
                </p>
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={() => {
                    setEditingSocio(null);
                    setIsFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar primeiro sócio
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SocioFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        socio={editingSocio}
        clientes={clientes || []}
        defaultClienteId={selectedClienteId}
      />

      <AlertDialog open={!!deleteSocio} onOpenChange={() => setDeleteSocio(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o sócio "{deleteSocio?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <DeleteButton socio={deleteSocio} onDone={() => setDeleteSocio(null)} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarLayout>
  );
}

function DeleteButton({ socio, onDone }: { socio: Socio | null; onDone: () => void }) {
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

interface SocioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  socio: Socio | null;
  clientes: { id: string; razao_social: string }[];
  defaultClienteId: string | null;
}

function SocioFormDialog({
  open,
  onOpenChange,
  socio,
  clientes,
  defaultClienteId,
}: SocioFormDialogProps) {
  const createSocio = useCreateSocio();
  const updateSocio = useUpdateSocio();
  const isEditing = !!socio;

  const [formData, setFormData] = useState<{
    cliente_id: string;
    nome: string;
    cpf: string;
    percentual: string;
    ativo: boolean;
  }>({
    cliente_id: defaultClienteId || '',
    nome: '',
    cpf: '',
    percentual: '',
    ativo: true,
  });

  // Update form when socio changes
  if (open && socio && formData.nome !== socio.nome) {
    setFormData({
      cliente_id: socio.cliente_id,
      nome: socio.nome,
      cpf: formatCPF(socio.cpf),
      percentual: socio.percentual?.toString() || '',
      ativo: socio.ativo,
    });
  }

  // Reset form when opening for new socio
  if (open && !socio && formData.nome !== '') {
    setFormData({
      cliente_id: defaultClienteId || '',
      nome: '',
      cpf: '',
      percentual: '',
      ativo: true,
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateSocioData = {
      cliente_id: formData.cliente_id,
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
    setFormData({
      cliente_id: defaultClienteId || '',
      nome: '',
      cpf: '',
      percentual: '',
      ativo: true,
    });
  };

  const isPending = createSocio.isPending || updateSocio.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Sócio' : 'Novo Sócio'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do sócio'
              : 'Preencha os dados do novo sócio'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cliente_id">Cliente *</Label>
            <Select
              value={formData.cliente_id}
              onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
              disabled={isPending || isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Button type="submit" disabled={isPending || !formData.cliente_id}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
