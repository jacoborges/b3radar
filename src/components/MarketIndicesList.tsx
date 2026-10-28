import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/InfoTip";
import { PortfolioChartButton } from "@/components/PortfolioChartButton";
import { getMarketIndices, type MarketIndexRow } from "@/lib/market-indices.functions";
import { sentimentFromScore } from "@/lib/market-sentiment";

const pct = (v: number | null) =>
  v == null ? <span className="text-muted-foreground">—</span> : (
    <span className={v >= 0 ? "text-success" : "text-destructive"}>
      {v >= 0 ? "+" : ""}{v.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%
    </span>
  );

function Sentiment({ score }: { score: number | null }) {
  const s = sentimentFromScore(score);
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.className}`}>{s.label}</span>;
}

export function useMarketIndices() {
  const fn = useServerFn(getMarketIndices);
  return useQuery({ queryKey: ["market-indices"], queryFn: () => fn(), staleTime: 60_000, refetchInterval: 60_000 });
}

export function MarketIndicesList({ compact = false }: { compact?: boolean }) {
  const q = useMarketIndices();
  const rows = q.data?.rows ?? [];
  const overall = rows.filter((r) => r.score != null);
  const avg = overall.length ? overall.reduce((a, r) => a + (r.score ?? 0), 0) / overall.length : null;
  const groups = ["B3", "Setorial B3", "Exterior"] as const;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
        <div className="flex-1">
          <h2 className="text-base font-semibold">Índices de mercado</h2>
          <p className="text-xs text-muted-foreground">
            Sensação geral do mercado: <Sentiment score={avg} />
            <InfoTip text="Consenso técnico do TradingView (médias móveis e osciladores). Não há base pública e gratuita com recomendações de casas de análise e fundos internacionais por índice, então este termômetro reflete o mercado técnico." />
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => q.refetch()} disabled={q.isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>
      {q.isLoading && <p className="text-sm text-muted-foreground">Carregando índices…</p>}
      {q.isError && <p className="text-sm text-destructive">Não foi possível carregar os índices agora.</p>}
      {groups.map((g) => {
        const list = rows.filter((r) => r.group === g);
        if (!list.length) return null;
        return (
          <div key={g} className="overflow-x-auto rounded-xl border border-border/60 bg-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-[11px] uppercase text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="px-3 py-2 text-left">{g}</th>
                  <th className="px-2 py-2 text-right">Atual</th>
                  <th className="px-2 py-2 text-right">Dia</th>
                  <th className="px-2 py-2 text-right">Semana</th>
                  <th className="px-2 py-2 text-right">Mês</th>
                  <th className="px-2 py-2 text-right">12 meses</th>
                  <th className="px-2 py-2 text-center">Sensação</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => <Row key={r.key} r={r} compact={compact} />)}
              </tbody>
            </table>
          </div>
        );
      })}
      {q.data && <p className="text-[11px] text-muted-foreground">Fonte: TradingView · atualizado {new Date(q.data.updatedAt).toLocaleTimeString("pt-BR")}</p>}
    </div>
  );
}

function Row({ r, compact }: { r: MarketIndexRow; compact: boolean }) {
  return (
    <tr className="border-b border-border/30 last:border-0">
      <td className="px-3 py-2">
        <div className="flex items-center gap-1 font-medium">{r.name}<InfoTip text={r.description} /></div>
        {!compact && <div className="text-[11px] text-muted-foreground">{r.proxy ?? r.symbol.split(":")[1]} · {r.currency}</div>}
      </td>
      <td className="px-2 py-2 text-right tabular-nums">
        {r.value == null ? <span className="text-muted-foreground">sem dados</span> : r.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
      </td>
      <td className="px-2 py-2 text-right tabular-nums">{pct(r.day)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{pct(r.week)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{pct(r.month)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{pct(r.year)}</td>
      <td className="px-2 py-2 text-center"><Sentiment score={r.score} /></td>
      <td className="px-2 py-2 text-right">{r.available && <PortfolioChartButton ticker={r.name} symbol={r.symbol} />}</td>
    </tr>
  );
}
