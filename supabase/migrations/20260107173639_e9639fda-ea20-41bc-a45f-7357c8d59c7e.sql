-- Drop the existing policy for clients viewing vehicles
DROP POLICY IF EXISTS "Clients can view vehicles in their documents" ON public.vehicles;

-- Create new expanded policy that includes all document types
CREATE POLICY "Clients can view vehicles in their documents"
ON public.vehicles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM clients c
    JOIN profiles p ON p.email = c.email
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
  )
);