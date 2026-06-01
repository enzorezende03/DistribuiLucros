
-- =====================================================================
-- 1) Make 'atas' storage bucket private and restrict access
-- =====================================================================
UPDATE storage.buckets SET public = false WHERE id = 'atas';

-- Drop any existing permissive policies on atas
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (policyname ILIKE '%atas%' OR policyname ILIKE '%Anyone can view atas%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END$$;

-- Admins can do everything on atas
CREATE POLICY "Admins manage atas"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'atas' AND public.is_admin())
  WITH CHECK (bucket_id = 'atas' AND public.is_admin());

-- Verified cliente owners can read their company's atas (folder = cliente_id)
CREATE POLICY "Cliente owners can view own atas"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'atas'
    AND public.is_cliente_owner(((storage.foldername(name))[1])::uuid)
  );

-- =====================================================================
-- 2) Restrict write policies to authenticated role only
-- =====================================================================

-- distribuicoes
DROP POLICY IF EXISTS "Clientes can insert own distribuicoes" ON public.distribuicoes;
DROP POLICY IF EXISTS "Clientes can update own distribuicoes" ON public.distribuicoes;
DROP POLICY IF EXISTS "Clientes can delete own distribuicoes" ON public.distribuicoes;
DROP POLICY IF EXISTS "Clientes can view own distribuicoes" ON public.distribuicoes;

CREATE POLICY "Clientes can insert own distribuicoes" ON public.distribuicoes
  FOR INSERT TO authenticated WITH CHECK (is_cliente_owner(cliente_id));
CREATE POLICY "Clientes can update own distribuicoes" ON public.distribuicoes
  FOR UPDATE TO authenticated USING (is_cliente_owner(cliente_id));
CREATE POLICY "Clientes can delete own distribuicoes" ON public.distribuicoes
  FOR DELETE TO authenticated USING (is_cliente_owner(cliente_id) AND status = 'ENVIADA_AO_CONTADOR'::status_distribuicao);
CREATE POLICY "Clientes can view own distribuicoes" ON public.distribuicoes
  FOR SELECT TO authenticated USING (is_cliente_owner(cliente_id));

-- distribuicao_itens
DROP POLICY IF EXISTS "Clientes can insert own itens" ON public.distribuicao_itens;
DROP POLICY IF EXISTS "Clientes can update own itens" ON public.distribuicao_itens;
CREATE POLICY "Clientes can insert own itens" ON public.distribuicao_itens
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM distribuicoes d WHERE d.id = distribuicao_itens.distribuicao_id AND is_cliente_owner(d.cliente_id)));
CREATE POLICY "Clientes can update own itens" ON public.distribuicao_itens
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM distribuicoes d WHERE d.id = distribuicao_itens.distribuicao_id AND is_cliente_owner(d.cliente_id)));

-- confirmacoes_mes
DROP POLICY IF EXISTS "Clientes can insert own confirmacoes" ON public.confirmacoes_mes;
DROP POLICY IF EXISTS "Clientes can view own confirmacoes" ON public.confirmacoes_mes;
CREATE POLICY "Clientes can insert own confirmacoes" ON public.confirmacoes_mes
  FOR INSERT TO authenticated WITH CHECK (is_cliente_owner(cliente_id));
CREATE POLICY "Clientes can view own confirmacoes" ON public.confirmacoes_mes
  FOR SELECT TO authenticated USING (is_cliente_owner(cliente_id));

-- notificacoes
DROP POLICY IF EXISTS "Clientes can update own notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Clientes can view own notificacoes" ON public.notificacoes;
CREATE POLICY "Clientes can update own notificacoes" ON public.notificacoes
  FOR UPDATE TO authenticated USING (is_cliente_owner(cliente_id));
CREATE POLICY "Clientes can view own notificacoes" ON public.notificacoes
  FOR SELECT TO authenticated USING (is_cliente_owner(cliente_id));

-- alertas
DROP POLICY IF EXISTS "Clientes can view own alertas" ON public.alertas;
CREATE POLICY "Clientes can view own alertas" ON public.alertas
  FOR SELECT TO authenticated USING (is_cliente_owner(cliente_id));

-- clientes
DROP POLICY IF EXISTS "Clientes can view own company" ON public.clientes;
CREATE POLICY "Clientes can view own company" ON public.clientes
  FOR SELECT TO authenticated USING (is_cliente_owner(id));

-- socios already authenticated; movimentacoes_lucros and tarefas_ir
DROP POLICY IF EXISTS "Clientes can view own movimentacoes" ON public.movimentacoes_lucros;
CREATE POLICY "Clientes can view own movimentacoes" ON public.movimentacoes_lucros
  FOR SELECT TO authenticated USING (is_cliente_owner(cliente_id));

DROP POLICY IF EXISTS "Clientes can view own tarefas_ir" ON public.tarefas_ir;
CREATE POLICY "Clientes can view own tarefas_ir" ON public.tarefas_ir
  FOR SELECT TO authenticated USING (is_cliente_owner(cliente_id));

-- distribuicao_historico
DROP POLICY IF EXISTS "Clientes can view own historico" ON public.distribuicao_historico;
CREATE POLICY "Clientes can view own historico" ON public.distribuicao_historico
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM distribuicoes d WHERE d.id = distribuicao_historico.distribuicao_id AND is_cliente_owner(d.cliente_id)));

-- user_roles
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- user_clientes
DROP POLICY IF EXISTS "Users can view own links" ON public.user_clientes;
CREATE POLICY "Users can view own links" ON public.user_clientes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- =====================================================================
-- 3) recibo_sequencia: restrict reads to admin only
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated can read sequencia" ON public.recibo_sequencia;
-- Admin policy already exists ("Admins can manage sequencia")
-- gerar_numero_recibo is SECURITY DEFINER so app does not need direct read.

-- =====================================================================
-- 4) Revoke EXECUTE on internal SECURITY DEFINER functions
--    Keep callable only those needed by anon (login) or authenticated (RPC).
-- =====================================================================

-- Trigger / internal functions: revoke from anon and authenticated
REVOKE EXECUTE ON FUNCTION public.check_alerta_50k() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recheck_alerta_50k_on_delete() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.abater_saldo_lucros_na_aprovacao() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gerar_alertas_pendente_mes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gerar_numero_recibo() FROM anon, authenticated;

-- Anon should NOT directly invoke these (used by RLS internally, still works via definer)
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_display_name(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_user_by_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.solicitar_acesso_cnpj(text) FROM anon;

-- find_email_by_cnpj must remain callable by anon (used on Login screen before auth)
-- is_admin, is_cliente_owner, has_role, get_user_cliente_id remain callable (used by RLS)
