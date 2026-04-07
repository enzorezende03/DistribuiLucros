import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Loader2, CheckCircle2 } from 'lucide-react';
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

export default function RegisterPage() {
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const { signUp } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleCnpjChange = async (value: string) => {
    const formatted = formatCNPJ(value);
    setCnpj(formatted);
    setEmpresaNome('');
    setEmpresaId(null);

    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 14) {
      setLookingUp(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('id, razao_social')
        .eq('cnpj', digits)
        .maybeSingle();

      if (!error && data) {
        setEmpresaNome(data.razao_social);
        setEmpresaId(data.id);
      } else {
        toast.error(t('register.cnpjNotFound'));
      }
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !sobrenome.trim()) {
      toast.error(t('register.fillNameSurname'));
      return;
    }

    if (!empresaId) {
      toast.error(t('register.cnpjNotFound'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('register.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      toast.error(t('register.passwordTooShort'));
      return;
    }

    setLoading(true);

    // Generate an internal email from CNPJ for auth
    const cnpjDigits = cnpj.replace(/\D/g, '');
    const internalEmail = `cnpj_${cnpjDigits}@distribuilucros.app`;

    const { error } = await signUp(internalEmail, password, nome.trim(), sobrenome.trim());

    if (error) {
      toast.error(t('register.error') + ': ' + error.message);
      setLoading(false);
      return;
    }

    // After signup, sign in to call the access request function
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

    if (!signInError) {
      await supabase.rpc('solicitar_acesso_cnpj', { _cnpj: cnpjDigits });
      await supabase.auth.signOut();
    }

    toast.success(t('register.successPending'));
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <Card className="w-full max-w-md animate-fade-in-up">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">DistribuiLucros</span>
            </div>
          </div>
          <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
          <CardDescription>{t('register.subtitle')}</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <div className="relative">
                <Input
                  id="cnpj"
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  required
                  disabled={loading}
                />
                {lookingUp && (
                  <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-muted-foreground" />
                )}
              </div>
              {empresaNome && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{empresaNome}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">{t('register.name')} *</Label>
                <Input id="nome" type="text" placeholder={t('register.name')} value={nome} onChange={(e) => setNome(e.target.value)} required disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sobrenome">{t('register.surname')} *</Label>
                <Input id="sobrenome" type="text" placeholder={t('register.surname')} value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} required disabled={loading} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('register.confirmPassword')}</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading || !empresaId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('register.submit')}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {t('register.hasAccount')}{' '}
              <Link to="/login" className="text-primary hover:underline">{t('register.login')}</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
