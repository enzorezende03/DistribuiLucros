import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const getLoginErrorMessage = (errorMessage: string, fallback: string) => {
  if (/failed to fetch|networkerror|load failed/i.test(errorMessage)) {
    return 'Falha de conexão ao entrar. Verifique sua internet e tente novamente.';
  }

  return `${fallback}: ${errorMessage}`;
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

  // Forgot password (cliente)
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotCnpj, setForgotCnpj] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Forgot password (admin)
  const [forgotAdminOpen, setForgotAdminOpen] = useState(false);
  const [forgotAdminEmail, setForgotAdminEmail] = useState('');
  const [forgotAdminLoading, setForgotAdminLoading] = useState(false);
  const [forgotAdminSuccess, setForgotAdminSuccess] = useState<string | null>(null);

  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cnpjDigits = forgotCnpj.replace(/\D/g, '');
    if (cnpjDigits.length !== 14) {
      toast.error('Informe um CNPJ válido');
      return;
    }
    setForgotLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const resp = await fetch(`${supabaseUrl}/functions/v1/reset-password-cnpj`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ cnpj: cnpjDigits }),
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok || data?.success === false || data?.error) {
        toast.error(data?.error || 'Não foi possível redefinir a senha');
        return;
      }
      setForgotSuccess(data?.razao_social || 'Empresa');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado';
      if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        toast.error('Falha de conexão ao redefinir a senha. Verifique sua internet e tente novamente.');
      } else {
        toast.error(msg);
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotCnpj('');
    setForgotSuccess(null);
  };

  const handleForgotAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = forgotAdminEmail.trim();
    if (!email || !email.includes('@')) {
      toast.error('Informe um e-mail válido');
      return;
    }
    setForgotAdminLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const resp = await fetch(`${supabaseUrl}/functions/v1/reset-password-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok || data?.success === false || data?.error) {
        toast.error(data?.error || 'Não foi possível redefinir a senha');
        return;
      }
      setForgotAdminSuccess(email);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado';
      if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        toast.error('Falha de conexão ao redefinir a senha. Verifique sua internet e tente novamente.');
      } else {
        toast.error(msg);
      }
    } finally {
      setForgotAdminLoading(false);
    }
  };

  const closeForgotAdmin = () => {
    setForgotAdminOpen(false);
    setForgotAdminEmail('');
    setForgotAdminSuccess(null);
  };

  const handleClienteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cnpjDigits = cnpj.replace(/\D/g, '');
      if (cnpjDigits.length !== 14) {
        toast.error(t('login.invalidCnpj'));
        return;
      }

      const { data: email, error: lookupError } = await supabase.rpc('find_email_by_cnpj', { _cnpj: cnpjDigits });
      if (lookupError || !email) {
        toast.error(t('login.cnpjNotFound'));
        return;
      }

      const senhaEfetiva = primeiroAcesso ? '2mCliente' : clientePassword;
      const { error, data } = await supabase.auth.signInWithPassword({ email, password: senhaEfetiva });

      if (error) {
        if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
          toast.error('Falha de conexão ao entrar. Verifique sua internet e tente novamente.');
          return;
        }

        if (primeiroAcesso) {
          toast.error('Senha padrão não reconhecida. Se você já redefiniu sua senha, desmarque "Primeiro acesso".');
        } else {
          toast.error(getLoginErrorMessage(error.message, t('login.error')));
        }
        return;
      }

      toast.success(t('login.success'));
      const mustChange = data?.user?.user_metadata?.must_change_password;
      navigate(mustChange ? '/alterar-senha' : '/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('login.error');
      toast.error(getLoginErrorMessage(message, t('login.error')));
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });

      if (error) {
        toast.error(getLoginErrorMessage(error.message, t('login.error')));
        return;
      }

      toast.success(t('login.success'));
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('login.error');
      toast.error(getLoginErrorMessage(message, t('login.error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-primary relative overflow-hidden flex-col items-center justify-center p-12">
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
          <p className="text-primary-foreground/90 text-xl leading-relaxed font-medium">
            A 2M cuida para você pagar imposto só sobre o que é realmente lucro.
          </p>
          <p className="text-primary-foreground/70 text-base mt-3">
            Confirme seu mês em um clique.
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

          {mode === 'cliente' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Acesso Cliente</h2>
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
                <p className="text-xs text-muted-foreground">
                  Use o CNPJ da empresa. A senha você define no primeiro acesso.
                </p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="primeiro_acesso"
                    checked={primeiroAcesso}
                    onCheckedChange={(checked) => setPrimeiroAcesso(checked === true)}
                    disabled={loading}
                  />
                  <Label htmlFor="primeiro_acesso" className="text-sm font-normal cursor-pointer">
                    É meu primeiro acesso
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

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setForgotCnpj(cnpj); setForgotOpen(true); }}
                  className="text-sm text-primary hover:underline transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => setMode('admin')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Acesso administrativo
                </button>
              </div>
            </div>
          )}

          {mode === 'admin' && (
            <div className="space-y-6">
              <div>
                <button
                  onClick={() => setMode('cliente')}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
                <h2 className="text-xl font-bold text-foreground">Acesso Administrativo</h2>
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

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setForgotAdminEmail(adminEmail); setForgotAdminOpen(true); }}
                  className="text-sm text-primary hover:underline transition-colors"
                  disabled={loading}
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={(o) => (o ? setForgotOpen(true) : closeForgot())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Esqueci minha senha</DialogTitle>
            <DialogDescription>
              {forgotSuccess
                ? 'Sua senha foi redefinida com sucesso.'
                : 'Informe o CNPJ da sua empresa. Vamos redefinir sua senha para a padrão para que você possa entrar e criar uma nova.'}
            </DialogDescription>
          </DialogHeader>

          {!forgotSuccess ? (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-cnpj">CNPJ</Label>
                <Input
                  id="forgot-cnpj"
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={forgotCnpj}
                  onChange={(e) => setForgotCnpj(formatCNPJ(e.target.value))}
                  required
                  disabled={forgotLoading}
                  autoFocus
                  className="h-11"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={closeForgot} disabled={forgotLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={forgotLoading}>
                  {forgotLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Redefinir senha
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted/40 p-4 text-sm space-y-2">
                <p className="font-medium text-foreground">{forgotSuccess}</p>
                <p className="text-muted-foreground">
                  Sua senha foi redefinida para a senha padrão{' '}
                  <span className="font-mono font-semibold text-foreground">2mCliente</span>.
                </p>
                <p className="text-muted-foreground">
                  Na tela de login, marque <strong>"Primeiro acesso (senha padrão)"</strong> e
                  entre — você será solicitado a criar uma nova senha em seguida.
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setPrimeiroAcesso(true);
                    setClientePassword('');
                    closeForgot();
                  }}
                  className="w-full"
                >
                  Entendi, ir para o login
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
