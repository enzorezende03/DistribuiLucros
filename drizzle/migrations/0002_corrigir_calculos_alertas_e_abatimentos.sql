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
  v_percentual numeric := 0;
  v_excedente_real numeric := 0;
  v_tipo_pessoa text := 'PF';
  v_cliente public.clientes%ROWTYPE;
  v_descricao text;
BEGIN
  SELECT COALESCE(tipo_pessoa, 'PF')
    INTO v_tipo_pessoa
  FROM public.socios
  WHERE id = _socio_id;

  SELECT COALESCE(SUM(di.valor), 0)
    INTO v_total
  FROM public.distribuicao_itens di
  JOIN public.distribuicoes d ON d.id = di.distribuicao_id
  WHERE d.cliente_id = _cliente_id
    AND di.socio_id = _socio_id
    AND d.competencia = _competencia
    AND d.status IN ('ENVIADA_AO_CONTADOR', 'APROVADA');

  IF v_tipo_pessoa = 'PJ' OR v_total <= 50000 THEN
    DELETE FROM public.alertas
    WHERE cliente_id = _cliente_id
      AND socio_id = _socio_id
      AND competencia = _competencia
      AND tipo = 'ALERTA_50K'
      AND resolvido = false;
    RETURN;
  END IF;

  SELECT * INTO v_cliente
  FROM public.clientes
  WHERE id = _cliente_id;

  v_excedente := v_total - 50000;

  IF v_cliente.ata_registrada = true
     AND v_cliente.saldo_lucros_acumulados >= v_excedente THEN
    DELETE FROM public.alertas
    WHERE cliente_id = _cliente_id
      AND socio_id = _socio_id
      AND competencia = _competencia
      AND tipo = 'ALERTA_50K'
      AND resolvido = false;
    RETURN;
  END IF;

  v_excedente_real := CASE
    WHEN v_cliente.ata_registrada = true THEN GREATEST(v_excedente - v_cliente.saldo_lucros_acumulados, 0)
    ELSE v_excedente
  END;
  v_percentual := ROUND((v_excedente / 50000.0) * 100, 2);
  v_descricao :=
    'Total: R$ ' || TO_CHAR(v_total, 'FM999G999G999D00') ||
    ' | Excedente: R$ ' || TO_CHAR(v_excedente, 'FM999G999G999D00') ||
    ' (' || v_percentual || '% acima do limite)' ||
    CASE
      WHEN v_cliente.ata_registrada = true AND v_cliente.saldo_lucros_acumulados > 0
      THEN ' | Coberto por lucros acumulados: R$ ' || TO_CHAR(LEAST(v_cliente.saldo_lucros_acumulados, v_excedente), 'FM999G999G999D00') ||
           ' | IR sobre: R$ ' || TO_CHAR(v_excedente_real, 'FM999G999G999D00')
      ELSE ''
    END;

  UPDATE public.alertas
  SET descricao = v_descricao
  WHERE cliente_id = _cliente_id
    AND socio_id = _socio_id
    AND competencia = _competencia
    AND tipo = 'ALERTA_50K'
    AND resolvido = false;

  IF NOT FOUND THEN
    INSERT INTO public.alertas (cliente_id, socio_id, competencia, tipo, descricao)
    VALUES (_cliente_id, _socio_id, _competencia, 'ALERTA_50K', v_descricao);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_alerta_50k()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente_id uuid;
  v_competencia text;
BEGIN
  SELECT cliente_id, competencia
    INTO v_cliente_id, v_competencia
  FROM public.distribuicoes
  WHERE id = NEW.distribuicao_id;

  PERFORM public.recalcular_alerta_50k(v_cliente_id, NEW.socio_id, v_competencia);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recheck_alerta_50k_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente_id uuid;
  v_competencia text;
BEGIN
  SELECT cliente_id, competencia
    INTO v_cliente_id, v_competencia
  FROM public.distribuicoes
  WHERE id = OLD.distribuicao_id;

  IF v_cliente_id IS NOT NULL THEN
    PERFORM public.recalcular_alerta_50k(v_cliente_id, OLD.socio_id, v_competencia);
  END IF;
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recheck_alerta_50k_on_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_socio_id uuid;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     OR OLD.competencia IS DISTINCT FROM NEW.competencia
     OR OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
    FOR v_socio_id IN
      SELECT DISTINCT socio_id
      FROM public.distribuicao_itens
      WHERE distribuicao_id = NEW.id
    LOOP
      PERFORM public.recalcular_alerta_50k(OLD.cliente_id, v_socio_id, OLD.competencia);
      IF OLD.cliente_id IS DISTINCT FROM NEW.cliente_id
         OR OLD.competencia IS DISTINCT FROM NEW.competencia THEN
        PERFORM public.recalcular_alerta_50k(NEW.cliente_id, v_socio_id, NEW.competencia);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_recheck_alerta_50k_status ON public.distribuicoes;
