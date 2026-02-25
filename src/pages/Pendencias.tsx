import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, FileText } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Pendencia {
  id: string;
  observacao: string | null;
  created_at: string;
  distribuicao_id: string;
  distribuicao?: {
    competencia: string;
    valor_total: number;
    recibo_numero: string | null;
    cliente?: {
      razao_social: string;
    };
  };
}

function usePendencias(clienteId?: string | null) {
  return useQuery({
    queryKey: ['pendencias', clienteId],
    queryFn: async () => {
      let distQuery = supabase
        .from('distribuicoes')
        .select('id, competencia, valor_total, recibo_numero, cliente:clientes(razao_social)');

      if (clienteId) {
        distQuery = distQuery.eq('cliente_id', clienteId);
      }

      const { data: dists } = await distQuery;
      if (!dists || dists.length === 0) return [] as Pendencia[];

      const distIds = dists.map((d: any) => d.id);
      const distMap = new Map(dists.map((d: any) => [d.id, d]));

      const { data, error } = await supabase
        .from('distribuicao_historico')
        .select('id, observacao, created_at, distribuicao_id, lida')
        .eq('status_novo', 'AJUSTE_SOLICITADO')
        .eq('lida', false)
        .in('distribuicao_id', distIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map((h: any) => ({
        ...h,
        distribuicao: distMap.get(h.distribuicao_id) || null,
      })).filter((d: any) => d.distribuicao) as Pendencia[];
    },
    enabled: !!clienteId,
  });
}

export default function PendenciasPage() {
  const { clienteId } = useAuth();
  const { t } = useLanguage();
  const { data: pendencias, isLoading } = usePendencias(clienteId);
  const navigate = useNavigate();

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('pending.title')}</h1>
          <p className="text-muted-foreground">{t('pending.subtitle')}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !pendencias || pendencias.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">{t('pending.noPending')}</p>
              <p className="text-sm">{t('pending.noAdjustments')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendencias.map((p) => (
              <Card
                key={p.id}
                className="transition-all hover:shadow-md border-yellow-500/30 bg-yellow-500/5"
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="mt-1 rounded-full bg-yellow-500/10 p-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{t('pending.adjustRequested')}</p>
                      {p.distribuicao?.recibo_numero && (
                        <Badge variant="outline" className="text-xs">{p.distribuicao.recibo_numero}</Badge>
                      )}
                      {p.distribuicao?.competencia && (
                        <Badge variant="secondary" className="text-xs">{p.distribuicao.competencia}</Badge>
                      )}
                    </div>
                    {p.observacao && (
                      <p className="text-sm text-muted-foreground mt-2 bg-muted/50 rounded px-3 py-2 italic">{p.observacao}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{formatDate(p.created_at)}</p>
                  </div>
                  <div className="shrink-0">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate('/distribuicoes')}>
                      <FileText className="h-3 w-3" />
                      {t('pending.view')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
