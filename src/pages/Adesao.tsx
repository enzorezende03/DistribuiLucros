import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Users,
  UserX,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Search,
  MoreVertical,
  Bell,
  KeyRound,
  Eye,
  ExternalLink,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { useAdesao, AdesaoCliente } from '@/hooks/useAdesao';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCNPJ } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type FiltroStatus = 'todos' | 'sem_login' | 'pendente_mes' | 'em_dia' | 'inativos';
type FiltroTag = 'todos' | '2M_SAUDE' | '2M_CONTABILIDADE';
type Ordenacao = 'engajamento_asc' | 'alfabetica' | 'ultimo_acesso';

function formatDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function statusMes(temDist: boolean, temNaoHouve: boolean) {
  if (temDist) return { label: 'Em dia', color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' };
  if (temNaoHouve) return { label: 'NÃO HOUVE', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' };
  return { label: 'Pendente', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' };
}

export default function AdesaoPage() {
  const { isAdmin, startImpersonating } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useAdesao(isAdmin);

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [filtroTag, setFiltroTag] = useState<FiltroTag>('todos');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('engajamento_asc');

  const [resetCliente, setResetCliente] = useState<AdesaoCliente | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [notifyCliente, setNotifyCliente] = useState<AdesaoCliente | null>(null);
  const [notifyTitulo, setNotifyTitulo] = useState('');
  const [notifyMensagem, setNotifyMensagem] = useState('');
  const [notifyLoading, setNotifyLoading] = useState(false);

  const stats = useMemo(() => {
    if (!data) return null;
    const ativos = data.filter((c) => c.status === 'ativo');
    const semUsuario = data.filter((c) => c.status === 'ativo' && c.usuarios_aprovados === 0);
    const nuncaAcessaram = data.filter(
      (c) => c.status === 'ativo' && c.usuarios_aprovados > 0 && !c.ultimo_acesso
    );
    const emDiaMesAtual = ativos.filter(
      (c) => c.tem_distribuicao_mes_atual || c.tem_naohouve_mes_atual
    );
    const pendenteMesAnterior = ativos.filter(
      (c) => !c.tem_distribuicao_mes_anterior && !c.tem_naohouve_mes_anterior
    );
    const engajamentoMedio =
      ativos.length > 0
        ? Math.round(
            (ativos.reduce((acc, c) => acc + c.meses_preenchidos_6m, 0) / (ativos.length * 6)) * 100
          )
        : 0;
    return {
      ativos: ativos.length,
      semUsuario: semUsuario.length,
      nuncaAcessaram: nuncaAcessaram.length,
      emDiaMesAtual: emDiaMesAtual.length,
      pendenteMesAnterior: pendenteMesAnterior.length,
      engajamentoMedio,
    };
  }, [data]);

  const lista = useMemo(() => {
    if (!data) return [];
    let result = [...data];
    if (busca.trim()) {
      const q = busca.toLowerCase().replace(/\D/g, '');
      const qText = busca.toLowerCase();
      result = result.filter(
        (c) =>
          c.razao_social.toLowerCase().includes(qText) ||
          (q.length > 0 && c.cnpj.replace(/\D/g, '').includes(q))
      );
    }
    if (filtroTag !== 'todos') {
      result = result.filter((c) => c.tag === filtroTag);
    }
    if (filtroStatus !== 'todos') {
      result = result.filter((c) => {
        switch (filtroStatus) {
          case 'sem_login':
            return c.status === 'ativo' && (c.usuarios_aprovados === 0 || !c.ultimo_acesso);
          case 'pendente_mes':
            return (
              c.status === 'ativo' &&
              !c.tem_distribuicao_mes_atual &&
              !c.tem_naohouve_mes_atual
            );
          case 'em_dia':
            return (
              c.status === 'ativo' &&
              (c.tem_distribuicao_mes_atual || c.tem_naohouve_mes_atual)
            );
          case 'inativos':
            return c.status !== 'ativo';
          default:
            return true;
        }
      });
    }
    result.sort((a, b) => {
      switch (ordenacao) {
        case 'alfabetica':
          return a.razao_social.localeCompare(b.razao_social);
        case 'ultimo_acesso':
          return (b.ultimo_acesso || '').localeCompare(a.ultimo_acesso || '');
        case 'engajamento_asc':
        default:
          return a.meses_preenchidos_6m - b.meses_preenchidos_6m;
      }
    });
    return result;
  }, [data, busca, filtroStatus, filtroTag, ordenacao]);

  const handleResetSenha = async () => {
    if (!resetCliente) return;
    setResetLoading(true);
    try {
      const cnpjEmail = 'cnpj_' + resetCliente.cnpj.replace(/\D/g, '') + '@distribuilucros.app';
      const { data: userData } = await supabase.rpc('find_user_by_email', { _email: cnpjEmail });
      if (!userData || userData.length === 0) {
        toast.error('Nenhum usuário encontrado para este cliente.');
        return;
      }
      const res = await supabase.functions.invoke('manage-admin', {
        body: { action: 'reset_password', user_id: userData[0].user_id },
      });
      if (res.error) throw res.error;
      const resData = res.data as any;
      if (resData?.error) throw new Error(resData.error);
      toast.success('Senha resetada para a padrão.');
      setResetCliente(null);
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || 'desconhecido'));
    } finally {
      setResetLoading(false);
    }
  };

  const openNotify = (c: AdesaoCliente) => {
    setNotifyCliente(c);
    setNotifyTitulo('Lembrete: distribuição de lucros');
    setNotifyMensagem(
      `Olá! Identificamos que ainda não houve registro de distribuição (ou declaração de "não houve") para o mês atual. Por favor, acesse o portal e regularize.`
    );
  };

  const handleNotify = async () => {
    if (!notifyCliente) return;
    if (!notifyTitulo.trim() || !notifyMensagem.trim()) {
      toast.error('Preencha título e mensagem.');
      return;
    }
    setNotifyLoading(true);
    try {
      const { error } = await supabase.from('notificacoes').insert({
        cliente_id: notifyCliente.cliente_id,
        titulo: notifyTitulo.trim(),
        mensagem: notifyMensagem.trim(),
        is_admin_notificacao: false,
      });
      if (error) throw error;
      toast.success('Notificação enviada.');
      setNotifyCliente(null);
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || 'desconhecido'));
    } finally {
      setNotifyLoading(false);
    }
  };

  const openWhatsApp = (c: AdesaoCliente) => {
    if (!c.telefone) {
      toast.error('Cliente não possui telefone cadastrado.');
      return;
    }
    const phone = c.telefone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Olá! Lembrete: ainda não recebemos a distribuição de lucros (ou declaração "não houve") do mês atual para ${c.razao_social}. Acesse o portal para regularizar.`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Adesão dos Clientes</h1>
          <p className="text-muted-foreground">
            Acompanhe quem está usando o sistema e quem precisa ser cobrado.
          </p>
        </div>

        {/* Cards de resumo */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 auto-rows-min">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Empresas ativas"
            value={stats?.ativos ?? '—'}
            tone="default"
          />
          <StatCard
            icon={<UserX className="h-4 w-4" />}
            label="Sem usuário"
            value={stats?.semUsuario ?? '—'}
            tone={stats && stats.semUsuario > 0 ? 'warning' : 'default'}
          />
          <StatCard
            icon={<AlertCircle className="h-4 w-4" />}
            label="Nunca acessaram"
            value={stats?.nuncaAcessaram ?? '—'}
            tone={stats && stats.nuncaAcessaram > 0 ? 'warning' : 'default'}
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Em dia (mês atual)"
            value={stats?.emDiaMesAtual ?? '—'}
            tone="success"
          />
          <StatCard
            icon={<AlertCircle className="h-4 w-4" />}
            label="Pend. mês anterior"
            value={stats?.pendenteMesAnterior ?? '—'}
            tone={stats && stats.pendenteMesAnterior > 0 ? 'danger' : 'success'}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Engajamento (6m)"
            value={stats ? `${stats.engajamentoMedio}%` : '—'}
            tone="default"
          />
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por razão social ou CNPJ..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as FiltroStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="sem_login">Sem login / sem acesso</SelectItem>
                  <SelectItem value="pendente_mes">Pendentes do mês</SelectItem>
                  <SelectItem value="em_dia">Em dia (mês atual)</SelectItem>
                  <SelectItem value="inativos">Inativos / arquivados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroTag} onValueChange={(v) => setFiltroTag(v as FiltroTag)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as tags</SelectItem>
                  <SelectItem value="2M_CONTABILIDADE">2M Contabilidade</SelectItem>
                  <SelectItem value="2M_SAUDE">2M Saúde</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as Ordenacao)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engajamento_asc">Pior engajamento primeiro</SelectItem>
                  <SelectItem value="alfabetica">Ordem alfabética</SelectItem>
                  <SelectItem value="ultimo_acesso">Último acesso (recentes)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isLoading ? 'Carregando...' : `${lista.length} cliente(s)`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : lista.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Nenhum cliente encontrado com esses filtros.
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Último acesso</TableHead>
                        <TableHead>Mês atual</TableHead>
                        <TableHead>Mês anterior</TableHead>
                        <TableHead className="min-w-[160px]">Engajamento (6m)</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lista.map((c) => {
                        const mesAtual = statusMes(c.tem_distribuicao_mes_atual, c.tem_naohouve_mes_atual);
                        const mesAnt = statusMes(c.tem_distribuicao_mes_anterior, c.tem_naohouve_mes_anterior);
                        const engajPct = Math.round((c.meses_preenchidos_6m / 6) * 100);
                        return (
                          <TableRow key={c.cliente_id}>
                            <TableCell>
                              <div className="font-medium">{c.razao_social}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                {formatCNPJ(c.cnpj)}
                                <Badge variant="outline" className={cn(
                                  'text-[10px] py-0 px-1.5',
                                  c.tag === '2M_SAUDE' ? 'border-blue-500/30 text-blue-700 dark:text-blue-400' : 'border-orange-500/30 text-orange-700 dark:text-orange-400'
                                )}>
                                  {c.tag === '2M_SAUDE' ? '2M Saúde' : '2M Contab.'}
                                </Badge>
                                {c.status !== 'ativo' && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-muted-foreground/30">
                                    {c.status}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {c.usuarios_aprovados > 0 ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                  Ativo ({c.usuarios_aprovados})
                                </Badge>
                              ) : c.usuarios_pendentes > 0 ? (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                                  Pendente
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
                                  Sem usuário
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {c.ultimo_acesso ? (
                                formatDate(c.ultimo_acesso)
                              ) : c.usuarios_aprovados > 0 ? (
                                <span className="text-red-600 dark:text-red-400 font-medium">Nunca acessou</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={mesAtual.color}>{mesAtual.label}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={mesAnt.color}>{mesAnt.label}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={engajPct} className="h-2 flex-1" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {c.meses_preenchidos_6m}/6
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <RowActions
                                cliente={c}
                                onNotify={() => openNotify(c)}
                                onReset={() => setResetCliente(c)}
                                onView={() => navigate(`/distribuicoes?clienteId=${c.cliente_id}`)}
                                onImpersonate={() => {
                                  startImpersonating(c.cliente_id);
                                  navigate('/dashboard');
                                }}
                                onWhatsApp={() => openWhatsApp(c)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile */}
                <div className="md:hidden divide-y">
                  {lista.map((c) => {
                    const mesAtual = statusMes(c.tem_distribuicao_mes_atual, c.tem_naohouve_mes_atual);
                    const engajPct = Math.round((c.meses_preenchidos_6m / 6) * 100);
                    return (
                      <div key={c.cliente_id} className="p-4 space-y-2">
                        <div className="flex justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{c.razao_social}</div>
                            <div className="text-xs text-muted-foreground">{formatCNPJ(c.cnpj)}</div>
                          </div>
                          <RowActions
                            cliente={c}
                            onNotify={() => openNotify(c)}
                            onReset={() => setResetCliente(c)}
                            onView={() => navigate(`/distribuicoes?clienteId=${c.cliente_id}`)}
                            onImpersonate={() => {
                              startImpersonating(c.cliente_id);
                              navigate('/dashboard');
                            }}
                            onWhatsApp={() => openWhatsApp(c)}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className={mesAtual.color}>Mês atual: {mesAtual.label}</Badge>
                          {c.usuarios_aprovados === 0 && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">Sem usuário</Badge>
                          )}
                          {c.usuarios_aprovados > 0 && !c.ultimo_acesso && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">Nunca acessou</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Engajamento:</span>
                          <Progress value={engajPct} className="h-2 flex-1" />
                          <span className="text-muted-foreground">{c.meses_preenchidos_6m}/6</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reset senha dialog */}
      <AlertDialog open={!!resetCliente} onOpenChange={(o) => !o && setResetCliente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar senha</AlertDialogTitle>
            <AlertDialogDescription>
              A senha de <strong>{resetCliente?.razao_social}</strong> será redefinida para a padrão.
              O cliente terá que criar nova senha no próximo acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetSenha} disabled={resetLoading}>
              {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notificar dialog */}
      <Dialog open={!!notifyCliente} onOpenChange={(o) => !o && setNotifyCliente(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar notificação ao cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Cliente</Label>
              <p className="text-sm font-medium">{notifyCliente?.razao_social}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notify-titulo">Título</Label>
              <Input id="notify-titulo" value={notifyTitulo} onChange={(e) => setNotifyTitulo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notify-msg">Mensagem</Label>
              <Textarea id="notify-msg" rows={4} value={notifyMensagem} onChange={(e) => setNotifyMensagem(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyCliente(null)} disabled={notifyLoading}>
              Cancelar
            </Button>
            <Button onClick={handleNotify} disabled={notifyLoading}>
              {notifyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: 'default' | 'success' | 'warning' | 'danger';
}) {
  const toneClass = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  }[tone];
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {icon}
          <span>{label}</span>
        </div>
        <div className={cn('text-2xl font-bold', toneClass)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function RowActions({
  cliente,
  onNotify,
  onReset,
  onView,
  onImpersonate,
  onWhatsApp,
}: {
  cliente: AdesaoCliente;
  onNotify: () => void;
  onReset: () => void;
  onView: () => void;
  onImpersonate: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onNotify}>
          <Bell className="h-4 w-4 mr-2" /> Notificar no portal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onWhatsApp} disabled={!cliente.telefone}>
          <MessageCircle className="h-4 w-4 mr-2" /> Enviar WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onReset}>
          <KeyRound className="h-4 w-4 mr-2" /> Resetar senha
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onView}>
          <ExternalLink className="h-4 w-4 mr-2" /> Ver distribuições
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImpersonate}>
          <Eye className="h-4 w-4 mr-2" /> Ver como cliente
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
