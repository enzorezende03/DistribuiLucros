
-- Update existing data that uses the statuses being removed
UPDATE public.distribuicoes SET status = 'ENVIADA_AO_CONTADOR' WHERE status IN ('RECEBIDA', 'EM_VALIDACAO');
UPDATE public.distribuicao_historico SET status_novo = 'ENVIADA_AO_CONTADOR' WHERE status_novo IN ('RECEBIDA', 'EM_VALIDACAO');
UPDATE public.distribuicao_historico SET status_anterior = 'ENVIADA_AO_CONTADOR' WHERE status_anterior IN ('RECEBIDA', 'EM_VALIDACAO');

-- Drop policy that depends on status column
DROP POLICY IF EXISTS "Clientes can delete own distribuicoes" ON public.distribuicoes;

-- Recreate the enum without RECEBIDA and EM_VALIDACAO
ALTER TYPE public.status_distribuicao RENAME TO status_distribuicao_old;
CREATE TYPE public.status_distribuicao AS ENUM ('ENVIADA_AO_CONTADOR', 'APROVADA', 'AJUSTE_SOLICITADO', 'CANCELADA');

-- Update distribuicoes column
ALTER TABLE public.distribuicoes
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.status_distribuicao USING status::text::public.status_distribuicao,
  ALTER COLUMN status SET DEFAULT 'ENVIADA_AO_CONTADOR'::public.status_distribuicao;

-- Update distribuicao_historico columns
ALTER TABLE public.distribuicao_historico
  ALTER COLUMN status_novo TYPE public.status_distribuicao USING status_novo::text::public.status_distribuicao;
ALTER TABLE public.distribuicao_historico
  ALTER COLUMN status_anterior TYPE public.status_distribuicao USING status_anterior::text::public.status_distribuicao;

-- Drop old enum
DROP TYPE public.status_distribuicao_old;

-- Recreate the delete policy
CREATE POLICY "Clientes can delete own distribuicoes"
ON public.distribuicoes
FOR DELETE
USING (is_cliente_owner(cliente_id) AND status = 'ENVIADA_AO_CONTADOR'::status_distribuicao);
