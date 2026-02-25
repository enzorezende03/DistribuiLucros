import { formatCurrency } from '@/lib/format';
import { useLanguage } from '@/contexts/LanguageContext';

interface AlertaDescricaoProps {
  descricao: string;
  tipo: string;
}

export function AlertaDescricao({ descricao, tipo }: AlertaDescricaoProps) {
  const { t } = useLanguage();

  if (tipo !== 'ALERTA_50K') {
    return <span className="text-sm">{descricao}</span>;
  }

  const totalMatch = descricao.match(/Total:\s*R\$\s*([\d.,]+)/);
  const excedenteMatch = descricao.match(/Excedente:\s*R\$\s*([\d.,]+)/);
  const percentualMatch = descricao.match(/\(([\d.,]+%)\s*acima do limite\)/);

  const totalValor = totalMatch
    ? parseFloat(totalMatch[1].replace(/\./g, '').replace(',', '.'))
    : 0;
  const excedenteValor = excedenteMatch
    ? parseFloat(excedenteMatch[1].replace(/\./g, '').replace(',', '.'))
    : 0;
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
          <span className="font-medium text-warning">
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
