import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { StatusDistribuicao } from './useDistribuicoes';

export type RespostaConfirmacao = 'NAO_HOUVE' | 'HOUVE';

export interface Confirmacao {
  id: string;
  cliente_id: string;
  competencia: string;
  resposta: RespostaConfirmacao;
  observacao: string | null;
  status: StatusDistribuicao;
  created_at: string;
  updated_at?: string;
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

      // Admin notification (only for NAO_HOUVE — accountant needs to review)
      if (confirmacao.resposta === 'NAO_HOUVE') {
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('razao_social')
          .eq('id', confirmacao.cliente_id)
          .single();
        const nomeEmpresa = clienteData?.razao_social || 'Empresa';

        await supabase.from('notificacoes').insert({
          cliente_id: confirmacao.cliente_id,
          titulo: `Não houve distribuição: ${nomeEmpresa}`,
          mensagem: `A empresa ${nomeEmpresa} declarou que não houve distribuição em ${confirmacao.competencia}.`,
          is_admin_notificacao: true,
        });
      }

      return data as Confirmacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confirmacoes'] });
      queryClient.invalidateQueries({ queryKey: ['confirmacoes-nao-houve'] });
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      toast.success('Confirmação registrada e enviada ao contador!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar confirmação: ' + error.message);
    },
  });
}

export function useUpdateConfirmacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, observacao }: { id: string; observacao?: string | null }) => {
      const { data, error } = await supabase
        .from('confirmacoes_mes')
        .update({ observacao: observacao ?? null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Confirmacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confirmacoes'] });
      queryClient.invalidateQueries({ queryKey: ['confirmacoes-nao-houve'] });
      toast.success('Observação atualizada!');
    },
    onError: (e) => toast.error('Erro ao atualizar: ' + e.message),
  });
}

export function useUpdateConfirmacaoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusDistribuicao }) => {
      const { data, error } = await supabase
        .from('confirmacoes_mes')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Notify client of status change
      const statusLabels: Record<string, string> = {
        ENVIADA_AO_CONTADOR: 'Enviada ao Contador',
        APROVADA: 'Aprovada',
        AJUSTE_SOLICITADO: 'Ajuste Solicitado',
        CANCELADA: 'Cancelada',
      };
      await supabase.from('notificacoes').insert({
        cliente_id: (data as any).cliente_id,
        titulo: `Não houve distribuição — status: ${statusLabels[status] || status}`,
        mensagem: `Sua declaração de "não houve distribuição" para ${(data as any).competencia} teve o status alterado para "${statusLabels[status] || status}".`,
      });

      return data as Confirmacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confirmacoes'] });
      queryClient.invalidateQueries({ queryKey: ['confirmacoes-nao-houve'] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      toast.success('Status atualizado!');
    },
    onError: (e) => toast.error('Erro ao atualizar status: ' + e.message),
  });
}

export function useDeleteConfirmacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('confirmacoes_mes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confirmacoes'] });
      queryClient.invalidateQueries({ queryKey: ['confirmacoes-nao-houve'] });
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      toast.success('Confirmação removida!');
    },
    onError: (e) => toast.error('Erro ao remover: ' + e.message),
  });
}

export interface ConfirmacaoComCliente extends Confirmacao {
  cliente: { id: string; razao_social: string; cnpj: string } | null;
}

export function useConfirmacoesNaoHouve() {
  return useQuery({
    queryKey: ['confirmacoes-nao-houve'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('confirmacoes_mes')
        .select('*, cliente:clientes(id, razao_social, cnpj)')
        .eq('resposta', 'NAO_HOUVE')
        .order('competencia', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ConfirmacaoComCliente[];
    },
  });
}
