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
import { Loader2, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

interface AdminUser {
  user_id: string;
  email: string;
  created_at: string;
}

export default function AdminUsuariosPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: admins, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('manage-admin', {
        body: { action: 'list' },
      });
      if (res.error) throw new Error(res.error.message);
      return (res.data?.admins || []) as AdminUser[];
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha e-mail e senha');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setCreating(true);
    try {
      const res = await supabase.functions.invoke('manage-admin', {
        body: { action: 'create', email, password },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success('Administrador criado com sucesso!');
      setEmail('');
      setPassword('');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Gerenciar Administradores
          </h1>
          <p className="text-muted-foreground">Crie e visualize os administradores do sistema</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create admin form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Novo Administrador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">E-mail</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Senha</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={creating}
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Criar Administrador
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Admins list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Administradores Existentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : admins && admins.length > 0 ? (
                <div className="space-y-3">
                  {admins.map((admin) => (
                    <div
                      key={admin.user_id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium text-sm">{admin.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Criado em {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Admin
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum administrador encontrado
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
