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

      // Separate the "Saldo inicial" entry (pinned at top, no date) from the rest
      const initials = filtered.filter(
        (m) => !m.distribuicao_id && m.tipo === 'ENTRADA'
      );
      const movements = filtered.filter(
        (m) => !(!m.distribuicao_id && m.tipo === 'ENTRADA')
      );

      // Keep only the most recent "Saldo inicial" as the current one
      const saldoInicial = initials.sort((a, b) =>
        b.created_at.localeCompare(a.created_at)
      )[0];
      const valorInicial = saldoInicial ? Number(saldoInicial.valor) : 0;

      // Sort movements chronologically by effective date (distribution date or created_at)
      const getDate = (m: MovimentacaoLucro) =>
        m.distribuicao?.data_distribuicao || m.created_at;
      const chronological = [...movements].sort((a, b) => {
        const da = getDate(a);
        const db = getDate(b);
        if (da === db) return a.created_at.localeCompare(b.created_at);
        return da.localeCompare(db);
      });

      // Running balance starts from initial balance and is abated by each movement
      let saldo = valorInicial;
      const recomputed = chronological.map((m) => {
        const saldoAnterior = saldo;
        const delta = m.tipo === 'ENTRADA' ? Number(m.valor) : -Number(m.valor);
        saldo = saldoAnterior + delta;
        return { ...m, saldo_anterior: saldoAnterior, saldo_posterior: saldo };
      });


      // Display: "Saldo inicial" pinned at top, then movements newest first
      const result: MovimentacaoLucro[] = [];
      if (saldoInicial) {
        result.push({
          ...saldoInicial,
          saldo_anterior: 0,
          saldo_posterior: valorInicial,
        });
      }
      result.push(...recomputed.reverse());
      return result;
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
