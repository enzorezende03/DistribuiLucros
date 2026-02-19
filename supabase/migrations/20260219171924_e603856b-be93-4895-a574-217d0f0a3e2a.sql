
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
BEGIN
  SELECT d.cliente_id, d.competencia INTO v_cliente_id, v_competencia
  FROM public.distribuicoes d WHERE d.id = NEW.distribuicao_id;
  
  SELECT COALESCE(SUM(di.valor), 0) INTO total_socio
  FROM public.distribuicao_itens di
  JOIN public.distribuicoes d ON d.id = di.distribuicao_id
  WHERE di.socio_id = NEW.socio_id AND d.competencia = v_competencia;
  
  IF total_socio > 50000 THEN
    INSERT INTO public.alertas (cliente_id, socio_id, competencia, tipo, descricao)
    SELECT v_cliente_id, NEW.socio_id, v_competencia, 'ALERTA_50K',
           'Sócio ultrapassou R$ 50.000 no mês. Total: R$ ' || total_socio::TEXT
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
