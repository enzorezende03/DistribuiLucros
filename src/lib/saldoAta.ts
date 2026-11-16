export function calcularSaldoAta(
  inicial: number,
  movimentos: { tipo: string; valor: number; distribuicao_id: string | null; cliente_origem_id?: string | null; cliente_destino_id?: string | null }[],
) {
  const variacao = movimentos.reduce((total, mov) => {
    if (!mov.distribuicao_id && !mov.cliente_origem_id && !mov.cliente_destino_id) return total;
    return total + (mov.tipo === 'ENTRADA' ? Number(mov.valor) : -Number(mov.valor));
  }, 0);
  return Math.max(inicial + variacao, 0);
}