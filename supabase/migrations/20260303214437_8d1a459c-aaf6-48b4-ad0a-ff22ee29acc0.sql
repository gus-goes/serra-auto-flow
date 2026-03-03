
ALTER TABLE public.tracking_runs DROP CONSTRAINT IF EXISTS tracking_runs_client_id_fkey;
ALTER TABLE public.tracking_runs ADD CONSTRAINT tracking_runs_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.tracking_runs DROP CONSTRAINT IF EXISTS tracking_runs_vehicle_id_fkey;
ALTER TABLE public.tracking_runs ADD CONSTRAINT tracking_runs_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;
