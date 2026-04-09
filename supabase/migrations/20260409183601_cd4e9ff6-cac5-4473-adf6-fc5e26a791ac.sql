
CREATE OR REPLACE FUNCTION public.abater_saldo_lucros_na_aprovacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_cliente record;
  v_saldo_anterior numeric;
  v_saldo_novo numeric;
  v_total_excedente numeric := 0;
  v_socio record;
  v_total_socio_mes numeric;
  v_excedente_socio numeric;
  v_mov record;
BEGIN
  -- When status changes TO 'APROVADA': deduct from accumulated profits
  IF NEW.status = 'APROVADA' AND (OLD.status IS NULL OR OLD.status != 'APROVADA') THEN
    SELECT * INTO v_cliente FROM clientes WHERE id = NEW.cliente_id;
    
    IF v_cliente.ata_registrada = true AND v_cliente.saldo_lucros_acumulados > 0 THEN
      FOR v_socio IN
        SELECT di.socio_id, di.valor
        FROM distribuicao_itens di
        WHERE di.distribuicao_id = NEW.id
      LOOP
        SELECT COALESCE(SUM(di2.valor), 0) INTO v_total_socio_mes
        FROM distribuicao_itens di2
        JOIN distribuicoes d2 ON d2.id = di2.distribuicao_id
        WHERE di2.socio_id = v_socio.socio_id
          AND d2.competencia = NEW.competencia
          AND d2.id != NEW.id
          AND d2.status != 'CANCELADA';
        
        v_total_socio_mes := v_total_socio_mes + v_socio.valor;
        
        IF v_total_socio_mes > 50000 THEN
          v_excedente_socio := LEAST(v_socio.valor, v_total_socio_mes - 50000);
          v_total_excedente := v_total_excedente + v_excedente_socio;
        END IF;
      END LOOP;
      
      IF v_total_excedente > 0 THEN
        v_saldo_anterior := v_cliente.saldo_lucros_acumulados;
        v_total_excedente := LEAST(v_total_excedente, v_saldo_anterior);
        v_saldo_novo := v_saldo_anterior - v_total_excedente;
        
        UPDATE clientes 
        SET saldo_lucros_acumulados = v_saldo_novo
        WHERE id = NEW.cliente_id;
        
        INSERT INTO movimentacoes_lucros (cliente_id, tipo, valor, saldo_anterior, saldo_posterior, descricao, distribuicao_id, competencia)
        VALUES (
          NEW.cliente_id,
          'SAIDA',
          v_total_excedente,
          v_saldo_anterior,
          v_saldo_novo,
          'Abatimento IR - Excedente acima de R$ 50.000 por sócio - ' || NEW.competencia,
          NEW.id,
          NEW.competencia
        );
      END IF;
    END IF;
  END IF;

  -- When status changes TO 'CANCELADA': reverse any previous deduction
  IF NEW.status = 'CANCELADA' AND (OLD.status IS NULL OR OLD.status != 'CANCELADA') THEN
    -- Find the SAIDA movement for this distribution and reverse it
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
$$;
