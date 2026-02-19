
-- Change default status to ENVIADA_AO_CONTADOR
ALTER TABLE public.distribuicoes ALTER COLUMN status SET DEFAULT 'ENVIADA_AO_CONTADOR'::status_distribuicao;

-- Update delete policy to only allow when ENVIADA_AO_CONTADOR
DROP POLICY IF EXISTS "Clientes can delete own distribuicoes" ON public.distribuicoes;
CREATE POLICY "Clientes can delete own distribuicoes"
ON public.distribuicoes
FOR DELETE
USING (is_cliente_owner(cliente_id) AND status = 'ENVIADA_AO_CONTADOR'::status_distribuicao);

-- Create status history table with observations
CREATE TABLE public.distribuicao_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  distribuicao_id UUID NOT NULL REFERENCES public.distribuicoes(id) ON DELETE CASCADE,
  status_anterior status_distribuicao,
  status_novo status_distribuicao NOT NULL,
  observacao TEXT,
  usuario_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.distribuicao_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do all on historico"
ON public.distribuicao_historico
FOR ALL
USING (is_admin());

CREATE POLICY "Clientes can view own historico"
ON public.distribuicao_historico
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM distribuicoes d
  WHERE d.id = distribuicao_historico.distribuicao_id AND is_cliente_owner(d.cliente_id)
));

-- Create notifications table
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  distribuicao_id UUID REFERENCES public.distribuicoes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do all on notificacoes"
ON public.notificacoes
FOR ALL
USING (is_admin());

CREATE POLICY "Clientes can view own notificacoes"
ON public.notificacoes
FOR SELECT
USING (is_cliente_owner(cliente_id));

CREATE POLICY "Clientes can update own notificacoes"
ON public.notificacoes
FOR UPDATE
USING (is_cliente_owner(cliente_id));
