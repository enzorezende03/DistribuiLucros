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
  nome: string;
  created_at: string;
}

export default function AdminUsuariosPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: admins, isLoading, isError, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await supabase.functions.invoke('manage-admin', {
        body: { action: 'list' },
      });
      if (res.error) {
        const message = res.error.message || 'falha na chamada';
        if (message.includes('401') || message.includes('Não autorizado')) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }
        throw new Error(message);
      }
      if (res.data?.error) {
        if (res.data.error === 'Não autorizado') {
          throw new Error('Sessão expirada. Faça login novamente.');
        }
        throw new Error(res.data.error);
      }
      return (res.data?.admins || []) as AdminUser[];
    },
    enabled: !!user,
    retry: false,
  });

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

    setCreating(true);
    try {
      const res = await supabase.functions.invoke('manage-admin', {
        body: { action: 'create', email, password, nome: nome.trim(), sobrenome: sobrenome.trim() },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(t('admin.createSuccess'));
      setNome('');
      setSobrenome('');
      setEmail('');
      setPassword('');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const dateLocale = (() => {
    const lang = t('nav.dashboard') === 'Dashboard' && t('common.save') === 'Save' ? 'en' :
                 t('common.save') === 'Guardar' ? 'es' : 'pt';
    return lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';
  })();

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            {t('admin.title')}
          </h1>
          <p className="text-muted-foreground">{t('admin.subtitle')}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {t('admin.newAdmin')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-nome">{t('admin.name')} *</Label>
                    <Input
                      id="admin-nome"
                      type="text"
                      placeholder={t('admin.name')}
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      disabled={creating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-sobrenome">{t('admin.surname')} *</Label>
                    <Input
                      id="admin-sobrenome"
                      type="text"
                      placeholder={t('admin.surname')}
                      value={sobrenome}
                      onChange={(e) => setSobrenome(e.target.value)}
                      required
                      disabled={creating}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">{t('admin.email')} *</Label>
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
                  <Label htmlFor="admin-password">{t('admin.password')}</Label>
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
                  {t('admin.createAdmin')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('admin.existingAdmins')}
              </CardTitle>
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
              ) : admins && admins.length > 0 ? (
                <div className="space-y-3">
                  {admins.map((admin) => (
                    <div
                      key={admin.user_id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        {admin.nome && (
                          <p className="font-semibold text-sm">{admin.nome}</p>
                        )}
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('admin.createdAt')} {new Date(admin.created_at).toLocaleDateString(dateLocale)}
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
                  {t('admin.noAdmins')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
