
CREATE OR REPLACE FUNCTION public.check_alerta_50k()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente_id UUID;
  v_competencia TEXT;
  total_socio NUMERIC;
  v_excedente NUMERIC;
  v_percentual NUMERIC;
  v_cliente record;
  v_excedente_real NUMERIC;
BEGIN
  SELECT d.cliente_id, d.competencia INTO v_cliente_id, v_competencia
  FROM public.distribuicoes d WHERE d.id = NEW.distribuicao_id;
  
  SELECT COALESCE(SUM(di.valor), 0) INTO total_socio
  FROM public.distribuicao_itens di
  JOIN public.distribuicoes d ON d.id = di.distribuicao_id
  WHERE di.socio_id = NEW.socio_id AND d.competencia = v_competencia
    AND d.cliente_id = v_cliente_id AND d.status != 'CANCELADA';
  
  IF total_socio > 50000 THEN
    v_excedente := total_socio - 50000;
    
    -- Check if client has ata registrada with sufficient balance
    SELECT * INTO v_cliente FROM public.clientes WHERE id = v_cliente_id;
    
    IF v_cliente.ata_registrada = true AND v_cliente.saldo_lucros_acumulados >= v_excedente THEN
      -- Fully covered by accumulated profits - no alert needed
      RETURN NEW;
    END IF;
    
    -- Calculate real taxable excess (after deducting accumulated profits)
    IF v_cliente.ata_registrada = true AND v_cliente.saldo_lucros_acumulados > 0 THEN
      v_excedente_real := v_excedente - v_cliente.saldo_lucros_acumulados;
    ELSE
      v_excedente_real := v_excedente;
    END IF;
    
    v_percentual := ROUND((v_excedente / 50000.0) * 100, 2);
    
    INSERT INTO public.alertas (cliente_id, socio_id, competencia, tipo, descricao)
    SELECT v_cliente_id, NEW.socio_id, v_competencia, 'ALERTA_50K',
           'Total: R$ ' || TO_CHAR(total_socio, 'FM999G999G999D00') || ' | Excedente: R$ ' || TO_CHAR(v_excedente, 'FM999G999G999D00') || ' (' || v_percentual || '% acima do limite)' ||
           CASE WHEN v_cliente.ata_registrada = true AND v_cliente.saldo_lucros_acumulados > 0 
             THEN ' | Coberto por lucros acumulados: R$ ' || TO_CHAR(LEAST(v_cliente.saldo_lucros_acumulados, v_excedente), 'FM999G999G999D00') || ' | IR sobre: R$ ' || TO_CHAR(v_excedente_real, 'FM999G999G999D00')
             ELSE ''
           END
    WHERE NOT EXISTS (
      SELECT 1 FROM public.alertas 
      WHERE cliente_id = v_cliente_id AND socio_id = NEW.socio_id 
        AND competencia = v_competencia AND tipo = 'ALERTA_50K'
        AND resolvido = false
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
