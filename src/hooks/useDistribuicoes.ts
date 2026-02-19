import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StatusDistribuicao = 'ENVIADA_AO_CONTADOR' | 'RECEBIDA' | 'EM_VALIDACAO' | 'APROVADA' | 'AJUSTE_SOLICITADO' | 'CANCELADA';

export interface DistribuicaoItem {
  id: string;
  distribuicao_id: string;
  socio_id: string;
  valor: number;
  created_at: string;
  socio?: {
    nome: string;
    cpf: string;
  };
}

export interface Distribuicao {
  id: string;
  cliente_id: string;
  competencia: string;
  data_distribuicao: string;
  valor_total: number;
  forma_pagamento: string;
  solicitante_nome: string;
  solicitante_email: string;
  status: StatusDistribuicao;
  recibo_numero: string | null;
  recibo_pdf_url: string | null;
  created_at: string;
  updated_at: string;
  cliente?: {
    razao_social: string;
    cnpj: string;
  };
  itens?: DistribuicaoItem[];
}

export interface CreateDistribuicaoData {
  cliente_id: string;
  competencia: string;
  data_distribuicao: string;
  valor_total: number;
  forma_pagamento: string;
  solicitante_nome: string;
  solicitante_email: string;
  itens: { socio_id: string; valor: number }[];
}

export function useDistribuicoes(clienteId?: string | null, competencia?: string) {
  return useQuery({
    queryKey: ['distribuicoes', clienteId, competencia],
    queryFn: async () => {
      let query = supabase
        .from('distribuicoes')
        .select(`
          *,
          cliente:clientes(razao_social, cnpj),
          itens:distribuicao_itens(id, socio_id, valor, socio:socios(nome, cpf))
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      if (competencia) {
        query = query.eq('competencia', competencia);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Distribuicao[];
    },
  });
}

export function useDistribuicao(id: string | null) {
  return useQuery({
    queryKey: ['distribuicao', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('distribuicoes')
        .select(`
          *,
          cliente:clientes(razao_social, cnpj),
          itens:distribuicao_itens(
            id, socio_id, valor,
            socio:socios(nome, cpf)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Distribuicao;
    },
    enabled: !!id,
  });
}

export function useCreateDistribuicao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itens, ...distribuicao }: CreateDistribuicaoData) => {
      // Gerar número do recibo
      const { data: reciboNumero, error: reciboError } = await supabase
        .rpc('gerar_numero_recibo');

      if (reciboError) throw reciboError;

      // Criar distribuição
      const { data, error } = await supabase
        .from('distribuicoes')
        .insert({
          ...distribuicao,
          recibo_numero: reciboNumero,
        })
        .select()
        .single();

      if (error) throw error;

      // Criar itens
      const itensComDistribuicao = itens.map((item) => ({
        ...item,
        distribuicao_id: data.id,
      }));

      const { error: itensError } = await supabase
        .from('distribuicao_itens')
        .insert(itensComDistribuicao);

      if (itensError) throw itensError;

      return data as Distribuicao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribuicoes'] });
      toast.success('Distribuição registrada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar distribuição: ' + error.message);
    },
  });
}

export function useDeleteDistribuicao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete itens first (foreign key)
      const { error: itensError } = await supabase
        .from('distribuicao_itens')
        .delete()
        .eq('distribuicao_id', id);

      if (itensError) throw itensError;

      const { error } = await supabase
        .from('distribuicoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribuicoes'] });
      toast.success('Distribuição excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir distribuição: ' + error.message);
    },
  });
}

export function useUpdateDistribuicaoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, observacao, userId }: { id: string; status: StatusDistribuicao; observacao?: string; userId: string }) => {
      // Get current status
      const { data: current, error: fetchError } = await supabase
        .from('distribuicoes')
        .select('status, cliente_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const statusAnterior = current.status as StatusDistribuicao;

      // Update status
      const { data, error } = await supabase
        .from('distribuicoes')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Insert history record
      await supabase.from('distribuicao_historico').insert({
        distribuicao_id: id,
        status_anterior: statusAnterior,
        status_novo: status,
        observacao: observacao || null,
        usuario_id: userId,
      });

      // Create notification for client
      const statusLabels: Record<string, string> = {
        ENVIADA_AO_CONTADOR: 'Enviada ao Contador',
        RECEBIDA: 'Recebida',
        EM_VALIDACAO: 'Em Validação',
        APROVADA: 'Aprovada',
        AJUSTE_SOLICITADO: 'Ajuste Solicitado',
        CANCELADA: 'Cancelada',
      };

      await supabase.from('notificacoes').insert({
        cliente_id: current.cliente_id,
        distribuicao_id: id,
        titulo: `Status atualizado: ${statusLabels[status] || status}`,
        mensagem: observacao
          ? `Sua distribuição teve o status alterado para "${statusLabels[status]}". Observação: ${observacao}`
          : `Sua distribuição teve o status alterado para "${statusLabels[status]}".`,
      });

      return data as Distribuicao;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['distribuicoes'] });
      queryClient.invalidateQueries({ queryKey: ['distribuicao', data.id] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });
}

export function useBatchUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status, userId }: { ids: string[]; status: StatusDistribuicao; userId: string }) => {
      for (const id of ids) {
        const { data: current } = await supabase
          .from('distribuicoes')
          .select('status, cliente_id')
          .eq('id', id)
          .single();

        if (!current) continue;

        await supabase
          .from('distribuicoes')
          .update({ status })
          .eq('id', id);

        await supabase.from('distribuicao_historico').insert({
          distribuicao_id: id,
          status_anterior: current.status,
          status_novo: status,
          observacao: 'Aprovação em lote',
          usuario_id: userId,
        });

        await supabase.from('notificacoes').insert({
          cliente_id: current.cliente_id,
          distribuicao_id: id,
          titulo: 'Status atualizado: Recebida',
          mensagem: 'Sua distribuição foi recebida pelo contador.',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribuicoes'] });
      toast.success('Distribuições atualizadas com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar distribuições: ' + error.message);
    },
  });
}

export function useNotificacoes(clienteId?: string | null) {
  return useQuery({
    queryKey: ['notificacoes', clienteId],
    queryFn: async () => {
      let query = supabase
        .from('notificacoes')
        .select('*')
        .eq('lida', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });
}

export function useMarkNotificacaoLida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}

export function useMarkAllNotificacoesLidas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clienteId: string) => {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('cliente_id', clienteId)
        .eq('lida', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}
