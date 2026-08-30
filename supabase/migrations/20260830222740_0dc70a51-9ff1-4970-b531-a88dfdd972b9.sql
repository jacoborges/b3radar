CREATE TABLE public.sim_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sim_portfolios TO authenticated;
GRANT ALL ON public.sim_portfolios TO service_role;
ALTER TABLE public.sim_portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios gerenciam as proprias simulacoes"
ON public.sim_portfolios FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_sim_portfolios_updated_at
BEFORE UPDATE ON public.sim_portfolios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sim_portfolio_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.sim_portfolios(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  bought_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sim_portfolio_lots TO authenticated;
GRANT ALL ON public.sim_portfolio_lots TO service_role;
ALTER TABLE public.sim_portfolio_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios gerenciam os proprios lancamentos simulados"
ON public.sim_portfolio_lots FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.sim_portfolios p WHERE p.id = sim_portfolio_lots.portfolio_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.sim_portfolios p WHERE p.id = sim_portfolio_lots.portfolio_id AND p.user_id = auth.uid()));

CREATE INDEX sim_portfolio_lots_portfolio_id_idx ON public.sim_portfolio_lots(portfolio_id);

CREATE TRIGGER update_sim_portfolio_lots_updated_at
BEFORE UPDATE ON public.sim_portfolio_lots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();