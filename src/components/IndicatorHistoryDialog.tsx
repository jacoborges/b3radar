import { useMemo, useState } from "react";
import { LineChart as LineChartIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SELIC, type DividendYear } from "@/lib/stocks-data";
import { usePriceHistory } from "@/hooks/use-price-history";
import type { PriceYear } from "@/lib/price-history.functions";
import { ActionTip } from "@/components/ActionTip";

export type HistoryKind = "preco" | "valorizacao" | "dy" | "proventos" | "selic";

const TITLES: Record<HistoryKind, string> = {
  preco: "Preço de fechamento — 10 anos",
  valorizacao: "Valorização anual vs. Selic — 10 anos",
  dy: "Dividend Yield anual vs. Selic — 10 anos",
  proventos: "Dividendos + JCP por ano — 10 anos",
  selic: "Selic média ponderada — 10 anos",
};

const FONTES: Record<HistoryKind, string> = {
  preco: "Cotações mensais ajustadas (Yahoo Finance)",
  valorizacao: "Cotações mensais ajustadas (Yahoo Finance) + Selic (Banco Central)",
  dy: "Proventos da B3 + cotações mensais (Yahoo Finance)",
  proventos: "Proventos em dinheiro divulgados na B3",
  selic: "Selic média ponderada anual (Banco Central)",
};

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
};

const tooltipStyle = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
};

interface Row {
  year: number;
  precoInicio: number | null;
  precoFim: number | null;
  precoMedio: number | null;
  valorizacao: number | null;
  dividendo: number | null;
  jcp: number | null;
  dy: number | null;
  selic: number;
}

function buildRows(precos: PriceYear[], historico: DividendYear[] | null): Row[] {
  const anoAtual = new Date().getUTCFullYear();
  const years = Array.from({ length: 11 }, (_, i) => anoAtual - 10 + i);
  const byPreco = new Map(precos.map((p) => [p.year, p]));
  const byProv = new Map((historico ?? []).map((h) => [h.year, h]));

  return years.map((year) => {
    const p = byPreco.get(year) ?? null;
    const h = byProv.get(year) ?? null;
    const total = h ? h.dividendo + h.jcp : null;
    const base = p?.precoMedio ?? (h?.precoMedio || null);
    return {
      year,
      precoInicio: p?.precoInicio ?? null,
      precoFim: p?.precoFim ?? null,
      precoMedio: p?.precoMedio ?? null,
      valorizacao: p?.valorizacao ?? null,
      dividendo: h?.dividendo ?? null,
      jcp: h?.jcp ?? null,
      dy: total != null && base ? Number(((total / base) * 100).toFixed(2)) : null,
      selic: h?.selicMediaPonderada ?? SELIC[year] ?? 12,
    };
  });
}

