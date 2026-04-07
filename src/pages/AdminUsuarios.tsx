import { useState } from 'react';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, ShieldCheck, Trash2, UserPlus, Users, X, Building2, Shield, CheckCircle2 } from 'lucide-react';

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ManagedUser {
  user_id: string;
  email: string;
  nome: string;
  role: 'admin' | 'cliente';
  created_at: string;
  empresas: { cliente_id: string; razao_social: string }[];
}

interface ClienteOption {
  id: string;
  razao_social: string;
}

export default function AdminUsuariosPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cnpjEmpresa, setCnpjEmpresa] = useState('');
  const [lookingUpCnpj, setLookingUpCnpj] = useState(false);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'cliente'>('cliente');
  const [selectedClienteIds, setSelectedClienteIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'cliente'>('all');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editSobrenome, setEditSobrenome] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch clientes for association
  const { data: clientes } = useQuery({
    queryKey: ['clientes-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, razao_social')
        .eq('status', 'ativo')
        .order('razao_social');
      if (error) throw error;
      return (data || []) as ClienteOption[];
    },
    enabled: !!user,
  });

  const { data: users, isLoading, isError, error } = useQuery({
    queryKey: ['managed-users'],
    queryFn: async () => {
      const res = await supabase.functions.invoke('manage-admin', {
        body: { action: 'list' },
      });
      if (res.error) {
        const message = res.error.message || 'falha na chamada';
        if (message.includes('401') || message.includes('Não autorizado')) {
          throw new Error(t('admin.sessionExpired'));
        }
        throw new Error(message);
      }
      if (res.data?.error) {
        if (res.data.error === 'Não autorizado') {
          throw new Error(t('admin.sessionExpired'));
        }
        throw new Error(res.data.error);
      }
      return (res.data?.users || []) as ManagedUser[];
    },
    enabled: !!user,
    retry: false,
  });

  const filteredUsers = users?.filter(u => filterRole === 'all' || u.role === filterRole);

  const toggleClienteId = (id: string) => {
    setSelectedClienteIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleCnpjChange = async (value: string) => {
    const formatted = formatCNPJ(value);
    setCnpj(formatted);
    setCnpjEmpresa('');
    setSelectedClienteIds([]);

    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 14) {
      setLookingUpCnpj(true);
      const { data, error: err } = await supabase
        .from('clientes')
        .select('id, razao_social')
        .eq('cnpj', digits)
        .maybeSingle();

      if (!err && data) {
        setCnpjEmpresa(data.razao_social);
        setSelectedClienteIds([data.id]);
      } else {
        toast.error(t('register.cnpjNotFound'));
      }
      setLookingUpCnpj(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !sobrenome.trim()) {
      toast.error(t('admin.fillNameSurname'));
      return;
    }
    if (!email || !password) {
      toast.error(t('admin.fillEmailPassword'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('admin.passwordMinLength'));
      return;
    }
    if (role === 'cliente' && selectedClienteIds.length === 0) {
      toast.error(t('admin.selectEmpresa'));
      return;
    }

    setCreating(true);
    try {
      const res = await supabase.functions.invoke('manage-admin', {
        body: {
          action: 'create',
          email,
          password,
          nome: nome.trim(),
          sobrenome: sobrenome.trim(),
          role,
          cliente_ids: role === 'cliente' ? selectedClienteIds : undefined,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(t('admin.createSuccess'));
      setNome('');
      setSobrenome('');
      setEmail('');
      setPassword('');
      setRole('cliente');
      setSelectedClienteIds([]);
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (u: ManagedUser) => {
    const parts = (u.nome || '').split(' ');
    setEditNome(parts[0] || '');
    setEditSobrenome(parts.slice(1).join(' ') || '');
    setEditingId(u.user_id);
  };

  const handleUpdate = async () => {
    if (!editingId || !editNome.trim()) return;
    setSaving(true);
    try {
      const res = await supabase.functions.invoke('manage-admin', {
        body: { action: 'update', user_id: editingId, nome: editNome.trim(), sobrenome: editSobrenome.trim() },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(t('admin.editSuccess'));
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.user_id === user?.id) {
      toast.error(t('admin.cannotDeleteSelf'));
      setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    try {
      const res = await supabase.functions.invoke('manage-admin', {
        body: { action: 'delete', user_id: deleteTarget.user_id },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(t('admin.deleteSuccess'));
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const dateLocale = (() => {
    const lang = t('nav.dashboard') === 'Dashboard' && t('common.save') === 'Save' ? 'en' :
                 t('common.save') === 'Guardar' ? 'es' : 'pt';
    return lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';
  })();

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-full overflow-x-hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            {t('admin.title')}
          </h1>
          <p className="text-muted-foreground">{t('admin.subtitle')}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {t('admin.newUser')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={role} onValueChange={(v) => { setRole(v as 'admin' | 'cliente'); setSelectedClienteIds([]); }}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="admin" className="gap-1.5">
                    <Shield className="h-4 w-4" />
                    {t('admin.tabInternal')}
                  </TabsTrigger>
                  <TabsTrigger value="cliente" className="gap-1.5">
                    <Building2 className="h-4 w-4" />
                    {t('admin.tabClient')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="admin" className="mt-0">
                  <p className="text-sm text-muted-foreground mb-4 p-3 rounded-lg bg-muted/50 border">
                    <Shield className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                    {t('admin.internalDesc')}
                  </p>
                </TabsContent>

                <TabsContent value="cliente" className="mt-0">
                  <p className="text-sm text-muted-foreground mb-4 p-3 rounded-lg bg-muted/50 border">
                    <Building2 className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                    {t('admin.clientDesc')}
                  </p>
                </TabsContent>
              </Tabs>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-nome">{t('admin.name')} *</Label>
                    <Input id="admin-nome" placeholder={t('admin.name')} value={nome} onChange={(e) => setNome(e.target.value)} required disabled={creating} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-sobrenome">{t('admin.surname')} *</Label>
                    <Input id="admin-sobrenome" placeholder={t('admin.surname')} value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} required disabled={creating} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">{t('admin.email')} *</Label>
                  <Input id="admin-email" type="email" placeholder="usuario@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={creating} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">{t('admin.password')} *</Label>
                  <Input id="admin-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={creating} />
                </div>

                {role === 'cliente' && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {t('admin.linkedEmpresas')} *
                    </Label>
                    <div className="border rounded-lg max-h-40 overflow-y-auto p-2 space-y-1">
                      {clientes && clientes.length > 0 ? clientes.map(c => (
                        <label key={c.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                          <Checkbox
                            checked={selectedClienteIds.includes(c.id)}
                            onCheckedChange={() => toggleClienteId(c.id)}
                            disabled={creating}
                          />
                          <span className="truncate">{c.razao_social}</span>
                        </label>
                      )) : (
                        <p className="text-xs text-muted-foreground py-2 text-center">{t('admin.noEmpresas')}</p>
                      )}
                    </div>
                    {selectedClienteIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedClienteIds.length} {t('admin.empresasSelected')}
                      </p>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full gap-2" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {role === 'admin' ? t('admin.createInternal') : t('admin.createClient')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* User list */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('admin.existingUsers')}
                </CardTitle>
                <Select value={filterRole} onValueChange={(v) => setFilterRole(v as any)}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.filterAll')}</SelectItem>
                    <SelectItem value="admin">{t('admin.roleAdmin')}</SelectItem>
                    <SelectItem value="cliente">{t('admin.roleCliente')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : isError ? (
                <p className="text-sm text-destructive text-center py-8">
                  {t('admin.loadError')}: {error instanceof Error ? error.message : ''}
                </p>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <div className="space-y-3">
                  {filteredUsers.map((u) => (
                    <div key={u.user_id} className="flex items-center justify-between p-3 rounded-lg border gap-2">
                      {editingId === u.user_id ? (
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={editNome}
                              onChange={(e) => setEditNome(e.target.value)}
                              placeholder={t('admin.name')}
                              disabled={saving}
                            />
                            <Input
                              value={editSobrenome}
                              onChange={(e) => setEditSobrenome(e.target.value)}
                              placeholder={t('admin.surname')}
                              disabled={saving}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleUpdate} disabled={saving} className="gap-1">
                              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                              {t('admin.save')}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={saving}>
                              {t('admin.cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            {u.nome && <p className="font-semibold text-sm">{u.nome}</p>}
                            <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                            {u.role === 'cliente' && u.empresas && u.empresas.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {u.empresas.map(e => (
                                  <Badge key={e.cliente_id} variant="outline" className="text-xs gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {e.razao_social}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('admin.createdAt')} {new Date(u.created_at).toLocaleDateString(dateLocale)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant={u.role === 'admin' ? 'secondary' : 'default'} className="gap-1">
                              {u.role === 'admin' ? <ShieldCheck className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                              {u.role === 'admin' ? 'Admin' : t('admin.roleCliente')}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => startEdit(u)}
                              title={t('admin.editUser')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(u)}
                              title={t('admin.deleteUser')}
                              disabled={u.user_id === user?.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('admin.noUsers')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.deleteUser')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.deleteConfirm')}
              {deleteTarget && (
                <span className="block mt-2 font-medium text-foreground">
                  {deleteTarget.nome} ({deleteTarget.email})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('admin.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('admin.deleteUser')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarLayout>
  );
}
