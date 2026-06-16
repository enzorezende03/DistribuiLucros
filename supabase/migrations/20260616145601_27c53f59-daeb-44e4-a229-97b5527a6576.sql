
CREATE OR REPLACE FUNCTION public.get_adesao_clientes()
RETURNS TABLE (
  cliente_id uuid,
  razao_social text,
  cnpj text,
  tag tag_cliente,
  status status_cliente,
  telefone text,
  total_usuarios bigint,
  usuarios_aprovados bigint,
  usuarios_pendentes bigint,
  ultimo_acesso timestamptz,
  tem_distribuicao_mes_atual boolean,
  tem_naohouve_mes_atual boolean,
  tem_distribuicao_mes_anterior boolean,
  tem_naohouve_mes_anterior boolean,
  meses_preenchidos_6m integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mes_atual text := to_char(now(), 'YYYY-MM');
  v_mes_anterior text := to_char(now() - interval '1 month', 'YYYY-MM');
  v_competencias_6m text[];
  i int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_competencias_6m := ARRAY[]::text[];
  FOR i IN 1..6 LOOP
    v_competencias_6m := array_append(v_competencias_6m, to_char(now() - (i || ' months')::interval, 'YYYY-MM'));
  END LOOP;

  RETURN QUERY
  SELECT
    c.id,
    c.razao_social,
    c.cnpj,
    c.tag,
    c.status,
    c.telefone,
    COALESCE(uc_stats.total, 0) AS total_usuarios,
    COALESCE(uc_stats.aprovados, 0) AS usuarios_aprovados,
    COALESCE(uc_stats.pendentes, 0) AS usuarios_pendentes,
    uc_stats.ultimo_acesso,
    EXISTS (
      SELECT 1 FROM distribuicoes d
      WHERE d.cliente_id = c.id AND d.competencia = v_mes_atual AND d.status <> 'CANCELADA'
    ) AS tem_distribuicao_mes_atual,
    EXISTS (
      SELECT 1 FROM confirmacoes_mes cm
      WHERE cm.cliente_id = c.id AND cm.competencia = v_mes_atual AND cm.resposta = 'NAO_HOUVE'
    ) AS tem_naohouve_mes_atual,
    EXISTS (
      SELECT 1 FROM distribuicoes d
      WHERE d.cliente_id = c.id AND d.competencia = v_mes_anterior AND d.status <> 'CANCELADA'
    ) AS tem_distribuicao_mes_anterior,
    EXISTS (
      SELECT 1 FROM confirmacoes_mes cm
      WHERE cm.cliente_id = c.id AND cm.competencia = v_mes_anterior AND cm.resposta = 'NAO_HOUVE'
    ) AS tem_naohouve_mes_anterior,
    (
      SELECT COUNT(DISTINCT comp)::int
      FROM unnest(v_competencias_6m) comp
      WHERE EXISTS (
        SELECT 1 FROM distribuicoes d
        WHERE d.cliente_id = c.id AND d.competencia = comp AND d.status <> 'CANCELADA'
      )
      OR EXISTS (
        SELECT 1 FROM confirmacoes_mes cm
        WHERE cm.cliente_id = c.id AND cm.competencia = comp AND cm.resposta = 'NAO_HOUVE'
      )
    ) AS meses_preenchidos_6m
  FROM clientes c
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE uc.aprovado = true AND uc.ativo = true) AS aprovados,
      COUNT(*) FILTER (WHERE uc.aprovado = false) AS pendentes,
      MAX(u.last_sign_in_at) FILTER (WHERE uc.aprovado = true AND uc.ativo = true) AS ultimo_acesso
    FROM user_clientes uc
    LEFT JOIN auth.users u ON u.id = uc.user_id
    WHERE uc.cliente_id = c.id
  ) uc_stats ON true
  ORDER BY c.razao_social;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_adesao_clientes() TO authenticated;
