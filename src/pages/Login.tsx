import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Building2, ShieldCheck, ArrowLeft } from 'lucide-react';
import logo2m from '@/assets/logo-2m.png';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

type LoginMode = 'select' | 'cliente' | 'admin';

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('select');
  // Cliente fields
  const [cnpj, setCnpj] = useState('');
  const [primeiroAcesso, setPrimeiroAcesso] = useState(true);
  const [clientePassword, setClientePassword] = useState('');
  // Admin fields
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const { } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleClienteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cnpjDigits = cnpj.replace(/\D/g, '');
    if (cnpjDigits.length !== 14) {
      toast.error(t('login.invalidCnpj'));
      setLoading(false);
      return;
    }

    const { data: email, error: lookupError } = await supabase.rpc('find_email_by_cnpj', { _cnpj: cnpjDigits });

    if (lookupError || !email) {
      toast.error(t('login.cnpjNotFound'));
      setLoading(false);
      return;
    }

    const senhaEfetiva = primeiroAcesso ? '2mCliente' : clientePassword;

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password: senhaEfetiva,
    });

    if (error) {
      if (primeiroAcesso) {
        toast.error('Senha padrão não reconhecida. Se você já redefiniu sua senha, desmarque "Primeiro acesso".');
      } else {
        toast.error(t('login.error') + ': ' + error.message);
      }
      setLoading(false);
      return;
    }

    toast.success(t('login.success'));
    const mustChange = data?.user?.user_metadata?.must_change_password;
    if (mustChange) {
      navigate('/alterar-senha');
    } else {
      navigate('/dashboard');
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (error) {
      toast.error(t('login.error') + ': ' + error.message);
      setLoading(false);
      return;
    }

    toast.success(t('login.success'));
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logo2m} alt="2M Contabilidade" className="h-20 object-contain" />
        </div>

        {mode === 'select' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-primary-foreground">{t('login.title')}</h1>
              <p className="text-primary-foreground/70 mt-1">Selecione o tipo de acesso</p>
            </div>

            {/* Client access - prominent */}
            <Card
              className="cursor-pointer border-2 border-transparent hover:border-accent transition-all hover:shadow-lg"
              onClick={() => setMode('cliente')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-7 w-7 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Acesso Cliente</h2>
                  <p className="text-sm text-muted-foreground">
                    Entre com o CNPJ da sua empresa
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Admin access - subtle */}
            <button
              className="w-full text-center text-sm text-primary-foreground/60 hover:text-primary-foreground/90 transition-colors py-2"
              onClick={() => setMode('admin')}
            >
              <ShieldCheck className="h-4 w-4 inline mr-1.5 -mt-0.5" />
              Acesso Administrativo
            </button>
          </div>
        )}

        {mode === 'cliente' && (
          <Card>
            <CardHeader>
              <button
                onClick={() => setMode('select')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 -ml-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-xl">Acesso Cliente</CardTitle>
                  <CardDescription>Entre com o CNPJ da sua empresa</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleClienteSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="primeiro_acesso"
                    checked={primeiroAcesso}
                    onCheckedChange={(checked) => setPrimeiroAcesso(checked === true)}
                    disabled={loading}
                  />
                  <Label htmlFor="primeiro_acesso" className="text-sm font-normal cursor-pointer">
                    Primeiro acesso (senha padrão)
                  </Label>
                </div>
                {!primeiroAcesso && (
                  <div className="space-y-2">
                    <Label htmlFor="cliente-password">{t('login.password')}</Label>
                    <Input id="cliente-password" type="password" placeholder="••••••••" value={clientePassword} onChange={(e) => setClientePassword(e.target.value)} required disabled={loading} />
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('login.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {mode === 'admin' && (
          <Card>
            <CardHeader>
              <button
                onClick={() => setMode('select')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 -ml-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Acesso Administrativo</CardTitle>
                  <CardDescription>Restrito à equipe interna</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">E-mail</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">{t('login.password')}</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('login.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
