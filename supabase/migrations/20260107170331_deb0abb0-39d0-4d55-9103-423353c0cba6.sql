-- Permitir que clientes vejam veículos associados aos seus contratos, propostas ou recibos
CREATE POLICY "Clients can view vehicles in their documents"
ON public.vehicles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN profiles p ON p.email = c.email
    WHERE p.id = auth.uid()
    AND (
      -- Veículo está em um contrato do cliente
      EXISTS (SELECT 1 FROM contracts WHERE contracts.vehicle_id = vehicles.id AND contracts.client_id = c.id)
      OR
      -- Veículo está em uma proposta do cliente
      EXISTS (SELECT 1 FROM proposals WHERE proposals.vehicle_id = vehicles.id AND proposals.client_id = c.id)
      OR
      -- Veículo está em um recibo do cliente
      EXISTS (SELECT 1 FROM receipts WHERE receipts.vehicle_id = vehicles.id AND receipts.client_id = c.id)
    )
  )
);