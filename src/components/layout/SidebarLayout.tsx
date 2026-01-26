import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

interface SidebarLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: '/clientes', label: 'Clientes', icon: <Building2 className="h-5 w-5" />, adminOnly: true },
  { href: '/socios', label: 'Sócios', icon: <Users className="h-5 w-5" />, adminOnly: true },
  { href: '/distribuicoes', label: 'Distribuições', icon: <FileText className="h-5 w-5" /> },
  { href: '/alertas', label: 'Alertas', icon: <AlertTriangle className="h-5 w-5" />, adminOnly: true },
];

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { user, signOut, isAdmin, isCliente } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
    
    return (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        {item.icon}
        <span>{item.label}</span>
        {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-sidebar border-r border-sidebar-border">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <TrendingUp className="h-6 w-6 text-sidebar-primary" />
          <span className="font-semibold text-sidebar-foreground">DistribuiLucros</span>
        </div>
        
        <nav className="flex-1 space-y-1 p-4">
          {filteredNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 px-3">
            <p className="text-xs text-sidebar-foreground/50">Logado como</p>
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email}
            </p>
            <span className={cn(
              'mt-1 inline-block text-xs px-2 py-0.5 rounded-full',
              isAdmin ? 'bg-sidebar-primary/20 text-sidebar-primary' : 'bg-sidebar-accent text-sidebar-accent-foreground'
            )}>
              {isAdmin ? 'Admin' : 'Cliente'}
            </span>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col md:hidden">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="font-semibold">DistribuiLucros</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 z-50 bg-card border-b shadow-lg animate-fade-in">
            <nav className="space-y-1 p-4">
              {filteredNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
            <div className="border-t p-4">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Desktop Content */}
      <main className="hidden md:flex flex-1 flex-col overflow-auto">
        {children}
      </main>
    </div>
  );
}
