import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useCliente } from '@/hooks/useClientes';
import { useSocios } from '@/hooks/useSocios';
import { useCreateDistribuicao } from '@/hooks/useDistribuicoes';
import { formatCurrency, formatCompetencia, getCompetenciaAnterior, formatCPF } from '@/lib/format';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  Calculator,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RateioItem {
  socio_id: string;
  valor: string;
}

export default function NovaDistribuicaoPage() {
  const navigate = useNavigate();
  const { clienteId, user } = useAuth();
  const { data: cliente } = useCliente(clienteId);
  const { data: socios } = useSocios(clienteId);
  const createDistribuicao = useCreateDistribuicao();

  const competenciaAnterior = getCompetenciaAnterior();

  // Gerar opções de competência (últimos 6 meses)
  const competenciaOptions = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [formData, setFormData] = useState({
    competencia: competenciaAnterior,
    data_distribuicao: new Date().toISOString().split('T')[0],
    forma_pagamento: '',
  });

  const [rateio, setRateio] = useState<RateioItem[]>([{ socio_id: '', valor: '' }]);
  const [errors, setErrors] = useState<string[]>([]);

  const sociosAtivos = socios?.filter((s) => s.ativo) || [];

  const addRateioItem = () => {
    setRateio([...rateio, { socio_id: '', valor: '' }]);
  };

  const removeRateioItem = (index: number) => {
    if (rateio.length > 1) {
      setRateio(rateio.filter((_, i) => i !== index));
    }
  };

  const updateRateioItem = (index: number, field: keyof RateioItem, value: string) => {
    const newRateio = [...rateio];
    newRateio[index] = { ...newRateio[index], [field]: value };
    setRateio(newRateio);
  };

  const valorTotal = rateio.reduce((sum, item) => {
    const valor = parseFloat(item.valor) || 0;
    return sum + valor;
  }, 0);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.competencia) {
      newErrors.push('Selecione a competência');
    }

    if (!formData.data_distribuicao) {
      newErrors.push('Informe a data da distribuição');
    }

    if (!formData.forma_pagamento) {
      newErrors.push('Informe a forma de pagamento');
    }

    const validRateio = rateio.filter((item) => item.socio_id && parseFloat(item.valor) > 0);
    if (validRateio.length === 0) {
      newErrors.push('Adicione pelo menos um sócio com valor válido');
    }

    const sociosDuplicados = rateio
      .map((item) => item.socio_id)
      .filter((id, index, arr) => id && arr.indexOf(id) !== index);
    if (sociosDuplicados.length > 0) {
      newErrors.push('Há sócios duplicados no rateio');
    }

    rateio.forEach((item, index) => {
      if (item.socio_id && parseFloat(item.valor) <= 0) {
        newErrors.push(`Item ${index + 1}: valor deve ser maior que zero`);
      }
    });

    setErrors(newErrors);
    if (newErrors.length > 0) {
      toast.error(newErrors[0]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !clienteId) return;

    const itens = rateio
      .filter((item) => item.socio_id && parseFloat(item.valor) > 0)
      .map((item) => ({
        socio_id: item.socio_id,
        valor: parseFloat(item.valor),
      }));

    await createDistribuicao.mutateAsync({
      cliente_id: clienteId,
      competencia: formData.competencia,
      data_distribuicao: formData.data_distribuicao,
      valor_total: valorTotal,
      forma_pagamento: formData.forma_pagamento,
      solicitante_nome: user?.email || 'Sistema',
      solicitante_email: user?.email || '',
      itens,
    });

    navigate('/distribuicoes');
  };

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="page-header">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Nova Distribuição</h1>
              <p className="text-muted-foreground">
                Registre uma nova distribuição de lucros
              </p>
            </div>
          </div>
        </div>

        {/* Info da Empresa */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{cliente?.razao_social}</p>
            <p className="text-sm text-muted-foreground">CNPJ: {cliente?.cnpj}</p>
          </CardContent>
        </Card>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Dados da Distribuição */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados da Distribuição</CardTitle>
                <CardDescription>Informe os dados gerais da distribuição</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="competencia">Competência *</Label>
                    <Select
                      value={formData.competencia}
                      onValueChange={(v) => setFormData({ ...formData, competencia: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {competenciaOptions.map((comp) => (
                          <SelectItem key={comp} value={comp}>
                            {formatCompetencia(comp)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_distribuicao">Data da Distribuição *</Label>
                    <Input
                      id="data_distribuicao"
                      type="date"
                      value={formData.data_distribuicao}
                      onChange={(e) =>
                        setFormData({ ...formData, data_distribuicao: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forma_pagamento">Forma de Pagamento *</Label>
                    <Select
                      value={formData.forma_pagamento}
                      onValueChange={(v) => setFormData({ ...formData, forma_pagamento: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="TED">TED</SelectItem>
                        <SelectItem value="DOC">DOC</SelectItem>
                        <SelectItem value="Transferência Interna">Transferência Interna</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rateio por Sócio */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Rateio por Sócio</CardTitle>
                    <CardDescription>Informe o valor para cada sócio</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRateioItem}
                    disabled={rateio.length >= sociosAtivos.length}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Sócio
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {sociosAtivos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum sócio ativo cadastrado.</p>
                    <p className="text-sm">Entre em contato com o administrador.</p>
                  </div>
                ) : (
                  <>
                    {rateio.map((item, index) => {
                      const selectedSocio = sociosAtivos.find((s) => s.id === item.socio_id);
                      const availableSocios = sociosAtivos.filter(
                        (s) => s.id === item.socio_id || !rateio.some((r) => r.socio_id === s.id)
                      );

                      return (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-4 rounded-lg border bg-muted/30"
                        >
                          <div className="flex-1 space-y-2 w-full">
                            <Label>Sócio</Label>
                            <Select
                              value={item.socio_id}
                              onValueChange={(v) => updateRateioItem(index, 'socio_id', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um sócio" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableSocios.map((socio) => (
                                  <SelectItem key={socio.id} value={socio.id}>
                                    {socio.nome} - CPF: {formatCPF(socio.cpf)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="w-full sm:w-48 space-y-2">
                            <Label>Valor (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              value={item.valor}
                              onChange={(e) => updateRateioItem(index, 'valor', e.target.value)}
                              className="money-value"
                            />
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRateioItem(index)}
                            disabled={rateio.length === 1}
                            className="text-destructive hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Alerta IR 50k */}
                {rateio.some((item) => parseFloat(item.valor) > 50000) && (
                  <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200 [&>svg]:text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm font-medium">
                      <strong>Atenção:</strong> Distribuições acima de R$ 50.000,00 por sócio podem estar sujeitas à incidência de <strong>Imposto de Renda (IR) de 10%</strong> sobre o valor excedente. Consulte seu contador para mais informações.
                      {rateio
                        .filter((item) => parseFloat(item.valor) > 50000)
                        .map((item) => {
                          const socio = sociosAtivos.find((s) => s.id === item.socio_id);
                          const valor = parseFloat(item.valor);
                          const ir = (valor - 50000) * 0.1;
                          return socio ? (
                            <div key={item.socio_id} className="mt-1 text-xs">
                              • {socio.nome}: {formatCurrency(valor)} — IR estimado: {formatCurrency(ir)}
                            </div>
                          ) : null;
                        })}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Total */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-accent" />
                    <span className="font-semibold text-lg">Total da Distribuição</span>
                  </div>
                  <span className="text-2xl font-bold money-value text-accent">
                    {formatCurrency(valorTotal)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createDistribuicao.isPending || valorTotal <= 0}
                className="gap-2"
              >
                {createDistribuicao.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar Distribuição
              </Button>
            </div>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
}
