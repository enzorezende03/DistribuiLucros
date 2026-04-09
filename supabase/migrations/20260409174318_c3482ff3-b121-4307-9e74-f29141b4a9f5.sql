
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
  v_total_excedente numeric := 0;
  v_socio record;
  v_total_socio_mes numeric;
  v_excedente_socio numeric;
BEGIN
  -- Only trigger when status changes TO 'APROVADA'
  IF NEW.status = 'APROVADA' AND (OLD.status IS NULL OR OLD.status != 'APROVADA') THEN
    SELECT * INTO v_cliente FROM clientes WHERE id = NEW.cliente_id;
    
    -- Only for clients with ata_registrada and positive balance
    IF v_cliente.ata_registrada = true AND v_cliente.saldo_lucros_acumulados > 0 THEN
      -- For each partner in this distribution, calculate excess above 50k for the month
      FOR v_socio IN
        SELECT di.socio_id, di.valor
        FROM distribuicao_itens di
        WHERE di.distribuicao_id = NEW.id
      LOOP
        -- Get total already distributed to this partner in the same month (excluding current distribution)
        SELECT COALESCE(SUM(di2.valor), 0) INTO v_total_socio_mes
        FROM distribuicao_itens di2
        JOIN distribuicoes d2 ON d2.id = di2.distribuicao_id
        WHERE di2.socio_id = v_socio.socio_id
          AND d2.competencia = NEW.competencia
          AND d2.id != NEW.id
          AND d2.status != 'CANCELADA';
        
        -- Total including current distribution
        v_total_socio_mes := v_total_socio_mes + v_socio.valor;
        
        -- If exceeds 50k, calculate the excess portion from THIS distribution
        IF v_total_socio_mes > 50000 THEN
          -- Previous total without this distribution
          v_excedente_socio := LEAST(v_socio.valor, v_total_socio_mes - 50000);
          v_total_excedente := v_total_excedente + v_excedente_socio;
        END IF;
      END LOOP;
      
      -- Only deduct the excess amount (the part that would incur IR)
      IF v_total_excedente > 0 THEN
        v_saldo_anterior := v_cliente.saldo_lucros_acumulados;
        -- Deduct at most the available balance
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
  
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trigger_abater_saldo_lucros ON distribuicoes;
CREATE TRIGGER trigger_abater_saldo_lucros
  AFTER UPDATE ON distribuicoes
  FOR EACH ROW
  EXECUTE FUNCTION abater_saldo_lucros_na_aprovacao();
