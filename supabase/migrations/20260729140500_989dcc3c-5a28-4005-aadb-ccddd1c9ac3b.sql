CREATE TABLE public.dividend_cache (
  ticker text PRIMARY KEY,
  trading_name text,
  eventos_cash jsonb NOT NULL DEFAULT '[]'::jsonb,
  historico_completo jsonb NOT NULL DEFAULT '[]'::jsonb,
  provisionados jsonb NOT NULL DEFAULT '[]'::jsonb,
  historico jsonb NOT NULL DEFAULT '[]'::jsonb,
  fonte text,
  error text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dividend_cache_fetched_at_idx ON public.dividend_cache (fetched_at);

GRANT SELECT ON public.dividend_cache TO anon;
GRANT SELECT ON public.dividend_cache TO authenticated;
GRANT ALL ON public.dividend_cache TO service_role;

ALTER TABLE public.dividend_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proventos são públicos para leitura"
ON public.dividend_cache
FOR SELECT
TO anon, authenticated
USING (true);