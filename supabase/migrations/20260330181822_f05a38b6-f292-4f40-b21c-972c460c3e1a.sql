
-- Create enum for client tag
CREATE TYPE public.tag_cliente AS ENUM ('2M_SAUDE', '2M_CONTABILIDADE');

-- Add tag column to clientes table
ALTER TABLE public.clientes ADD COLUMN tag tag_cliente NOT NULL DEFAULT '2M_CONTABILIDADE';