function Chart({ kind, rows }: { kind: HistoryKind; rows: Row[] }) {
  if (kind === "proventos") {
    const data = rows.map((r) => ({ ...r, ano: String(r.year) }));
    return (
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="ano" {...axis} interval={0} angle={-35} height={44} textAnchor="end" />
            <YAxis {...axis} tickFormatter={(v) => `R$ ${v}`} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={tooltipStyle}
              formatter={(v: number, n: string) => [
                `R$ ${Number(v).toFixed(2)}`,
                n === "dividendo" ? "Dividendo" : "JCP",
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(v) => (v === "dividendo" ? "Dividendo" : "JCP")}
            />
            <Bar dataKey="jcp" stackId="a" fill="var(--color-jcp)" />
            <Bar dataKey="dividendo" stackId="a" fill="var(--color-dividend)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "preco") {
    const data = rows
      .filter((r) => r.precoFim != null)
      .map((r) => ({ ...r, ano: String(r.year) }));
    return (
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="ano" {...axis} interval={0} angle={-35} height={44} textAnchor="end" />
            <YAxis {...axis} tickFormatter={(v) => `R$ ${v}`} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number) => [`R$ ${Number(v).toFixed(2)}`, "Fechamento do ano"]}
            />
            <Line
              type="monotone"
              dataKey="precoFim"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "selic") {
    const data = rows.map((r) => ({ ...r, ano: String(r.year) }));
    return (
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="ano" {...axis} interval={0} angle={-35} height={44} textAnchor="end" />
            <YAxis {...axis} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={tooltipStyle}
              formatter={(v: number) => [`${Number(v).toFixed(2)}%`, "Selic ponderada"]}
            />
            <Bar dataKey="selic" fill="var(--color-selic)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const key = kind === "dy" ? "dy" : "valorizacao";
  const data = rows
    .filter((r) => r[key] != null)
    .map((r) => ({ ...r, ano: String(r.year), valor: r[key] as number }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="ano" {...axis} interval={0} angle={-35} height={44} textAnchor="end" />
          <YAxis {...axis} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            contentStyle={tooltipStyle}
            formatter={(v: number, n: string) => [
              `${Number(v).toFixed(2)}%`,
              n === "valor"
                ? kind === "dy"
                  ? "Yield da ação"
                  : "Valorização do ativo"
                : "Selic ponderada",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(v) =>
              v === "valor"
                ? kind === "dy"
                  ? "Yield da ação"
                  : "Valorização do ativo"
                : "Selic ponderada"
            }
          />
          <Bar dataKey="valor" radius={[6, 6, 0, 0]} fill="var(--color-dividend)">
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.valor >= d.selic ? "var(--color-success)" : "var(--color-danger)"}
              />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="selic"
            stroke="var(--color-selic)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--color-selic)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Tabela({ kind, rows }: { kind: HistoryKind; rows: Row[] }) {
  const fmt = (v: number | null, suf: "R$" | "%") =>
    v == null
      ? "—"
      : suf === "R$"
        ? `R$ ${v.toFixed(2)}`
        : `${v >= 0 ? "" : ""}${v.toFixed(2)}%`;

  return (
    <div className="max-h-56 overflow-auto rounded-md border border-border/40">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium">Ano</th>
            {kind === "proventos" && (
              <>
                <th className="px-2 py-1.5 text-right font-medium">Dividendos</th>
                <th className="px-2 py-1.5 text-right font-medium">JCP</th>
                <th className="px-2 py-1.5 text-right font-medium">Total</th>
              </>
            )}
            {kind === "preco" && (
              <>
                <th className="px-2 py-1.5 text-right font-medium">Início</th>
                <th className="px-2 py-1.5 text-right font-medium">Fim</th>
                <th className="px-2 py-1.5 text-right font-medium">Var.</th>
              </>
            )}
            {kind === "valorizacao" && (
              <>
                <th className="px-2 py-1.5 text-right font-medium">Valorização</th>
                <th className="px-2 py-1.5 text-right font-medium">Selic</th>
              </>
            )}
            {kind === "dy" && (
              <>
                <th className="px-2 py-1.5 text-right font-medium">Yield</th>
                <th className="px-2 py-1.5 text-right font-medium">Selic</th>
              </>
            )}
            {kind === "selic" && (
              <th className="px-2 py-1.5 text-right font-medium">Selic ponderada</th>
            )}
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((r) => (
            <tr key={r.year} className="border-t border-border/30">
              <td className="px-2 py-1.5 text-left">{r.year}</td>
              {kind === "proventos" && (
                <>
                  <td className="px-2 py-1.5 text-right">{fmt(r.dividendo, "R$")}</td>
                  <td className="px-2 py-1.5 text-right">{fmt(r.jcp, "R$")}</td>
                  <td className="px-2 py-1.5 text-right">
                    {r.dividendo == null && r.jcp == null
                      ? "—"
                      : fmt((r.dividendo ?? 0) + (r.jcp ?? 0), "R$")}
                  </td>
                </>
              )}
              {kind === "preco" && (
                <>
                  <td className="px-2 py-1.5 text-right">{fmt(r.precoInicio, "R$")}</td>
                  <td className="px-2 py-1.5 text-right">{fmt(r.precoFim, "R$")}</td>
                  <td className="px-2 py-1.5 text-right">{fmt(r.valorizacao, "%")}</td>
                </>
              )}
              {kind === "valorizacao" && (
                <>
                  <td className="px-2 py-1.5 text-right">{fmt(r.valorizacao, "%")}</td>
                  <td className="px-2 py-1.5 text-right">{fmt(r.selic, "%")}</td>
                </>
              )}
              {kind === "dy" && (
                <>
                  <td className="px-2 py-1.5 text-right">{fmt(r.dy, "%")}</td>
                  <td className="px-2 py-1.5 text-right">{fmt(r.selic, "%")}</td>
                </>
              )}
              {kind === "selic" && (
                <td className="px-2 py-1.5 text-right">{fmt(r.selic, "%")}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface Props {
  ticker: string;
  kind: HistoryKind;
  historico?: DividendYear[] | null;
  label?: string;
}

/** Ícone de gráfico que abre um pop-up com a série histórica de 10 anos. */
export function HistoryChartButton({ ticker, kind, historico, label }: Props) {
  const [open, setOpen] = useState(false);
  const needsPrice = kind !== "proventos" && kind !== "selic";
  const { data, isLoading } = usePriceHistory(ticker, open && needsPrice);

  const rows = useMemo(
    () => buildRows(data?.anos ?? [], historico ?? null),
    [data, historico],
  );

  const semDados =
    (kind === "proventos" && !(historico ?? []).length) ||
    (needsPrice && !isLoading && !(data?.anos ?? []).length);

  return (
    <>
      <ActionTip tip="historicoIndicador">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:text-primary"
          aria-label={`Histórico de 10 anos de ${label ?? kind}`}
        >
          <LineChartIcon className="h-3.5 w-3.5" />
        </button>
      </ActionTip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl border-border/60 bg-card"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="text-base">
              {ticker} — {label ?? TITLES[kind]}
            </DialogTitle>
            <DialogDescription className="text-xs">{TITLES[kind]}</DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="h-72 animate-pulse rounded-md bg-border/30" />
          ) : semDados ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sem histórico disponível para este ativo nas fontes oficiais.
            </p>
          ) : (
            <div className="space-y-3">
              <Chart kind={kind} rows={rows} />
              <Tabela kind={kind} rows={rows} />
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">Fonte: {FONTES[kind]}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
