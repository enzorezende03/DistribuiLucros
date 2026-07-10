
CREATE OR REPLACE FUNCTION public.resolver_pendente_mes_on_confirmacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.resposta = 'NAO_HOUVE' THEN
    UPDATE public.alertas
    SET resolvido = true,
        resolucao_tipo = 'NAO_HOUVE',
        resolucao_justificativa = COALESCE(NEW.observacao, 'Cliente confirmou que não houve distribuição'),
        resolucao_data = now()
    WHERE cliente_id = NEW.cliente_id
      AND competencia = NEW.competencia
      AND tipo = 'PENDENTE_MES'
      AND resolvido = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolver_pendente_mes_on_confirmacao ON public.confirmacoes_mes;
CREATE TRIGGER trg_resolver_pendente_mes_on_confirmacao
AFTER INSERT OR UPDATE ON public.confirmacoes_mes
FOR EACH ROW
EXECUTE FUNCTION public.resolver_pendente_mes_on_confirmacao();

-- Backfill retroativo
UPDATE public.alertas a
SET resolvido = true,
    resolucao_tipo = 'NAO_HOUVE',
    resolucao_justificativa = COALESCE(a.resolucao_justificativa, 'Cliente confirmou que não houve distribuição'),
    resolucao_data = COALESCE(a.resolucao_data, now())
FROM public.confirmacoes_mes cm
WHERE a.tipo = 'PENDENTE_MES'
  AND a.resolvido = false
  AND cm.resposta = 'NAO_HOUVE'
  AND cm.cliente_id = a.cliente_id
  AND cm.competencia = a.competencia;