CREATE TRIGGER trigger_recheck_alerta_50k_status
AFTER UPDATE OF status, competencia, cliente_id ON public.distribuicoes
FOR EACH ROW EXECUTE FUNCTION public.recheck_alerta_50k_on_status();

CREATE OR REPLACE FUNCTION public.reconciliar_abatimento_lucros(
  _cliente_id uuid,
  _competencia text,
  _distribuicao_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente public.clientes%ROWTYPE;
  v_esperado numeric := 0;
  v_realizado numeric := 0;
  v_ajuste numeric := 0;
  v_saldo_novo numeric := 0;
BEGIN
  SELECT * INTO v_cliente
  FROM public.clientes
  WHERE id = _cliente_id
  FOR UPDATE;

  IF v_cliente.id IS NULL OR v_cliente.ata_registrada IS NOT TRUE THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(GREATEST(x.total_socio - 50000, 0)), 0)
    INTO v_esperado
  FROM (
    SELECT di.socio_id, SUM(di.valor) AS total_socio
    FROM public.distribuicao_itens di
    JOIN public.distribuicoes d ON d.id = di.distribuicao_id
    JOIN public.socios s ON s.id = di.socio_id
    WHERE d.cliente_id = _cliente_id
      AND d.competencia = _competencia
      AND d.status = 'APROVADA'
      AND COALESCE(s.tipo_pessoa, 'PF') = 'PF'
    GROUP BY di.socio_id
  ) x;

  SELECT COALESCE(SUM(CASE WHEN ml.tipo = 'SAIDA' THEN ml.valor ELSE -ml.valor END), 0)
    INTO v_realizado
  FROM public.movimentacoes_lucros ml
  WHERE ml.cliente_id = _cliente_id
    AND ml.competencia = _competencia
    AND ml.distribuicao_id IS NOT NULL
    AND ml.tipo IN ('SAIDA', 'ENTRADA');

  v_ajuste := v_esperado - v_realizado;

  IF v_ajuste > 0 AND v_cliente.saldo_lucros_acumulados > 0 THEN
    v_ajuste := LEAST(v_ajuste, v_cliente.saldo_lucros_acumulados);
    v_saldo_novo := v_cliente.saldo_lucros_acumulados - v_ajuste;

    UPDATE public.clientes SET saldo_lucros_acumulados = v_saldo_novo WHERE id = _cliente_id;
    INSERT INTO public.movimentacoes_lucros
      (cliente_id, tipo, valor, saldo_anterior, saldo_posterior, descricao, distribuicao_id, competencia)
    VALUES
      (_cliente_id, 'SAIDA', v_ajuste, v_cliente.saldo_lucros_acumulados, v_saldo_novo,
       'Abatimento IR - Excedente aprovado acima de R$ 50.000 por sócio PF - ' || _competencia,
       _distribuicao_id, _competencia);
  ELSIF v_ajuste < 0 THEN
    v_ajuste := ABS(v_ajuste);
    v_saldo_novo := v_cliente.saldo_lucros_acumulados + v_ajuste;

    UPDATE public.clientes SET saldo_lucros_acumulados = v_saldo_novo WHERE id = _cliente_id;
    INSERT INTO public.movimentacoes_lucros
      (cliente_id, tipo, valor, saldo_anterior, saldo_posterior, descricao, distribuicao_id, competencia)
    VALUES
      (_cliente_id, 'ENTRADA', v_ajuste, v_cliente.saldo_lucros_acumulados, v_saldo_novo,
       'Estorno de abatimento após alteração da distribuição - ' || _competencia,
       _distribuicao_id, _competencia);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.abater_saldo_lucros_na_aprovacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND (OLD.status = 'APROVADA' OR NEW.status = 'APROVADA') THEN
    PERFORM public.reconciliar_abatimento_lucros(NEW.cliente_id, NEW.competencia, NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reconciliar_abatimento_on_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_distribuicao_id uuid := COALESCE(NEW.distribuicao_id, OLD.distribuicao_id);
  v_cliente_id uuid;
  v_competencia text;
  v_status public.status_distribuicao;
BEGIN
  SELECT cliente_id, competencia, status
    INTO v_cliente_id, v_competencia, v_status
  FROM public.distribuicoes
  WHERE id = v_distribuicao_id;

  IF v_status = 'APROVADA' THEN
    PERFORM public.reconciliar_abatimento_lucros(v_cliente_id, v_competencia, v_distribuicao_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trigger_reconciliar_abatimento_item ON public.distribuicao_itens;
CREATE TRIGGER trigger_reconciliar_abatimento_item
AFTER INSERT OR UPDATE OR DELETE ON public.distribuicao_itens
FOR EACH ROW EXECUTE FUNCTION public.reconciliar_abatimento_on_item();

REVOKE ALL ON FUNCTION public.recalcular_alerta_50k(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_alerta_50k() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recheck_alerta_50k_on_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recheck_alerta_50k_on_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconciliar_abatimento_lucros(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.abater_saldo_lucros_na_aprovacao() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconciliar_abatimento_on_item() FROM PUBLIC, anon, authenticated;