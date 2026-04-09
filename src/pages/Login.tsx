import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type LoginMode = 'cliente' | 'admin';

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('cliente');
  const [cnpj, setCnpj] = useState('');
  const [primeiroAcesso, setPrimeiroAcesso] = useState(true);
  const [clientePassword, setClientePassword] = useState('');
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
    const { error, data } = await supabase.auth.signInWithPassword({ email, password: senhaEfetiva });
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
    const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (error) {
      toast.error(t('login.error') + ': ' + error.message);
      setLoading(false);
      return;
    }
    toast.success(t('login.success'));
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-primary relative overflow-hidden flex-col items-center justify-center p-12">
        {/* Decorative shapes */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-white/5" />
          <div className="absolute bottom-[-15%] left-[-5%] w-[400px] h-[400px] rounded-full bg-white/5" />
          <div className="absolute top-[40%] left-[10%] w-[200px] h-[200px] rounded-full bg-white/[0.03]" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <img src={logo2m} alt="2M Contabilidade" className="h-28 object-contain mb-8 drop-shadow-lg" />
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">
            DistribuiLucros
          </h1>
          <p className="text-primary-foreground/70 text-lg leading-relaxed">
            Gerencie distribuições, acompanhe saldos e mantenha sua empresa em conformidade com segurança e praticidade.
          </p>
        </div>

        <div className="absolute bottom-8 text-primary-foreground/40 text-sm">
          © {new Date().getFullYear()} 2M Contabilidade
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm animate-fade-in-up">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src={logo2m} alt="2M Contabilidade" className="h-16 object-contain" />
          </div>

          {mode === 'select' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Bem-vindo</h2>
                <p className="text-muted-foreground">Selecione o tipo de acesso para continuar</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setMode('cliente')}
                  className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-border bg-card hover:border-accent hover:shadow-md transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                    <Building2 className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <span className="text-base font-semibold text-foreground block">Acesso Cliente</span>
                    <span className="text-sm text-muted-foreground">Entre com o CNPJ da sua empresa</span>
                  </div>
                </button>

                <button
                  onClick={() => setMode('admin')}
                  className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-border bg-card hover:border-primary/40 hover:shadow-md transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <span className="text-base font-semibold text-foreground block">Acesso Administrativo</span>
                    <span className="text-sm text-muted-foreground">Restrito à equipe interna</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {mode === 'cliente' && (
            <div className="space-y-6">
              <div>
                <button
                  onClick={() => setMode('select')}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
                <div className="flex items-center gap-3 mb-1">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-accent" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Acesso Cliente</h2>
                </div>
                <p className="text-muted-foreground text-sm mt-1">Entre com o CNPJ da sua empresa</p>
              </div>

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
                    className="h-11"
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
                    <Input id="cliente-password" type="password" placeholder="••••••••" value={clientePassword} onChange={(e) => setClientePassword(e.target.value)} required disabled={loading} className="h-11" />
                  </div>
                )}
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('login.submit')}
                </Button>
              </form>
            </div>
          )}

          {mode === 'admin' && (
            <div className="space-y-6">
              <div>
                <button
                  onClick={() => setMode('select')}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
                <div className="flex items-center gap-3 mb-1">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Acesso Administrativo</h2>
                </div>
                <p className="text-muted-foreground text-sm mt-1">Restrito à equipe interna</p>
              </div>

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
                    className="h-11"
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
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('login.submit')}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
