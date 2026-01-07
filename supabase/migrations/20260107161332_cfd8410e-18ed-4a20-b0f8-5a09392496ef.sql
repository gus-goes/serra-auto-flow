-- Add RLS policies for clients to view their own proposals
CREATE POLICY "Clients can view own proposals" 
ON public.proposals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN profiles p ON (p.email = c.email)
    WHERE c.id = proposals.client_id AND p.id = auth.uid()
  )
);

-- Add RLS policies for clients to view their own receipts
CREATE POLICY "Clients can view own receipts" 
ON public.receipts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN profiles p ON (p.email = c.email)
    WHERE c.id = receipts.client_id AND p.id = auth.uid()
  )
);