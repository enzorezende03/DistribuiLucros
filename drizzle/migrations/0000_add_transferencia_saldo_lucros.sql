ALTER TABLE public.movimentacoes_lucros
  ADD COLUMN IF NOT EXISTS cliente_origem_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cliente_destino_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mov_lucros_origem ON public.movimentacoes_lucros(cliente_origem_id);
CREATE INDEX IF NOT EXISTS idx_mov_lucros_destino ON public.movimentacoes_lucros(cliente_destino_id);