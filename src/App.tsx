import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { consumeSsoToken } from "@/lib/sso-receiver";


// Pages
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import AlterarSenhaPage from "@/pages/AlterarSenha";
import DashboardPage from "@/pages/Dashboard";
import ClientesPage from "@/pages/Clientes";
import SelecionarEmpresaPage from "@/pages/SelecionarEmpresa";
import DistribuicoesPage from "@/pages/Distribuicoes";
import NovaDistribuicaoPage from "@/pages/NovaDistribuicao";
import EditarDistribuicaoPage from "@/pages/EditarDistribuicao";
import AlertasPage from "@/pages/Alertas";
import AlertasClientePage from "@/pages/AlertasCliente";
import NotificacoesPage from "@/pages/Notificacoes";
import PendenciasPage from "@/pages/Pendencias";
import SimulacaoPage from "@/pages/Simulacao";
import AdminUsuariosPage from "@/pages/AdminUsuarios";
import LucrosAcumuladosPage from "@/pages/LucrosAcumulados";
import TarefasIRPage from "@/pages/TarefasIR";
import AjudaPage from "@/pages/Ajuda";
import AdesaoPage from "@/pages/Adesao";
import NotFound from "@/pages/NotFound";

// Components
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000,
      gcTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

function AlertasRoute() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AlertasPage /> : <AlertasClientePage />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
        <Route path="/alterar-senha" element={<ProtectedRoute><AlterarSenhaPage /></ProtectedRoute>} />

        {/* Company selection */}
        <Route path="/selecionar-empresa" element={<ProtectedRoute><SelecionarEmpresaPage /></ProtectedRoute>} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute requireAdmin><ClientesPage /></ProtectedRoute>} />
        <Route path="/admin-usuarios" element={<ProtectedRoute requireAdmin><AdminUsuariosPage /></ProtectedRoute>} />
        <Route path="/socios" element={<Navigate to="/clientes" replace />} />
        <Route path="/distribuicoes" element={<ProtectedRoute><DistribuicoesPage /></ProtectedRoute>} />
        <Route path="/distribuicoes/nova" element={<ProtectedRoute><NovaDistribuicaoPage /></ProtectedRoute>} />
        <Route path="/distribuicoes/editar/:id" element={<ProtectedRoute><EditarDistribuicaoPage /></ProtectedRoute>} />
        <Route path="/alertas" element={<ProtectedRoute><AlertasRoute /></ProtectedRoute>} />
        <Route path="/tarefas-ir" element={<ProtectedRoute requireAdmin><TarefasIRPage /></ProtectedRoute>} />
        <Route path="/notificacoes" element={<ProtectedRoute><NotificacoesPage /></ProtectedRoute>} />
        <Route path="/pendencias" element={<ProtectedRoute><PendenciasPage /></ProtectedRoute>} />
        <Route path="/simulacao" element={<ProtectedRoute><SimulacaoPage /></ProtectedRoute>} />
        <Route path="/lucros-acumulados" element={<ProtectedRoute><LucrosAcumuladosPage /></ProtectedRoute>} />
        <Route path="/ajuda" element={<ProtectedRoute><AjudaPage /></ProtectedRoute>} />
        <Route path="/adesao" element={<ProtectedRoute requireAdmin><AdesaoPage /></ProtectedRoute>} />

        {/* Redirect root */}
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}

const App = () => {
  const [ssoReady, setSsoReady] = useState(false);
  useEffect(() => {
    consumeSsoToken().finally(() => setSsoReady(true));
  }, []);
  if (!ssoReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <LanguageProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </LanguageProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};


export default App;
