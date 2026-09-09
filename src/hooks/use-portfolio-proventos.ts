import { useMemo } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getTickerProventos,
  type TickerProventosResult,
} from "@/lib/proventos.functions";
import type { ProventoProvisionado } from "@/lib/stocks-data";

const ONE_DAY = 24 * 60 * 60 * 1000;
/** Novos anúncios da B3 aparecem durante o dia: revalidar a cada 6h. */
const SIX_HOURS = 6 * 60 * 60 * 1000;

export interface ProventoCarteira {
  ticker: string;
  tipo: ProventoProvisionado["tipo"];
  valorPorAcao: number;
  quantidade: number;
  total: number;
  dataCom: string;
  dataEx: string;
  dataPagamento: string;
  /** true quando a data com já passou (direito garantido) */
  direitoGarantido: boolean;
  /** true quando o ativo já não está mais em carteira (saldo zero) */
  posicaoEncerrada: boolean;
}

export interface UsePortfolioProventosResult {
  eventos: ProventoCarteira[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
}

function hojeISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Proventos já anunciados (B3/CVM) dos ativos da carteira, com o total
 * a receber por posição.
 */
export interface PosicaoProventos {
  ticker: string;
  lots: Array<{ quantity: number; boughtAt: string }>;
  sales?: Array<{ quantity: number; soldAt: string }>;
  /** true quando o saldo atual do ativo é zero (posição encerrada) */
  encerrada?: boolean;
}

export function usePortfolioProventos(
  posicoes: PosicaoProventos[],
): UsePortfolioProventosResult {
  const callProventos = useServerFn(getTickerProventos);
  const queryClient = useQueryClient();

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
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const isFetching = results.some((r) => r.isFetching);

  const eventos = useMemo(() => {
    const hoje = hojeISO();
    const byTicker = new Map(posicoes.map((p) => [p.ticker, p]));
    const out: ProventoCarteira[] = [];

    results.forEach((r, i) => {
      const ticker = tickers[i]!;
      const data = r.data as TickerProventosResult | undefined;
      const pos = byTicker.get(ticker);
      const lots = pos?.lots ?? [];
      const sales = pos?.sales ?? [];
      if (!data?.provisionados || lots.length === 0) return;
      for (const p of data.provisionados) {
        if (!(p.valorPorAcao > 0)) continue;
        const pagamento = p.dataPagamento || p.dataEx;
        if (pagamento < hoje) continue;
        // Direito = quantidade que estava em carteira na data com:
        // comprada antes da data com, menos a vendida antes da data com.
        const comprada = lots
          .filter((l) => l.boughtAt < p.dataCom)
          .reduce((s, l) => s + l.quantity, 0);
        const vendida = sales
          .filter((s) => s.soldAt < p.dataCom)
          .reduce((s, v) => s + v.quantity, 0);
        const quantidade = comprada - vendida;
        if (quantidade <= 0) continue;
        out.push({
          ticker,
          tipo: p.tipo,
          valorPorAcao: p.valorPorAcao,
          quantidade,
          total: p.valorPorAcao * quantidade,
          dataCom: p.dataCom,
          dataEx: p.dataEx,
          dataPagamento: pagamento,
          direitoGarantido: p.dataCom <= hoje,
          posicaoEncerrada: pos?.encerrada === true,
        });
      }
    });

    out.sort(
      (a, b) =>
        a.dataPagamento.localeCompare(b.dataPagamento) ||
        a.ticker.localeCompare(b.ticker),
    );
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posicoes, tickers, results.map((r) => r.dataUpdatedAt).join("|")]);

  const total = useMemo(
    () => eventos.reduce((s, e) => s + e.total, 0),
    [eventos],
  );

  return {
    eventos,
    total,
    isLoading,
    isFetching,
    refetch: () => {
      for (const t of tickers) {
        void queryClient.invalidateQueries({ queryKey: ["proventos", t] });
      }
    },
  };
}
