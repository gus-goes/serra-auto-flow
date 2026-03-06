
-- Create deposit_status enum
CREATE TYPE public.deposit_status AS ENUM ('pendente', 'pago', 'devolvido');

-- Add new columns to tracking_runs
ALTER TABLE public.tracking_runs
  ADD COLUMN deposit_amount numeric DEFAULT 0,
  ADD COLUMN deposit_status public.deposit_status DEFAULT 'pendente',
  ADD COLUMN vehicle_total_price numeric DEFAULT 0,
  ADD COLUMN remaining_amount numeric DEFAULT 0,
  ADD COLUMN estimated_delivery_date date,
  ADD COLUMN dispatcher_name text,
  ADD COLUMN mechanic_name text,
  ADD COLUMN notes text,
  ADD COLUMN contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  ADD COLUMN receipt_id uuid REFERENCES public.receipts(id) ON DELETE SET NULL,
  ADD COLUMN warranty_id uuid REFERENCES public.warranties(id) ON DELETE SET NULL,
  ADD COLUMN delivery_confirmed_at timestamptz,
  ADD COLUMN cancellation_reason text;

-- Allow staff to delete tracking_runs
CREATE POLICY "Staff can delete tracking runs"
  ON public.tracking_runs
  FOR DELETE
  TO authenticated
  USING (is_staff(auth.uid()));
