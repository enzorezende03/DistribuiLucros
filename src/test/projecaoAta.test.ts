import { describe, expect, it } from 'vitest';
import { projetarAta } from '@/lib/projecaoAta';

const excedentes = [9840.7, 0, 47557, 1557, 30558, 13500, 18229.49, 10400, 51878.56, 2500, 0, 0];
describe('Projeção da ata da Dra. Claudia', () => {
  it('soma R$ 186.020,75 em nove meses sem confundir com abatimentos efetivados', () => {
    const p = projetarAta(1277010.43, excedentes, 153905.75, new Date(2026, 10, 30));
    expect(p.excedente).toBe(186020.75);
    expect(p.meses).toBe(9);
    expect(p.media).toBe(20668.97);
    expect(p.pendente).toBe(32115);
    expect(p.saldoAposPendentes).toBe(1244895.43);
  });
  it('projeta 25 meses após novembro de 2026, com saldo sem isenção e meta mensal', () => {
    const p = projetarAta(1244895.43, excedentes, 186020.75, new Date(2026, 10, 30));
    expect(p.mesesAteLimite).toBe(25);
    expect(p.saldoNoLimite).toBe(728171.12);
    expect(p.mensalNecessario).toBe(49795.82);
  });
  it('não projeta meses de isenção após dezembro de 2028', () => {
    const p = projetarAta(100000, [1000], 1000, new Date(2029, 0, 31));
    expect(p.mesesAteLimite).toBe(0);
    expect(p.saldoNoLimite).toBe(100000);
    expect(p.mensalNecessario).toBeNull();
  });
});