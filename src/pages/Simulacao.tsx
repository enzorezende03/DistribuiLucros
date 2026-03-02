import { useState } from 'react';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Calculator, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getExcessColor } from '@/lib/excessColor';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function breakableCurrency(value: number): string {
  return formatCurrency(value).replace(/([.,])/g, '$1\u200B');
}

function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/\D/g, '');
  return parseInt(cleaned, 10) / 100 || 0;
}

function maskCurrency(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '0,00';
  const num = parseInt(digits, 10);
  return (num / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const LIMITE_ISENCAO = 50000;
const ALIQUOTA = 0.10;

export default function SimulacaoPage() {
  const { t } = useLanguage();
  const [valorDistribuicao, setValorDistribuicao] = useState(0);
  const [inputValue, setInputValue] = useState('0,00');

  const isento = valorDistribuicao <= LIMITE_ISENCAO;
  const imposto = isento ? 0 : valorDistribuicao * ALIQUOTA;
  const valorLiquido = valorDistribuicao - imposto;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = maskCurrency(raw);
    setInputValue(masked);
    setValorDistribuicao(parseCurrencyInput(raw));
  };

  const handleSliderChange = (values: number[]) => {
    const val = values[0];
    setValorDistribuicao(val);
    setInputValue(val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            {t('simulation.title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('simulation.subtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('simulation.distributionValue')}</CardTitle>
            <CardDescription>{t('simulation.informValue')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="valor">{t('simulation.value')}</Label>
              <Input id="valor" placeholder="0,00" value={inputValue} onChange={handleInputChange} className="text-lg font-semibold" />
            </div>
            <div className="space-y-2">
              <Label>{t('simulation.quickAdjust')}</Label>
              <Slider value={[valorDistribuicao]} onValueChange={handleSliderChange} max={500000} step={1000} className="py-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>R$ 0</span>
                <span>R$ 500.000</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card className={isento ? 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20' : ''}>
            <CardContent className="pt-6 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                {isento ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                <span className="text-sm font-medium text-muted-foreground">{t('simulation.statusLabel')}</span>
              </div>
              <p className={`text-base font-bold break-all ${isento ? 'text-green-600' : 'text-amber-600'}`}>
                {isento ? t('simulation.exempt') : t('simulation.taxable')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isento ? t('simulation.exemptMsg') : t('simulation.taxableMsg')}
              </p>
            </CardContent>
          </Card>

          <Card className={!isento ? 'border-destructive/30 bg-destructive/5' : 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20'}>
            <CardContent className="pt-6 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-muted-foreground">{t('simulation.tax')}</span>
              </div>
              <p className={`text-base font-bold ${isento ? 'text-green-600' : ''}`} style={!isento ? { color: getExcessColor(valorDistribuicao) } : undefined}>{breakableCurrency(imposto)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isento ? t('simulation.noTax') : `${t('simulation.taxOver')} ${breakableCurrency(valorDistribuicao)}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-muted-foreground">{t('simulation.grossValue')}</span>
              </div>
              <p className="text-base font-bold text-foreground">{breakableCurrency(valorDistribuicao)}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('simulation.grossDesc')}</p>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-muted-foreground">{t('simulation.netValue')}</span>
              </div>
              <p className="text-base font-bold text-primary">{breakableCurrency(valorLiquido)}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('simulation.netDesc')}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">{t('simulation.taxRules')}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{t('simulation.rule1Title')}</p>
                  <p className="text-muted-foreground">{t('simulation.rule1Desc')}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{t('simulation.rule2Title')}</p>
                  <p className="text-muted-foreground">{t('simulation.rule2Desc')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
