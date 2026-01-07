-- Allow authenticated client portal users to fetch legal representative signature/data
-- This is needed to render signatures on client-downloaded PDFs (Contrato/ATPV)

CREATE POLICY "Authenticated can view legal representative setting"
ON public.company_settings
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND key = 'legal_representative'
);
