import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TipoAlerta = 'ALERTA_50K' | 'PENDENTE_MES';
export type ResolucaoTipo = 'GERAR_GUIA_IR' | 'DISPENSADO';

export interface Alerta {
  id: string;
  cliente_id: string;
  socio_id: string | null;
  competencia: string;
  tipo: TipoAlerta;
  descricao: string;
  resolvido: boolean;
  created_at: string;
  resolucao_tipo: ResolucaoTipo | null;
  resolucao_justificativa: string | null;
  resolucao_data: string | null;
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
        .order('created_at', { ascending: false })
        .limit(50);

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
    mutationFn: async ({ id, resolucao_tipo, resolucao_justificativa }: {
      id: string;
      resolucao_tipo: ResolucaoTipo;
      resolucao_justificativa?: string;
    }) => {
      const { data, error } = await supabase
        .from('alertas')
        .update({
          resolvido: true,
          resolucao_tipo,
          resolucao_justificativa: resolucao_justificativa || null,
          resolucao_data: new Date().toISOString(),
        } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Alerta;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      
      if (variables.resolucao_tipo === 'GERAR_GUIA_IR' && data) {
        // Create a task in tarefas_ir
        const alertaData = data as any;
        await supabase.from('tarefas_ir').insert({
          alerta_id: alertaData.id,
          cliente_id: alertaData.cliente_id,
          socio_id: alertaData.socio_id || null,
          competencia: alertaData.competencia,
          descricao: alertaData.descricao || '',
        } as any);
        queryClient.invalidateQueries({ queryKey: ['tarefas_ir'] });
        toast.success('Tarefa de Guia IR criada! Acesse Tarefas IR para gerenciar.');
      } else {
        toast.success('Alerta dispensado com sucesso!');
      }
    },
    onError: (error) => {
      toast.error('Erro ao resolver alerta: ' + error.message);
    },
  });
}
