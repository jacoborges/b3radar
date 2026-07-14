import { useMemo } from "react";
import { useConsensusBatch } from "@/hooks/use-consensus";
import { useTradingViewBatch } from "@/hooks/use-tradingview";
import { isConsensusAvailable, type ConsensusRating } from "@/lib/consensus-rating";
import { isTvAvailable } from "@/lib/tradingview-rating";

export interface BiasEntry {
  analyst?: ConsensusRating;
  technical?: ConsensusRating;
}

/**
 * Combines analyst consensus (Yahoo) and TradingView technical (1D)
 * ratings per ticker for use in list-wide filters.
 */
export function useBiasBatch(tickers: string[]) {
  const consensus = useConsensusBatch(tickers);
  const tv = useTradingViewBatch(tickers);

  const map = useMemo(() => {
    const m = new Map<string, BiasEntry>();
    for (const t of tickers) {
      const entry: BiasEntry = {};
      const c = consensus.results[t];
      if (c && isConsensusAvailable(c)) entry.analyst = c.rating;
      const v = tv.results[t];
      if (v && isTvAvailable(v)) {
        const day = v.signals.find((s) => s.timeframe === "1D") ?? v.signals[0];
        if (day) entry.technical = day.rating;
      }
      m.set(t, entry);
    }
    return m;
  }, [tickers, consensus.results, tv.results]);

  return {
    map,
    isFetching: consensus.isFetching || tv.isFetching,
  };
}
