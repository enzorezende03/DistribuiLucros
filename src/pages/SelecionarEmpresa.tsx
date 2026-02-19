import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function SelecionarEmpresaPage() {
  const { userClientes, selectCliente, user } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (clienteId: string) => {
    selectCliente(clienteId);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Selecione a Empresa</h1>
          <p className="text-muted-foreground text-sm">
            Olá, {user?.email}. Escolha qual empresa deseja acessar.
          </p>
        </div>

        <div className="space-y-3">
          {userClientes.map((uc) => (
            <Card
              key={uc.cliente_id}
              className="cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
              onClick={() => handleSelect(uc.cliente_id)}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{uc.razao_social}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
