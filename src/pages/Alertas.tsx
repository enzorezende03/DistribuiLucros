import { useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { AlertaDescricao } from '@/components/AlertaDescricao';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAlertas, useResolverAlerta, type TipoAlerta } from '@/hooks/useAlertas';
import { formatCompetencia, formatDate } from '@/lib/format';
import { AlertTriangle, Loader2, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AlertasPage() {
  const { t } = useLanguage();
  const [selectedTipo, setSelectedTipo] = useState<TipoAlerta | null>(null);
  const [showResolvidos, setShowResolvidos] = useState(false);
  
  const { data: alertas, isLoading } = useAlertas(undefined, selectedTipo || undefined, showResolvidos ? undefined : false);
  const resolverAlerta = useResolverAlerta();

  const tipoConfig: Record<TipoAlerta, { label: string; icon: React.ReactNode; className: string }> = {
    ALERTA_50K: {
      label: t('alerts.value50k'),
      icon: <DollarSign className="h-4 w-4" />,
      className: 'alert-50k',
    },
    PENDENTE_MES: {
      label: t('alerts.monthlyPending'),
      icon: <Clock className="h-4 w-4" />,
      className: 'alert-pendente',
    },
  };

  const handleResolver = async (id: string) => {
    await resolverAlerta.mutateAsync(id);
  };

  const alertas50k = alertas?.filter((a) => a.tipo === 'ALERTA_50K' && !a.resolvido) || [];
  const alertasPendentes = alertas?.filter((a) => a.tipo === 'PENDENTE_MES' && !a.resolvido) || [];

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
        <div className="page-header">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('alerts.title')}</h1>
            <p className="text-muted-foreground">
              {t('alerts.subtitle')}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className={cn('stat-card', alertas50k.length > 0 && 'border-destructive/30')}>
            <div className="stat-card-accent bg-destructive" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t('alerts.value50kAlerts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{alertas50k.length}</p>
              <p className="text-sm text-muted-foreground">{t('alerts.activeAlerts')}</p>
            </CardContent>
          </Card>

          <Card className={cn('stat-card', alertasPendentes.length > 0 && 'border-warning/30')}>
            <div className="stat-card-accent bg-warning" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('alerts.monthlyPending')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{alertasPendentes.length}</p>
              <p className="text-sm text-muted-foreground">{t('alerts.pendingClients')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                {t('alerts.alertsList')}
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                <Select
                  value={selectedTipo || 'all'}
                  onValueChange={(v) => setSelectedTipo(v === 'all' ? null : (v as TipoAlerta))}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder={t('alerts.filterByType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('alerts.allTypes')}</SelectItem>
                    {Object.entries(tipoConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={showResolvidos ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setShowResolvidos(!showResolvidos)}
                >
                  {showResolvidos ? t('alerts.hideResolved') : t('alerts.showResolved')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : alertas && alertas.length > 0 ? (
              <>
                {/* Mobile card layout */}
                <div className="space-y-3 sm:hidden">
                  {alertas.map((alerta) => {
                    const config = tipoConfig[alerta.tipo];
                    return (
                      <div key={alerta.id} className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className={cn('inline-flex items-center gap-2 px-2 py-1 rounded-full border', config.className)}>
                            {config.icon}
                            <span className="text-xs font-medium">{config.label}</span>
                          </div>
                          {alerta.resolvido ? (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                              {t('alerts.resolved')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                              {t('alerts.active')}
                            </Badge>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{alerta.cliente?.razao_social}</p>
                          {alerta.socio?.nome && (
                            <p className="text-xs text-muted-foreground">{alerta.socio.nome}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatCompetencia(alerta.competencia)}</span>
                          <span>{formatDate(alerta.created_at)}</span>
                        </div>
                        {!alerta.resolvido && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolver(alerta.id)}
                            disabled={resolverAlerta.isPending}
                            className="w-full gap-2"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {t('alerts.resolve')}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table layout */}
                <div className="rounded-md border hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('alerts.type')}</TableHead>
                        <TableHead>{t('alerts.client')}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('alerts.partner')}</TableHead>
                        <TableHead>{t('alerts.competence')}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('alerts.description')}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('alerts.date')}</TableHead>
                        <TableHead>{t('alerts.status')}</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertas.map((alerta) => {
                        const config = tipoConfig[alerta.tipo];
                        return (
                          <TableRow key={alerta.id} className="table-row-interactive">
                            <TableCell>
                              <div className={cn('inline-flex items-center gap-2 px-2 py-1 rounded-full border', config.className)}>
                                {config.icon}
                                <span className="text-xs font-medium">{config.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{alerta.cliente?.razao_social}</TableCell>
                            <TableCell className="hidden md:table-cell">{alerta.socio?.nome || '-'}</TableCell>
                            <TableCell>{formatCompetencia(alerta.competencia)}</TableCell>
                            <TableCell className="max-w-[300px] hidden lg:table-cell">
                              <AlertaDescricao descricao={alerta.descricao} tipo={alerta.tipo} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(alerta.created_at)}</TableCell>
                            <TableCell>
                              {alerta.resolvido ? (
                                <Badge variant="outline" className="bg-success/10 text-success border-success/20">{t('alerts.resolved')}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">{t('alerts.active')}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {!alerta.resolvido && (
                                <Button variant="ghost" size="sm" onClick={() => handleResolver(alerta.id)} disabled={resolverAlerta.isPending} className="gap-2">
                                  <CheckCircle2 className="h-4 w-4" />
                                  {t('alerts.resolve')}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="empty-state py-12">
                <CheckCircle2 className="h-12 w-12 text-accent mb-4" />
                <p className="text-muted-foreground">
                  {showResolvidos
                    ? t('alerts.noAlertsFound')
                    : t('alerts.noActiveAlerts')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
