import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useDistribuicoes } from '@/hooks/useDistribuicoes';
import { useNotificacoes, useMarkNotificacaoLida, useMarkAllNotificacoesLidas } from '@/hooks/useDistribuicoes';
import { useAlertas } from '@/hooks/useAlertas';
import { useCliente } from '@/hooks/useClientes';
import { useConfirmacoes, useCreateConfirmacao } from '@/hooks/useConfirmacoes';
import { formatCurrency, formatCompetencia, getCompetenciaAnterior, formatDate } from '@/lib/format';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { isAdmin, clienteId } = useAuth();
  
  return (
    <SidebarLayout>
      <div className="p-6 space-y-6">
        <div className="page-header">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'Visão geral do sistema' : 'Suas distribuições de lucros'}
            </p>
          </div>
          
          {!isAdmin && (
            <div className="flex gap-2">
              <Link to="/distribuicoes/nova">
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Registrar Distribuição
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
  const { data: cliente } = useCliente(clienteId);
  const { data: distribuicoes, isLoading: loadingDist } = useDistribuicoes(clienteId);
  const { data: alertas, isLoading: loadingAlertas } = useAlertas(clienteId, undefined, false);
  const { data: confirmacoes } = useConfirmacoes(clienteId);
  const { data: notificacoes } = useNotificacoes(clienteId);
  const markLida = useMarkNotificacaoLida();
  const markAllLidas = useMarkAllNotificacoesLidas();
  const createConfirmacao = useCreateConfirmacao();

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
      {/* Alerta de pendência */}
      {!mesResolvido && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold">Ação necessária</h3>
                <p className="text-sm text-muted-foreground">
                  Informe se houve distribuição de lucros em {formatCompetencia(competenciaAnterior)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Link to="/distribuicoes/nova" className="flex-1 sm:flex-none">
                <Button className="w-full gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Houve
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
                Não houve
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="dashboard-grid">
        <Card className="stat-card">
          <div className="stat-card-accent bg-primary" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold break-words">{cliente?.razao_social || '-'}</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <div className="stat-card-accent bg-accent" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total no Ano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="money-value-lg">{formatCurrency(totalAno)}</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <div className="stat-card-accent bg-info" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total no Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="money-value-lg">{formatCurrency(totalMes)}</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <div className="stat-card-accent bg-warning" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{alertas?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Notificações */}
      {notificacoes && notificacoes.length > 0 && (
        <Card className="border-info/50 bg-info/5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-info" />
              Notificações ({notificacoes.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clienteId && markAllLidas.mutate(clienteId)}
              disabled={markAllLidas.isPending}
            >
              Marcar todas como lidas
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notificacoes.map((n) => (
                <div key={n.id} className="flex items-start justify-between p-3 rounded-lg border bg-background">
                  <div>
                    <p className="font-medium text-sm">{n.titulo}</p>
                    <p className="text-xs text-muted-foreground">{n.mensagem}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => markLida.mutate(n.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alertas Ativos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alertas Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAlertas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : alertas && alertas.length > 0 ? (
              <div className="space-y-3">
                {alertas.slice(0, 5).map((alerta) => (
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
                        <p className="text-sm">{alerta.descricao}</p>
                      </div>
                      <Badge variant={alerta.tipo === 'ALERTA_50K' ? 'destructive' : 'secondary'}>
                        {alerta.tipo === 'ALERTA_50K' ? '>50k' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-8">
                <CheckCircle2 className="h-12 w-12 text-accent mb-4" />
                <p className="text-muted-foreground">Nenhum alerta ativo</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas Distribuições */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Últimas Distribuições
            </CardTitle>
            <Link to="/distribuicoes">
              <Button variant="ghost" size="sm">
                Ver todas
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
                <p className="text-muted-foreground">Nenhuma distribuição registrada</p>
                <Link to="/distribuicoes/nova">
                  <Button variant="outline" className="mt-4 gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Registrar primeira distribuição
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

function AdminDashboard() {
  const { data: distribuicoes, isLoading: loadingDist } = useDistribuicoes();
  const { data: alertas, isLoading: loadingAlertas } = useAlertas(undefined, undefined, false);

  const competenciaAtual = getCompetenciaAnterior();
  const distribuicoesMes = distribuicoes?.filter(d => d.competencia === competenciaAtual) || [];
  const totalMes = distribuicoesMes.reduce((sum, d) => sum + Number(d.valor_total), 0);

  const alertas50k = alertas?.filter(a => a.tipo === 'ALERTA_50K') || [];
  const alertasPendentes = alertas?.filter(a => a.tipo === 'PENDENTE_MES') || [];

  return (
    <>
      {/* Stats Cards */}
      <div className="dashboard-grid">
        <Card className="stat-card">
          <div className="stat-card-accent bg-accent" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Distribuído no Mês
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
              Distribuições no Mês
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
              Alertas &gt;R$50k
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
              Clientes Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{alertasPendentes.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alertas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alertas Ativos
            </CardTitle>
            <Link to="/alertas">
              <Button variant="ghost" size="sm">
                Ver todos
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
                {alertas.slice(0, 5).map((alerta) => (
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
                        <p className="text-sm">
                          {alerta.socio?.nome
                            ? alerta.descricao.replace(/^Sócio/, alerta.socio.nome)
                            : alerta.descricao}
                        </p>
                      </div>
                      <Badge variant={alerta.tipo === 'ALERTA_50K' ? 'destructive' : 'secondary'}>
                        {alerta.tipo === 'ALERTA_50K' ? '>50k' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-8">
                <CheckCircle2 className="h-12 w-12 text-accent mb-4" />
                <p className="text-muted-foreground">Nenhum alerta ativo</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas Distribuições */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Últimas Distribuições
            </CardTitle>
            <Link to="/distribuicoes">
              <Button variant="ghost" size="sm">
                Ver todas
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
                <p className="text-muted-foreground">Nenhuma distribuição registrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    ENVIADA_AO_CONTADOR: { label: 'Enviada ao Contador', className: 'status-recebida' },
    RECEBIDA: { label: 'Recebida', className: 'status-recebida' },
    EM_VALIDACAO: { label: 'Em validação', className: 'status-em-validacao' },
    APROVADA: { label: 'Aprovada', className: 'status-aprovada' },
    AJUSTE_SOLICITADO: { label: 'Ajuste solicitado', className: 'status-ajuste-solicitado' },
    CANCELADA: { label: 'Cancelada', className: 'status-cancelada' },
  };

  const config = statusConfig[status] || { label: status, className: '' };

  return (
    <Badge variant="outline" className={cn('text-xs', config.className)}>
      {config.label}
    </Badge>
  );
}
