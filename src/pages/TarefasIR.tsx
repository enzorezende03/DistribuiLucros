import { useState } from 'react';
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useTarefasIR, useAtualizarTarefaIR, type TarefaIR, type StatusTarefa } from '@/hooks/useTarefasIR';
import { formatDate } from '@/lib/format';
import { Loader2, CheckCircle2, Clock, FileText, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<StatusTarefa, { label: string; className: string; icon: React.ReactNode }> = {
  PENDENTE: {
    label: 'Pendente',
    className: 'bg-warning/10 text-warning border-warning/20',
    icon: <Clock className="h-3 w-3" />,
  },
  EM_ANDAMENTO: {
    label: 'Em Andamento',
    className: 'bg-info/10 text-info border-info/20',
    icon: <PlayCircle className="h-3 w-3" />,
  },
  CONCLUIDA: {
    label: 'Concluída',
    className: 'bg-success/10 text-success border-success/20',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
};

export default function TarefasIRPage() {
  const [filterStatus, setFilterStatus] = useState<StatusTarefa | 'all'>('all');
  const [actionDialog, setActionDialog] = useState<TarefaIR | null>(null);
  const [observacao, setObservacao] = useState('');

  const activeFilter = filterStatus === 'all' ? undefined : filterStatus;
  const { data: tarefas, isLoading } = useTarefasIR(activeFilter);
  const atualizarTarefa = useAtualizarTarefaIR();

  const pendentes = tarefas?.filter(t => t.status === 'PENDENTE').length || 0;
  const emAndamento = tarefas?.filter(t => t.status === 'EM_ANDAMENTO').length || 0;

  const handleUpdateStatus = async (tarefa: TarefaIR, newStatus: StatusTarefa) => {
    if (newStatus === 'CONCLUIDA') {
      setActionDialog(tarefa);
      setObservacao('');
      return;
    }
    await atualizarTarefa.mutateAsync({ id: tarefa.id, status: newStatus });
  };

  const handleConcluir = async () => {
    if (!actionDialog) return;
    await atualizarTarefa.mutateAsync({
      id: actionDialog.id,
      status: 'CONCLUIDA',
      observacao: observacao.trim() || undefined,
    });
    setActionDialog(null);
  };

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
        <div className="page-header">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tarefas - Guias de IR</h1>
            <p className="text-muted-foreground">
              Gerencie as guias de IR pendentes de geração
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card">
            <div className="stat-card-accent bg-warning" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" /> Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{pendentes}</p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <div className="stat-card-accent bg-info" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PlayCircle className="h-4 w-4" /> Em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{emAndamento}</p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <div className="stat-card-accent bg-success" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{tarefas?.filter(t => t.status === 'CONCLUIDA').length || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Task List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Lista de Tarefas
              </CardTitle>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as StatusTarefa | 'all')}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : tarefas && tarefas.length > 0 ? (
              <>
                {/* Mobile */}
                <div className="space-y-3 sm:hidden">
                  {tarefas.map((tarefa) => {
                    const config = statusConfig[tarefa.status];
                    return (
                      <div key={tarefa.id} className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge variant="outline" className={cn('gap-1', config.className)}>
                            {config.icon} {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{tarefa.competencia}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tarefa.cliente?.razao_social}</p>
                          {tarefa.socio?.nome && <p className="text-xs text-muted-foreground">{tarefa.socio.nome}</p>}
                        </div>
                        {tarefa.descricao && <p className="text-xs text-muted-foreground">{tarefa.descricao}</p>}
                        {tarefa.observacao && (
                          <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">{tarefa.observacao}</p>
                        )}
                        <div className="flex gap-2">
                          {tarefa.status === 'PENDENTE' && (
                            <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => handleUpdateStatus(tarefa, 'EM_ANDAMENTO')} disabled={atualizarTarefa.isPending}>
                              <PlayCircle className="h-4 w-4" /> Iniciar
                            </Button>
                          )}
                          {(tarefa.status === 'PENDENTE' || tarefa.status === 'EM_ANDAMENTO') && (
                            <Button size="sm" className="flex-1 gap-1" onClick={() => handleUpdateStatus(tarefa, 'CONCLUIDA')} disabled={atualizarTarefa.isPending}>
                              <CheckCircle2 className="h-4 w-4" /> Concluir
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop */}
                <div className="rounded-md border hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="hidden md:table-cell">Sócio</TableHead>
                        <TableHead>Competência</TableHead>
                        <TableHead className="hidden md:table-cell">Descrição</TableHead>
                        <TableHead className="hidden md:table-cell">Criada em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tarefas.map((tarefa) => {
                        const config = statusConfig[tarefa.status];
                        return (
                          <TableRow key={tarefa.id}>
                            <TableCell>
                              <Badge variant="outline" className={cn('gap-1', config.className)}>
                                {config.icon} {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{tarefa.cliente?.razao_social}</TableCell>
                            <TableCell className="hidden md:table-cell">{tarefa.socio?.nome || '-'}</TableCell>
                            <TableCell>{tarefa.competencia}</TableCell>
                            <TableCell className="max-w-[250px] truncate hidden md:table-cell">{tarefa.descricao || '-'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(tarefa.created_at)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {tarefa.status === 'PENDENTE' && (
                                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => handleUpdateStatus(tarefa, 'EM_ANDAMENTO')} disabled={atualizarTarefa.isPending}>
                                    <PlayCircle className="h-4 w-4" /> Iniciar
                                  </Button>
                                )}
                                {(tarefa.status === 'PENDENTE' || tarefa.status === 'EM_ANDAMENTO') && (
                                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => handleUpdateStatus(tarefa, 'CONCLUIDA')} disabled={atualizarTarefa.isPending}>
                                    <CheckCircle2 className="h-4 w-4" /> Concluir
                                  </Button>
                                )}
                              </div>
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
                <p className="text-muted-foreground">Nenhuma tarefa encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conclude Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => { if (!open) setActionDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Concluir Tarefa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">
              <strong>{actionDialog?.cliente?.razao_social}</strong>
              {actionDialog?.socio?.nome ? ` — ${actionDialog.socio.nome}` : ''}
              {' • '}{actionDialog?.competencia}
            </p>
            <Textarea
              placeholder="Observação (opcional)..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancelar</Button>
            <Button onClick={handleConcluir} disabled={atualizarTarefa.isPending} className="gap-2">
              {atualizarTarefa.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}
