
-- Add aprovado column to user_clientes
ALTER TABLE public.user_clientes ADD COLUMN aprovado boolean NOT NULL DEFAULT false;

-- Mark all existing links as approved
UPDATE public.user_clientes SET aprovado = true;

-- Update is_cliente_owner to only consider approved links
CREATE OR REPLACE FUNCTION public.is_cliente_owner(_cliente_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_clientes
    WHERE user_id = auth.uid() AND cliente_id = _cliente_id AND aprovado = true
  )
$$;

-- Function for a new user to request access by CNPJ
CREATE OR REPLACE FUNCTION public.solicitar_acesso_cnpj(_cnpj text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cliente_id uuid;
  _user_id uuid := auth.uid();
  _existing_link uuid;
BEGIN
  IF _user_id IS NULL THEN
    RETURN json_build_object('error', 'Não autenticado');
  END IF;

  -- Find cliente by CNPJ
  SELECT id INTO _cliente_id FROM clientes WHERE cnpj = _cnpj LIMIT 1;
  IF _cliente_id IS NULL THEN
    RETURN json_build_object('error', 'CNPJ não encontrado');
  END IF;

  -- Check if link already exists
  SELECT id INTO _existing_link FROM user_clientes
    WHERE user_id = _user_id AND cliente_id = _cliente_id LIMIT 1;
  IF _existing_link IS NOT NULL THEN
    RETURN json_build_object('error', 'Solicitação já existente');
  END IF;

  -- Create pending link
  INSERT INTO user_clientes (user_id, cliente_id, aprovado)
  VALUES (_user_id, _cliente_id, false);

  -- Ensure user has cliente role
  INSERT INTO user_roles (user_id, role, cliente_id)
  VALUES (_user_id, 'cliente', _cliente_id)
  ON CONFLICT DO NOTHING;

  RETURN json_build_object('success', true, 'cliente_id', _cliente_id);
END;
$$;

-- Allow authenticated users to insert their own pending access requests
CREATE POLICY "Users can request access"
ON public.user_clientes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND aprovado = false);
