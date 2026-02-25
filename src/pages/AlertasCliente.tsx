import { useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { AlertaDescricao } from '@/components/AlertaDescricao';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAlertas, type TipoAlerta } from '@/hooks/useAlertas';
import { useAuth } from '@/contexts/AuthContext';
import { formatCompetencia, formatDate } from '@/lib/format';
import {
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tipoConfig: Record<TipoAlerta, { label: string; icon: React.ReactNode; className: string }> = {
  ALERTA_50K: {
    label: 'Valor > R$50k',
    icon: <DollarSign className="h-4 w-4" />,
    className: 'alert-50k',
  },
  PENDENTE_MES: {
    label: 'Pendência Mensal',
    icon: <Clock className="h-4 w-4" />,
    className: 'alert-pendente',
  },
};

export default function AlertasClientePage() {
  const { clienteId } = useAuth();
  const { t } = useLanguage();
  const [selectedTipo, setSelectedTipo] = useState<TipoAlerta | null>(null);
  const [showResolvidos, setShowResolvidos] = useState(false);

  const { data: alertas, isLoading } = useAlertas(
    clienteId,
    selectedTipo || undefined,
    showResolvidos ? undefined : false
  );

  const alertas50k = alertas?.filter((a) => a.tipo === 'ALERTA_50K' && !a.resolvido) || [];
  const alertasPendentes = alertas?.filter((a) => a.tipo === 'PENDENTE_MES' && !a.resolvido) || [];

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="page-header">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('alerts.title')}</h1>
            <p className="text-muted-foreground">{t('alerts.subtitle')}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className={cn('stat-card', alertas50k.length > 0 && 'border-destructive/30')}>
            <div className="stat-card-accent bg-destructive" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Alertas de Valor &gt; R$50k
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{alertas50k.length}</p>
              <p className="text-sm text-muted-foreground">alertas ativos</p>
            </CardContent>
          </Card>

          <Card className={cn('stat-card', alertasPendentes.length > 0 && 'border-warning/30')}>
            <div className="stat-card-accent bg-warning" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pendências Mensais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{alertasPendentes.length}</p>
              <p className="text-sm text-muted-foreground">pendências ativas</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Lista de Alertas
              </CardTitle>
              <div className="flex gap-4">
                <Select
                  value={selectedTipo || 'all'}
                  onValueChange={(v) => setSelectedTipo(v === 'all' ? null : (v as TipoAlerta))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
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
                  {showResolvidos ? 'Ocultar Resolvidos' : 'Mostrar Resolvidos'}
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
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Sócio</TableHead>
                      <TableHead className="hidden sm:table-cell">Competência</TableHead>
                      <TableHead className="hidden md:table-cell">Descrição</TableHead>
                      <TableHead className="hidden sm:table-cell">Data</TableHead>
                      <TableHead>Status</TableHead>
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
                          <TableCell className="font-medium">
                            {alerta.socio?.nome || '-'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {formatCompetencia(alerta.competencia)}
                          </TableCell>
                          <TableCell className="max-w-[300px] hidden md:table-cell">
                            <AlertaDescricao descricao={alerta.descricao} tipo={alerta.tipo} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                            {formatDate(alerta.created_at)}
                          </TableCell>
                          <TableCell>
                            {alerta.resolvido ? (
                              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                Resolvido
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                                Ativo
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="empty-state py-12">
                <CheckCircle2 className="h-12 w-12 text-accent mb-4" />
                <p className="text-muted-foreground">
                  {showResolvidos
                    ? 'Nenhum alerta encontrado'
                    : 'Nenhum alerta ativo no momento'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
