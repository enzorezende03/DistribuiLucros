
CREATE OR REPLACE FUNCTION public.find_email_by_cnpj(_cnpj text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email::text
  FROM auth.users u
  JOIN user_clientes uc ON uc.user_id = u.id
  JOIN clientes c ON c.id = uc.cliente_id
  WHERE c.cnpj = _cnpj
  LIMIT 1
$$;
