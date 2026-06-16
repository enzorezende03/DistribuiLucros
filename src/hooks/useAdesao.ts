import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdesaoCliente {
  cliente_id: string;
  razao_social: string;
  cnpj: string;
  tag: '2M_SAUDE' | '2M_CONTABILIDADE';
  status: 'ativo' | 'suspenso' | 'arquivado';
  telefone: string | null;
  total_usuarios: number;
  usuarios_aprovados: number;
  usuarios_pendentes: number;
  ultimo_acesso: string | null;
  tem_distribuicao_mes_atual: boolean;
  tem_naohouve_mes_atual: boolean;
  tem_distribuicao_mes_anterior: boolean;
  tem_naohouve_mes_anterior: boolean;
  meses_preenchidos_6m: number;
}

export function useAdesao(enabled: boolean) {
  return useQuery({
    queryKey: ['adesao_clientes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_adesao_clientes' as any);
      if (error) throw error;
      return (data || []) as unknown as AdesaoCliente[];
    },
    enabled,
    staleTime: 60_000,
  });
}
