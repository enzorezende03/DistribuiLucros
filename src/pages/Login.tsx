import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
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

export default function LoginPage() {
  const [cnpj, setCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [primeiroAcesso, setPrimeiroAcesso] = useState(true);
  const [loading, setLoading] = useState(false);
  const { } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const senhaEfetiva = primeiroAcesso ? '2mCliente' : password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cnpjDigits = cnpj.replace(/\D/g, '');
    if (cnpjDigits.length !== 14) {
      toast.error(t('login.invalidCnpj'));
      setLoading(false);
      return;
    }

    // Look up email by CNPJ
    const { data: email, error: lookupError } = await supabase.rpc('find_email_by_cnpj', { _cnpj: cnpjDigits });

    if (lookupError || !email) {
      toast.error(t('login.cnpjNotFound'));
      setLoading(false);
      return;
    }

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

    // Check if user must change password on first login
    const mustChange = data?.user?.user_metadata?.must_change_password;
    if (mustChange) {
      navigate('/alterar-senha');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <Card className="w-full max-w-md animate-fade-in-up">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo2m} alt="2M Contabilidade" className="h-20 object-contain" />
          </div>
          <CardTitle className="text-2xl">{t('login.title')}</CardTitle>
          <CardDescription>{t('login.subtitle')}</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
                <Label htmlFor="password">{t('login.password')}</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('login.submit')}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {t('login.noAccount')}{' '}
              <Link to="/register" className="text-primary hover:underline">{t('login.register')}</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
