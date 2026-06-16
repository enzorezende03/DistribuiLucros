
CREATE TYPE public.natureza_repasse AS ENUM ('LUCRO', 'REEMBOLSO', 'EMPRESTIMO_MUTUO', 'PRO_LABORE', 'DEVOLUCAO');

ALTER TABLE public.distribuicoes
  ADD COLUMN natureza public.natureza_repasse NOT NULL DEFAULT 'LUCRO';

ALTER TABLE public.distribuicoes
  ALTER COLUMN natureza DROP DEFAULT;
