import { describe, expect, it } from 'vitest';
import { calcularSaldoAta } from '@/lib/saldoAta';

describe('saldo da ata', () => {
  it('preserva abatimentos existentes ao cadastrar o saldo inicial', () => {
    expect(calcularSaldoAta(1430916, [
      { tipo: 'SAIDA', valor: 13500, distribuicao_id: 'junho' },
      { tipo: 'SAIDA', valor: 18229.49, distribuicao_id: 'julho' },
      { tipo: 'SAIDA', valor: 10400, distribuicao_id: 'agosto' },
      { tipo: 'SAIDA', valor: 51878.56, distribuicao_id: 'setembro' },
    ])).toBeCloseTo(1336907.95, 2);
  });
  it('inclui estornos e transferências sem contar o saldo inicial duas vezes', () => {
    expect(calcularSaldoAta(100000, [
      { tipo: 'ENTRADA', valor: 100000, distribuicao_id: null },
      { tipo: 'SAIDA', valor: 20000, distribuicao_id: 'd1' },
      { tipo: 'ENTRADA', valor: 5000, distribuicao_id: 'd1' },
      { tipo: 'ENTRADA', valor: 10000, distribuicao_id: null, cliente_origem_id: 'origem' },
      { tipo: 'SAIDA', valor: 3000, distribuicao_id: null, cliente_destino_id: 'destino' },
    ])).toBe(92000);
  });
});