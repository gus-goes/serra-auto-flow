-- Allow staff to delete receipts
CREATE POLICY "Staff can delete receipts"
ON public.receipts
FOR DELETE
USING (is_staff(auth.uid()));