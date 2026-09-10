import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getTickerProventos,
  type TickerProventosResult,
} from "@/lib/proventos.functions";

const ONE_DAY = 24 * 60 * 60 * 1000;
const SIX_HOURS = 6 * 60 * 60 * 1000;

export interface PosicaoRecebidos {
  ticker: string;
  lots: Array<{ quantity: number; boughtAt: string }>;
  sales?: Array<{ quantity: number; soldAt: string }>;
}

export interface UseProventosRecebidosResult {
  /** total já recebido por ticker, no período de custódia */
  byTicker: Map<string, number>;
  /** total já recebido por mês de pagamento ("YYYY-MM") */
  byMonth: Map<string, number>;
  total: number;
  isLoading: boolean;
  isFetching: boolean;
}

function hojeISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Dividendos e JCP já pagos referentes ao período em que os ativos
 * estiveram em custódia (quantidade na data com).
 */
export function usePortfolioProventosRecebidos(
  posicoes: PosicaoRecebidos[],
): UseProventosRecebidosResult {
  const callProventos = useServerFn(getTickerProventos);

  const tickers = useMemo(
    () => Array.from(new Set(posicoes.map((p) => p.ticker))).sort(),
    [posicoes],
  );

  const results = useQueries({
    queries: tickers.map((ticker) => ({
      queryKey: ["proventos", ticker],
      queryFn: () => callProventos({ data: { ticker } }),
      staleTime: SIX_HOURS,
      gcTime: ONE_DAY * 7,
      retry: 1,
    })),
  });

  const agregados = useMemo(() => {
    const hoje = hojeISO();
    const map = new Map<string, number>();
    const meses = new Map<string, number>();
    const posByTicker = new Map(posicoes.map((p) => [p.ticker, p]));


    results.forEach((r, i) => {
      const ticker = tickers[i]!;
      const data = r.data as TickerProventosResult | undefined;
      const pos = posByTicker.get(ticker);
      const lots = pos?.lots ?? [];
      const sales = pos?.sales ?? [];
      if (!data?.historicoCompleto || lots.length === 0) return;

      let total = 0;
      for (const ev of data.historicoCompleto) {
        if (ev.tipo !== "Dividendo" && ev.tipo !== "JCP") continue;
        if (!(ev.valor > 0)) continue;
        const dataCom = ev.dataCom;
        const pagamento = ev.dataPagamento ?? ev.dataEx ?? dataCom;
        if (!dataCom || !pagamento) continue;
        if (pagamento > hoje) continue; // ainda não pago
        const comprada = lots
          .filter((l) => l.boughtAt < dataCom)
          .reduce((s, l) => s + l.quantity, 0);
        const vendida = sales
          .filter((s) => s.soldAt < dataCom)
          .reduce((s, v) => s + v.quantity, 0);
        const quantidade = comprada - vendida;
        if (quantidade <= 0) continue;
        total += ev.valor * quantidade;
      }
      map.set(ticker, total);
    });

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posicoes, tickers, results.map((r) => r.dataUpdatedAt).join("|")]);

  const total = useMemo(() => {
    let s = 0;
    for (const v of byTicker.values()) s += v;
    return s;
  }, [byTicker]);

  return {
    byTicker,
    total,
    isLoading: results.some((r) => r.isLoading),
    isFetching: results.some((r) => r.isFetching),
  };
}
