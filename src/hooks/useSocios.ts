import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Socio {
  id: string;
  cliente_id: string;
  nome: string;
  cpf: string;
  percentual: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSocioData {
  cliente_id: string;
  nome: string;
  cpf: string;
  percentual?: number;
  ativo?: boolean;
}

export function useSocios(clienteId?: string | null) {
  return useQuery({
    queryKey: ['socios', clienteId],
    queryFn: async () => {
      let query = supabase
        .from('socios')
        .select('*')
        .order('nome');

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Socio[];
    },
    enabled: clienteId !== undefined,
  });
}

export function useSocio(id: string | null) {
  return useQuery({
    queryKey: ['socio', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('socios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Socio;
    },
    enabled: !!id,
  });
}

export function useCreateSocio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (socio: CreateSocioData) => {
      const { data, error } = await supabase
        .from('socios')
        .insert(socio)
        .select()
        .single();

      if (error) throw error;
      return data as Socio;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['socios'] });
      queryClient.invalidateQueries({ queryKey: ['socios', data.cliente_id] });
      toast.success('Sócio criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar sócio: ' + error.message);
    },
  });
}

export function useUpdateSocio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...socio }: { id: string } & Partial<CreateSocioData>) => {
      const { data, error } = await supabase
        .from('socios')
        .update(socio)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Socio;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['socios'] });
      queryClient.invalidateQueries({ queryKey: ['socios', data.cliente_id] });
      queryClient.invalidateQueries({ queryKey: ['socio', data.id] });
      toast.success('Sócio atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar sócio: ' + error.message);
    },
  });
}

export function useDeleteSocio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('socios')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socios'] });
      toast.success('Sócio removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover sócio: ' + error.message);
    },
  });
}
