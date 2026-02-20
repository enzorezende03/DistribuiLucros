-- Add lida column to distribuicao_historico for dismissing pendencias
ALTER TABLE public.distribuicao_historico ADD COLUMN lida boolean NOT NULL DEFAULT false;

-- Allow clients to mark their own pendencias as read
CREATE POLICY "Users can update lida on their own historico"
ON public.distribuicao_historico
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.distribuicoes d
    JOIN public.user_clientes uc ON uc.cliente_id = d.cliente_id
    WHERE d.id = distribuicao_historico.distribuicao_id AND uc.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.distribuicoes d
    JOIN public.user_clientes uc ON uc.cliente_id = d.cliente_id
    WHERE d.id = distribuicao_historico.distribuicao_id AND uc.user_id = auth.uid()
  )
);