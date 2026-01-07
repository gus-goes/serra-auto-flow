-- =============================================
-- MIGRAÇÃO COMPLETA: Adicionar tabelas faltantes
-- =============================================

-- 1. Tabela de simulações
CREATE TABLE IF NOT EXISTS public.simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  seller_id UUID,
  vehicle_price NUMERIC NOT NULL DEFAULT 0,
  down_payment NUMERIC NOT NULL DEFAULT 0,
  financed_amount NUMERIC NOT NULL DEFAULT 0,
  bank_name TEXT,
  installments INTEGER NOT NULL DEFAULT 1,
  interest_rate NUMERIC NOT NULL DEFAULT 0,
  installment_value NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  cet NUMERIC DEFAULT 0,
  vendor_commission NUMERIC DEFAULT 0,
  store_margin NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for simulations
CREATE POLICY "Staff can view all simulations"
ON public.simulations FOR SELECT
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can insert simulations"
ON public.simulations FOR INSERT
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update simulations"
ON public.simulations FOR UPDATE
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete simulations"
ON public.simulations FOR DELETE
USING (is_staff(auth.uid()));

-- 2. Tabela de garantias (warranties)
CREATE TABLE IF NOT EXISTS public.warranties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warranty_number TEXT NOT NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  seller_id UUID,
  warranty_period TEXT NOT NULL DEFAULT '6 meses',
  warranty_coverage TEXT NOT NULL DEFAULT 'Motor e Câmbio',
  warranty_km INTEGER DEFAULT 200000,
  conditions TEXT,
  client_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage warranties"
ON public.warranties FOR ALL
USING (is_staff(auth.uid()));

-- 3. Tabela de autorizações de transferência (ATPV)
CREATE TABLE IF NOT EXISTS public.transfer_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  authorization_number TEXT NOT NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  seller_id UUID,
  vehicle_value NUMERIC NOT NULL DEFAULT 0,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location TEXT NOT NULL DEFAULT 'Lages/SC',
  vendor_signature TEXT,
  client_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transfer_authorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage transfer_authorizations"
ON public.transfer_authorizations FOR ALL
USING (is_staff(auth.uid()));

-- 4. Tabela de declarações de desistência
CREATE TABLE IF NOT EXISTS public.withdrawal_declarations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  declaration_number TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  seller_id UUID,
  reason TEXT,
  declaration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage withdrawal_declarations"
ON public.withdrawal_declarations FOR ALL
USING (is_staff(auth.uid()));

-- 5. Adicionar campos faltantes em tabelas existentes

-- Adicionar campos JSONB para dados do cliente/veículo no contrato
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_data JSONB;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS vehicle_data JSONB;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS vehicle_price NUMERIC;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'avista';
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS down_payment NUMERIC;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS installments INTEGER;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS installment_value NUMERIC;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS due_day INTEGER;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS witness1 JSONB;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS witness2 JSONB;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Adicionar campos para bancos
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS rates JSONB DEFAULT '{"12": 1.89, "24": 1.99, "36": 2.09, "48": 2.19, "60": 2.29}'::jsonb;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS color_hex TEXT;

-- Adicionar campos para proposals
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS cash_price NUMERIC;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS is_own_financing BOOLEAN DEFAULT false;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS client_signature TEXT;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS vendor_signature TEXT;

-- Adicionar campos para receipts
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS client_signature TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS vendor_signature TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS payer_name TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS payer_cpf TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Lages - SC';
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS description TEXT;

-- Adicionar campos para vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS crv_number TEXT;

-- Adicionar campos para reservations
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS reservation_number TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS client_signature TEXT;

-- 6. Criar função para gerar números sequenciais
CREATE OR REPLACE FUNCTION public.generate_document_number(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_month TEXT;
  random_part TEXT;
BEGIN
  year_month := to_char(now(), 'YYYYMM');
  random_part := lpad(floor(random() * 9999)::text, 4, '0');
  RETURN prefix || year_month || random_part;
END;
$$;

-- 7. Criar trigger para atualizar updated_at nos contratos
CREATE OR REPLACE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Criar bucket para logos de bancos (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bank-logos', 'bank-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for bank logos
CREATE POLICY "Bank logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'bank-logos');

CREATE POLICY "Staff can upload bank logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bank-logos' AND is_staff(auth.uid()));

CREATE POLICY "Staff can update bank logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'bank-logos' AND is_staff(auth.uid()));

CREATE POLICY "Staff can delete bank logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'bank-logos' AND is_staff(auth.uid()));