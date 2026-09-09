import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
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
const SNAPSHOT_TTL = 7 * 24 * 60 * 60 * 1000;

interface Snapshot {
  ranking: RankedPosition[];
  semPreco: string[];
  computedAt: number;
}

export interface UseSectorSimulationResult {
  ranking: RankedPosition[];
  /** Ativos sem preço na data escolhida (excluídos da comparação). */
  semPreco: string[];
  precoNaData: Map<string, PriceOnDateResult>;
  /** Quando o resultado exibido foi calculado (null = calculado agora). */
  computedAt: Date | null;
  fromCache: boolean;
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
 *
 * O resultado é guardado no cache do app (persistido no navegador) por 7 dias,
 * evitando refazer dezenas de consultas quando a mesma comparação é repetida.
 */
export function useSectorSimulation(opts: {
  tickers: string[];
  data: string;
  quantidade: number;
  criterio: RankCriterio;
  enabled: boolean;
  /** Identificação da pesquisa (setor, limite…) usada como chave do cache. */
  cacheKey: (string | number)[];
}): UseSectorSimulationResult {
  const { tickers, data, quantidade, criterio, enabled, cacheKey } = opts;
  const callPrice = useServerFn(getPriceOnDate);
  const queryClient = useQueryClient();

  const list = useMemo(
    () => Array.from(new Set(tickers)).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tickers.join("|")],
  );

  const snapKey = useMemo(
    () => ["sector-compare", ...cacheKey, data, quantidade] as const,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey.join("|"), data, quantidade],
  );

  // Observer só para manter o snapshot vivo no cache (e ser persistido).
  const snapQuery = useQuery<Snapshot | null>({
    queryKey: snapKey,
    queryFn: async () => null,
    enabled: false,
    staleTime: Infinity,
    gcTime: SNAPSHOT_TTL,
  });

  const [ignoreSnapshot, setIgnoreSnapshot] = useState(false);
  useEffect(() => {
    setIgnoreSnapshot(false);
  }, [snapKey.join("|")]);

  const snapshot =
    !ignoreSnapshot &&
    snapQuery.data &&
    Date.now() - snapQuery.data.computedAt < SNAPSHOT_TTL
      ? snapQuery.data
      : null;

  const liveEnabled = enabled && !snapshot;

  const priceQueries = useQueries({
    queries: list.map((ticker) => ({
      queryKey: ["price-on-date", ticker, data],
      queryFn: () => callPrice({ data: { ticker, date: data } }),
      enabled: liveEnabled && !!data,
      staleTime: ONE_MONTH,
      gcTime: ONE_MONTH,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    })),
  });

  const proventos = useSimProventos(liveEnabled ? list : []);
  const quotes = useLiveQuotes(liveEnabled ? list : []);

  const precoNaData = useMemo(() => {
    const map = new Map<string, PriceOnDateResult>();
    priceQueries.forEach((q, i) => {
      const value = q.data as PriceOnDateResult | undefined;
      if (value) map.set(list[i]!, value);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, priceQueries.map((q) => q.dataUpdatedAt).join("|")]);

  const computed = useMemo(() => {
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

  const pricesDone =
    liveEnabled &&
    list.length > 0 &&
    priceQueries.every((q) => !q.isLoading && !q.isFetching) &&
    !proventos.isLoading &&
    !proventos.isFetching;

  // Grava o snapshot assim que a comparação termina com dados completos.
  useEffect(() => {
    if (!pricesDone || computed.ranking.length === 0) return;
    queryClient.setQueryData<Snapshot>(snapKey, {
      ranking: computed.ranking,
      semPreco: computed.semPreco,
      computedAt: Date.now(),
    });
    setIgnoreSnapshot(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricesDone, computed, snapKey.join("|")]);

  const ranking = snapshot ? snapshot.ranking : computed.ranking;
  const semPreco = snapshot ? snapshot.semPreco : computed.semPreco;

  return {
    ranking,
    semPreco,
    precoNaData,
    computedAt: snapshot
      ? new Date(snapshot.computedAt)
      : pricesDone && ranking.length > 0
        ? new Date()
        : null,
    fromCache: !!snapshot,
    isLoading:
      liveEnabled &&
      (priceQueries.some((q) => q.isLoading) || proventos.isLoading),
    isFetching: liveEnabled && priceQueries.some((q) => q.isFetching),
    refetch: () => {
      queryClient.removeQueries({ queryKey: snapKey, exact: true });
      setIgnoreSnapshot(true);
      for (const t of list) {
        void queryClient.invalidateQueries({
          queryKey: ["price-on-date", t, data],
        });
      }
      proventos.refetch();
    },
  };
}
