-- Add 'arquivado' to status_cliente enum
ALTER TYPE public.status_cliente ADD VALUE IF NOT EXISTS 'arquivado';

-- Add motivo_arquivamento column
ALTER TABLE public.clientes ADD COLUMN motivo_arquivamento text DEFAULT NULL;
