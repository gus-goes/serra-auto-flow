DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typnamespace = 'public'::regnamespace
      AND t.typname = 'tracking_status'
  ) THEN
    CREATE TYPE public.tracking_status AS ENUM ('aguardando', 'em_rota', 'no_local', 'retornando', 'concluido');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tracking_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id),
  client_id UUID REFERENCES public.clients(id),
  driver_name TEXT NOT NULL,
  origin_address TEXT NOT NULL,
  origin_lat DOUBLE PRECISION,
  origin_lng DOUBLE PRECISION,
  destination_address TEXT NOT NULL,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  status public.tracking_status NOT NULL DEFAULT 'aguardando',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid()
);

ALTER TABLE public.tracking_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tracking_runs'
      AND policyname = 'Authenticated users can read tracking runs'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read tracking runs"
      ON public.tracking_runs FOR SELECT TO authenticated
      USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tracking_runs'
      AND policyname = 'Authenticated users can create tracking runs'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can create tracking runs"
      ON public.tracking_runs FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = created_by)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tracking_runs'
      AND policyname = 'Authenticated users can update tracking runs'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can update tracking runs"
      ON public.tracking_runs FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tracking_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_runs;
  END IF;
END $$;