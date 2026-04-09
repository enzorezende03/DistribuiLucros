
ALTER TABLE public.clientes
ADD COLUMN ata_registrada boolean NOT NULL DEFAULT false,
ADD COLUMN saldo_lucros_acumulados numeric NOT NULL DEFAULT 0;
