import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useCliente } from '@/hooks/useClientes';
import { useSocios } from '@/hooks/useSocios';
import { useDistribuicao, useDistribuicoes } from '@/hooks/useDistribuicoes';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatCPF } from '@/lib/format';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, ArrowLeft, Calculator, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getExcessColor } from '@/lib/excessColor';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQueryClient } from '@tanstack/react-query';

interface RateioItem {
  socio_id: string;
  valor: string;
}

function maskCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '0,00';
  const num = parseInt(digits, 10);
  return (num / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseMaskedCurrency(masked: string): number {
  return parseFloat(masked.replace(/\./g, '').replace(',', '.')) || 0;
}

function numberToMasked(val: number): string {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function EditarDistribuicaoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { clienteId } = useAuth();
  const { data: distribuicao, isLoading: loadingDist } = useDistribuicao(id || null);
  const { data: cliente } = useCliente(clienteId);
  const { data: socios } = useSocios(clienteId);
  const { data: existingDistribuicoes } = useDistribuicoes(clienteId);

  const [formData, setFormData] = useState({ data_distribuicao: '' });
  const [rateio, setRateio] = useState<RateioItem[]>([{ socio_id: '', valor: '' }]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize form from existing distribution
  useEffect(() => {
    if (distribuicao && !initialized) {
      setFormData({ data_distribuicao: distribuicao.data_distribuicao });
      if (distribuicao.itens && distribuicao.itens.length > 0) {
        setRateio(
          distribuicao.itens.map((item) => ({
            socio_id: item.socio_id,
            valor: numberToMasked(Number(item.valor)),
          }))
        );
      }
      setInitialized(true);
    }
  }, [distribuicao, initialized]);

  // Guard: only allow editing ENVIADA_AO_CONTADOR
  if (distribuicao && distribuicao.status !== 'ENVIADA_AO_CONTADOR') {
    navigate('/distribuicoes');
    return null;
  }

  const getCompetenciaFromDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const sociosAtivos = socios?.filter((s) => s.ativo) || [];
  const addRateioItem = () => setRateio([...rateio, { socio_id: '', valor: '' }]);
  const removeRateioItem = (index: number) => { if (rateio.length > 1) setRateio(rateio.filter((_, i) => i !== index)); };
  const updateRateioItem = (index: number, field: keyof RateioItem, value: string) => {
    const newRateio = [...rateio];
    newRateio[index] = { ...newRateio[index], [field]: value };
    setRateio(newRateio);
  };

  const valorTotal = rateio.reduce((sum, item) => sum + parseMaskedCurrency(item.valor), 0);

  const competenciaAtual = formData.data_distribuicao ? getCompetenciaFromDate(formData.data_distribuicao) : '';
  const acumuladoPorSocio = useMemo(() => {
    const map = new Map<string, number>();
    if (!existingDistribuicoes) return map;
    for (const dist of existingDistribuicoes) {
      if (dist.competencia !== competenciaAtual || dist.id === id) continue;
      for (const item of dist.itens || []) {
        map.set(item.socio_id, (map.get(item.socio_id) || 0) + Number(item.valor));
      }
    }
    return map;
  }, [existingDistribuicoes, competenciaAtual, id]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    if (!formData.data_distribuicao) newErrors.push(t('newDist.informDate'));
    const validRateio = rateio.filter((item) => item.socio_id && parseMaskedCurrency(item.valor) > 0);
    if (validRateio.length === 0) newErrors.push(t('newDist.addPartnerWithValue'));
    const sociosDuplicados = rateio.map((item) => item.socio_id).filter((sid, index, arr) => sid && arr.indexOf(sid) !== index);
    if (sociosDuplicados.length > 0) newErrors.push(t('newDist.duplicatePartners'));
    rateio.forEach((item, index) => {
      if (item.socio_id && parseMaskedCurrency(item.valor) <= 0) newErrors.push(`${t('common.item')} ${index + 1}: ${t('newDist.valueGreaterThanZero')}`);
    });
    setErrors(newErrors);
    if (newErrors.length > 0) { toast.error(newErrors[0]); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !id || !clienteId) return;
    setSaving(true);
    try {
      const competencia = getCompetenciaFromDate(formData.data_distribuicao);
      const itens = rateio.filter((item) => item.socio_id && parseMaskedCurrency(item.valor) > 0).map((item) => ({ socio_id: item.socio_id, valor: parseMaskedCurrency(item.valor) }));
      const newValorTotal = itens.reduce((sum, i) => sum + i.valor, 0);

      // Update distribution
      const { error: updateError } = await supabase
        .from('distribuicoes')
        .update({
          data_distribuicao: formData.data_distribuicao,
          competencia,
          valor_total: newValorTotal,
        })
        .eq('id', id);
      if (updateError) throw updateError;

      // Delete old items and insert new
      const { error: deleteError } = await supabase
        .from('distribuicao_itens')
        .delete()
        .eq('distribuicao_id', id);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('distribuicao_itens')
        .insert(itens.map((item) => ({ ...item, distribuicao_id: id })));
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['distribuicoes'] });
      queryClient.invalidateQueries({ queryKey: ['distribuicao', id] });
      toast.success(t('newDist.updated') || 'Distribuição atualizada com sucesso!');
      navigate('/distribuicoes');
    } catch (err: any) {
      toast.error('Erro ao atualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingDist) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
        <div className="page-header">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('newDist.editTitle') || 'Editar Distribuição'}</h1>
              <p className="text-muted-foreground">{t('newDist.editSubtitle') || 'Altere os dados da distribuição'}</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('newDist.company')}</CardTitle>
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
                {errors.map((error, index) => (<li key={index}>{error}</li>))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('newDist.distributionData')}</CardTitle>
                <CardDescription>{t('newDist.distributionDataDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="data_distribuicao">{t('newDist.distributionDate')} *</Label>
                  <Input id="data_distribuicao" type="date" value={formData.data_distribuicao} onChange={(e) => setFormData({ ...formData, data_distribuicao: e.target.value })} required />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{t('newDist.partnerAllocation')}</CardTitle>
                    <CardDescription>{t('newDist.partnerAllocationDesc')}</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addRateioItem} disabled={rateio.length >= sociosAtivos.length} className="gap-2">
                    <Plus className="h-4 w-4" />{t('newDist.addPartner')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {sociosAtivos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t('newDist.noActivePartners')}</p>
                  </div>
                ) : (
                  <>
                    {rateio.map((item, index) => {
                      const availableSocios = sociosAtivos.filter((s) => s.id === item.socio_id || !rateio.some((r) => r.socio_id === s.id));
                      return (
                        <div key={index} className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-4 rounded-lg border bg-muted/30">
                          <div className="flex-1 space-y-2 w-full">
                            <Label>{t('newDist.partner')}</Label>
                            <Select value={item.socio_id} onValueChange={(v) => updateRateioItem(index, 'socio_id', v)}>
                              <SelectTrigger><SelectValue placeholder={t('newDist.selectPartner')} /></SelectTrigger>
                              <SelectContent>
                                {availableSocios.map((socio) => (
                                  <SelectItem key={socio.id} value={socio.id}>{socio.nome} - CPF: {formatCPF(socio.cpf)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-full sm:w-48 space-y-2">
                            <Label>{t('newDist.valueLabel')}</Label>
                            <Input placeholder="0,00" value={item.valor} onChange={(e) => { const masked = maskCurrencyInput(e.target.value); updateRateioItem(index, 'valor', masked); }} className="money-value" />
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeRateioItem(index)} disabled={rateio.length === 1} className="text-destructive hover:text-destructive shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </>
                )}

                {rateio.some((item) => {
                  const valorForm = parseMaskedCurrency(item.valor);
                  const acumulado = item.socio_id ? (acumuladoPorSocio.get(item.socio_id) || 0) : 0;
                  return (valorForm + acumulado) > 50000;
                }) && (
                  <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200 [&>svg]:text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm font-medium">
                      <strong>{t('common.attention')}:</strong> {t('newDist.irWarning')}
                      {rateio.filter((item) => {
                        const valorForm = parseMaskedCurrency(item.valor);
                        const acumulado = item.socio_id ? (acumuladoPorSocio.get(item.socio_id) || 0) : 0;
                        return (valorForm + acumulado) > 50000;
                      }).map((item) => {
                        const socio = sociosAtivos.find((s) => s.id === item.socio_id);
                        const valorForm = parseMaskedCurrency(item.valor);
                        const acumulado = item.socio_id ? (acumuladoPorSocio.get(item.socio_id) || 0) : 0;
                        const totalSocio = valorForm + acumulado;
                        const ir = totalSocio * 0.1;
                        return socio ? (
                          <div key={item.socio_id} className="mt-1 text-xs">
                            • {socio.nome}: <span style={{ color: getExcessColor(totalSocio) }} className="font-semibold">{formatCurrency(totalSocio)}</span>
                            {acumulado > 0 && <span className="text-muted-foreground"> (já distribuído: {formatCurrency(acumulado)})</span>}
                            {' '}— {t('newDist.estimatedIR')}: <span style={{ color: getExcessColor(totalSocio) }} className="font-semibold">{formatCurrency(ir)}</span>
                          </div>
                        ) : null;
                      })}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                    <span className="font-semibold text-sm sm:text-lg">{t('newDist.totalDistribution')}</span>
                  </div>
                  <span className="text-base sm:text-2xl font-bold money-value text-accent">{formatCurrency(valorTotal)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving || valorTotal <= 0} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('newDist.save') || 'Salvar alterações'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
}
