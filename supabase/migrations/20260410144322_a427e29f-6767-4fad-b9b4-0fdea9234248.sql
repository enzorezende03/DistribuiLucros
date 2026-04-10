
CREATE TABLE public.tarefas_ir (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alerta_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  socio_id uuid,
  competencia text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA')),
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  concluida_em timestamp with time zone
);

ALTER TABLE public.tarefas_ir ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do all on tarefas_ir"
  ON public.tarefas_ir FOR ALL
  USING (is_admin());

CREATE POLICY "Clientes can view own tarefas_ir"
  ON public.tarefas_ir FOR SELECT
  USING (is_cliente_owner(cliente_id));
