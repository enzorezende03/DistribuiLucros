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
  cliente_origem_id?: string | null;
  cliente_destino_id?: string | null;
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

      // Separate the "Saldo inicial" entry (pinned at top, no date) from the rest.
      // Transfers between companies are real movements, never "saldo inicial".
      const isSaldoInicial = (m: MovimentacaoLucro) =>
        !m.distribuicao_id &&
        m.tipo === 'ENTRADA' &&
        !m.cliente_origem_id &&
        !m.cliente_destino_id;
      const initials = filtered.filter(isSaldoInicial);
      const movements = filtered.filter((m) => !isSaldoInicial(m));


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


      // Display: "Saldo inicial" pinned at top, then movements chronologically
      const result: MovimentacaoLucro[] = [];
      if (saldoInicial) {
        result.push({
          ...saldoInicial,
          saldo_anterior: 0,
          saldo_posterior: valorInicial,
        });
      }
      result.push(...recomputed);
      return result;
    },
    enabled: !!clienteId,
    staleTime: 0,
    refetchOnMount: 'always',
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

export function useTransferirSaldoLucros() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      origem_id: string;
      destino_id: string;
      valor: number;
      observacao?: string;
    }) => {
      const { origem_id, destino_id, valor, observacao } = params;
      if (origem_id === destino_id) throw new Error('Selecione uma empresa de destino diferente.');
      if (!(valor > 0)) throw new Error('Informe um valor maior que zero.');

      const { data: empresas, error: empresasError } = await supabase
        .from('clientes')
        .select('id, razao_social, saldo_lucros_acumulados')
        .in('id', [origem_id, destino_id]);

      if (empresasError) throw empresasError;

      const origem = empresas?.find((c) => c.id === origem_id);
      const destino = empresas?.find((c) => c.id === destino_id);
      if (!origem || !destino) throw new Error('Empresa não encontrada.');

      const saldoOrigem = Number(origem.saldo_lucros_acumulados) || 0;
      const saldoDestino = Number(destino.saldo_lucros_acumulados) || 0;
      if (valor > saldoOrigem) throw new Error('Valor maior que o saldo disponível.');

      const sufixo = observacao?.trim() ? ` — ${observacao.trim()}` : '';

      const { error: movError } = await supabase.from('movimentacoes_lucros').insert([
        {
          cliente_id: origem_id,
          tipo: 'SAIDA',
          valor,
          saldo_anterior: saldoOrigem,
          saldo_posterior: saldoOrigem - valor,
          descricao: `Transferência de saldo para ${destino.razao_social}${sufixo}`,
          cliente_destino_id: destino_id,
        },
        {
          cliente_id: destino_id,
          tipo: 'ENTRADA',
          valor,
          saldo_anterior: saldoDestino,
          saldo_posterior: saldoDestino + valor,
          descricao: `Transferência de saldo recebida de ${origem.razao_social}${sufixo}`,
          cliente_origem_id: origem_id,
        },
      ]);

      if (movError) throw movError;

      const { error: updOrigem } = await supabase
        .from('clientes')
        .update({ saldo_lucros_acumulados: saldoOrigem - valor })
        .eq('id', origem_id);
      if (updOrigem) throw updOrigem;

      const { error: updDestino } = await supabase
        .from('clientes')
        .update({ saldo_lucros_acumulados: saldoDestino + valor })
        .eq('id', destino_id);
      if (updDestino) throw updDestino;

      return { destino: destino.razao_social, valor };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes_lucros'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente'] });
      toast.success(`Saldo transferido para ${res.destino}!`);
    },
    onError: (error) => {
      toast.error('Erro ao transferir saldo: ' + error.message);
    },
  });
}

