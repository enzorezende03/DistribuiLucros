import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StatusCliente = 'ativo' | 'suspenso';

export interface Cliente {
  id: string;
  razao_social: string;
  cnpj: string;
  email_responsavel: string;
  email_copia: string | null;
  telefone: string | null;
  status: StatusCliente;
  created_at: string;
  updated_at: string;
}

export interface CreateClienteData {
  razao_social: string;
  cnpj: string;
  email_responsavel: string;
  email_copia?: string;
  telefone?: string;
  status?: StatusCliente;
}

export function useClientes() {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('razao_social');

      if (error) throw error;
      return data as Cliente[];
    },
  });
}

export function useCliente(id: string | null) {
  return useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Cliente;
    },
    enabled: !!id,
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cliente: CreateClienteData) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert(cliente)
        .select()
        .single();

      if (error) throw error;
      return data as Cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar cliente: ' + error.message);
    },
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...cliente }: { id: string } & Partial<CreateClienteData>) => {
      const { data, error } = await supabase
        .from('clientes')
        .update(cliente)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Cliente;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente', data.id] });
      toast.success('Cliente atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar cliente: ' + error.message);
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover cliente: ' + error.message);
    },
  });
}
