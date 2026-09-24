ALTER TABLE public.distribuicao_itens
  ADD COLUMN IF NOT EXISTS editado_em timestamptz,
  ADD COLUMN IF NOT EXISTS edicao_justificativa text,
  ADD COLUMN IF NOT EXISTS valor_anterior numeric;