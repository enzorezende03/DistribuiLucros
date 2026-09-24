import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Users, CalendarDays, Trophy, AlertTriangle, ChevronDown, Info, Presentation } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useAuth } from '@/contexts/AuthContext';
import { useSocios } from '@/hooks/useSocios';
import { useCliente } from '@/hooks/useClientes';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';

const LIMITE = 50000;
const CORES = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-3, 38 92% 50%))', 'hsl(var(--chart-4, 280 60% 55%))', 'hsl(var(--chart-5, 0 70% 55%))', 'hsl(var(--muted-foreground))'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const compact = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} mi` : v >= 1000 ? `${Math.round(v / 1000)} mil` : String(v);

export default function AnaliseDistribuicoesPage() {
  const { clienteId } = useAuth();
  const navigate = useNavigate();
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(String(anoAtual));
  const { data: socios } = useSocios(clienteId);
  const { data: cliente } = useCliente(clienteId);

  const { data: dists, isLoading } = useQuery({
    queryKey: ['analise-dist', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distribuicoes')
        .select('competencia, status, itens:distribuicao_itens(socio_id, valor)')
        .eq('cliente_id', clienteId!)
        .in('status', ['ENVIADA_AO_CONTADOR', 'APROVADA'])
        .limit(5000);
      if (error) throw error;
      return data as { competencia: string; status: string; itens: { socio_id: string; valor: number }[] }[];
    },
  });

  const { data: confirmacoes } = useQuery({
    queryKey: ['analise-conf', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data } = await supabase.from('confirmacoes_mes').select('competencia, resposta').eq('cliente_id', clienteId!);
      return data ?? [];
    },
  });

  const anos = useMemo(() => {
    const s = new Set<string>([String(anoAtual)]);
    dists?.forEach(d => s.add(d.competencia.slice(0, 4)));
    return Array.from(s).sort().reverse();
  }, [dists, anoAtual]);

  const a = useMemo(() => {
    const socioInfo = new Map((socios || []).map(s => [s.id, s]));
    const porSocio = new Map<string, { id: string; nome: string; pj: boolean; meses: number[]; total: number }>();
    const mesTotal = Array(12).fill(0);
    for (const d of dists || []) {
      if (!d.competencia.startsWith(ano)) continue;
      const m = Number(d.competencia.slice(5, 7)) - 1;
      for (const it of d.itens || []) {
        const s = socioInfo.get(it.socio_id);
        if (!porSocio.has(it.socio_id)) porSocio.set(it.socio_id, { id: it.socio_id, nome: s?.nome || 'Sócio', pj: (s as any)?.tipo_pessoa === 'PJ', meses: Array(12).fill(0), total: 0 });
        const r = porSocio.get(it.socio_id)!;
        r.meses[m] += Number(it.valor); r.total += Number(it.valor); mesTotal[m] += Number(it.valor);
      }
    }
    const lista = Array.from(porSocio.values()).sort((x, y) => y.total - x.total);
    const total = lista.reduce((s, x) => s + x.total, 0);
    const ultimoMes = ano === String(anoAtual) ? new Date().getMonth() : 11;
    const mesesComValor = mesTotal.filter(v => v > 0).length;
    const maiorIdx = mesTotal.indexOf(Math.max(...mesTotal));
    const chart = MESES.slice(0, ultimoMes + 1).map((mes, i) => {
      const row: Record<string, any> = { mes };
      lista.forEach((s, k) => { row[`s${k}`] = s.meses[i]; });
      return row;
    });
    const config: ChartConfig = {};
    lista.forEach((s, k) => { config[`s${k}`] = { label: s.nome, color: CORES[k % CORES.length] }; });
    return { lista, total, mesTotal, ultimoMes, mesesComValor, maiorIdx, chart, config };
  }, [dists, socios, ano, anoAtual]);

  const pontos = useMemo(() => {
    const p: string[] = [];
    const mesesDecorridos = a.ultimoMes + 1;
    const temAta = !!cliente?.ata_registrada;
    const saldo = Number(cliente?.saldo_lucros_acumulados || 0);
    let excedenteTotal = 0;
    for (const s of a.lista) {
      if (s.pj) continue;
      const acima = s.meses.filter(v => v > LIMITE).length;
      excedenteTotal += s.meses.reduce((t, v) => t + Math.max(v - LIMITE, 0), 0);
      if (acima > 0) p.push(`${s.nome} passou de R$ 50 mil em ${acima} de ${mesesDecorridos} ${mesesDecorridos === 1 ? 'mês' : 'meses'}${temAta ? ' — excedente coberto pelos lucros acumulados da ata' : ''}.`);
    }
    if (temAta && excedenteTotal > 0) {
      p.push(`Empresa com ata registrada: o que passou de R$ 50 mil no ano (${formatCurrency(excedenteTotal)}) é abatido dos lucros acumulados. Saldo disponível hoje: ${formatCurrency(saldo)}${saldo <= 0 ? ' — saldo esgotado, novos excedentes terão 10% de IR' : ''}.`);
    }
    if (a.lista[0] && a.total > 0) {
      const pct = (a.lista[0].total / a.total) * 100;
      if (pct >= 60 && a.lista.length > 1) p.push(`${a.lista[0].nome} concentra ${pct.toFixed(0)}% de tudo que foi distribuído no ano.`);
    }
    const confirmados = new Set((confirmacoes || []).map((c: any) => c.competencia));
    const semInfo: string[] = [];
    for (let i = 0; i < a.ultimoMes; i++) {
      const comp = `${ano}-${String(i + 1).padStart(2, '0')}`;
      if (a.mesTotal[i] === 0 && !confirmados.has(comp)) semInfo.push(MESES[i]);
    }
    if (semInfo.length) p.push(`Sem informação em: ${semInfo.join(', ')}.`);
    return p;
  }, [a, confirmacoes, ano, cliente]);

  const pieData = a.lista.map((s, k) => ({ name: s.nome, value: s.total, fill: CORES[k % CORES.length] }));

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
        <div className="page-header flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-1 no-print" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Análise das distribuições {''}<span className="print-only">— {ano}</span></h1>
            <p className="text-muted-foreground">Quanto cada sócio recebeu e como isso evoluiu no ano</p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <Button variant="outline" className="gap-2" disabled={isLoading || a.lista.length === 0} onClick={() => window.print()}>
              <Presentation className="h-4 w-4" /> Apresentação (PDF)
            </Button>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{anos.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : a.lista.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma distribuição em {ano}.</CardContent></Card>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 print-grid-4">
              <Stat icon={TrendingUp} label={`Distribuído em ${ano}`} value={formatCurrency(a.total)} />
              <Stat icon={CalendarDays} label="Média por mês" value={formatCurrency(a.mesesComValor ? a.total / a.mesesComValor : 0)} hint={`${a.mesesComValor} ${a.mesesComValor === 1 ? 'mês' : 'meses'} com distribuição`} />
              <Stat icon={Trophy} label="Maior mês" value={formatCurrency(a.mesTotal[a.maiorIdx])} hint={MESES[a.maiorIdx]} />
              <Stat icon={Users} label="Sócios que receberam" value={String(a.lista.length)} />
            </div>

            {pontos.length > 0 && (
              <Card className="border-warning/40 bg-warning/5">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Pontos de atenção</CardTitle></CardHeader>
                <CardContent><ul className="space-y-1 text-sm list-disc pl-5">{pontos.map((p, i) => <li key={i}>{p}</li>)}</ul></CardContent>
              </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-3 print-slide print-grid-3">
              <Card className="lg:col-span-2 print-span-2">
                <CardHeader><CardTitle className="text-base">Distribuição mês a mês por sócio</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={a.config} className="h-[320px] w-full aspect-auto">
                    <BarChart data={a.chart}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={50} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => (
                        <div className="flex w-full justify-between gap-3"><span className="text-muted-foreground">{a.config[n as string]?.label}</span><span className="font-mono">{formatCurrency(Number(v))}</span></div>
                      )} />} />
                      <ReferenceLine y={LIMITE} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: 'R$ 50 mil', position: 'insideTopRight', fontSize: 11, fill: 'hsl(var(--destructive))' }} />
                      {a.lista.map((_, k) => <Bar key={k} dataKey={`s${k}`} stackId="a" fill={`var(--color-s${k})`} />)}
                    </BarChart>
                  </ChartContainer>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Info className="h-3 w-3" /> A linha tracejada marca R$ 50 mil, o limite mensal por sócio pessoa física.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Participação no ano</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={a.config} className="h-[240px] w-full aspect-auto">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(v, n) => (
                        <div className="flex w-full justify-between gap-3"><span>{n}</span><span className="font-mono">{formatCurrency(Number(v))}</span></div>
                      )} />} />
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>
                        {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="space-y-1 mt-2">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs gap-2">
                        <span className="flex items-center gap-2 truncate"><span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: d.fill }} />{d.name}</span>
                        <span className="font-medium">{((d.value / a.total) * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="print-slide">
              <CardHeader><CardTitle className="text-base">Resumo por sócio</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground text-left border-b">
                    <tr><th className="py-2 pr-3">Sócio</th><th className="py-2 px-3 text-right">Total no ano</th><th className="py-2 px-3 text-right">% do total</th><th className="py-2 px-3 text-right">Média/mês</th><th className="py-2 px-3 text-right">Maior mês</th><th className="py-2 pl-3 text-right">Meses acima de R$ 50 mil</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {a.lista.map(s => {
                      const mc = s.meses.filter(v => v > 0).length;
                      const max = Math.max(...s.meses);
                      const acima = s.meses.filter(v => v > LIMITE).length;
                      return (
                        <tr key={s.id}>
                          <td className="py-2 pr-3 font-medium">{s.nome}</td>
                          <td className="py-2 px-3 text-right money-value">{formatCurrency(s.total)}</td>
                          <td className="py-2 px-3 text-right">{((s.total / a.total) * 100).toFixed(1)}%</td>
                          <td className="py-2 px-3 text-right money-value">{formatCurrency(mc ? s.total / mc : 0)}</td>
                          <td className="py-2 px-3 text-right money-value">{formatCurrency(max)} <span className="text-muted-foreground text-xs">({MESES[s.meses.indexOf(max)]})</span></td>
                          <td className="py-2 pl-3 text-right">{s.pj ? <Badge variant="secondary">PJ – sem limite</Badge> : acima > 0 ? <Badge variant="destructive">{acima}</Badge> : <Badge variant="outline">0</Badge>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Collapsible className="no-print">
              <Card>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-4 text-left font-semibold">Valores por sócio e mês <ChevronDown className="h-4 w-4" /></button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {a.lista.map(s => (
                      <div key={s.id} className="rounded-lg border overflow-hidden">
                        <div className="flex justify-between p-3 bg-muted/30"><span className="font-semibold">{s.nome}</span><span className="font-bold money-value">{formatCurrency(s.total)}</span></div>
                        <div className="divide-y">
                          {s.meses.map((v, i) => v > 0 && (
                            <div key={i} className="flex justify-between px-3 py-2 text-sm">
                              <span className="text-muted-foreground">{MESES[i]}/{ano}</span>
                              <span className={`money-value ${!s.pj && v > LIMITE ? 'text-destructive font-semibold' : ''}`}>{formatCurrency(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) {
  return (
    <Card className="stat-card">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" />{label}</p>
        <p className="text-xl font-bold money-value mt-1">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
