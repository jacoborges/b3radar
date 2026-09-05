CREATE TABLE public.market_cache (
  kind TEXT NOT NULL,
  ticker TEXT NOT NULL,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, ticker)
);

GRANT SELECT ON public.market_cache TO anon;
GRANT SELECT ON public.market_cache TO authenticated;
GRANT ALL ON public.market_cache TO service_role;

ALTER TABLE public.market_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache de mercado é público para leitura"
ON public.market_cache FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX market_cache_fetched_at_idx ON public.market_cache (fetched_at);