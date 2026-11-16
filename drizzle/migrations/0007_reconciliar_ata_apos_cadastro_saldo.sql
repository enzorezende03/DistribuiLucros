CREATE OR REPLACE FUNCTION public.reconciliar_saldo_ata_cliente(_cliente_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_mes record;
  v_socio record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  PERFORM 1 FROM public.clientes WHERE id = _cliente_id AND ata_registrada = true FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  FOR v_mes IN
    SELECT competencia, (array_agg(id ORDER BY data_distribuicao DESC, created_at DESC, id))[1] AS distribuicao_id
    FROM public.distribuicoes
    WHERE cliente_id = _cliente_id AND status = 'APROVADA'
    GROUP BY competencia ORDER BY competencia
  LOOP
    PERFORM public.reconciliar_abatimento_lucros(_cliente_id, v_mes.competencia, v_mes.distribuicao_id);
  END LOOP;
  FOR v_socio IN
    SELECT DISTINCT di.socio_id, d.competencia
    FROM public.distribuicao_itens di JOIN public.distribuicoes d ON d.id = di.distribuicao_id
    WHERE d.cliente_id = _cliente_id
  LOOP
    PERFORM public.recalcular_alerta_50k(_cliente_id, v_socio.socio_id, v_socio.competencia);
  END LOOP;
END;
$function$;
REVOKE ALL ON FUNCTION public.reconciliar_saldo_ata_cliente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconciliar_saldo_ata_cliente(uuid) TO authenticated, service_role;