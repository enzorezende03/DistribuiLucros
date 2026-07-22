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
    data_distribuicao: string | null;
  } | null;
}

export function useMovimentacoesLucros(clienteId: string | null) {
  return useQuery({
    queryKey: ['movimentacoes_lucros', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('movimentacoes_lucros')
        .select('*, distribuicao:distribuicoes(status, data_distribuicao)')
        .eq('cliente_id', clienteId);

      if (error) throw error;
      const filtered = (data as MovimentacaoLucro[]).filter(
        (mov) => !mov.distribuicao || mov.distribuicao.status !== 'CANCELADA'
      );

      // Sort chronologically by effective date (data_distribuicao when available, else created_at)
      const getDate = (m: MovimentacaoLucro) =>
        m.distribuicao?.data_distribuicao || m.created_at;
      const sorted = [...filtered].sort((a, b) => {
        const da = getDate(a);
        const db = getDate(b);
        if (da === db) return a.created_at.localeCompare(b.created_at);
        return da.localeCompare(db);
      });

      // Recompute running balance in chronological order so the last row
      // matches the client's current accumulated balance.
      let saldo = 0;
      const recomputed = sorted.map((m) => {
        const saldoAnterior = saldo;
        const delta = m.tipo === 'ENTRADA' ? Number(m.valor) : -Number(m.valor);
        saldo = Math.max(saldoAnterior + delta, 0);
        return { ...m, saldo_anterior: saldoAnterior, saldo_posterior: saldo };
      });

      // Display most recent first
      return recomputed.reverse();
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
