import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SimPosition } from "@/lib/sim-portfolio";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Comparativo entre ativos: investido, proventos recebidos e yield on cost. */
export function SimCompareChart({ posicoes }: { posicoes: SimPosition[] }) {
  const data = posicoes.map((p) => ({
    ticker: p.ticker,
    investido: Number(p.investido.toFixed(2)),
    proventos: Number(p.proventos.toFixed(2)),
    yoc: Number((p.yieldOnCost ?? 0).toFixed(2)),
  }));

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">Comparativo entre ativos</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="ticker" stroke="var(--color-muted-foreground)" fontSize={11} />
            <YAxis
              yAxisId="brl"
              stroke="var(--color-muted-foreground)"
              fontSize={11}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              stroke="var(--color-muted-foreground)"
              fontSize={11}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              formatter={(v: number, n: string) =>
                n === "Yield on cost" ? [`${v.toFixed(2)}%`, n] : [brl(v), n]
              }
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="brl" dataKey="investido" name="Investido" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="brl" dataKey="proventos" name="Proventos" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="yoc"
              name="Yield on cost"
              stroke="var(--color-warning, var(--color-foreground))"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Yield on cost = proventos recebidos ÷ valor investido no ativo.
      </p>
    </div>
  );
}
