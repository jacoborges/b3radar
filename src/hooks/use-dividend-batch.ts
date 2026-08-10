import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getProventosCached,
  refreshProventosChunk,
  type CachedDividendItem,
} from "@/lib/proventos.functions";
import {
  computeDividendIntelligence,
  type DividendIntelligence,
} from "@/lib/dividend-intelligence";
import type { Stock } from "@/lib/stocks-data";

const ONE_HOUR = 60 * 60 * 1000;
const SIX_HOURS = 6 * ONE_HOUR;
const CHUNK = 20;

export interface DividendBatchRow {
  stock: Stock;
  raw: CachedDividendItem | null;
  intel: DividendIntelligence | null;
}

export interface UseDividendBatchResult {
  rows: DividendBatchRow[];
  updatedAt: Date | null;
  isFetching: boolean;
  isLoading: boolean;
  error: string | null;
  /** ativos ainda não coletados/desatualizados */
  pendentes: number;
  /** true enquanto o coletor em segundo plano está rodando */
  coletando: boolean;
}

/**
 * Lê o cache persistente de proventos (todos os ativos) e, em segundo plano,
 * dispara a coleta na B3 dos ativos faltantes/desatualizados, em pequenos lotes.
 */
export function useDividendBatch(
  stocks: Stock[],
  options: { enabled?: boolean } = {},
): UseDividendBatchResult {
  const enabled = options.enabled ?? true;
  const loadCache = useServerFn(getProventosCached);
  const refresh = useServerFn(refreshProventosChunk);
  const queryClient = useQueryClient();
  const [coletando, setColetando] = useState(false);
  const running = useRef(false);

  const q = useQuery({
    queryKey: ["proventos-cache"],
    queryFn: () => loadCache(),
    staleTime: 60_000,
    gcTime: ONE_HOUR * 2,
    refetchOnWindowFocus: false,
    enabled,
  });

  const byTicker = useMemo(() => {
    const m = new Map<string, CachedDividendItem>();
    for (const it of q.data?.items ?? []) m.set(it.ticker, it);
    return m;
  }, [q.data]);

  // Ordena por liquidez para priorizar a coleta dos ativos mais negociados.
  const ordered = useMemo(
    () => [...stocks].sort((a, b) => b.liquidezDiaria - a.liquidezDiaria),
    [stocks],
  );

  const pendingTickers = useMemo(() => {
    const now = Date.now();
    return ordered
      .filter((s) => {
        const row = byTicker.get(s.ticker);
        if (!row) return true;
        return now - new Date(row.fetchedAt).getTime() > SIX_HOURS * 4;
      })
      .map((s) => s.ticker);
  }, [ordered, byTicker]);

  const pendingKey = pendingTickers.length;

  useEffect(() => {
    if (!enabled || q.isLoading || running.current || pendingTickers.length === 0) return;
    running.current = true;
    setColetando(true);
    let cancelled = false;

    (async () => {
      const fila = pendingTickers.slice(0, 400);
      for (let i = 0; i < fila.length; i += CHUNK) {
        if (cancelled) break;
        try {
          await refresh({ data: { tickers: fila.slice(i, i + CHUNK) } });
        } catch {
          /* segue para o próximo lote */
        }
        await queryClient.invalidateQueries({ queryKey: ["proventos-cache"] });
      }
      if (!cancelled) {
        running.current = false;
        setColetando(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, q.isLoading, pendingKey > 0]);

  const rows = useMemo<DividendBatchRow[]>(() => {
    return ordered.map((stock) => {
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
  }, [ordered, byTicker]);

  return {
    rows,
    updatedAt: q.data ? new Date(q.data.updatedAt) : null,
    isFetching: q.isFetching,
    isLoading: q.isLoading,
    error: q.error ? String(q.error) : null,
    pendentes: pendingTickers.length,
    coletando,
  };
}
