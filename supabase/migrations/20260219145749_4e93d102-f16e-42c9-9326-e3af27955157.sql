
-- Create user_clientes junction table for many-to-many relationship
CREATE TABLE public.user_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, cliente_id)
);

-- Enable RLS
ALTER TABLE public.user_clientes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can do all on user_clientes"
ON public.user_clientes FOR ALL
USING (is_admin());

CREATE POLICY "Users can view own links"
ON public.user_clientes FOR SELECT
USING (auth.uid() = user_id);

-- Migrate existing data from user_roles to user_clientes
INSERT INTO public.user_clientes (user_id, cliente_id)
SELECT user_id, cliente_id FROM public.user_roles 
WHERE cliente_id IS NOT NULL
ON CONFLICT (user_id, cliente_id) DO NOTHING;

-- Update is_cliente_owner to check user_clientes table
CREATE OR REPLACE FUNCTION public.is_cliente_owner(_cliente_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_clientes
    WHERE user_id = auth.uid() AND cliente_id = _cliente_id
  )
$$;

-- Update get_user_cliente_id to use user_clientes (returns first linked company)
CREATE OR REPLACE FUNCTION public.get_user_cliente_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cliente_id FROM public.user_clientes
  WHERE user_id = _user_id
  LIMIT 1
$$;
