import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPortfolios } from "@/lib/portfolio.functions";
import { heldPositions, heldTickers } from "@/lib/portfolio-holdings";

/** Tickers com posição aberta em alguma carteira do usuário. */
export function usePortfolioHoldings() {
  const fetchPortfolios = useServerFn(listPortfolios);

  const { data: portfolios = [], isLoading } = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => fetchPortfolios(),
    staleTime: 60_000,
  });

  const tickers = useMemo(() => heldTickers(portfolios), [portfolios]);
  const tickerSet = useMemo(() => new Set(tickers), [tickers]);
  const positions = useMemo(() => heldPositions(portfolios), [portfolios]);

  return { tickers, tickerSet, positions, isLoading };
}
