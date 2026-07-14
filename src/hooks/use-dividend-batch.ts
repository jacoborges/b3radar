import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { getProventosBatch, type BatchProventosItem } from "@/lib/proventos.functions";
import {
  computeDividendIntelligence,
  type DividendIntelligence,
} from "@/lib/dividend-intelligence";
import type { Stock } from "@/lib/stocks-data";

const ONE_HOUR = 60 * 60 * 1000;

export interface DividendBatchRow {
  stock: Stock;
  raw: BatchProventosItem | null;
  intel: DividendIntelligence | null;
}

export interface UseDividendBatchResult {
  rows: DividendBatchRow[];
  updatedAt: Date | null;
  isFetching: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useDividendBatch(
  stocks: Stock[],
  limit: number = 120,
): UseDividendBatchResult {
  const call = useServerFn(getProventosBatch);

  // Ordena por liquidez desc e limita para não estourar B3.
  const subset = useMemo(() => {
    return [...stocks]
      .sort((a, b) => b.liquidezDiaria - a.liquidezDiaria)
      .slice(0, limit);
  }, [stocks, limit]);

  const tickers = useMemo(() => subset.map((s) => s.ticker), [subset]);
  const key = tickers.slice().sort().join(",");

  const q = useQuery({
    queryKey: ["proventos-batch", key],
    queryFn: () => call({ data: { tickers } }),
    enabled: tickers.length > 0,
    staleTime: ONE_HOUR,
    gcTime: ONE_HOUR * 2,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const rows = useMemo<DividendBatchRow[]>(() => {
    const byTicker = new Map<string, BatchProventosItem>();
    for (const it of q.data?.items ?? []) byTicker.set(it.ticker, it);
    return subset.map((stock) => {
      const raw = byTicker.get(stock.ticker) ?? null;
      const intel = raw
        ? computeDividendIntelligence(
            raw.historicoCompleto,
            stock.preco,
            stock.margemLiquida,
          )
        : null;
      return { stock, raw, intel };
    });
  }, [subset, q.data]);

  return {
    rows,
    updatedAt: q.data ? new Date(q.data.updatedAt) : null,
    isFetching: q.isFetching,
    isLoading: q.isLoading,
    error: q.error ? String(q.error) : null,
  };
}
