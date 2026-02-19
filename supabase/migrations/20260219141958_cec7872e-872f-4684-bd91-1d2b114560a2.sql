-- Drop the existing restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Clientes can view own socios" ON public.socios;

CREATE POLICY "Clientes can view own socios"
ON public.socios
FOR SELECT
TO authenticated
USING (is_cliente_owner(cliente_id));

-- Also fix distribuicao_itens SELECT policy to be permissive
DROP POLICY IF EXISTS "Clientes can view own itens" ON public.distribuicao_itens;

CREATE POLICY "Clientes can view own itens"
ON public.distribuicao_itens
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM distribuicoes d
  WHERE d.id = distribuicao_itens.distribuicao_id
  AND is_cliente_owner(d.cliente_id)
));