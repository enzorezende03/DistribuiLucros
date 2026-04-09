import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MovimentacaoLucro {
  id: string;
  cliente_id: string;
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
  saldo_anterior: number;
  saldo_posterior: number;
  descricao: string;
  distribuicao_id: string | null;
  competencia: string | null;
  created_at: string;
  distribuicao?: {
    status: string;
  } | null;
}

export function useMovimentacoesLucros(clienteId: string | null) {
  return useQuery({
    queryKey: ['movimentacoes_lucros', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('movimentacoes_lucros')
        .select('*, distribuicao:distribuicoes(status)')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data as MovimentacaoLucro[]).filter(
        (mov) => !mov.distribuicao || mov.distribuicao.status !== 'CANCELADA'
      );
    },
    enabled: !!clienteId,
  });
}

export function useCreateMovimentacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      cliente_id: string;
      tipo: 'ENTRADA' | 'SAIDA';
      valor: number;
      descricao: string;
      competencia?: string;
    }) => {
      // Get current balance
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('saldo_lucros_acumulados')
        .eq('id', data.cliente_id)
        .single();

      if (clienteError) throw clienteError;

      const saldoAnterior = Number(cliente.saldo_lucros_acumulados);
      const saldoNovo = data.tipo === 'ENTRADA'
        ? saldoAnterior + data.valor
        : Math.max(saldoAnterior - data.valor, 0);

      // Insert movement
      const { error: movError } = await supabase
        .from('movimentacoes_lucros')
        .insert({
          cliente_id: data.cliente_id,
          tipo: data.tipo,
          valor: data.valor,
          saldo_anterior: saldoAnterior,
          saldo_posterior: saldoNovo,
          descricao: data.descricao,
          competencia: data.competencia || null,
        });

      if (movError) throw movError;

      // Update client balance
      const { error: updateError } = await supabase
        .from('clientes')
        .update({ saldo_lucros_acumulados: saldoNovo })
        .eq('id', data.cliente_id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes_lucros'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente'] });
      toast.success('Movimentação registrada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar movimentação: ' + error.message);
    },
  });
}
