
-- Function to find user by email (admin only, security definer)
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id as user_id, email::text
  FROM auth.users
  WHERE email = _email
  LIMIT 1
$$;
