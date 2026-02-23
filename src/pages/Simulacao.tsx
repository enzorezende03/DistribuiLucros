import { useState } from 'react';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Calculator, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

const LIMITE_ISENCAO = 50000;
const ALIQUOTA = 0.10;

export default function SimulacaoPage() {
  const [valorDistribuicao, setValorDistribuicao] = useState(0);
  const [inputValue, setInputValue] = useState('');

  const isento = valorDistribuicao <= LIMITE_ISENCAO;
  const imposto = isento ? 0 : valorDistribuicao * ALIQUOTA;
  const valorLiquido = valorDistribuicao - imposto;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    setValorDistribuicao(parseCurrencyInput(raw));
  };

  const handleSliderChange = (values: number[]) => {
    const val = values[0];
    setValorDistribuicao(val);
    setInputValue(val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Simulação de Distribuição
          </h1>
          <p className="text-muted-foreground mt-1">
            Simule o imposto sobre a distribuição de lucros antes de solicitar.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Valor da Distribuição</CardTitle>
            <CardDescription>
              Informe o valor total que deseja distribuir
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                placeholder="0,00"
                value={inputValue}
                onChange={handleInputChange}
                className="text-lg font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label>Ajuste rápido</Label>
              <Slider
                value={[valorDistribuicao]}
                onValueChange={handleSliderChange}
                max={500000}
                step={1000}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>R$ 0</span>
                <span>R$ 500.000</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className={isento ? 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                {isento ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-sm font-medium text-muted-foreground">Status</span>
              </div>
              <p className={`text-lg font-bold ${isento ? 'text-green-600' : 'text-amber-600'}`}>
                {isento ? 'Isento' : 'Tributável'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isento
                  ? 'Até R$ 50.000 é isento'
                  : 'Acima de R$ 50.000 incide 10%'}
              </p>
            </CardContent>
          </Card>

          <Card className={!isento ? 'border-destructive/30 bg-destructive/5' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Imposto (10%)</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(imposto)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isento ? 'Nenhum imposto' : `10% sobre ${formatCurrency(valorDistribuicao)}`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Valor Líquido</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(valorLiquido)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Valor após dedução do imposto
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Regras de tributação</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Até R$ 50.000,00 — Isento</p>
                  <p className="text-muted-foreground">Distribuições de até R$ 50 mil não possuem incidência de imposto.</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Acima de R$ 50.000,00 — 10% sobre o total</p>
                  <p className="text-muted-foreground">Quando o valor ultrapassa R$ 50 mil, incide alíquota de 10% sobre o valor total da distribuição.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
