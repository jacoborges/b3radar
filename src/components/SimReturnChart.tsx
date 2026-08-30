import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getPriceHistory,
  type PriceHistoryResult,
} from "@/lib/price-history.functions";
import type { SimPosition } from "@/lib/sim-portfolio";

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  posicoes: SimPosition[];
  proventosAno: Array<{ ano: number; proventos: number }>;
}

/** Retorno anual da simulação: valorização estimada + proventos recebidos. */
export function SimReturnChart({ posicoes, proventosAno }: Props) {
  const callHistory = useServerFn(getPriceHistory);
  const tickers = useMemo(
    () => Array.from(new Set(posicoes.map((p) => p.ticker))).sort(),
    [posicoes],
  );

  const results = useQueries({
    queries: tickers.map((ticker) => ({
      queryKey: ["price-history", ticker],
      queryFn: () => callHistory({ data: { ticker } }),
      staleTime: ONE_WEEK,
      gcTime: ONE_WEEK * 4,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    })),
  });

  const data = useMemo(() => {
    const valorizacaoAno = new Map<number, number>();
    results.forEach((r, i) => {
      const ticker = tickers[i]!;
      const hist = r.data as PriceHistoryResult | undefined;
      const pos = posicoes.find((p) => p.ticker === ticker);
      if (!hist?.anos || !pos) return;
      const anoCompra = Number(pos.primeiraCompra.slice(0, 4));
      for (const a of hist.anos) {
        if (a.year < anoCompra) continue;
        const base =
          a.year === anoCompra
            ? pos.precoMedioAjustado || a.precoInicio
            : a.precoInicio;
        if (!(base > 0) || !(a.precoFim > 0)) continue;
        const delta = (a.precoFim - base) * pos.quantidadeAtual;
        valorizacaoAno.set(a.year, (valorizacaoAno.get(a.year) ?? 0) + delta);
      }
    });

    const anos = new Set<number>([
      ...valorizacaoAno.keys(),
      ...proventosAno.map((p) => p.ano),
    ]);
    return [...anos]
      .sort((a, b) => a - b)
      .map((ano) => ({
        ano: String(ano),
        valorizacao: Number((valorizacaoAno.get(ano) ?? 0).toFixed(2)),
        proventos: Number(
          (proventosAno.find((p) => p.ano === ano)?.proventos ?? 0).toFixed(2),
        ),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers, posicoes, proventosAno, results.map((r) => r.dataUpdatedAt).join("|")]);

  const acumulado = data.reduce(
    (s, d) => s + d.valorizacao + d.proventos,
    0,
  );

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
        Sem histórico suficiente para montar o gráfico anual.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Retorno por ano</h3>
        <span className="text-xs text-muted-foreground">
          Acumulado no período:{" "}
          <strong
            className={
              acumulado >= 0 ? "text-success" : "text-destructive"
            }
          >
            {brl(acumulado)}
          </strong>
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="ano" stroke="var(--color-muted-foreground)" fontSize={11} />
            <YAxis
              stroke="var(--color-muted-foreground)"
              fontSize={11}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip
              formatter={(v: number, n: string) => [brl(v), n]}
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="valorizacao"
              name="Valorização"
              stackId="a"
              fill="var(--color-primary)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="proventos"
              name="Proventos"
              stackId="a"
              fill="var(--color-success)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Valorização anual estimada com o preço de fechamento de cada ano e a
        quantidade atual de ações (já ajustada por bonificações e
        desdobramentos).
      </p>
    </div>
  );
}
