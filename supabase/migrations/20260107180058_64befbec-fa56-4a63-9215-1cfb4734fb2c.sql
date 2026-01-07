
-- Create company_settings table for centralized configuration
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Staff can read settings
CREATE POLICY "Staff can view settings"
ON public.company_settings
FOR SELECT
USING (is_staff(auth.uid()));

-- Only admins can modify settings
CREATE POLICY "Admins can manage settings"
ON public.company_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default legal representative (Jackson Delfes de Moraes)
INSERT INTO public.company_settings (key, value)
VALUES ('legal_representative', '{
  "name": "Jackson Delfes de Moraes",
  "nationality": "Brasileiro",
  "maritalStatus": "casado(a)",
  "occupation": "Empresário",
  "rg": "4.663.620",
  "cpf": "039.855.889-05",
  "signature": ""
}'::jsonb);
