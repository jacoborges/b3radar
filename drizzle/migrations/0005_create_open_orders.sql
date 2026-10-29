CREATE TABLE public.open_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  price numeric NOT NULL CHECK (price > 0),
  quantity numeric NOT NULL CHECK (quantity > 0),
  filled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.open_orders TO authenticated;
GRANT ALL ON public.open_orders TO service_role;
ALTER TABLE public.open_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios gerenciam as proprias ordens" ON public.open_orders FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_id AND p.user_id = auth.uid()));