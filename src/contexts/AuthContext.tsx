import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'cliente';

interface UserRole {
  role: AppRole;
  cliente_id: string | null;
}

interface UserCliente {
  cliente_id: string;
  razao_social: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  roleLoaded: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isCliente: boolean;
  clienteId: string | null;
  // Multi-company support
  userClientes: UserCliente[];
  selectedClienteId: string | null;
  selectCliente: (clienteId: string) => void;
  needsCompanySelection: boolean;
  // Impersonation
  isImpersonating: boolean;
  impersonatedClienteId: string | null;
  startImpersonating: (clienteId: string) => void;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedClienteId, setImpersonatedClienteId] = useState<string | null>(null);
  const [userClientes, setUserClientes] = useState<UserCliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, cliente_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data as UserRole | null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  const fetchUserClientes = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_clientes')
        .select('cliente_id, clientes:clientes(razao_social)')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user clientes:', error);
        return [];
      }

      return (data || []).map((d: any) => ({
        cliente_id: d.cliente_id,
        razao_social: d.clientes?.razao_social || 'Empresa',
      }));
    } catch (error) {
      console.error('Error fetching user clientes:', error);
      return [];
    }
  };

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            if (!isMounted) return;
            const userId = session.user.id;
            Promise.all([fetchUserRole(userId), fetchUserClientes(userId)]).then(
              ([role, clientes]) => {
                if (!isMounted) return;
                setUserRole(role);
                setUserClientes(clientes);
                setRoleLoaded(true);
                if (role?.role === 'cliente' && clientes.length === 1) {
                  setSelectedClienteId(clientes[0].cliente_id);
                }
              }
            );
          }, 0);
        } else {
          setUserRole(null);
          setUserClientes([]);
          setSelectedClienteId(null);
          setRoleLoaded(false);
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const [role, clientes] = await Promise.all([
            fetchUserRole(session.user.id),
            fetchUserClientes(session.user.id),
          ]);
          if (!isMounted) return;
          setUserRole(role);
          setUserClientes(clientes);
          setRoleLoaded(true);
          if (role?.role === 'cliente' && clientes.length === 1) {
            setSelectedClienteId(clientes[0].cliente_id);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserClientes([]);
    setSelectedClienteId(null);
    setImpersonatedClienteId(null);
  };

  const selectCliente = useCallback((clienteId: string) => {
    setSelectedClienteId(clienteId);
  }, []);

  const isRealAdmin = userRole?.role === 'admin';
  const isImpersonating = isRealAdmin && impersonatedClienteId !== null;
  const isClienteRole = userRole?.role === 'cliente';
  const needsCompanySelection = isClienteRole && userClientes.length > 1 && !selectedClienteId;

  // Determine effective clienteId
  let effectiveClienteId: string | null = null;
  if (isImpersonating) {
    effectiveClienteId = impersonatedClienteId;
  } else if (isClienteRole) {
    effectiveClienteId = selectedClienteId;
  }

  const value: AuthContextType = {
    user,
    session,
    userRole,
    loading,
    roleLoaded,
    signIn,
    signUp,
    signOut,
    isAdmin: isRealAdmin && !isImpersonating,
    isCliente: isClienteRole || isImpersonating,
    clienteId: effectiveClienteId,
    userClientes,
    selectedClienteId,
    selectCliente,
    needsCompanySelection,
    isImpersonating,
    impersonatedClienteId,
    startImpersonating: (clienteId: string) => setImpersonatedClienteId(clienteId),
    stopImpersonating: () => setImpersonatedClienteId(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
