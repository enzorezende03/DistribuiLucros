CREATE OR REPLACE FUNCTION public.abater_saldo_lucros_na_aprovacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente record;
  v_saldo_anterior numeric;
  v_saldo_novo numeric;
  v_total_excedente_mes numeric := 0;
  v_ja_abatido numeric := 0;
  v_abater numeric := 0;
  v_mov record;
BEGIN
  IF NEW.status = 'APROVADA' AND (OLD.status IS NULL OR OLD.status != 'APROVADA') THEN
    SELECT * INTO v_cliente FROM clientes WHERE id = NEW.cliente_id;

    IF v_cliente.ata_registrada = true AND v_cliente.saldo_lucros_acumulados > 0 THEN
      -- Excedente total do mês, considerando TODOS os sócios PF do cliente na competência
      SELECT COALESCE(SUM(GREATEST(t.total_socio - 50000, 0)), 0)
        INTO v_total_excedente_mes
      FROM (
        SELECT di.socio_id, SUM(di.valor) AS total_socio
        FROM distribuicao_itens di
        JOIN distribuicoes d ON d.id = di.distribuicao_id
        JOIN socios s ON s.id = di.socio_id
        WHERE d.cliente_id = NEW.cliente_id
          AND d.competencia = NEW.competencia
          AND d.status <> 'CANCELADA'
          AND COALESCE(s.tipo_pessoa, 'PF') <> 'PJ'
        GROUP BY di.socio_id
      ) t;

      IF v_total_excedente_mes > 0 THEN
        SELECT COALESCE(SUM(ml.valor), 0) INTO v_ja_abatido
        FROM movimentacoes_lucros ml
        WHERE ml.cliente_id = NEW.cliente_id
          AND ml.competencia = NEW.competencia
          AND ml.tipo = 'SAIDA'
          AND ml.distribuicao_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM distribuicoes d3
            WHERE d3.id = ml.distribuicao_id
              AND d3.status <> 'CANCELADA'
          );

        v_abater := v_total_excedente_mes - v_ja_abatido;

        IF v_abater > 0 THEN
          v_saldo_anterior := v_cliente.saldo_lucros_acumulados;
          v_abater := LEAST(v_abater, v_saldo_anterior);
          v_saldo_novo := v_saldo_anterior - v_abater;

          UPDATE clientes
          SET saldo_lucros_acumulados = v_saldo_novo
          WHERE id = NEW.cliente_id;

          INSERT INTO movimentacoes_lucros (cliente_id, tipo, valor, saldo_anterior, saldo_posterior, descricao, distribuicao_id, competencia)
          VALUES (
            NEW.cliente_id,
            'SAIDA',
            v_abater,
            v_saldo_anterior,
            v_saldo_novo,
            'Abatimento IR - Excedente acima de R$ 50.000 por sócio PF - ' || NEW.competencia,
            NEW.id,
            NEW.competencia
          );
        END IF;
      END IF;
    END IF;
  END IF;

  IF NEW.status = 'CANCELADA' AND (OLD.status IS NULL OR OLD.status != 'CANCELADA') THEN
    FOR v_mov IN
      SELECT id, valor, cliente_id, competencia
      FROM movimentacoes_lucros
      WHERE distribuicao_id = NEW.id AND tipo = 'SAIDA'
    LOOP
      SELECT * INTO v_cliente FROM clientes WHERE id = v_mov.cliente_id;
      v_saldo_anterior := v_cliente.saldo_lucros_acumulados;
      v_saldo_novo := v_saldo_anterior + v_mov.valor;

      UPDATE clientes
      SET saldo_lucros_acumulados = v_saldo_novo
      WHERE id = v_mov.cliente_id;

      INSERT INTO movimentacoes_lucros (cliente_id, tipo, valor, saldo_anterior, saldo_posterior, descricao, distribuicao_id, competencia)
      VALUES (
        v_mov.cliente_id,
        'ENTRADA',
        v_mov.valor,
        v_saldo_anterior,
        v_saldo_novo,
        'Estorno - Distribuição cancelada - ' || COALESCE(v_mov.competencia, ''),
        NEW.id,
        v_mov.competencia
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;