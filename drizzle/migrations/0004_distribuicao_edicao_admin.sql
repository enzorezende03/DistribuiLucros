ALTER TABLE public.distribuicoes
  ADD COLUMN IF NOT EXISTS editado_em timestamptz,
  ADD COLUMN IF NOT EXISTS editado_por uuid,
  ADD COLUMN IF NOT EXISTS edicao_justificativa text;