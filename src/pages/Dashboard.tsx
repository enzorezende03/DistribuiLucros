import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDistribuicoes } from '@/hooks/useDistribuicoes';
import { useNotificacoes, useMarkNotificacaoLida, useMarkAllNotificacoesLidas } from '@/hooks/useDistribuicoes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAlertas } from '@/hooks/useAlertas';
import { useCliente } from '@/hooks/useClientes';
import { useConfirmacoes, useCreateConfirmacao } from '@/hooks/useConfirmacoes';
import { formatCurrency, breakableCurrency, formatCompetencia, getCompetenciaAnterior, formatDate } from '@/lib/format';
import { Link, useNavigate } from 'react-router-dom';
import { AlertaDescricao } from '@/components/AlertaDescricao';
import {
  PlusCircle,
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Calendar,
  XCircle,
  Loader2,
  Bell,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function DashboardPage() {
  const { isAdmin, clienteId } = useAuth();
  const { t } = useLanguage();
  
  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="page-header">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
            <p className="text-muted-foreground">
              {isAdmin ? t('dashboard.adminSubtitle') : t('dashboard.clientSubtitle')}
            </p>
          </div>
          
          {!isAdmin && (
            <div className="flex gap-2">
              <Link to="/distribuicoes/nova">
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  {t('dashboard.registerDistribution')}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {isAdmin ? (
          <AdminDashboard />
        ) : (
          <ClienteDashboard clienteId={clienteId} />
        )}
      </div>
    </SidebarLayout>
  );
}

function ClienteDashboard({ clienteId }: { clienteId: string | null }) {
  const { t } = useLanguage();
  const { data: cliente } = useCliente(clienteId);
  const { data: distribuicoes, isLoading: loadingDist } = useDistribuicoes(clienteId);
  const { data: alertas, isLoading: loadingAlertas } = useAlertas(clienteId, undefined, false);
  const { data: confirmacoes } = useConfirmacoes(clienteId);
  const { data: notificacoes } = useNotificacoes(clienteId);
  const markLida = useMarkNotificacaoLida();
  const markAllLidas = useMarkAllNotificacoesLidas();
  const createConfirmacao = useCreateConfirmacao();

  const [totalMesDialogOpen, setTotalMesDialogOpen] = useState(false);
  const navigate = useNavigate();
  const [totalAnoDialogOpen, setTotalAnoDialogOpen] = useState(false);
  const competenciaAnterior = getCompetenciaAnterior();
  const hasConfirmacao = confirmacoes?.some(c => c.competencia === competenciaAnterior);
  const hasDistribuicao = distribuicoes?.some(d => d.competencia === competenciaAnterior);
  const mesResolvido = hasConfirmacao || hasDistribuicao;

  const totalAno = distribuicoes?.reduce((sum, d) => sum + Number(d.valor_total), 0) || 0;
  const totalMes = distribuicoes?.filter(d => d.competencia === competenciaAnterior)
    .reduce((sum, d) => sum + Number(d.valor_total), 0) || 0;

  const handleNaoHouve = async () => {
    if (!clienteId) return;
    await createConfirmacao.mutateAsync({
      cliente_id: clienteId,
      competencia: competenciaAnterior,
      resposta: 'NAO_HOUVE',
    });
  };

  return (
    <>
      {!mesResolvido && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold">{t('dashboard.actionRequired')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.informDistribution')} {formatCompetencia(competenciaAnterior)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Link to="/distribuicoes/nova" className="flex-1 sm:flex-none">
                <Button className="w-full gap-2">
                  <PlusCircle className="h-4 w-4" />
                  {t('dashboard.happened')}
                </Button>
              </Link>
              <Button
                variant="outline"
                className="flex-1 sm:flex-none gap-2"
                onClick={handleNaoHouve}
                disabled={createConfirmacao.isPending}
              >
                {createConfirmacao.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {t('dashboard.didNotHappen')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="dashboard-grid">
        <Card className="stat-card">
          <div className="stat-card-accent bg-primary" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.company')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold break-words">{cliente?.razao_social || '-'}</p>
          </CardContent>
        </Card>

        <Card className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTotalAnoDialogOpen(true)}>
          <div className="stat-card-accent bg-accent" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.totalYear')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="money-value-lg">{breakableCurrency(totalAno)}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.clickDetails')}</p>
          </CardContent>
        </Card>

        <Card className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTotalMesDialogOpen(true)}>
          <div className="stat-card-accent bg-info" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.totalMonth')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="money-value-lg">{breakableCurrency(totalMes)}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.clickDetails')}</p>
          </CardContent>
        </Card>

        <Card className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/alertas')}>
          <div className="stat-card-accent bg-warning" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('alerts.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{alertas?.length || 0}</p>
            {(alertas?.length || 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{t('dashboard.clickDetails')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={totalMesDialogOpen} onOpenChange={setTotalMesDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-info" />
              {t('dashboard.monthDetails')} — {formatCompetencia(competenciaAnterior)}
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const distMes = distribuicoes?.filter(d => d.competencia === competenciaAnterior) || [];
            const socioMap = new Map<string, { nome: string; total: number }>();
            for (const dist of distMes) {
              for (const item of dist.itens || []) {
                const nome = item.socio?.nome || t('dashboard.unknown');
                const existing = socioMap.get(item.socio_id) || { nome, total: 0 };
                existing.total += Number(item.valor);
                socioMap.set(item.socio_id, existing);
              }
            }
            const socioList = Array.from(socioMap.values()).sort((a, b) => b.total - a.total);

            return socioList.length > 0 ? (
              <div className="space-y-3">
                {socioList.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="font-medium">{s.nome}</span>
                    <span className="font-semibold money-value">{formatCurrency(s.total)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="font-bold">{t('dashboard.total')}</span>
                  <span className="font-bold money-value">{formatCurrency(totalMes)}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    setTotalMesDialogOpen(false);
                    navigate(`/distribuicoes?competencia=${competenciaAnterior}`);
                  }}
                >
                  <FileText className="h-4 w-4" />
                  {t('dashboard.viewMoreDetails')}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">{t('dashboard.noDistributionMonth')}</p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={totalAnoDialogOpen} onOpenChange={setTotalAnoDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              {t('dashboard.yearDetails')} — {new Date().getFullYear()}
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const anoAtual = String(new Date().getFullYear());
            const distAno = distribuicoes?.filter(d => d.competencia.startsWith(anoAtual)) || [];
            
            const socioMap = new Map<string, { nome: string; meses: Map<string, number>; total: number }>();
            const allMonths = new Set<string>();

            for (const dist of distAno) {
              allMonths.add(dist.competencia);
              for (const item of dist.itens || []) {
                const nome = item.socio?.nome || t('dashboard.unknown');
                if (!socioMap.has(item.socio_id)) {
                  socioMap.set(item.socio_id, { nome, meses: new Map(), total: 0 });
                }
                const s = socioMap.get(item.socio_id)!;
                s.meses.set(dist.competencia, (s.meses.get(dist.competencia) || 0) + Number(item.valor));
                s.total += Number(item.valor);
              }
            }

            const sortedMonths = Array.from(allMonths).sort();
            const socioList = Array.from(socioMap.values()).sort((a, b) => b.total - a.total);

            return socioList.length > 0 ? (
              <div className="space-y-4">
                {socioList.map((s, i) => (
                  <div key={i} className="rounded-lg border overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-muted/30">
                      <span className="font-semibold">{s.nome}</span>
                      <span className="font-bold money-value">{formatCurrency(s.total)}</span>
                    </div>
                    <div className="divide-y">
                      {sortedMonths.map((month) => {
                        const val = s.meses.get(month);
                        if (!val) return null;
                        return (
                          <div key={month} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span className="text-muted-foreground">{formatCompetencia(month)}</span>
                            <span className="font-medium money-value">{formatCurrency(val)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="font-bold">{t('dashboard.totalYearLabel')}</span>
                  <span className="font-bold money-value">{formatCurrency(totalAno)}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    setTotalAnoDialogOpen(false);
                    navigate(`/distribuicoes?competencia=${anoAtual}`);
                  }}
                >
                  <FileText className="h-4 w-4" />
                  {t('dashboard.viewMoreDetails')}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">{t('dashboard.noDistributionYear')}</p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <NotificacoesPendenciasSection
        clienteId={clienteId}
        notificacoes={notificacoes}
        markLida={markLida}
        markAllLidas={markAllLidas}
      />

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {t('dashboard.activeAlerts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAlertas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : alertas && alertas.length > 0 ? (
              <div className="space-y-3">
                {alertas.slice(0, 5).map((alerta) => {
                  const totalMatch = alerta.descricao.match(/Total:\s*R\$\s*([\d.,]+)/);
                  const totalValor = totalMatch ? parseFloat(totalMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
                  const imposto = alerta.tipo === 'ALERTA_50K' && totalValor > 0 ? totalValor * 0.10 : 0;

                  return (
                    <div
                      key={alerta.id}
                      className={cn(
                        'p-4 rounded-lg border',
                        alerta.tipo === 'ALERTA_50K' ? 'alert-50k' : 'alert-pendente'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{alerta.socio?.nome || cliente?.razao_social}</p>
                          <AlertaDescricao descricao={alerta.descricao} tipo={alerta.tipo} />
                        </div>
                        <Badge variant={alerta.tipo === 'ALERTA_50K' ? 'destructive' : 'secondary'}>
                          {alerta.tipo === 'ALERTA_50K' ? t('alerts.value50k') : t('common.pending')}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state py-8">
                <CheckCircle2 className="h-12 w-12 text-accent mb-4" />
                <p className="text-muted-foreground">{t('dashboard.noAlerts')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              {t('dashboard.lastDistributions')}
            </CardTitle>
            <Link to="/distribuicoes">
              <Button variant="ghost" size="sm">
                {t('dashboard.viewAll2')}
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingDist ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : distribuicoes && distribuicoes.length > 0 ? (
              <div className="space-y-3">
                {distribuicoes.slice(0, 5).map((dist) => (
                  <div
                    key={dist.id}
                    className="flex items-center justify-between p-4 rounded-lg border table-row-interactive"
                  >
                    <div>
                      <p className="font-medium">{dist.itens?.map((item) => item.socio?.nome).filter(Boolean).join(', ') || '—'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCompetencia(dist.competencia)} • {dist.recibo_numero}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold money-value">
                        {formatCurrency(Number(dist.valor_total))}
                      </p>
                      <StatusBadge status={dist.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-8">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t('dashboard.noDistributionRegistered')}</p>
                <Link to="/distribuicoes/nova">
                  <Button variant="outline" className="mt-4 gap-2">
                    <PlusCircle className="h-4 w-4" />
                    {t('dashboard.registerFirst')}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function usePendenciasDashboard(clienteId?: string | null) {
  return useQuery({
    queryKey: ['pendencias-dashboard', clienteId],
    queryFn: async () => {
      let distQuery = supabase
        .from('distribuicoes')
        .select('id, competencia, valor_total, recibo_numero')
        .eq('status', 'AJUSTE_SOLICITADO');

      if (clienteId) {
        distQuery = distQuery.eq('cliente_id', clienteId);
      }

      const { data: dists } = await distQuery;
      if (!dists || dists.length === 0) return [];

      const distIds = dists.map((d: any) => d.id);
      const distMap = new Map(dists.map((d: any) => [d.id, d]));

      const { data } = await supabase
        .from('distribuicao_historico')
        .select('id, observacao, created_at, distribuicao_id, lida')
        .eq('status_novo', 'AJUSTE_SOLICITADO')
        .eq('lida', false)
        .in('distribuicao_id', distIds)
        .order('created_at', { ascending: false })
        .limit(5);

      return (data || []).map((h: any) => ({
        ...h,
        distribuicao: distMap.get(h.distribuicao_id) || null,
      })).filter((d: any) => d.distribuicao);
    },
    enabled: !!clienteId,
  });
}

function NotificacoesPendenciasSection({ clienteId, notificacoes, markLida, markAllLidas }: {
  clienteId: string | null;
  notificacoes: any[] | undefined;
  markLida: any;
  markAllLidas: any;
}) {
  const { t } = useLanguage();
  const { data: pendencias } = usePendenciasDashboard(clienteId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasNotificacoes = notificacoes && notificacoes.length > 0;
  const hasPendencias = pendencias && pendencias.length > 0;

  const markPendenciaLida = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('distribuicao_historico')
        .update({ lida: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendencias-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pendencias'] });
    },
  });

  const markAllPendenciasLidas = useMutation({
    mutationFn: async () => {
      if (!pendencias) return;
      const ids = pendencias.map((p: any) => p.id);
      const { error } = await supabase
        .from('distribuicao_historico')
        .update({ lida: true })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendencias-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pendencias'] });
    },
  });

  return (
    <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
      <Card className="border-info/50 bg-info/5">
        <CardHeader className="flex flex-row items-center justify-between pb-3 gap-2">
          <CardTitle className="text-base md:text-lg flex items-center gap-2 shrink-0">
            <Bell className="h-5 w-5 text-info" />
            <span className="hidden sm:inline">{t('dashboard.notifications')}</span>
            <span className="sm:hidden">{t('dashboard.notif')}</span>
            ({notificacoes?.length || 0})
          </CardTitle>
          {hasNotificacoes && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs shrink-0"
              onClick={() => clienteId && markAllLidas.mutate(clienteId)}
              disabled={markAllLidas.isPending}
            >
              <span className="hidden sm:inline">{t('dashboard.markAllRead')}</span>
              <span className="sm:hidden">{t('dashboard.markRead')}</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {hasNotificacoes ? (
            <div className="space-y-2">
              {notificacoes!.slice(0, 5).map((n) => (
                <div key={n.id} className="flex items-start justify-between p-3 rounded-lg border bg-background">
                  <div>
                    <p className="font-medium text-sm">{n.titulo}</p>
                    <p className="text-xs text-muted-foreground">{n.mensagem}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => markLida.mutate(n.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {notificacoes!.length > 5 && (
                <Button variant="link" size="sm" className="w-full" onClick={() => navigate('/notificacoes')}>
                  {t('dashboard.viewAll2')} ({notificacoes!.length})
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">{t('dashboard.noNotificationsPending')}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-warning/30 bg-warning/5">
        <CardHeader className="flex flex-row items-center justify-between pb-3 gap-2">
          <CardTitle className="text-base md:text-lg flex items-center gap-2 shrink-0">
            <AlertCircle className="h-5 w-5 text-warning" />
            <span className="hidden sm:inline">{t('dashboard.pendencias')}</span>
            <span className="sm:hidden">{t('dashboard.pend')}</span>
            ({pendencias?.length || 0})
          </CardTitle>
          {hasPendencias && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs shrink-0"
              onClick={() => markAllPendenciasLidas.mutate()}
              disabled={markAllPendenciasLidas.isPending}
            >
              <span className="hidden sm:inline">{t('dashboard.markAllRead')}</span>
              <span className="sm:hidden">{t('dashboard.markRead')}</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {hasPendencias ? (
            <div className="space-y-2">
              {pendencias!.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-start justify-between p-3 rounded-lg border bg-background">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{t('dashboard.adjustRequested')}</p>
                      {p.distribuicao?.competencia && (
                        <Badge variant="secondary" className="text-xs">{p.distribuicao.competencia}</Badge>
                      )}
                    </div>
                    {p.observacao && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{p.observacao}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => markPendenciaLida.mutate(p.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">{t('dashboard.noPendencias')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboard() {
  const { t } = useLanguage();
  const { data: distribuicoes, isLoading: loadingDist } = useDistribuicoes();
  const { data: alertas, isLoading: loadingAlertas } = useAlertas(undefined, undefined, false);

  const competenciaAtual = getCompetenciaAnterior();
  const distribuicoesMes = distribuicoes?.filter(d => d.competencia === competenciaAtual) || [];
  const totalMes = distribuicoesMes.reduce((sum, d) => sum + Number(d.valor_total), 0);

  const alertas50k = alertas?.filter(a => a.tipo === 'ALERTA_50K') || [];
  const alertasPendentes = alertas?.filter(a => a.tipo === 'PENDENTE_MES') || [];

  return (
    <>
      <div className="dashboard-grid">
        <Card className="stat-card">
          <div className="stat-card-accent bg-accent" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.totalDistributedMonth')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="money-value-lg">{formatCurrency(totalMes)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCompetencia(competenciaAtual)}
            </p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <div className="stat-card-accent bg-info" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.distributionsMonth')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{distribuicoesMes.length}</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <div className="stat-card-accent bg-destructive" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.alerts50k')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{alertas50k.length}</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <div className="stat-card-accent bg-warning" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.pendingClients')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{alertasPendentes.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {t('dashboard.activeAlerts')}
            </CardTitle>
            <Link to="/alertas">
              <Button variant="ghost" size="sm">
                {t('dashboard.viewAllAlerts')}
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingAlertas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : alertas && alertas.length > 0 ? (
              <div className="space-y-3">
                {alertas.slice(0, 5).map((alerta) => {
                  const totalMatch = alerta.descricao.match(/Total:\s*R\$\s*([\d.,]+)/);
                  const totalValor = totalMatch ? parseFloat(totalMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
                  const imposto = alerta.tipo === 'ALERTA_50K' && totalValor > 0 ? totalValor * 0.10 : 0;

                  return (
                    <div
                      key={alerta.id}
                      className={cn(
                        'p-4 rounded-lg border',
                        alerta.tipo === 'ALERTA_50K' ? 'alert-50k' : 'alert-pendente'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{alerta.cliente?.razao_social}</p>
                          {alerta.socio?.nome && (
                            <p className="text-sm text-muted-foreground">{alerta.socio.nome}</p>
                          )}
                          <AlertaDescricao descricao={alerta.descricao} tipo={alerta.tipo} />
                        </div>
                        <Badge variant={alerta.tipo === 'ALERTA_50K' ? 'destructive' : 'secondary'}>
                          {alerta.tipo === 'ALERTA_50K' ? t('alerts.value50k') : t('common.pending')}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state py-8">
                <CheckCircle2 className="h-12 w-12 text-accent mb-4" />
                <p className="text-muted-foreground">{t('dashboard.noAlerts')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              {t('dashboard.lastDistributions')}
            </CardTitle>
            <Link to="/distribuicoes">
              <Button variant="ghost" size="sm">
                {t('dashboard.viewAll2')}
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingDist ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : distribuicoes && distribuicoes.length > 0 ? (
              <div className="space-y-3">
                {distribuicoes.slice(0, 5).map((dist) => (
                  <div
                    key={dist.id}
                    className="flex items-center justify-between p-4 rounded-lg border table-row-interactive"
                  >
                    <div>
                      <p className="font-medium">{dist.cliente?.razao_social}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCompetencia(dist.competencia)} • {dist.recibo_numero}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold money-value">
                        {formatCurrency(Number(dist.valor_total))}
                      </p>
                      <StatusBadge status={dist.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-8">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t('dashboard.noDistributionRegistered')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const statusConfig: Record<string, { className: string }> = {
    ENVIADA_AO_CONTADOR: { className: 'status-recebida' },
    RECEBIDA: { className: 'status-recebida' },
    EM_VALIDACAO: { className: 'status-em-validacao' },
    APROVADA: { className: 'status-aprovada' },
    AJUSTE_SOLICITADO: { className: 'status-ajuste-solicitado' },
    CANCELADA: { className: 'status-cancelada' },
  };

  const config = statusConfig[status] || { className: '' };
  const label = t(`status.${status}`) || status;

  return (
    <Badge variant="outline" className={cn('text-xs', config.className)}>
      {label}
    </Badge>
  );
}
