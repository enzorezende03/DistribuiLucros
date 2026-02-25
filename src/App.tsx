import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

// Pages
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import DashboardPage from "@/pages/Dashboard";
import ClientesPage from "@/pages/Clientes";
import SelecionarEmpresaPage from "@/pages/SelecionarEmpresa";
import DistribuicoesPage from "@/pages/Distribuicoes";
import NovaDistribuicaoPage from "@/pages/NovaDistribuicao";
import AlertasPage from "@/pages/Alertas";
import AlertasClientePage from "@/pages/AlertasCliente";
import NotificacoesPage from "@/pages/Notificacoes";
import PendenciasPage from "@/pages/Pendencias";
import SimulacaoPage from "@/pages/Simulacao";
import NotFound from "@/pages/NotFound";

// Components
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
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
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

      {/* Company selection */}
      <Route path="/selecionar-empresa" element={<ProtectedRoute><SelecionarEmpresaPage /></ProtectedRoute>} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute requireAdmin><ClientesPage /></ProtectedRoute>} />
      <Route path="/socios" element={<Navigate to="/clientes" replace />} />
      <Route path="/distribuicoes" element={<ProtectedRoute><DistribuicoesPage /></ProtectedRoute>} />
      <Route path="/distribuicoes/nova" element={<ProtectedRoute><NovaDistribuicaoPage /></ProtectedRoute>} />
      <Route path="/alertas" element={<ProtectedRoute><AlertasRoute /></ProtectedRoute>} />
      <Route path="/notificacoes" element={<ProtectedRoute><NotificacoesPage /></ProtectedRoute>} />
      <Route path="/pendencias" element={<ProtectedRoute><PendenciasPage /></ProtectedRoute>} />
      <Route path="/simulacao" element={<ProtectedRoute><SimulacaoPage /></ProtectedRoute>} />

      {/* Redirect root */}
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
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

export default App;
