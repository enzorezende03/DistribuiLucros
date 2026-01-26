import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin, userRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Usuário logado mas sem role ainda (pode estar sendo carregado)
  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold">Acesso Pendente</h2>
          <p className="text-muted-foreground max-w-sm">
            Sua conta está aguardando aprovação do administrador para acessar o sistema.
          </p>
        </div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
