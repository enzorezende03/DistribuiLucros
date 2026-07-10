
-- 1. Add status column (reusing status_distribuicao enum)
ALTER TABLE public.confirmacoes_mes
  ADD COLUMN IF NOT EXISTS status public.status_distribuicao NOT NULL DEFAULT 'ENVIADA_AO_CONTADOR';

-- 2. Add updated_at
ALTER TABLE public.confirmacoes_mes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_confirmacoes_mes_updated_at ON public.confirmacoes_mes;
CREATE TRIGGER trg_confirmacoes_mes_updated_at
BEFORE UPDATE ON public.confirmacoes_mes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Backfill: existing confirmations should show up for the accountant to review
UPDATE public.confirmacoes_mes SET status = 'ENVIADA_AO_CONTADOR' WHERE status IS NULL;

-- 4. RLS: allow clients to UPDATE / DELETE only while not approved/cancelled
DROP POLICY IF EXISTS "Clientes can update own confirmacoes pending" ON public.confirmacoes_mes;
CREATE POLICY "Clientes can update own confirmacoes pending"
ON public.confirmacoes_mes
FOR UPDATE
TO authenticated
USING (
  public.is_cliente_owner(cliente_id)
  AND status = 'ENVIADA_AO_CONTADOR'
)
WITH CHECK (
  public.is_cliente_owner(cliente_id)
  AND status = 'ENVIADA_AO_CONTADOR'
);

DROP POLICY IF EXISTS "Clientes can delete own confirmacoes pending" ON public.confirmacoes_mes;
CREATE POLICY "Clientes can delete own confirmacoes pending"
ON public.confirmacoes_mes
FOR DELETE
TO authenticated
USING (
  public.is_cliente_owner(cliente_id)
  AND status = 'ENVIADA_AO_CONTADOR'
);

-- 5. Update the resolver_pendente_mes trigger to only fire when actually approved OR when insert happens (option A: resolve as soon as client declares)
-- Keep current behavior: resolve on any NAO_HOUVE regardless of status
-- (No change needed; keeping the function as-is.)
