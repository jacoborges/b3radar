CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
GRANT ALL ON public.portfolios TO service_role;

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam as proprias carteiras"
ON public.portfolios FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_portfolios_updated_at
BEFORE UPDATE ON public.portfolios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.portfolio_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  price numeric(14,4) NOT NULL CHECK (price > 0),
  quantity numeric(18,6) NOT NULL CHECK (quantity > 0),
  bought_at date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX portfolio_lots_portfolio_id_idx ON public.portfolio_lots(portfolio_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_lots TO authenticated;
GRANT ALL ON public.portfolio_lots TO service_role;

ALTER TABLE public.portfolio_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam os proprios lancamentos"
ON public.portfolio_lots FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_id AND p.user_id = auth.uid()));

CREATE TRIGGER update_portfolio_lots_updated_at
BEFORE UPDATE ON public.portfolio_lots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();