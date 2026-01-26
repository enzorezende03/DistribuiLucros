import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TipoAlerta = 'ALERTA_50K' | 'PENDENTE_MES';

export interface Alerta {
  id: string;
  cliente_id: string;
  socio_id: string | null;
  competencia: string;
  tipo: TipoAlerta;
  descricao: string;
  resolvido: boolean;
  created_at: string;
  cliente?: {
    razao_social: string;
  };
  socio?: {
    nome: string;
  };
}

export function useAlertas(clienteId?: string | null, tipo?: TipoAlerta, resolvido?: boolean) {
  return useQuery({
    queryKey: ['alertas', clienteId, tipo, resolvido],
    queryFn: async () => {
      let query = supabase
        .from('alertas')
        .select(`
          *,
          cliente:clientes(razao_social),
          socio:socios(nome)
        `)
        .order('created_at', { ascending: false });

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      if (tipo) {
        query = query.eq('tipo', tipo);
      }

      if (resolvido !== undefined) {
        query = query.eq('resolvido', resolvido);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Alerta[];
    },
  });
}

export function useResolverAlerta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('alertas')
        .update({ resolvido: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Alerta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      toast.success('Alerta resolvido!');
    },
    onError: (error) => {
      toast.error('Erro ao resolver alerta: ' + error.message);
    },
  });
}
