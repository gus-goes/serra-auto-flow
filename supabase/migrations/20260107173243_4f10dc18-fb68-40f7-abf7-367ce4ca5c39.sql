-- Add RLS policies for clients to view their own documents

-- Warranties: Allow clients to view their own warranties
CREATE POLICY "Clients can view own warranties" 
ON public.warranties 
FOR SELECT 
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    INNER JOIN public.profiles p ON c.email = p.email
    WHERE p.id = auth.uid()
  )
);

-- Transfer Authorizations: Allow clients to view their own transfer authorizations
CREATE POLICY "Clients can view own transfer_authorizations" 
ON public.transfer_authorizations 
FOR SELECT 
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    INNER JOIN public.profiles p ON c.email = p.email
    WHERE p.id = auth.uid()
  )
);

-- Reservations: Allow clients to view their own reservations
CREATE POLICY "Clients can view own reservations" 
ON public.reservations 
FOR SELECT 
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    INNER JOIN public.profiles p ON c.email = p.email
    WHERE p.id = auth.uid()
  )
);

-- Withdrawal Declarations: Allow clients to view their own withdrawal declarations
CREATE POLICY "Clients can view own withdrawal_declarations" 
ON public.withdrawal_declarations 
FOR SELECT 
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    INNER JOIN public.profiles p ON c.email = p.email
    WHERE p.id = auth.uid()
  )
);