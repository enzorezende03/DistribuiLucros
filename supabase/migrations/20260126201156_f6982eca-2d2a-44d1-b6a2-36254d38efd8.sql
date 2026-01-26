-- Enums para os tipos
CREATE TYPE public.status_distribuicao AS ENUM ('RECEBIDA', 'EM_VALIDACAO', 'APROVADA', 'AJUSTE_SOLICITADO', 'CANCELADA');
CREATE TYPE public.tipo_alerta AS ENUM ('ALERTA_50K', 'PENDENTE_MES');
CREATE TYPE public.resposta_confirmacao AS ENUM ('NAO_HOUVE', 'HOUVE');
CREATE TYPE public.status_cliente AS ENUM ('ativo', 'suspenso');
CREATE TYPE public.app_role AS ENUM ('admin', 'cliente');

-- Tabela de roles de usuário (separada conforme best practices)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'cliente',
    cliente_id UUID, -- referência ao cliente (preenchido para role cliente)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Tabela de Clientes
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social TEXT NOT NULL,
    cnpj TEXT NOT NULL UNIQUE,
    email_responsavel TEXT NOT NULL,
    email_copia TEXT,
    telefone TEXT,
    status status_cliente NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Sócios
CREATE TABLE public.socios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    percentual NUMERIC,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Distribuições
CREATE TABLE public.distribuicoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    competencia TEXT NOT NULL, -- formato YYYY-MM
    data_distribuicao DATE NOT NULL,
    valor_total NUMERIC NOT NULL CHECK (valor_total >= 0),
    forma_pagamento TEXT NOT NULL,
    solicitante_nome TEXT NOT NULL,
    solicitante_email TEXT NOT NULL,
    status status_distribuicao NOT NULL DEFAULT 'RECEBIDA',
    recibo_numero TEXT UNIQUE,
    recibo_pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Itens de Distribuição (rateio por sócio)
CREATE TABLE public.distribuicao_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribuicao_id UUID REFERENCES public.distribuicoes(id) ON DELETE CASCADE NOT NULL,
    socio_id UUID REFERENCES public.socios(id) ON DELETE CASCADE NOT NULL,
    valor NUMERIC NOT NULL CHECK (valor >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Confirmações de Mês
CREATE TABLE public.confirmacoes_mes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    competencia TEXT NOT NULL, -- formato YYYY-MM
    resposta resposta_confirmacao NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (cliente_id, competencia)
);

-- Tabela de Alertas
CREATE TABLE public.alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    socio_id UUID REFERENCES public.socios(id) ON DELETE SET NULL,
    competencia TEXT NOT NULL,
    tipo tipo_alerta NOT NULL,
    descricao TEXT NOT NULL,
    resolvido BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de sequência para recibos
CREATE TABLE public.recibo_sequencia (
    id SERIAL PRIMARY KEY,
    ano INTEGER NOT NULL UNIQUE,
    ultimo_numero INTEGER NOT NULL DEFAULT 0
);

-- Adicionar FK de user_roles para clientes
ALTER TABLE public.user_roles ADD CONSTRAINT fk_user_roles_cliente FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribuicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribuicao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmacoes_mes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recibo_sequencia ENABLE ROW LEVEL SECURITY;

-- Funções helper para RLS (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_cliente_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cliente_id FROM public.user_roles
  WHERE user_id = _user_id AND role = 'cliente'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_cliente_owner(_cliente_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_cliente_id(auth.uid()) = _cliente_id
$$;

-- Policies para user_roles
CREATE POLICY "Admins can do all on user_roles" ON public.user_roles FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Policies para clientes
CREATE POLICY "Admins can do all on clientes" ON public.clientes FOR ALL USING (public.is_admin());
CREATE POLICY "Clientes can view own company" ON public.clientes FOR SELECT USING (public.is_cliente_owner(id));

-- Policies para socios
CREATE POLICY "Admins can do all on socios" ON public.socios FOR ALL USING (public.is_admin());
CREATE POLICY "Clientes can view own socios" ON public.socios FOR SELECT USING (public.is_cliente_owner(cliente_id));

-- Policies para distribuicoes
CREATE POLICY "Admins can do all on distribuicoes" ON public.distribuicoes FOR ALL USING (public.is_admin());
CREATE POLICY "Clientes can view own distribuicoes" ON public.distribuicoes FOR SELECT USING (public.is_cliente_owner(cliente_id));
CREATE POLICY "Clientes can insert own distribuicoes" ON public.distribuicoes FOR INSERT WITH CHECK (public.is_cliente_owner(cliente_id));
CREATE POLICY "Clientes can update own distribuicoes" ON public.distribuicoes FOR UPDATE USING (public.is_cliente_owner(cliente_id));

-- Policies para distribuicao_itens
CREATE POLICY "Admins can do all on distribuicao_itens" ON public.distribuicao_itens FOR ALL USING (public.is_admin());
CREATE POLICY "Clientes can view own itens" ON public.distribuicao_itens FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.distribuicoes d WHERE d.id = distribuicao_id AND public.is_cliente_owner(d.cliente_id)
));
CREATE POLICY "Clientes can insert own itens" ON public.distribuicao_itens FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.distribuicoes d WHERE d.id = distribuicao_id AND public.is_cliente_owner(d.cliente_id)
));
CREATE POLICY "Clientes can update own itens" ON public.distribuicao_itens FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.distribuicoes d WHERE d.id = distribuicao_id AND public.is_cliente_owner(d.cliente_id)
));

