-- Fix RLS policies to use case-insensitive email comparison

-- Drop existing policies for clients
DROP POLICY IF EXISTS "Clients can view own data" ON public.clients;
DROP POLICY IF EXISTS "Clients can update own data" ON public.clients;

-- Recreate with case-insensitive comparison
CREATE POLICY "Clients can view own data" 
ON public.clients 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE LOWER(p.email) = LOWER(clients.email) 
  AND p.id = auth.uid()
));

CREATE POLICY "Clients can update own data" 
ON public.clients 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE LOWER(p.email) = LOWER(clients.email) 
  AND p.id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE LOWER(p.email) = LOWER(clients.email) 
  AND p.id = auth.uid()
));

-- Fix proposals policy
DROP POLICY IF EXISTS "Clients can view own proposals" ON public.proposals;
CREATE POLICY "Clients can view own proposals" 
ON public.proposals 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM clients c 
  JOIN profiles p ON LOWER(p.email) = LOWER(c.email)
  WHERE c.id = proposals.client_id 
  AND p.id = auth.uid()
));

-- Fix contracts policy
DROP POLICY IF EXISTS "Clients can view own contracts" ON public.contracts;
CREATE POLICY "Clients can view own contracts" 
ON public.contracts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM clients c 
  JOIN profiles p ON LOWER(p.email) = LOWER(c.email)
  WHERE c.id = contracts.client_id 
  AND p.id = auth.uid()
));

-- Fix receipts policy
DROP POLICY IF EXISTS "Clients can view own receipts" ON public.receipts;
CREATE POLICY "Clients can view own receipts" 
ON public.receipts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM clients c 
  JOIN profiles p ON LOWER(p.email) = LOWER(c.email)
  WHERE c.id = receipts.client_id 
  AND p.id = auth.uid()
));

-- Fix warranties policy  
DROP POLICY IF EXISTS "Clients can view own warranties" ON public.warranties;
CREATE POLICY "Clients can view own warranties" 
ON public.warranties 
FOR SELECT 
USING (client_id IN (
  SELECT c.id FROM clients c 
  JOIN profiles p ON LOWER(c.email) = LOWER(p.email)
  WHERE p.id = auth.uid()
));

-- Fix transfer_authorizations policy
DROP POLICY IF EXISTS "Clients can view own transfer_authorizations" ON public.transfer_authorizations;
CREATE POLICY "Clients can view own transfer_authorizations" 
ON public.transfer_authorizations 
FOR SELECT 
USING (client_id IN (
  SELECT c.id FROM clients c 
  JOIN profiles p ON LOWER(c.email) = LOWER(p.email)
  WHERE p.id = auth.uid()
));

-- Fix reservations policy
DROP POLICY IF EXISTS "Clients can view own reservations" ON public.reservations;
CREATE POLICY "Clients can view own reservations" 
ON public.reservations 
FOR SELECT 
USING (client_id IN (
  SELECT c.id FROM clients c 
  JOIN profiles p ON LOWER(c.email) = LOWER(p.email)
  WHERE p.id = auth.uid()
));

-- Fix withdrawal_declarations policy
DROP POLICY IF EXISTS "Clients can view own withdrawal_declarations" ON public.withdrawal_declarations;
CREATE POLICY "Clients can view own withdrawal_declarations" 
ON public.withdrawal_declarations 
FOR SELECT 
USING (client_id IN (
  SELECT c.id FROM clients c 
  JOIN profiles p ON LOWER(c.email) = LOWER(p.email)
  WHERE p.id = auth.uid()
));

-- Fix vehicles policy for clients
DROP POLICY IF EXISTS "Clients can view vehicles in their documents" ON public.vehicles;
CREATE POLICY "Clients can view vehicles in their documents" 
ON public.vehicles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM clients c 
  JOIN profiles p ON LOWER(p.email) = LOWER(c.email)
  WHERE p.id = auth.uid() 
  AND (
    EXISTS (SELECT 1 FROM contracts WHERE contracts.vehicle_id = vehicles.id AND contracts.client_id = c.id)
    OR EXISTS (SELECT 1 FROM proposals WHERE proposals.vehicle_id = vehicles.id AND proposals.client_id = c.id)
    OR EXISTS (SELECT 1 FROM receipts WHERE receipts.vehicle_id = vehicles.id AND receipts.client_id = c.id)
    OR EXISTS (SELECT 1 FROM warranties WHERE warranties.vehicle_id = vehicles.id AND warranties.client_id = c.id)
    OR EXISTS (SELECT 1 FROM transfer_authorizations WHERE transfer_authorizations.vehicle_id = vehicles.id AND transfer_authorizations.client_id = c.id)
    OR EXISTS (SELECT 1 FROM reservations WHERE reservations.vehicle_id = vehicles.id AND reservations.client_id = c.id)
    OR EXISTS (SELECT 1 FROM withdrawal_declarations WHERE withdrawal_declarations.vehicle_id = vehicles.id AND withdrawal_declarations.client_id = c.id)
  )
));