
-- Function to get user email by id (admin only, security definer)
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email::text
  FROM auth.users
  WHERE id = _user_id
  LIMIT 1
$$;
