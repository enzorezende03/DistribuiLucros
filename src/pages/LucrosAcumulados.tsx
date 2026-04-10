import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCliente } from '@/hooks/useClientes';
import { useMovimentacoesLucros } from '@/hooks/useMovimentacoesLucros';
import { formatCurrency, formatDate } from '@/lib/format';
import { ArrowDownCircle, ArrowUpCircle, Loader2, TrendingUp, FileText } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

export default function LucrosAcumuladosPage() {
  const navigate = useNavigate();
  const { clienteId } = useAuth();
  const { data: cliente, isLoading: loadingCliente } = useCliente(clienteId);
  const { data: movimentacoes, isLoading: loadingMov } = useMovimentacoesLucros(clienteId);

  if (loadingCliente) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SidebarLayout>
    );
  }

  if (!cliente?.ata_registrada) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-full overflow-x-hidden">
        <div className="page-header">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Lucros Acumulados</h1>
            <p className="text-muted-foreground">
              Controle do saldo de lucros acumulados com Ata Registrada
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Saldo Atual de Lucros Acumulados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(cliente.saldo_lucros_acumulados)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Este saldo é abatido automaticamente quando distribuições aprovadas possuem valores acima de R$ 50.000,00 por sócio no mês (parte sujeita a IR).
            </p>
          </CardContent>
        </Card>

        {/* Movement History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Extrato de Movimentações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMov ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : movimentacoes && movimentacoes.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Saldo Anterior</TableHead>
                      <TableHead className="text-right">Saldo Posterior</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map((mov) => (
                      <TableRow 
                        key={mov.id}
                        className={mov.distribuicao_id ? 'cursor-pointer hover:bg-muted/50' : ''}
                        onClick={() => mov.distribuicao_id && navigate(`/distribuicoes/editar/${mov.distribuicao_id}`)}
                      >
                        <TableCell className="whitespace-nowrap">
                          {formatDate(mov.created_at)}
                        </TableCell>
                        <TableCell>
                          {mov.tipo === 'ENTRADA' ? (
                            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300">
                              <ArrowUpCircle className="h-3 w-3" />
                              Entrada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-red-600 border-red-300">
                              <ArrowDownCircle className="h-3 w-3" />
                              Saída
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {mov.descricao}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${mov.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {mov.tipo === 'ENTRADA' ? '+' : '-'}{formatCurrency(mov.valor)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(mov.saldo_anterior)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(mov.saldo_posterior)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma movimentação registrada.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
