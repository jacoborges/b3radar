import { useMemo } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getTickerProventos,
  type TickerProventosResult,
} from "@/lib/proventos.functions";
import type { EventoSocietario } from "@/lib/dividend-intelligence";

const ONE_DAY = 24 * 60 * 60 * 1000;

export interface UseSimProventosResult {
  /** histórico completo (proventos + eventos societários) por ticker */
  byTicker: Map<string, EventoSocietario[]>;
  isLoading: boolean;
  isFetching: boolean;
  errors: string[];
  refetch: () => void;
}

/** Histórico oficial B3/CVM dos tickers da simulação. */
export function useSimProventos(tickers: string[]): UseSimProventosResult {
  const callProventos = useServerFn(getTickerProventos);
  const queryClient = useQueryClient();

  const list = useMemo(
    () => Array.from(new Set(tickers)).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tickers.join("|")],
  );

  const results = useQueries({
    queries: list.map((ticker) => ({
      queryKey: ["proventos", ticker],
      queryFn: () => callProventos({ data: { ticker } }),
      staleTime: ONE_DAY,
      gcTime: ONE_DAY * 7,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    })),
  });

  const byTicker = useMemo(() => {
    const map = new Map<string, EventoSocietario[]>();
    results.forEach((r, i) => {
      const ticker = list[i]!;
      const data = r.data as TickerProventosResult | undefined;
      map.set(ticker, data?.historicoCompleto ?? []);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, results.map((r) => r.dataUpdatedAt).join("|")]);

  const errors = useMemo(() => {
    const out: string[] = [];
    results.forEach((r, i) => {
      const data = r.data as TickerProventosResult | undefined;
      if (data?.error) out.push(`${list[i]}: ${data.error}`);
      else if (r.error) out.push(`${list[i]}: falha ao consultar B3`);
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, results.map((r) => r.dataUpdatedAt).join("|")]);

  return {
    byTicker,
    isLoading: results.some((r) => r.isLoading),
    isFetching: results.some((r) => r.isFetching),
    errors,
    refetch: () => {
      for (const t of list) {
        void queryClient.invalidateQueries({ queryKey: ["proventos", t] });
      }
    },
  };
}
