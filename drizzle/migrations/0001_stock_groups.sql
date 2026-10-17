CREATE TABLE public.stock_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#22c55e',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_groups TO authenticated;
GRANT ALL ON public.stock_groups TO service_role;
ALTER TABLE public.stock_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios gerenciam os proprios grupos" ON public.stock_groups FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_stock_groups_updated_at BEFORE UPDATE ON public.stock_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.stock_group_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.stock_groups(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, ticker)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_group_items TO authenticated;
GRANT ALL ON public.stock_group_items TO service_role;
ALTER TABLE public.stock_group_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios gerenciam itens dos proprios grupos" ON public.stock_group_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.stock_groups g WHERE g.id = stock_group_items.group_id AND g.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.stock_groups g WHERE g.id = stock_group_items.group_id AND g.user_id = auth.uid()));