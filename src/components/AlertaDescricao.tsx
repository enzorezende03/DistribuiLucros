import { formatCurrency } from '@/lib/format';

interface AlertaDescricaoProps {
  descricao: string;
  tipo: string;
}

/**
 * Parses alert descriptions like:
 * "Total: R$ 146.333,00 | Excedente: R$ 96.333,00 (192.67% acima do limite)"
 * and renders them in a structured layout.
 */
export function AlertaDescricao({ descricao, tipo }: AlertaDescricaoProps) {
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

  // If we couldn't parse, fall back to raw text
  if (!totalMatch) {
    return <span className="text-sm">{descricao}</span>;
  }

  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Total:</span>
        <span className="font-semibold">{formatCurrency(totalValor)}</span>
      </div>
      {excedenteValor > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Excedente:</span>
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
          <span className="text-muted-foreground">Tributação (10%):</span>
          <span className="font-semibold text-destructive">{formatCurrency(imposto)}</span>
        </div>
      )}
    </div>
  );
}
