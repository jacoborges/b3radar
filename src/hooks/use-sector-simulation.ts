import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getPriceOnDate,
  type PriceOnDateResult,
} from "@/lib/price-history.functions";
import { useSimProventos } from "@/hooks/use-sim-proventos";
import { useLiveQuotes } from "@/hooks/use-live-quotes";
import {
  rankearPosicoes,
  simularTicker,
  type RankCriterio,
  type RankedPosition,
} from "@/lib/sim-portfolio";

const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;

export interface UseSectorSimulationResult {
  ranking: RankedPosition[];
  /** Ativos sem preço na data escolhida (excluídos da comparação). */
  semPreco: string[];
  precoNaData: Map<string, PriceOnDateResult>;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Simula a mesma compra (mesma data, mesma quantidade) em vários ativos e
 * devolve o ranking por proventos recebidos / retorno total.
 */
export function useSectorSimulation(opts: {
  tickers: string[];
  data: string;
  quantidade: number;
  criterio: RankCriterio;
  enabled: boolean;
}): UseSectorSimulationResult {
  const { tickers, data, quantidade, criterio, enabled } = opts;
  const callPrice = useServerFn(getPriceOnDate);

  const list = useMemo(
    () => Array.from(new Set(tickers)).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tickers.join("|")],
  );

  const priceQueries = useQueries({
    queries: list.map((ticker) => ({
      queryKey: ["price-on-date", ticker, data],
      queryFn: () => callPrice({ data: { ticker, date: data } }),
      enabled: enabled && !!data,
      staleTime: ONE_MONTH,
      gcTime: ONE_MONTH,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    })),
  });

  const proventos = useSimProventos(enabled ? list : []);
  const quotes = useLiveQuotes(enabled ? list : []);

  const precoNaData = useMemo(() => {
    const map = new Map<string, PriceOnDateResult>();
    priceQueries.forEach((q, i) => {
      const value = q.data as PriceOnDateResult | undefined;
      if (value) map.set(list[i]!, value);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, priceQueries.map((q) => q.dataUpdatedAt).join("|")]);

  const { ranking, semPreco } = useMemo(() => {
    const hoje = hojeISO();
    const faltando: string[] = [];
    const posicoes = [];
    for (const ticker of list) {
      const preco = precoNaData.get(ticker);
      if (!preco || preco.close == null) {
        if (preco) faltando.push(ticker);
        continue;
      }
      posicoes.push(
        simularTicker(
          ticker,
          [
            {
              id: `${ticker}-sim`,
              ticker,
              price: preco.close,
              quantity: quantidade,
              boughtAt: preco.usedDate ?? data,
            },
          ],
          proventos.byTicker.get(ticker) ?? [],
          quotes.map.get(ticker)?.price ?? null,
          hoje,
        ),
      );
    }
    return { ranking: rankearPosicoes(posicoes, criterio), semPreco: faltando };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, precoNaData, proventos.byTicker, quotes.map, quantidade, data, criterio]);

  return {
    ranking,
    semPreco,
    precoNaData,
    isLoading:
      enabled && (priceQueries.some((q) => q.isLoading) || proventos.isLoading),
    isFetching: priceQueries.some((q) => q.isFetching) || proventos.isFetching,
    refetch: () => proventos.refetch(),
  };
}
