CREATE OR REPLACE FUNCTION public.record_portfolio_sale(_portfolio_id uuid, _ticker text, _price numeric, _quantity numeric, _sold_at date, _expected_lots jsonb, _expected_sales jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE _id uuid; _lots jsonb; _sales jsonb;
BEGIN
  PERFORM id FROM public.portfolios WHERE id = _portfolio_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carteira não encontrada.'; END IF;
  IF _quantity <= 0 OR _price <= 0 OR _sold_at > CURRENT_DATE THEN RAISE EXCEPTION 'Informe uma venda válida, sem data futura.'; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id), '[]'::jsonb) INTO _lots FROM (SELECT id, ticker, price, quantity, bought_at FROM public.portfolio_lots WHERE portfolio_id = _portfolio_id AND ticker = _ticker) t;
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id), '[]'::jsonb) INTO _sales FROM (SELECT id, ticker, price, quantity, sold_at FROM public.portfolio_sales WHERE portfolio_id = _portfolio_id AND ticker = _ticker) t;
  IF _lots IS DISTINCT FROM _expected_lots OR _sales IS DISTINCT FROM _expected_sales THEN RAISE EXCEPTION 'A posição mudou. Atualize a Carteira e tente novamente.'; END IF;
  INSERT INTO public.portfolio_sales (portfolio_id, ticker, price, quantity, sold_at) VALUES (_portfolio_id, _ticker, _price, _quantity, _sold_at) RETURNING id INTO _id;
  RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_portfolio_sale(uuid, text, numeric, numeric, date, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_portfolio_sale(uuid, text, numeric, numeric, date, jsonb, jsonb) TO authenticated;
