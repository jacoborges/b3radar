CREATE TABLE public.brokers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brokers_id_user_unique UNIQUE (id, user_id)
);
CREATE UNIQUE INDEX brokers_user_name_unique ON public.brokers (user_id, lower(btrim(name)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brokers TO authenticated;
GRANT ALL ON public.brokers TO service_role;

ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios gerenciam as proprias corretoras" ON public.brokers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.portfolios ADD COLUMN broker_id uuid;
ALTER TABLE public.portfolios
  ADD CONSTRAINT portfolios_broker_owner_fkey
  FOREIGN KEY (broker_id, user_id) REFERENCES public.brokers (id, user_id)
  ON DELETE SET NULL (broker_id);
CREATE INDEX portfolios_broker_id_idx ON public.portfolios (broker_id);