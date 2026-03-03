DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tracking_runs'
      AND policyname = 'Authenticated users can update tracking runs'
  ) THEN
    DROP POLICY "Authenticated users can update tracking runs" ON public.tracking_runs;
  END IF;
END $$;

CREATE POLICY "Authenticated users can update tracking runs"
ON public.tracking_runs
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by OR public.is_staff(auth.uid()))
WITH CHECK (auth.uid() = created_by OR public.is_staff(auth.uid()));