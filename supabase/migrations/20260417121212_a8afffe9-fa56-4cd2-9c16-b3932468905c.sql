
-- Recalcula/remove alerta ALERTA_50K após DELETE de itens/distribuição
CREATE OR REPLACE FUNCTION public.recheck_alerta_50k_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_id UUID;
  v_competencia DATE;
  total_socio NUMERIC;
  v_excedente NUMERIC;
  v_percentual NUMERIC;
BEGIN
  SELECT cliente_id, competencia INTO v_cliente_id, v_competencia
  FROM public.distribuicoes WHERE id = OLD.distribuicao_id;

  IF v_cliente_id IS NULL THEN
    -- Distribuição já foi deletada; tenta achar pelo alerta existente via socio
    RETURN OLD;
  END IF;

  SELECT COALESCE(SUM(di.valor), 0) INTO total_socio
  FROM public.distribuicao_itens di
  JOIN public.distribuicoes d ON d.id = di.distribuicao_id
  WHERE di.socio_id = OLD.socio_id
    AND d.cliente_id = v_cliente_id
    AND d.competencia = v_competencia
    AND d.status <> 'CANCELADA';

  IF total_socio <= 50000 THEN
    -- Remove alerta não resolvido
    DELETE FROM public.alertas
    WHERE cliente_id = v_cliente_id
      AND socio_id = OLD.socio_id
      AND competencia = v_competencia
      AND tipo = 'ALERTA_50K'
      AND resolvido = false;
  ELSE
    -- Atualiza descrição do alerta existente
    v_excedente := total_socio - 50000;
    v_percentual := ROUND((v_excedente / 50000) * 100);
    UPDATE public.alertas
    SET descricao = 'Total: R$ ' || TO_CHAR(total_socio, 'FM999G999G999D00') || ' | Excedente: R$ ' || TO_CHAR(v_excedente, 'FM999G999G999D00') || ' (' || v_percentual || '% acima do limite)'
    WHERE cliente_id = v_cliente_id
      AND socio_id = OLD.socio_id
      AND competencia = v_competencia
      AND tipo = 'ALERTA_50K'
      AND resolvido = false;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_recheck_alerta_50k_delete ON public.distribuicao_itens;
CREATE TRIGGER trigger_recheck_alerta_50k_delete
AFTER DELETE ON public.distribuicao_itens
FOR EACH ROW EXECUTE FUNCTION public.recheck_alerta_50k_on_delete();

-- Limpeza retroativa: remove alertas 50k não resolvidos que não têm mais respaldo
DELETE FROM public.alertas a
WHERE a.tipo = 'ALERTA_50K'
  AND a.resolvido = false
  AND COALESCE((
    SELECT SUM(di.valor)
    FROM public.distribuicao_itens di
    JOIN public.distribuicoes d ON d.id = di.distribuicao_id
    WHERE di.socio_id = a.socio_id
      AND d.cliente_id = a.cliente_id
      AND d.competencia = a.competencia
      AND d.status <> 'CANCELADA'
  ), 0) <= 50000;