-- Policies para confirmacoes_mes
CREATE POLICY "Admins can do all on confirmacoes_mes" ON public.confirmacoes_mes FOR ALL USING (public.is_admin());
CREATE POLICY "Clientes can view own confirmacoes" ON public.confirmacoes_mes FOR SELECT USING (public.is_cliente_owner(cliente_id));
CREATE POLICY "Clientes can insert own confirmacoes" ON public.confirmacoes_mes FOR INSERT WITH CHECK (public.is_cliente_owner(cliente_id));

-- Policies para alertas
CREATE POLICY "Admins can do all on alertas" ON public.alertas FOR ALL USING (public.is_admin());
CREATE POLICY "Clientes can view own alertas" ON public.alertas FOR SELECT USING (public.is_cliente_owner(cliente_id));

-- Policies para recibo_sequencia (apenas admin)
CREATE POLICY "Admins can manage sequencia" ON public.recibo_sequencia FOR ALL USING (public.is_admin());
CREATE POLICY "Authenticated can read sequencia" ON public.recibo_sequencia FOR SELECT TO authenticated USING (true);

-- Função para gerar número de recibo
CREATE OR REPLACE FUNCTION public.gerar_numero_recibo()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ano_atual INTEGER := EXTRACT(YEAR FROM now());
  novo_numero INTEGER;
  recibo_numero TEXT;
BEGIN
  INSERT INTO public.recibo_sequencia (ano, ultimo_numero)
  VALUES (ano_atual, 1)
  ON CONFLICT (ano) 
  DO UPDATE SET ultimo_numero = recibo_sequencia.ultimo_numero + 1
  RETURNING ultimo_numero INTO novo_numero;
  
  recibo_numero := 'DL-' || ano_atual::TEXT || '-' || LPAD(novo_numero::TEXT, 6, '0');
  RETURN recibo_numero;
END;
$$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_socios_updated_at BEFORE UPDATE ON public.socios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_distribuicoes_updated_at BEFORE UPDATE ON public.distribuicoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para verificar alerta 50k
CREATE OR REPLACE FUNCTION public.check_alerta_50k()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_id UUID;
  v_competencia TEXT;
  total_socio NUMERIC;
BEGIN
  -- Pegar cliente_id e competencia da distribuição
  SELECT d.cliente_id, d.competencia INTO v_cliente_id, v_competencia
  FROM public.distribuicoes d WHERE d.id = NEW.distribuicao_id;
  
  -- Calcular total do sócio no mês
  SELECT COALESCE(SUM(di.valor), 0) INTO total_socio
  FROM public.distribuicao_itens di
  JOIN public.distribuicoes d ON d.id = di.distribuicao_id
  WHERE di.socio_id = NEW.socio_id AND d.competencia = v_competencia;
  
  -- Se ultrapassou 50k e não existe alerta, criar
  IF total_socio > 50000 THEN
    INSERT INTO public.alertas (cliente_id, socio_id, competencia, tipo, descricao)
    SELECT v_cliente_id, NEW.socio_id, v_competencia, 'ALERTA_50K',
           'Sócio ultrapassou R$ 50.000 no mês. Total: R$ ' || total_socio::TEXT
    WHERE NOT EXISTS (
      SELECT 1 FROM public.alertas 
      WHERE cliente_id = v_cliente_id AND socio_id = NEW.socio_id 
        AND competencia = v_competencia AND tipo = 'ALERTA_50K'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_check_alerta_50k
AFTER INSERT OR UPDATE ON public.distribuicao_itens
FOR EACH ROW EXECUTE FUNCTION public.check_alerta_50k();

-- Índices para performance
CREATE INDEX idx_socios_cliente ON public.socios(cliente_id);
CREATE INDEX idx_distribuicoes_cliente ON public.distribuicoes(cliente_id);
CREATE INDEX idx_distribuicoes_competencia ON public.distribuicoes(competencia);
CREATE INDEX idx_distribuicao_itens_distribuicao ON public.distribuicao_itens(distribuicao_id);
CREATE INDEX idx_distribuicao_itens_socio ON public.distribuicao_itens(socio_id);
CREATE INDEX idx_confirmacoes_cliente_competencia ON public.confirmacoes_mes(cliente_id, competencia);
CREATE INDEX idx_alertas_cliente ON public.alertas(cliente_id);
CREATE INDEX idx_alertas_tipo ON public.alertas(tipo);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- Grant para funções
GRANT EXECUTE ON FUNCTION public.gerar_numero_recibo() TO authenticated;