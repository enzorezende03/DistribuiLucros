-- Allow clients to delete their own distribuicao_itens
CREATE POLICY "Clientes can delete own itens"
ON public.distribuicao_itens
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM distribuicoes d
  WHERE d.id = distribuicao_itens.distribuicao_id
  AND is_cliente_owner(d.cliente_id)
));

-- Allow clients to delete their own distribuicoes (only RECEBIDA status)
CREATE POLICY "Clientes can delete own distribuicoes"
ON public.distribuicoes
FOR DELETE
TO authenticated
USING (is_cliente_owner(cliente_id) AND status = 'RECEBIDA');