ALTER TABLE public.alertas
  ADD COLUMN resolucao_tipo text DEFAULT NULL,
  ADD COLUMN resolucao_justificativa text DEFAULT NULL,
  ADD COLUMN resolucao_data timestamp with time zone DEFAULT NULL;