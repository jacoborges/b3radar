import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/InfoTip";
import { getMacroHistory, refreshMacro, type MacroSeries } from "@/lib/macro.functions";
import { useMacroSeries } from "@/hooks/use-macro";

export const Route = createFileRoute("/_authenticated/macro")({
  head: () => ({
    meta: [
      { title: "Dados Macroeconômicos — Bovespa Radar" },
      { name: "description", content: "Selic, inflação, câmbio, risco-país, inadimplência e expectativas Focus do Banco Central." },
      { property: "og:title", content: "Dados Macroeconômicos — Bovespa Radar" },
      { property: "og:description", content: "Indicadores do Banco Central atualizados para valuation de ações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MacroPage,
});

const fmt = (v: number | null, unit: string) => {
  if (v == null) return "—";
  const digits = Math.abs(v) >= 1000 ? 0 : unit === "R$" ? 4 : 2;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: unit === "R$" ? 2 : 0 });
};
const fmtDate = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");

function MacroPage() {
  const { data, isLoading } = useMacroSeries();
  const qc = useQueryClient();
  const refreshFn = useServerFn(refreshMacro);
  const refresh = useMutation({
    mutationFn: (force: boolean) => refreshFn({ data: { force } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["macro-series"] }),
  });
  const [selected, setSelected] = useState<string>("selic_meta");

  // atualização automática quando os dados estão com mais de 12h
  useEffect(() => {
    refresh.mutate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, MacroSeries[]>();
    for (const s of data ?? []) m.set(s.category, [...(m.get(s.category) ?? []), s]);
    return [...m.entries()];
  }, [data]);
  const current = data?.find((s) => s.code === selected) ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="icon"><Link to="/" aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-xl font-semibold">Dados Macroeconômicos</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {refresh.isPending ? "Atualizando no Banco Central…" : refresh.data?.failed?.length ? `${refresh.data.failed.length} série(s) indisponível(is) agora` : ""}
          </span>
          <Button size="sm" variant="outline" onClick={() => refresh.mutate(true)} disabled={refresh.isPending}>
            <RefreshCw className={`mr-1 h-4 w-4 ${refresh.isPending ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Fontes: Banco Central (SGS e Focus) e Ipeadata (risco-país EMBI+). Dados usados nos cálculos de valuation.
      </p>

      {current && <HistoryChart series={current} />}

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {groups.map(([cat, list]) => (
        <section key={cat} className="mb-5">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">{cat}</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((s) => (
              <div
                key={s.code}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(s.code)}
                onKeyDown={(e) => e.key === "Enter" && setSelected(s.code)}
                className={`rounded-lg border p-3 text-left transition-colors ${selected === s.code ? "border-primary bg-primary/10" : "border-border/60 bg-card hover:bg-accent/40"}`}
              >
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="truncate">{s.name}</span>
                  <InfoTip title={s.name} fundamentalista={s.description} tecnica="Disponível para os cálculos de valuation (Selic como taxa livre de risco, risco-país no custo de capital, Focus no crescimento de longo prazo)." />
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {fmt(s.lastValue, s.unit)} <span className="text-xs font-normal text-muted-foreground">{s.unit}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{s.frequency} · ref. {fmtDate(s.lastDate)}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function HistoryChart({ series }: { series: MacroSeries }) {
  const [years, setYears] = useState(5);
  const fn = useServerFn(getMacroHistory);
  const { data, isLoading } = useQuery({
    queryKey: ["macro-history", series.code, years, series.lastDate],
    queryFn: () => fn({ data: { code: series.code, years } }),
    staleTime: 60 * 60 * 1000,
  });
  const points = useMemo(() => {
    const d = data ?? [];
    const step = Math.max(1, Math.floor(d.length / 400));
    return d.filter((_, i) => i % step === 0 || i === d.length - 1);
  }, [data]);
  return (
    <div className="mb-5 rounded-lg border border-border/60 bg-card p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{series.name}</span>
        <div className="ml-auto flex gap-1">
          {[1, 5, 10].map((y) => (
            <Button key={y} size="sm" variant={y === years ? "default" : "outline"} onClick={() => setYears(y)}>{y}a</Button>
          ))}
        </div>
      </div>
      <div className="h-56 w-full">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando histórico…</p>
        ) : points.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem histórico ainda — clique em Atualizar.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(0, 7)} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} minTickGap={40} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={50} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }}
                labelFormatter={(d) => fmtDate(String(d))}
                formatter={(v) => [fmt(Number(v), series.unit), series.unit]}
              />
              <Area dataKey="value" type="monotone" stroke="var(--primary)" fill="color-mix(in oklab, var(--primary) 15%, transparent)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
