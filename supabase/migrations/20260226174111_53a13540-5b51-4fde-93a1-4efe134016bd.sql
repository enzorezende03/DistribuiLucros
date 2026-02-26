
-- Restrict find_user_by_email to admins only
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
 RETURNS TABLE(user_id uuid, email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT id as user_id, email::text
  FROM auth.users
  WHERE email = _email
    AND public.is_admin()
  LIMIT 1
$$;

-- Restrict get_user_email to admins or the user themselves
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN public.is_admin() OR _user_id = auth.uid() THEN email::text
    ELSE NULL
  END
  FROM auth.users
  WHERE id = _user_id
  LIMIT 1
$$;
