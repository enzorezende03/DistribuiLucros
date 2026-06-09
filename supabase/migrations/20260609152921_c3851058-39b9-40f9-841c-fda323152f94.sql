
-- 1) Fix distribuicao_historico UPDATE policy to use is_cliente_owner (gates approval + active)
DROP POLICY IF EXISTS "Users can update lida on their own historico" ON public.distribuicao_historico;

CREATE POLICY "Users can update lida on their own historico"
ON public.distribuicao_historico
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.distribuicoes d
    WHERE d.id = distribuicao_historico.distribuicao_id
      AND public.is_cliente_owner(d.cliente_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.distribuicoes d
    WHERE d.id = distribuicao_historico.distribuicao_id
      AND public.is_cliente_owner(d.cliente_id)
  )
);

-- 2) Lock down recibo_sequencia: revoke any direct privileges from non-admin roles.
--    Admins access it via SECURITY DEFINER functions / service_role; no direct client access needed.
REVOKE ALL ON TABLE public.recibo_sequencia FROM anon, authenticated;
GRANT ALL ON TABLE public.recibo_sequencia TO service_role;
