import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StatusTarefa = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA';

export interface TarefaIR {
  id: string;
  alerta_id: string;
  cliente_id: string;
  socio_id: string | null;
  competencia: string;
  descricao: string;
  status: StatusTarefa;
  observacao: string | null;
  created_at: string;
  concluida_em: string | null;
  cliente?: { razao_social: string };
  socio?: { nome: string };
}

export function useTarefasIR(status?: StatusTarefa) {
  return useQuery({
    queryKey: ['tarefas_ir', status],
    queryFn: async () => {
      let query = supabase
        .from('tarefas_ir')
        .select(`
          *,
          cliente:clientes(razao_social),
          socio:socios(nome)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TarefaIR[];
    },
  });
}

export function useAtualizarTarefaIR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, observacao }: {
      id: string;
      status: StatusTarefa;
      observacao?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      if (observacao !== undefined) updateData.observacao = observacao;
      if (status === 'CONCLUIDA') updateData.concluida_em = new Date().toISOString();

      const { data, error } = await supabase
        .from('tarefas_ir')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas_ir'] });
      toast.success('Tarefa atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar tarefa: ' + error.message);
    },
  });
}

export function useCriarTarefaIR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      alerta_id: string;
      cliente_id: string;
      socio_id: string | null;
      competencia: string;
      descricao: string;
    }) => {
      const { data: result, error } = await supabase
        .from('tarefas_ir')
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas_ir'] });
    },
    onError: (error) => {
      toast.error('Erro ao criar tarefa: ' + error.message);
    },
  });
}
