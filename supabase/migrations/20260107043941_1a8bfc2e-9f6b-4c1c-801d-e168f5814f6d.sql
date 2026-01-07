
-- =====================
-- ENUMS
-- =====================
CREATE TYPE public.vehicle_status AS ENUM ('disponivel', 'reservado', 'vendido');
CREATE TYPE public.fuel_type AS ENUM ('flex', 'gasolina', 'etanol', 'diesel', 'eletrico', 'hibrido');
CREATE TYPE public.transmission_type AS ENUM ('manual', 'automatico', 'cvt', 'automatizado');
CREATE TYPE public.marital_status AS ENUM ('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel');
CREATE TYPE public.funnel_stage AS ENUM ('lead', 'atendimento', 'simulacao', 'proposta', 'vendido', 'perdido');
CREATE TYPE public.proposal_status AS ENUM ('pendente', 'aprovada', 'recusada', 'cancelada');
CREATE TYPE public.proposal_type AS ENUM ('financiamento_bancario', 'financiamento_direto', 'a_vista');
CREATE TYPE public.payment_method AS ENUM ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'boleto', 'cheque');
CREATE TYPE public.payment_reference AS ENUM ('entrada', 'sinal', 'parcial', 'quitacao');
CREATE TYPE public.reservation_status AS ENUM ('ativa', 'cancelada', 'convertida');

-- =====================
-- VEHICLES
-- =====================
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  version TEXT,
  year_fab INTEGER NOT NULL,
  year_model INTEGER NOT NULL,
  color TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  mileage INTEGER DEFAULT 0,
  fuel fuel_type NOT NULL DEFAULT 'flex',
  transmission transmission_type NOT NULL DEFAULT 'manual',
  plate TEXT,
  chassi TEXT,
  renavam TEXT,
  crv_number TEXT,
  status vehicle_status NOT NULL DEFAULT 'disponivel',
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all vehicles" ON public.vehicles
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert vehicles" ON public.vehicles
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update vehicles" ON public.vehicles
  FOR UPDATE USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete vehicles" ON public.vehicles
  FOR DELETE USING (public.is_staff(auth.uid()));

-- =====================
-- CLIENTS
-- =====================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  birth_date DATE,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  marital_status marital_status,
  occupation TEXT,
  funnel_stage funnel_stage NOT NULL DEFAULT 'lead',
  notes TEXT,
  seller_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all clients" ON public.clients
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert clients" ON public.clients
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update clients" ON public.clients
  FOR UPDATE USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete clients" ON public.clients
  FOR DELETE USING (public.is_staff(auth.uid()));

-- =====================
-- BANKS (configuração de bancos para financiamento)
-- =====================
CREATE TABLE public.banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#000000',
  interest_rate DECIMAL(5,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view banks" ON public.banks
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins can manage banks" ON public.banks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- PROPOSALS
-- =====================
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_number TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES auth.users(id),
  status proposal_status NOT NULL DEFAULT 'pendente',
  type proposal_type NOT NULL,
  
  -- Valores
  vehicle_price DECIMAL(12,2) NOT NULL,
  down_payment DECIMAL(12,2) DEFAULT 0,
  financed_amount DECIMAL(12,2) DEFAULT 0,
  installments INTEGER DEFAULT 1,
  installment_value DECIMAL(12,2) DEFAULT 0,
  interest_rate DECIMAL(5,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  
  -- Banco (para financiamento bancário)
  bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL,
  
  -- Datas
  first_due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all proposals" ON public.proposals
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert proposals" ON public.proposals
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update proposals" ON public.proposals
  FOR UPDATE USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete proposals" ON public.proposals
  FOR DELETE USING (public.is_staff(auth.uid()));

-- =====================
-- RECEIPTS
-- =====================
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES auth.users(id),
  
  amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method NOT NULL,
  payment_reference payment_reference NOT NULL,
  
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all receipts" ON public.receipts
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert receipts" ON public.receipts
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update receipts" ON public.receipts
  FOR UPDATE USING (public.is_staff(auth.uid()));

-- =====================
-- SALES
-- =====================
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES auth.users(id),
  
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_value DECIMAL(12,2) NOT NULL,
  commission_value DECIMAL(12,2) DEFAULT 0,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all sales" ON public.sales
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert sales" ON public.sales
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update sales" ON public.sales
  FOR UPDATE USING (public.is_staff(auth.uid()));

-- =====================
-- CONTRACTS
-- =====================
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES auth.users(id),
  
  contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_percentage DECIMAL(5,2) DEFAULT 50,
  first_due_date DATE,
  
  client_signature TEXT,
  seller_signature TEXT,
  signed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all contracts" ON public.contracts
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage contracts" ON public.contracts
  FOR ALL USING (public.is_staff(auth.uid()));

-- Clientes podem ver seus próprios contratos
CREATE POLICY "Clients can view own contracts" ON public.contracts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.profiles p ON p.email = c.email
      WHERE c.id = contracts.client_id AND p.id = auth.uid()
    )
  );

-- =====================
-- RESERVATIONS
-- =====================
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES auth.users(id),
  
  reservation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  deposit_amount DECIMAL(12,2) DEFAULT 0,
  status reservation_status NOT NULL DEFAULT 'ativa',
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all reservations" ON public.reservations
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage reservations" ON public.reservations
  FOR ALL USING (public.is_staff(auth.uid()));

-- =====================
-- ACTIVITY LOG
-- =====================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view activity logs" ON public.activity_logs
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Authenticated users can insert logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================
-- TRIGGERS para updated_at
-- =====================
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_banks_updated_at BEFORE UPDATE ON public.banks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- STORAGE BUCKET para fotos de veículos
-- =====================
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-photos', 'vehicle-photos', true);

CREATE POLICY "Anyone can view vehicle photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehicle-photos');

CREATE POLICY "Staff can upload vehicle photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'vehicle-photos' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can update vehicle photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'vehicle-photos' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete vehicle photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'vehicle-photos' AND public.is_staff(auth.uid()));

-- =====================
-- Tabela para fotos de veículos (referências)
-- =====================
CREATE TABLE public.vehicle_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view vehicle photos" ON public.vehicle_photos
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage vehicle photos" ON public.vehicle_photos
  FOR ALL USING (public.is_staff(auth.uid()));
