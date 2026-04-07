import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserClienteLink {
  id: string;
  user_id: string;
  cliente_id: string;
  created_at: string;
  aprovado: boolean;
  email?: string;
  nome?: string;
}

export function useUserClientes(clienteId: string | null) {
  return useQuery({
    queryKey: ['user_clientes', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('user_clientes')
        .select('*')
        .eq('cliente_id', clienteId);

      if (error) throw error;
      
      // Fetch name and email for each user
      const links = data as UserClienteLink[];
      const withDetails = await Promise.all(
        links.map(async (link) => {
          const [{ data: displayName }, { data: email }] = await Promise.all([
            supabase.rpc('get_user_display_name', { _user_id: link.user_id }),
            supabase.rpc('get_user_email', { _user_id: link.user_id }),
          ]);
          return { ...link, nome: displayName || undefined, email: email || link.user_id };
        })
      );
      
      return withDetails;
    },
    enabled: !!clienteId,
  });
}

export function useUserAllClientes(userId: string | null) {
  return useQuery({
    queryKey: ['user_all_clientes', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_clientes')
        .select('id, cliente_id, clientes:clientes(razao_social, cnpj)')
        .eq('user_id', userId);

      if (error) throw error;
      return data as { id: string; cliente_id: string; clientes: { razao_social: string; cnpj: string } }[];
    },
    enabled: !!userId,
  });
}

export function useLinkUserByEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, clienteId }: { email: string; clienteId: string }) => {
      const { data: users, error: lookupError } = await supabase
        .rpc('find_user_by_email', { _email: email });

      if (lookupError) throw lookupError;
      if (!users || users.length === 0) {
        throw new Error('Nenhum usuário encontrado com este e-mail.');
      }

      const userId = users[0].user_id;

      const { data: existing } = await supabase
        .from('user_clientes')
        .select('id')
        .eq('user_id', userId)
        .eq('cliente_id', clienteId)
        .maybeSingle();

      if (existing) {
        throw new Error('Este usuário já está vinculado a esta empresa.');
      }

      // Also ensure user has 'cliente' role
      const { data: roleExists } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'cliente')
        .maybeSingle();

      if (!roleExists) {
        // Create cliente role for this user
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'cliente', cliente_id: clienteId });
      }

      const { data, error } = await supabase
        .from('user_clientes')
        .insert({ user_id: userId, cliente_id: clienteId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['user_clientes', vars.clienteId] });
      toast.success('Usuário vinculado com sucesso!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUnlinkUserFromCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clienteId }: { id: string; clienteId: string }) => {
      const { error } = await supabase
        .from('user_clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['user_clientes', vars.clienteId] });
      toast.success('Vínculo removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover vínculo: ' + error.message);
    },
  });
}

export function useApproveUserCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clienteId }: { id: string; clienteId: string }) => {
      const { error } = await supabase
        .from('user_clientes')
        .update({ aprovado: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['user_clientes', vars.clienteId] });
      toast.success('Usuário aprovado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao aprovar usuário: ' + error.message);
    },
  });
}
