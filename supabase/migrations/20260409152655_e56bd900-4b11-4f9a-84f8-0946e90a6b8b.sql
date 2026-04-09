
-- Create movimentacoes_lucros table
CREATE TABLE public.movimentacoes_lucros (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
  valor numeric NOT NULL,
  saldo_anterior numeric NOT NULL,
  saldo_posterior numeric NOT NULL,
  descricao text NOT NULL,
  distribuicao_id uuid REFERENCES public.distribuicoes(id) ON DELETE SET NULL,
  competencia text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.movimentacoes_lucros ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can do all on movimentacoes_lucros"
ON public.movimentacoes_lucros
FOR ALL
USING (is_admin());

CREATE POLICY "Clientes can view own movimentacoes"
ON public.movimentacoes_lucros
FOR SELECT
USING (is_cliente_owner(cliente_id));

-- Index for performance
CREATE INDEX idx_movimentacoes_lucros_cliente ON public.movimentacoes_lucros(cliente_id);
CREATE INDEX idx_movimentacoes_lucros_distribuicao ON public.movimentacoes_lucros(distribuicao_id);

-- Function to auto-deduct balance when distribution is approved
CREATE OR REPLACE FUNCTION public.abater_saldo_lucros_na_aprovacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cliente record;
  v_saldo_anterior numeric;
  v_saldo_novo numeric;
BEGIN
  -- Only trigger when status changes TO 'APROVADA'
  IF NEW.status = 'APROVADA' AND (OLD.status IS NULL OR OLD.status != 'APROVADA') THEN
    SELECT * INTO v_cliente FROM clientes WHERE id = NEW.cliente_id;
    
    -- Only for clients with ata_registrada
    IF v_cliente.ata_registrada = true AND v_cliente.saldo_lucros_acumulados > 0 THEN
      v_saldo_anterior := v_cliente.saldo_lucros_acumulados;
      v_saldo_novo := GREATEST(v_saldo_anterior - NEW.valor_total, 0);
      
      -- Update client balance
      UPDATE clientes 
      SET saldo_lucros_acumulados = v_saldo_novo
      WHERE id = NEW.cliente_id;
      
      -- Record movement
      INSERT INTO movimentacoes_lucros (cliente_id, tipo, valor, saldo_anterior, saldo_posterior, descricao, distribuicao_id, competencia)
      VALUES (
        NEW.cliente_id,
        'SAIDA',
        NEW.valor_total,
        v_saldo_anterior,
        v_saldo_novo,
        'Distribuição aprovada - ' || NEW.competencia,
        NEW.id,
        NEW.competencia
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_abater_saldo_lucros
AFTER UPDATE ON public.distribuicoes
FOR EACH ROW
EXECUTE FUNCTION public.abater_saldo_lucros_na_aprovacao();
