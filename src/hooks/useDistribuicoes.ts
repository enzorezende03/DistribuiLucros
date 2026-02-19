import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StatusDistribuicao = 'RECEBIDA' | 'EM_VALIDACAO' | 'APROVADA' | 'AJUSTE_SOLICITADO' | 'CANCELADA';

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
          cliente:clientes(razao_social, cnpj)
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

export function useUpdateDistribuicaoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusDistribuicao }) => {
      const { data, error } = await supabase
        .from('distribuicoes')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
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
