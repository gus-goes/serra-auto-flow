-- Permitir que clientes atualizem seus próprios dados
CREATE POLICY "Clients can update own data"
ON public.clients
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.email = clients.email
    AND p.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.email = clients.email
    AND p.id = auth.uid()
  )
);

-- Permitir que clientes vejam seus próprios dados
CREATE POLICY "Clients can view own data"
ON public.clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.email = clients.email
    AND p.id = auth.uid()
  )
);