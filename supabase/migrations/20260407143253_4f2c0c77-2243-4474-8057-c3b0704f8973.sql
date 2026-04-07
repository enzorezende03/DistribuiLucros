CREATE OR REPLACE FUNCTION public.get_user_display_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN public.is_admin() OR _user_id = auth.uid() THEN
      COALESCE(
        NULLIF(TRIM(
          COALESCE(raw_user_meta_data->>'nome', '') || ' ' || COALESCE(raw_user_meta_data->>'sobrenome', '')
        ), ''),
        email::text
      )
    ELSE NULL
  END
  FROM auth.users
  WHERE id = _user_id
  LIMIT 1
$$;