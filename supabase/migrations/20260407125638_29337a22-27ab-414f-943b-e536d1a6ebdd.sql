
-- Function to generate PENDENTE_MES alerts for clients without distributions in previous month
CREATE OR REPLACE FUNCTION public.gerar_alertas_pendente_mes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _competencia text;
  _cliente record;
BEGIN
  -- Calculate previous month competencia (YYYY-MM format)
  _competencia := to_char(now() - interval '1 month', 'YYYY-MM');

  -- Find active clients that have NO distribution for previous month
  -- and don't already have a PENDENTE_MES alert for that competencia
  FOR _cliente IN
    SELECT c.id, c.razao_social
    FROM clientes c
    WHERE c.status = 'ativo'
      -- No distribution for previous month
      AND NOT EXISTS (
        SELECT 1 FROM distribuicoes d
        WHERE d.cliente_id = c.id
          AND d.competencia = _competencia
          AND d.status != 'CANCELADA'
      )
      -- No "NAO_HOUVE" confirmation for previous month
      AND NOT EXISTS (
        SELECT 1 FROM confirmacoes_mes cm
        WHERE cm.cliente_id = c.id
          AND cm.competencia = _competencia
      )
      -- No existing PENDENTE_MES alert for this competencia
      AND NOT EXISTS (
        SELECT 1 FROM alertas a
        WHERE a.cliente_id = c.id
          AND a.tipo = 'PENDENTE_MES'
          AND a.competencia = _competencia
      )
  LOOP
    INSERT INTO alertas (cliente_id, tipo, competencia, descricao, resolvido)
    VALUES (
      _cliente.id,
      'PENDENTE_MES',
      _competencia,
      'Nenhuma distribuição registrada para ' || _competencia || '. Por favor, registre uma distribuição ou declare que não houve.',
      false
    );
  END LOOP;
END;
$$;

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule to run on the 1st of every month at 08:00 UTC
SELECT cron.schedule(
  'gerar-alertas-pendente-mes',
  '0 8 1 * *',
  $$SELECT public.gerar_alertas_pendente_mes()$$
);
