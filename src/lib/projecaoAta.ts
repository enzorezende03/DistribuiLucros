const cents = (value: number) => Math.round(value * 100) / 100;

export function projetarAta(saldo: number, excedentes: number[], abatido: number, corte: Date) {
  const excedente = cents(excedentes.reduce((total, value) => total + Math.max(value, 0), 0));
  const meses = excedentes.filter(value => value > 0).length;
  const media = meses ? excedente / meses : 0;
  const pendente = cents(Math.max(excedente - abatido, 0));
  const saldoAposPendentes = cents(Math.max(saldo - pendente, 0));
  const mesesAteLimite = Math.max((2028 - corte.getFullYear()) * 12 + 11 - corte.getMonth(), 0);
  return {
    excedente, meses, media: cents(media), pendente, saldoAposPendentes, mesesAteLimite,
    saldoNoLimite: cents(Math.max(saldoAposPendentes - media * mesesAteLimite, 0)),
    mensalNecessario: mesesAteLimite ? cents(saldoAposPendentes / mesesAteLimite) : null,
  };
}