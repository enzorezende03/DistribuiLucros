ALTER TABLE public.distribuicoes ADD COLUMN IF NOT EXISTS justificativa_recusa text;
ALTER TABLE public.confirmacoes_mes ADD COLUMN IF NOT EXISTS justificativa_recusa text;