-- Add ativo and motivo_desativacao columns to user_clientes
ALTER TABLE public.user_clientes 
  ADD COLUMN ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN motivo_desativacao text;

-- Update is_cliente_owner to also check ativo
CREATE OR REPLACE FUNCTION public.is_cliente_owner(_cliente_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_clientes
    WHERE user_id = auth.uid() AND cliente_id = _cliente_id AND aprovado = true AND ativo = true
  )
$$;