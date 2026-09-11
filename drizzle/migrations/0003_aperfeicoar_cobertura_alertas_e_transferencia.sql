CREATE OR REPLACE FUNCTION public.recalcular_alerta_50k(
  _cliente_id uuid,
  _socio_id uuid,
  _competencia text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric := 0;
  v_excedente numeric := 0;
  v_excedente_total_cliente numeric := 0;
  v_excedente_outros numeric := 0;
  v_saldo_disponivel_socio numeric := 0;
  v_percentual numeric := 0;
  v_excedente_real numeric := 0;
  v_tipo_pessoa text := 'PF';
  v_cliente public.clientes%ROWTYPE;
  v_descricao text;
BEGIN
  SELECT COALESCE(tipo_pessoa, 'PF') INTO v_tipo_pessoa
  FROM public.socios WHERE id = _socio_id;

  SELECT COALESCE(SUM(di.valor), 0) INTO v_total
  FROM public.distribuicao_itens di
  JOIN public.distribuicoes d ON d.id = di.distribuicao_id
  WHERE d.cliente_id = _cliente_id
    AND di.socio_id = _socio_id
    AND d.competencia = _competencia
    AND d.status IN ('ENVIADA_AO_CONTADOR', 'APROVADA');

  IF v_tipo_pessoa = 'PJ' OR v_total <= 50000 THEN
    DELETE FROM public.alertas
    WHERE cliente_id = _cliente_id AND socio_id = _socio_id
      AND competencia = _competencia AND tipo = 'ALERTA_50K' AND resolvido = false;
    RETURN;
  END IF;

  SELECT * INTO v_cliente FROM public.clientes WHERE id = _cliente_id;
  v_excedente := v_total - 50000;

  SELECT COALESCE(SUM(GREATEST(x.total_socio - 50000, 0)), 0)
    INTO v_excedente_total_cliente
  FROM (
    SELECT di.socio_id, SUM(di.valor) total_socio
    FROM public.distribuicao_itens di
    JOIN public.distribuicoes d ON d.id = di.distribuicao_id
    JOIN public.socios s ON s.id = di.socio_id
    WHERE d.cliente_id = _cliente_id
      AND d.competencia = _competencia
      AND d.status IN ('ENVIADA_AO_CONTADOR', 'APROVADA')
      AND COALESCE(s.tipo_pessoa, 'PF') = 'PF'
    GROUP BY di.socio_id
  ) x;

  IF v_cliente.ata_registrada = true
     AND v_cliente.saldo_lucros_acumulados >= v_excedente_total_cliente THEN
    DELETE FROM public.alertas
    WHERE cliente_id = _cliente_id AND socio_id = _socio_id
      AND competencia = _competencia AND tipo = 'ALERTA_50K' AND resolvido = false;
    RETURN;
  END IF;

  v_excedente_outros := GREATEST(v_excedente_total_cliente - v_excedente, 0);
  v_saldo_disponivel_socio := CASE
    WHEN v_cliente.ata_registrada = true
    THEN GREATEST(v_cliente.saldo_lucros_acumulados - v_excedente_outros, 0)
    ELSE 0
  END;
  v_excedente_real := GREATEST(v_excedente - v_saldo_disponivel_socio, 0);
  v_percentual := ROUND((v_excedente / 50000.0) * 100, 2);
  v_descricao :=
    'Total: R$ ' || TO_CHAR(v_total, 'FM999G999G999D00') ||
    ' | Excedente: R$ ' || TO_CHAR(v_excedente, 'FM999G999G999D00') ||
    ' (' || v_percentual || '% acima do limite)' ||
    CASE WHEN v_cliente.ata_registrada = true AND v_saldo_disponivel_socio > 0
      THEN ' | Coberto por lucros acumulados: R$ ' || TO_CHAR(LEAST(v_saldo_disponivel_socio, v_excedente), 'FM999G999G999D00') ||
           ' | IR sobre: R$ ' || TO_CHAR(v_excedente_real, 'FM999G999G999D00')
      ELSE '' END;

  UPDATE public.alertas SET descricao = v_descricao
  WHERE cliente_id = _cliente_id AND socio_id = _socio_id
    AND competencia = _competencia AND tipo = 'ALERTA_50K' AND resolvido = false;

  IF NOT FOUND THEN
    INSERT INTO public.alertas (cliente_id, socio_id, competencia, tipo, descricao)
    VALUES (_cliente_id, _socio_id, _competencia, 'ALERTA_50K', v_descricao);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.transferir_saldo_lucros(
  _origem_id uuid,
  _destino_id uuid,
  _valor numeric,
  _observacao text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_origem public.clientes%ROWTYPE;
  v_destino public.clientes%ROWTYPE;
  v_sufixo text := '';
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF _origem_id = _destino_id THEN RAISE EXCEPTION 'Selecione uma empresa de destino diferente.'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Informe um valor maior que zero.'; END IF;

  PERFORM 1 FROM public.clientes WHERE id IN (_origem_id, _destino_id) ORDER BY id FOR UPDATE;
  SELECT * INTO v_origem FROM public.clientes WHERE id = _origem_id;
  SELECT * INTO v_destino FROM public.clientes WHERE id = _destino_id;
  IF v_origem.id IS NULL OR v_destino.id IS NULL THEN RAISE EXCEPTION 'Empresa não encontrada.'; END IF;
  IF _valor > v_origem.saldo_lucros_acumulados THEN RAISE EXCEPTION 'Valor maior que o saldo disponível.'; END IF;

  IF NULLIF(TRIM(_observacao), '') IS NOT NULL THEN v_sufixo := ' — ' || TRIM(_observacao); END IF;

  UPDATE public.clientes SET saldo_lucros_acumulados = saldo_lucros_acumulados - _valor WHERE id = _origem_id;
  UPDATE public.clientes SET saldo_lucros_acumulados = saldo_lucros_acumulados + _valor WHERE id = _destino_id;

  INSERT INTO public.movimentacoes_lucros
    (cliente_id, tipo, valor, saldo_anterior, saldo_posterior, descricao, cliente_destino_id)
  VALUES
    (_origem_id, 'SAIDA', _valor, v_origem.saldo_lucros_acumulados,
     v_origem.saldo_lucros_acumulados - _valor,
     'Transferência de saldo para ' || v_destino.razao_social || v_sufixo, _destino_id);

  INSERT INTO public.movimentacoes_lucros
    (cliente_id, tipo, valor, saldo_anterior, saldo_posterior, descricao, cliente_origem_id)
  VALUES
    (_destino_id, 'ENTRADA', _valor, v_destino.saldo_lucros_acumulados,
     v_destino.saldo_lucros_acumulados + _valor,
     'Transferência de saldo recebida de ' || v_origem.razao_social || v_sufixo, _origem_id);

  RETURN json_build_object('destino', v_destino.razao_social, 'valor', _valor);
END;
$function$;

REVOKE ALL ON FUNCTION public.recalcular_alerta_50k(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transferir_saldo_lucros(uuid, uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transferir_saldo_lucros(uuid, uuid, numeric, text) TO authenticated;