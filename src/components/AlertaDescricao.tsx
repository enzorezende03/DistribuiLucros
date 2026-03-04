import { formatCurrency } from '@/lib/format';
import { useLanguage } from '@/contexts/LanguageContext';
import { getExcessColor } from '@/lib/excessColor';

interface AlertaDescricaoProps {
  descricao: string;
  tipo: string;
}

function parseCurrencyValue(value: string): number {
  const cleaned = value.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    const normalized = cleaned.split(thousandsSeparator).join('').replace(decimalSeparator, '.');
    return Number(normalized) || 0;
  }

  if (lastComma !== -1) {
    const decimalPlaces = cleaned.length - lastComma - 1;
    const normalized = decimalPlaces <= 2
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
    return Number(normalized) || 0;
  }

  if (lastDot !== -1) {
    const decimalPlaces = cleaned.length - lastDot - 1;
    const normalized = decimalPlaces <= 2
      ? cleaned.replace(/,/g, '')
      : cleaned.replace(/\./g, '');
    return Number(normalized) || 0;
  }

  return Number(cleaned) || 0;
}

export function AlertaDescricao({ descricao, tipo }: AlertaDescricaoProps) {
  const { t } = useLanguage();

  if (tipo !== 'ALERTA_50K') {
    return <span className="text-sm">{descricao}</span>;
  }

  const totalMatch = descricao.match(/Total:\s*R\$\s*([\d.,]+)/i);
  const excedenteMatch = descricao.match(/Excedente:\s*R\$\s*([\d.,]+)/i);
  const percentualMatch = descricao.match(/\(([\d.,]+%)\s*(?:acima do limite|above limit|por encima del límite)\)/i);

  const totalValor = totalMatch ? parseCurrencyValue(totalMatch[1]) : 0;
  const excedenteValor = excedenteMatch ? parseCurrencyValue(excedenteMatch[1]) : 0;
  const percentual = percentualMatch ? percentualMatch[1] : null;
  const imposto = totalValor > 0 ? totalValor * 0.10 : 0;

  if (!totalMatch) {
    return <span className="text-sm">{descricao}</span>;
  }

  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{t('alerts.total')}:</span>
        <span className="font-semibold">{formatCurrency(totalValor)}</span>
      </div>
      {excedenteValor > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t('alerts.excess')}:</span>
          <span className="font-medium" style={{ color: getExcessColor(totalValor) }}>
            {formatCurrency(excedenteValor)}
            {percentual && (
              <span className="text-xs ml-1">({percentual})</span>
            )}
          </span>
        </div>
      )}
      {imposto > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t('alerts.taxation')}:</span>
          <span className="font-semibold text-destructive">{formatCurrency(imposto)}</span>
        </div>
      )}
    </div>
  );
}
