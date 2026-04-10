import { useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { AlertaDescricao } from '@/components/AlertaDescricao';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useAlertas, useResolverAlerta, type TipoAlerta, type Alerta, type ResolucaoTipo } from '@/hooks/useAlertas';
import { formatDate } from '@/lib/format';
import { AlertTriangle, Loader2, CheckCircle2, Clock, DollarSign, FileText, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AlertasPage() {
  const { t } = useLanguage();
  const [selectedTipo, setSelectedTipo] = useState<TipoAlerta | null>(null);
  const [showResolvidos, setShowResolvidos] = useState(false);
  const [resolveDialog, setResolveDialog] = useState<Alerta | null>(null);
  const [justificativa, setJustificativa] = useState('');
  
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

  const openResolveDialog = (alerta: Alerta) => {
    setResolveDialog(alerta);
    setJustificativa('');
  };

  const handleResolve = async (tipo: ResolucaoTipo) => {
    if (!resolveDialog) return;
    if (tipo === 'DISPENSADO' && !justificativa.trim()) return;
    
    await resolverAlerta.mutateAsync({
      id: resolveDialog.id,
      resolucao_tipo: tipo,
      resolucao_justificativa: tipo === 'DISPENSADO' ? justificativa.trim() : undefined,
    });
    setResolveDialog(null);
    setJustificativa('');
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
                            <ResolucaoBadge alerta={alerta} />
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
                        <div className="text-xs text-muted-foreground">
                          <span>{formatDate(alerta.created_at)}</span>
                        </div>
                        {alerta.resolvido && alerta.resolucao_justificativa && (
                          <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                            {alerta.resolucao_justificativa}
                          </p>
                        )}
                        {!alerta.resolvido && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openResolveDialog(alerta)}
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
                        <TableHead className="hidden md:table-cell">{t('alerts.description')}</TableHead>
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
                            <TableCell className="max-w-[300px] hidden md:table-cell">
                              <AlertaDescricao descricao={alerta.descricao} tipo={alerta.tipo} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(alerta.created_at)}</TableCell>
                            <TableCell>
                              {alerta.resolvido ? (
                                <ResolucaoBadge alerta={alerta} />
                              ) : (
                                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">{t('alerts.active')}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {!alerta.resolvido && (
                                <Button variant="ghost" size="sm" onClick={() => openResolveDialog(alerta)} className="gap-2">
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

      {/* Resolve Dialog */}
      <Dialog open={!!resolveDialog} onOpenChange={(open) => { if (!open) setResolveDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Resolver Alerta
            </DialogTitle>
            <DialogDescription>
              {resolveDialog?.cliente?.razao_social}
              {resolveDialog?.socio?.nome ? ` — ${resolveDialog.socio.nome}` : ''}
              {' • '}
              {resolveDialog?.competencia}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {resolveDialog?.tipo === 'ALERTA_50K' && (
              <div className="rounded-lg border p-3 text-sm">
                <AlertaDescricao descricao={resolveDialog.descricao} tipo={resolveDialog.tipo} />
              </div>
            )}

            <p className="text-sm font-medium">Escolha uma ação:</p>

            {/* Option 1: Generate IR Guide */}
            {resolveDialog?.tipo === 'ALERTA_50K' && (
              <Button
                className="w-full gap-2 justify-start h-auto py-3"
                variant="default"
                onClick={() => handleResolve('GERAR_GUIA_IR')}
                disabled={resolverAlerta.isPending}
              >
                {resolverAlerta.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 shrink-0" />
                )}
                <div className="text-left">
                  <p className="font-medium">Gerar Guia de IR</p>
                  <p className="text-xs opacity-80 font-normal">Marcar para geração da guia de recolhimento do imposto</p>
                </div>
              </Button>
            )}

            {/* Option 2: Dismiss with justification */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-sm">Dispensar Alerta</p>
                  <p className="text-xs text-muted-foreground">Informe o motivo da dispensa</p>
                </div>
              </div>
              <Textarea
                placeholder="Ex: Cliente já recolheu o IR por conta própria..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
              />
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleResolve('DISPENSADO')}
                disabled={resolverAlerta.isPending || !justificativa.trim()}
              >
                {resolverAlerta.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Dispensar com justificativa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}

function ResolucaoBadge({ alerta }: { alerta: Alerta }) {
  const { t } = useLanguage();
  
  if (alerta.resolucao_tipo === 'GERAR_GUIA_IR') {
    return (
      <Badge variant="outline" className="bg-info/10 text-info border-info/20 gap-1">
        <FileText className="h-3 w-3" />
        Guia IR
      </Badge>
    );
  }
  
  if (alerta.resolucao_tipo === 'DISPENSADO') {
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-muted gap-1" title={alerta.resolucao_justificativa || ''}>
        <XCircle className="h-3 w-3" />
        Dispensado
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
      {t('alerts.resolved')}
    </Badge>
  );
}
