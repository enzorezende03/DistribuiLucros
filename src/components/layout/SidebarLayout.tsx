import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { languageFlags } from '@/translations';
import { useClientes } from '@/hooks/useClientes';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  AlertTriangle,
  AlertCircle,
  Calculator,
  LogOut,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  Eye,
  ArrowLeft,
  Bell,
  Globe,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import logo2m from '@/assets/logo-2m.png';

interface SidebarLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
  clienteOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'nav.dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: '/clientes', label: 'nav.clientes', icon: <Building2 className="h-5 w-5" />, adminOnly: true },
  { href: '/admin-usuarios', label: 'nav.adminUsuarios', icon: <Users className="h-5 w-5" />, adminOnly: true },
  { href: '/distribuicoes', label: 'nav.distribuicoes', icon: <FileText className="h-5 w-5" /> },
  { href: '/alertas', label: 'nav.alertas', icon: <AlertTriangle className="h-5 w-5" /> },
  { href: '/notificacoes', label: 'nav.notificacoes', icon: <Bell className="h-5 w-5" /> },
  { href: '/pendencias', label: 'nav.pendencias', icon: <AlertCircle className="h-5 w-5" />, clienteOnly: true },
  { href: '/simulacao', label: 'nav.simulacao', icon: <Calculator className="h-5 w-5" />, clienteOnly: true },
];

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { user, signOut, isAdmin, isCliente, isImpersonating, impersonatedClienteId, startImpersonating, stopImpersonating, userClientes, selectedClienteId, selectCliente } = useAuth();
  const { t, language, cycleLanguage } = useLanguage();
  const userRoleRaw = useAuth().userRole;
  const isRealAdmin = userRoleRaw?.role === 'admin';
  const isClienteWithMultiple = userRoleRaw?.role === 'cliente' && userClientes.length > 1;
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: clientes } = useClientes({ enabled: isRealAdmin });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.clienteOnly && isAdmin) return false;
    return true;
  });

  const NavLink = ({ item, mobile }: { item: NavItem; mobile?: boolean }) => {
    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
    
    return (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
          mobile
            ? isActive
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-foreground/70 hover:bg-muted hover:text-foreground'
            : isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        {item.icon}
        <span>{t(item.label)}</span>
        {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-background max-w-[100vw] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:shrink-0 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
          <div className="flex items-center gap-2">
            <img src={logo2m} alt="2M" className="h-8 object-contain" />
            <span className="font-semibold text-sidebar-foreground">{t('sidebar.appName')}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={cycleLanguage}
            title={`${languageFlags[language]} ${language.toUpperCase()}`}
          >
            <span className="text-sm font-semibold">{languageFlags[language]}</span>
          </Button>
        </div>
        
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Impersonation selector for admin */}
        {isRealAdmin && (
          <div className="border-t border-sidebar-border p-4">
            <p className="text-xs text-sidebar-foreground/50 mb-2 px-1 flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {t('sidebar.viewAsClient')}
            </p>
            <Select
              value={impersonatedClienteId || 'none'}
              onValueChange={(v) => {
                if (v === 'none') {
                  stopImpersonating();
                } else {
                  startImpersonating(v);
                  navigate('/dashboard');
                }
              }}
            >
              <SelectTrigger className="w-full text-xs h-9 bg-sidebar-accent/30 border-sidebar-border">
                <SelectValue placeholder={t('sidebar.selectClient')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('sidebar.adminView')}</SelectItem>
                {clientes?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Company switcher for clients with multiple companies */}
        {isClienteWithMultiple && (
          <div className="border-t border-sidebar-border p-4">
            <p className="text-xs text-sidebar-foreground/50 mb-2 px-1 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {t('sidebar.activeCompany')}
            </p>
            <Select
              value={selectedClienteId || ''}
              onValueChange={(v) => {
                selectCliente(v);
              }}
            >
              <SelectTrigger className="w-full text-xs h-9 bg-sidebar-accent/30 border-sidebar-border">
                <SelectValue placeholder={t('sidebar.selectCompany')} />
              </SelectTrigger>
              <SelectContent>
                {userClientes.map((uc) => (
                  <SelectItem key={uc.cliente_id} value={uc.cliente_id}>
                    {uc.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 px-3">
            <p className="text-xs text-sidebar-foreground/50">{t('sidebar.loggedAs')}</p>
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.user_metadata?.full_name || user?.user_metadata?.nome || user?.email}
            </p>
            <span className={cn(
              'mt-1 inline-block text-xs px-2 py-0.5 rounded-full',
              isAdmin ? 'bg-sidebar-primary/20 text-sidebar-primary' : 'bg-sidebar-accent text-sidebar-accent-foreground'
            )}>
              {isAdmin ? t('sidebar.admin') : t('sidebar.client')}
            </span>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            {t('sidebar.logout')}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col min-w-0 md:hidden">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4">
          <div className="flex items-center gap-2">
            <img src={logo2m} alt="2M" className="h-7 object-contain" />
            <span className="font-semibold">{t('sidebar.appName')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={cycleLanguage}
            >
              <span className="text-sm">{languageFlags[language]}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 z-50 bg-card border-b shadow-lg animate-fade-in max-h-[calc(100vh-4rem)] overflow-y-auto">
            <nav className="space-y-1 p-4">
              {filteredNavItems.map((item) => (
                <NavLink key={item.href} item={item} mobile />
              ))}
            </nav>

            {/* Impersonation selector for admin on mobile */}
            {isRealAdmin && (
              <div className="border-t p-4">
                <p className="text-xs text-muted-foreground mb-2 px-1 flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {t('sidebar.viewAsClient')}
                </p>
                <Select
                  value={impersonatedClienteId || 'none'}
                  onValueChange={(v) => {
                    if (v === 'none') {
                      stopImpersonating();
                    } else {
                      startImpersonating(v);
                      setMobileMenuOpen(false);
                      navigate('/dashboard');
                    }
                  }}
                >
                  <SelectTrigger className="w-full text-xs h-9">
                    <SelectValue placeholder={t('sidebar.selectClient')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('sidebar.adminView')}</SelectItem>
                    {clientes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="border-t p-4">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-foreground/70"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                {t('sidebar.logout')}
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Content */}
        <main className="flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden">
          <ImpersonationBanner />
          {children}
        </main>
      </div>

      {/* Desktop Content */}
      <main className="hidden md:flex flex-1 flex-col min-w-0 max-w-full overflow-y-auto">
        <ImpersonationBanner />
        {children}
      </main>
    </div>
  );
}

function ImpersonationBanner() {
  const { isImpersonating, impersonatedClienteId, stopImpersonating } = useAuth();
  const { t } = useLanguage();
  const { data: clientes } = useClientes({ enabled: isImpersonating });

  if (!isImpersonating) return null;

  const clienteName = clientes?.find(c => c.id === impersonatedClienteId)?.razao_social;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm">
        <Eye className="h-4 w-4 text-primary" />
        <span className="font-medium">{t('sidebar.viewingAs')}</span>
        <span className="text-primary font-semibold">{clienteName || t('sidebar.client')}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs h-7"
        onClick={stopImpersonating}
      >
        <ArrowLeft className="h-3 w-3" />
        {t('sidebar.backToAdmin')}
      </Button>
    </div>
  );
}
