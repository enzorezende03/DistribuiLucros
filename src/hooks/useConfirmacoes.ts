import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type RespostaConfirmacao = 'NAO_HOUVE' | 'HOUVE';

export interface Confirmacao {
  id: string;
  cliente_id: string;
  competencia: string;
  resposta: RespostaConfirmacao;
  observacao: string | null;
  created_at: string;
}

export interface CreateConfirmacaoData {
  cliente_id: string;
  competencia: string;
  resposta: RespostaConfirmacao;
  observacao?: string;
}

export function useConfirmacoes(clienteId?: string | null) {
  return useQuery({
    queryKey: ['confirmacoes', clienteId],
    queryFn: async () => {
      let query = supabase
        .from('confirmacoes_mes')
        .select('*')
        .order('competencia', { ascending: false });

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Confirmacao[];
    },
  });
}

export function useCreateConfirmacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (confirmacao: CreateConfirmacaoData) => {
      const { data, error } = await supabase
        .from('confirmacoes_mes')
        .insert(confirmacao)
        .select()
        .single();

      if (error) throw error;
      return data as Confirmacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confirmacoes'] });
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      toast.success('Confirmação registrada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar confirmação: ' + error.message);
    },
  });
}
