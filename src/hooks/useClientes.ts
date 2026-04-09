import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StatusCliente = 'ativo' | 'suspenso';
export type TagCliente = '2M_SAUDE' | '2M_CONTABILIDADE';

export interface Cliente {
  id: string;
  razao_social: string;
  cnpj: string;
  email_responsavel: string;
  email_copia: string | null;
  telefone: string | null;
  status: StatusCliente;
  tag: TagCliente;
  ata_registrada: boolean;
  saldo_lucros_acumulados: number;
  created_at: string;
  updated_at: string;
}

export interface CreateClienteData {
  razao_social: string;
  cnpj: string;
  email_responsavel?: string;
  email_copia?: string;
  telefone?: string;
  status?: StatusCliente;
  tag?: TagCliente;
  socios?: { nome: string; cpf: string; percentual?: number }[];
}

export function useClientes(options?: { enabled?: boolean }) {
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
    enabled: options?.enabled !== false,
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
    mutationFn: async ({ socios, ...cliente }: CreateClienteData) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert(cliente)
        .select()
        .single();

      if (error) throw error;

      // Create sócios if provided
      if (socios && socios.length > 0) {
        const sociosData = socios.map((s) => ({
          cliente_id: data.id,
          nome: s.nome,
          cpf: s.cpf,
          percentual: s.percentual ?? null,
        }));

        const { error: sociosError } = await supabase
          .from('socios')
          .insert(sociosData);

        if (sociosError) throw sociosError;
      }

      return data as Cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['socios'] });
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
