DO $$
DECLARE
  v_cliente uuid := 'c574f2a6-b1f9-4740-8b5f-012330bf7422';
  v_saldo numeric;
  v_mov record;
BEGIN
  -- remove abatimentos cujo excedente vinha somente de sócios PJ
  FOR v_mov IN
    SELECT ml.id, ml.valor, ml.competencia
    FROM movimentacoes_lucros ml
    WHERE ml.cliente_id = v_cliente AND ml.tipo = 'SAIDA'
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM distribuicao_itens di
      JOIN distribuicoes d ON d.id = di.distribuicao_id
      JOIN socios s ON s.id = di.socio_id
      WHERE d.cliente_id = v_cliente
        AND d.competencia = v_mov.competencia
        AND d.status <> 'CANCELADA'
        AND COALESCE(s.tipo_pessoa,'PF') <> 'PJ'
      GROUP BY di.socio_id
      HAVING SUM(di.valor) > 50000
    ) THEN
      DELETE FROM movimentacoes_lucros WHERE id = v_mov.id;
    END IF;
  END LOOP;

  -- recalcula o saldo: saldo inicial - abatimentos restantes
  SELECT COALESCE(SUM(CASE WHEN tipo='ENTRADA' THEN valor ELSE -valor END), 0)
    INTO v_saldo
  FROM movimentacoes_lucros
  WHERE cliente_id = v_cliente;

  UPDATE clientes SET saldo_lucros_acumulados = GREATEST(v_saldo, 0) WHERE id = v_cliente;

  -- remove alertas de 50k gerados por sócios PJ
  DELETE FROM alertas a
  USING socios s
  WHERE a.socio_id = s.id
    AND a.cliente_id = v_cliente
    AND a.tipo = 'ALERTA_50K'
    AND COALESCE(s.tipo_pessoa,'PF') = 'PJ';
END $$;