CREATE TABLE public.portfolio_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  sold_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_sales TO authenticated;
GRANT ALL ON public.portfolio_sales TO service_role;

ALTER TABLE public.portfolio_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam as proprias vendas"
ON public.portfolio_sales FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_sales.portfolio_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_sales.portfolio_id AND p.user_id = auth.uid()));

CREATE INDEX portfolio_sales_portfolio_id_idx ON public.portfolio_sales (portfolio_id);

CREATE TRIGGER update_portfolio_sales_updated_at
BEFORE UPDATE ON public.portfolio_sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();