CREATE TABLE public.espelhos_distribuicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  socio_origem_id uuid NOT NULL UNIQUE REFERENCES public.socios(id) ON DELETE CASCADE,
  cliente_destino_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  socio_destino_id uuid NOT NULL REFERENCES public.socios(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.espelhos_distribuicao TO authenticated;
GRANT ALL ON public.espelhos_distribuicao TO service_role;
ALTER TABLE public.espelhos_distribuicao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage espelhos" ON public.espelhos_distribuicao FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.distribuicoes ADD COLUMN espelho_origem_item_id uuid UNIQUE;

INSERT INTO public.espelhos_distribuicao (socio_origem_id, cliente_destino_id, socio_destino_id)
VALUES ('4a5c60e3-fa0e-4e04-b54a-32291836c539','3dd97037-9d00-4274-b014-7adb246fe41f','e53d7794-92bb-4aee-a595-2a5a71403859');

CREATE OR REPLACE FUNCTION public.espelhar_item_distribuicao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e record; d record; mirror_id uuid; old_e record;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    SELECT id INTO mirror_id FROM distribuicoes WHERE espelho_origem_item_id = OLD.id;
    IF mirror_id IS NOT NULL THEN
      IF TG_OP = 'DELETE' OR NEW.socio_id <> OLD.socio_id THEN
        UPDATE distribuicoes SET status = 'CANCELADA', espelho_origem_item_id = NULL WHERE id = mirror_id;
        mirror_id := NULL;
      END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  END IF;

  SELECT * INTO e FROM espelhos_distribuicao WHERE socio_origem_id = NEW.socio_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT * INTO d FROM distribuicoes WHERE id = NEW.distribuicao_id;

  IF mirror_id IS NULL THEN
    INSERT INTO distribuicoes (cliente_id, competencia, data_distribuicao, valor_total, forma_pagamento, natureza,
      solicitante_nome, solicitante_email, status, recibo_numero, espelho_origem_item_id)
    VALUES (e.cliente_destino_id, d.competencia, d.data_distribuicao, NEW.valor, d.forma_pagamento, d.natureza,
      d.solicitante_nome, d.solicitante_email, d.status, gerar_numero_recibo(), NEW.id)
    RETURNING id INTO mirror_id;
    INSERT INTO distribuicao_itens (distribuicao_id, socio_id, valor) VALUES (mirror_id, e.socio_destino_id, NEW.valor);
  ELSE
    UPDATE distribuicoes SET valor_total = NEW.valor WHERE id = mirror_id;
    UPDATE distribuicao_itens SET valor = NEW.valor WHERE distribuicao_id = mirror_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_espelhar_item_distribuicao
AFTER INSERT OR UPDATE OF valor, socio_id OR DELETE ON public.distribuicao_itens
FOR EACH ROW EXECUTE FUNCTION public.espelhar_item_distribuicao();

CREATE OR REPLACE FUNCTION public.espelhar_status_distribuicao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE distribuicoes m SET status = NEW.status, data_distribuicao = NEW.data_distribuicao, competencia = NEW.competencia
  FROM distribuicao_itens i
  WHERE i.distribuicao_id = NEW.id AND m.espelho_origem_item_id = i.id
    AND (m.status IS DISTINCT FROM NEW.status OR m.data_distribuicao IS DISTINCT FROM NEW.data_distribuicao OR m.competencia IS DISTINCT FROM NEW.competencia);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_espelhar_status_distribuicao
AFTER UPDATE OF status, data_distribuicao, competencia ON public.distribuicoes
FOR EACH ROW EXECUTE FUNCTION public.espelhar_status_distribuicao();

REVOKE EXECUTE ON FUNCTION public.espelhar_item_distribuicao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.espelhar_status_distribuicao() FROM PUBLIC, anon, authenticated;