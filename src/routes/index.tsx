import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  LineChart,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { STOCKS, SECTORS, type Stock } from "@/lib/stocks-data";
import { INDICATORS, FUNDAMENTAL_KEYS, debtLevel } from "@/lib/indicators";
import { InfoTip } from "@/components/InfoTip";
import { DebtSemaphore } from "@/components/DebtSemaphore";
import { StockDetailModal } from "@/components/StockDetailModal";
import { TradingViewModal } from "@/components/TradingViewModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "B3 Radar — Ações da Bovespa com fundamentos, dividendos e gráfico" },
      {
        name: "description",
        content:
          "Painel escuro para acompanhar todas as ações ON, PN e Units da B3: fundamentos, dividendos vs. Selic, semáforo de endividamento, filtros técnicos e gráficos TradingView.",
      },
      { property: "og:title", content: "B3 Radar — Painel completo da Bovespa" },
      {
        property: "og:description",
        content:
          "Fundamentos, dividendos, comparativo com a Selic e gráficos TradingView de todas as ações da B3.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

type Tipo = "ALL" | "ON" | "PN" | "UNIT";
type SortKey = "ticker" | "preco" | "dy" | "pl" | "pvp" | "roe";
type DebtOpt = "ALL" | "success" | "warning" | "danger";
type RecOpt = "ALL" | "YES" | "NO";

interface FilterRange {
  min: number | null;
  max: number | null;
}

const initialFilters: Record<string, FilterRange> = Object.fromEntries(
  FUNDAMENTAL_KEYS.map((k) => [k, { min: null, max: null }]),
);

function HomePage() {
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<Tipo>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("ticker");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, FilterRange>>(initialFilters);
  const [debtFilter, setDebtFilter] = useState<DebtOpt>("ALL");
  const [recFilter, setRecFilter] = useState<RecOpt>("ALL");
  const [minAnosAcimaSelic, setMinAnosAcimaSelic] = useState<number>(0);
  const [selected, setSelected] = useState<Stock | null>(null);
  const [chartTicker, setChartTicker] = useState<string | null>(null);
  const [openSectors, setOpenSectors] = useState<string[]>([]);

  const activeFilters = useMemo(
    () =>
      Object.entries(filters).filter(
        ([, r]) => r.min !== null || r.max !== null,
      ),
    [filters],
  );

  const extraActiveCount =
    (debtFilter !== "ALL" ? 1 : 0) +
    (recFilter !== "ALL" ? 1 : 0) +
    (minAnosAcimaSelic > 0 ? 1 : 0);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    return STOCKS.filter((s) => {
      if (q && !s.ticker.includes(q) && !s.nome.toUpperCase().includes(q))
        return false;
      if (tipo !== "ALL" && s.tipo !== tipo) return false;
      for (const [k, r] of activeFilters) {
        const val = s[k as keyof Stock] as number;
        if (r.min !== null && val < r.min) return false;
        if (r.max !== null && val > r.max) return false;
      }
      if (debtFilter !== "ALL" && debtLevel(s.divBrutaPatrimonio).color !== debtFilter)
        return false;
      if (recFilter === "YES" && !s.dividendosRecorrentes) return false;
      if (recFilter === "NO" && s.dividendosRecorrentes) return false;
      if (s.anosYieldAcimaSelic < minAnosAcimaSelic) return false;
      return true;
    });
  }, [search, tipo, activeFilters, debtFilter, recFilter, minAnosAcimaSelic]);


  const bySector = useMemo(() => {
    const map = new Map<string, Stock[]>();
    for (const sec of SECTORS) map.set(sec, []);
    for (const s of filtered) map.get(s.setor)?.push(s);
    for (const [, arr] of map) {
      arr.sort((a, b) => {
        const av = a[sortKey] as number | string;
        const bv = b[sortKey] as number | string;
        if (typeof av === "number" && typeof bv === "number")
          return sortDir === "asc" ? av - bv : bv - av;
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return map;
  }, [filtered, sortKey, sortDir]);

  const total = filtered.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] px-4 py-4 md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-1 rounded-full"
                  style={{ backgroundColor: "var(--color-primary)" }}
                />
                <h1 className="text-2xl font-bold tracking-tight">
                  B3 <span className="text-primary">Radar</span>
                </h1>
                <span className="hidden rounded-full border border-border/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground md:inline">
                  Bovespa · Tempo real
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {total} ativos · ON, PN e Units organizados por setor econômico
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 md:w-72 md:flex-none">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar ticker ou empresa…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-input/60 border-border/60"
                />
              </div>

              <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
                <SelectTrigger className="w-[110px] bg-input/60 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="ON">ON</SelectItem>
                  <SelectItem value="PN">PN</SelectItem>
                  <SelectItem value="UNIT">UNIT</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={`${sortKey}:${sortDir}`}
                onValueChange={(v) => {
                  const [k, d] = v.split(":");
                  setSortKey(k as SortKey);
                  setSortDir(d as "asc" | "desc");
                }}
              >
                <SelectTrigger className="w-[170px] bg-input/60 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ticker:asc">Ticker A→Z</SelectItem>
                  <SelectItem value="dy:desc">Maior DY</SelectItem>
                  <SelectItem value="pl:asc">Menor P/L</SelectItem>
                  <SelectItem value="pvp:asc">Menor P/VP</SelectItem>
                  <SelectItem value="roe:desc">Maior ROE</SelectItem>
                  <SelectItem value="preco:desc">Maior preço</SelectItem>
                </SelectContent>
              </Select>

              <FilterSheet
                filters={filters}
                setFilters={setFilters}
                activeCount={activeFilters.length + extraActiveCount}
                debtFilter={debtFilter}
                setDebtFilter={setDebtFilter}
                recFilter={recFilter}
                setRecFilter={setRecFilter}
                minAnosAcimaSelic={minAnosAcimaSelic}
                setMinAnosAcimaSelic={setMinAnosAcimaSelic}
              />

            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeFilters.map(([k, r]) => (
                <button
                  key={k}
                  onClick={() =>
                    setFilters((f) => ({ ...f, [k]: { min: null, max: null } }))
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/50 px-2.5 py-1 text-xs text-secondary-foreground transition-colors hover:border-primary/60"
                >
                  <span className="text-muted-foreground">
                    {INDICATORS[k].label}:
                  </span>
                  <span className="font-mono">
                    {r.min !== null ? r.min : "…"}
                    {" ↔ "}
                    {r.max !== null ? r.max : "…"}
                  </span>
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button
                onClick={() => setFilters(initialFilters)}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {total} ativos em {SECTORS.filter((s) => (bySector.get(s)?.length ?? 0) > 0).length} setores
          </span>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setOpenSectors(
                  SECTORS.filter((s) => (bySector.get(s)?.length ?? 0) > 0),
                )
              }
              className="rounded-md border border-border/60 px-2.5 py-1 transition-colors hover:border-primary/60 hover:text-foreground"
            >
              Expandir tudo
            </button>
            <button
              onClick={() => setOpenSectors([])}
              className="rounded-md border border-border/60 px-2.5 py-1 transition-colors hover:border-primary/60 hover:text-foreground"
            >
              Recolher tudo
            </button>
          </div>
        </div>
        {total === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card p-12 text-center text-muted-foreground">
            Nenhum ativo encontrado com esses filtros.
          </div>
        ) : (
          <Accordion
            type="multiple"
            value={
              search.trim() || activeFilters.length > 0 || extraActiveCount > 0
                ? SECTORS.filter((s) => (bySector.get(s)?.length ?? 0) > 0)
                : openSectors
            }

            onValueChange={setOpenSectors}
            className="space-y-3"
          >
            {SECTORS.map((sec) => {
              const items = bySector.get(sec) ?? [];
              if (items.length === 0) return null;
              return (
                <AccordionItem
                  key={sec}
                  value={sec}
                  className="overflow-hidden rounded-xl border border-border/60 bg-card"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-6 w-1 rounded-full"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      />
                      <span className="text-base font-semibold">{sec}</span>
                      <Badge
                        variant="outline"
                        className="border-border/60 text-muted-foreground"
                      >
                        {items.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <StockTable
                      stocks={items}
                      onSelect={setSelected}
                      onChart={setChartTicker}
                    />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </main>

      <StockDetailModal
        stock={selected}
        onClose={() => setSelected(null)}
        onOpenChart={(t) => {
          setChartTicker(t);
        }}
      />
      <TradingViewModal
        ticker={chartTicker}
        onClose={() => setChartTicker(null)}
      />

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Dados de demonstração · Integração de dados reais via brapi.dev + Fundamentus na próxima fase
      </footer>
    </div>
  );
}

function StockTable({
  stocks,
  onSelect,
  onChart,
}: {
  stocks: Stock[];
  onSelect: (s: Stock) => void;
  onChart: (t: string) => void;
}) {
  return (
    <div className="overflow-x-auto border-t border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 bg-background/30 text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 text-left font-medium">Ticker</th>
            <th className="px-3 py-2.5 text-right font-medium">Preço</th>
            <th className="px-3 py-2.5 text-right font-medium">Dia</th>
            {FUNDAMENTAL_KEYS.slice(0, 6).map((k) => (
              <th
                key={k}
                className="px-3 py-2.5 text-right font-medium"
              >
                <span className="inline-flex items-center gap-1">
                  {INDICATORS[k].label}
                  <InfoTip
                    title={INDICATORS[k].short}
                    fundamentalista={INDICATORS[k].fundamentalista}
                    tecnica={INDICATORS[k].tecnica}
                  />
                </span>
              </th>
            ))}
            <th className="px-3 py-2.5 text-center font-medium">
              <span className="inline-flex items-center gap-1">
                Dívida
                <InfoTip
                  title="Semáforo de Endividamento"
                  fundamentalista="Verde: Dív/PL ≤ 0,5x. Amarelo: entre 0,5x e 1,2x. Vermelho: > 1,2x."
                  tecnica="Empresas mais endividadas amplificam movimentos e exigem stops mais largos."
                />
              </span>
            </th>
            <th className="px-3 py-2.5 text-center font-medium">Gráfico</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((s) => {
            const dl = debtLevel(s.divBrutaPatrimonio);
            return (
              <tr
                key={s.ticker}
                onClick={() => onSelect(s)}
                className="cursor-pointer border-b border-border/20 transition-colors last:border-0 hover:bg-primary/5"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-primary">
                      {s.ticker}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-border/50 px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                    >
                      {s.tipo}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{s.nome}</div>
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  R$ {s.preco.toFixed(2)}
                </td>
                <td
                  className="px-3 py-3 text-right font-mono"
                  style={{
                    color:
                      s.variacaoDia >= 0
                        ? "var(--color-success)"
                        : "var(--color-danger)",
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    {s.variacaoDia >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {s.variacaoDia >= 0 ? "+" : ""}
                    {s.variacaoDia.toFixed(2)}%
                  </span>
                </td>
                {FUNDAMENTAL_KEYS.slice(0, 6).map((k) => {
                  const val = s[k as keyof Stock] as number;
                  return (
                    <td key={k} className="px-3 py-3 text-right font-mono">
                      {INDICATORS[k].format(val)}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-center" title={dl.label}>
                  <div className="flex justify-center">
                    <DebtSemaphore divPL={s.divBrutaPatrimonio} compact />
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 px-2 text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChart(s.ticker);
                    }}
                  >
                    <LineChart className="h-4 w-4" />
                    <span className="hidden md:inline">Ver</span>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FilterSheet({
  filters,
  setFilters,
  activeCount,
  debtFilter,
  setDebtFilter,
  recFilter,
  setRecFilter,
  minAnosAcimaSelic,
  setMinAnosAcimaSelic,
}: {
  filters: Record<string, FilterRange>;
  setFilters: (f: Record<string, FilterRange>) => void;
  activeCount: number;
  debtFilter: DebtOpt;
  setDebtFilter: (v: DebtOpt) => void;
  recFilter: RecOpt;
  setRecFilter: (v: RecOpt) => void;
  minAnosAcimaSelic: number;
  setMinAnosAcimaSelic: (v: number) => void;
}) {

  // sensible ranges for sliders
  const bounds: Record<string, [number, number, number]> = {
    pl: [0, 60, 0.5],
    pvp: [0, 10, 0.1],
    dy: [0, 20, 0.1],
    roe: [-10, 40, 0.5],
    roic: [-10, 40, 0.5],
    margemLiquida: [-10, 50, 0.5],
    margemEbit: [-10, 70, 0.5],
    divBrutaPatrimonio: [0, 3, 0.05],
    liquidezCorrente: [0, 5, 0.05],
    cagrLucros5a: [-30, 50, 0.5],
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" className="gap-2 border border-border/60">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtros por indicadores técnicos</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6 px-4 pb-8">
          {/* Filtros qualitativos */}
          <div className="space-y-4 rounded-lg border border-border/60 bg-background/40 p-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                Semáforo de endividamento
                <InfoTip
                  title="Semáforo de Endividamento"
                  fundamentalista="Verde: Dív/PL ≤ 0,5x. Amarelo: 0,5x–1,2x. Vermelho: > 1,2x."
                  tecnica="Ativos mais alavancados costumam ter beta e volatilidade maiores."
                />
              </Label>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  ["ALL", "Todos", "var(--color-muted-foreground)"],
                  ["success", "Baixo", "var(--color-success)"],
                  ["warning", "Moderado", "var(--color-warning)"],
                  ["danger", "Elevado", "var(--color-danger)"],
                ] as const).map(([val, label, color]) => (
                  <button
                    key={val}
                    onClick={() => setDebtFilter(val as DebtOpt)}
                    className="rounded-md border px-2 py-1.5 text-xs transition-colors"
                    style={{
                      borderColor: debtFilter === val ? color : "var(--color-border)",
                      color: debtFilter === val ? color : "var(--color-muted-foreground)",
                      backgroundColor: debtFilter === val ? `color-mix(in oklab, ${color} 12%, transparent)` : "transparent",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                Pagamento recorrente de dividendos
                <InfoTip
                  title="Recorrência de proventos"
                  fundamentalista="Considera recorrente quem pagou dividendos ou JCP em todos os últimos 5 anos."
                  tecnica="Papéis 'pagadores' costumam ter menor volatilidade e drawdowns mais amenos."
                />
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ["ALL", "Todos"],
                  ["YES", "Sim (5/5 anos)"],
                  ["NO", "Não"],
                ] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setRecFilter(val as RecOpt)}
                    className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                      recFilter === val
                        ? "border-primary/70 bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm">
                  Dividendo &gt; Selic
                  <InfoTip
                    title="Yield vs. Selic"
                    fundamentalista="Nº de anos (dos últimos 5) em que o yield de proventos superou a Selic média ponderada do ano."
                    tecnica="Papéis que batem a Selic sistematicamente tendem a atrair fluxo em ciclos de queda de juros."
                  />
                </Label>
                <span className="font-mono text-xs text-muted-foreground">
                  ≥ {minAnosAcimaSelic}/5 anos
                </span>
              </div>
              <Slider
                min={0}
                max={5}
                step={1}
                value={[minAnosAcimaSelic]}
                onValueChange={([v]) => setMinAnosAcimaSelic(v)}
              />
            </div>
          </div>

          {FUNDAMENTAL_KEYS.map((k) => {
            const [min, max, step] = bounds[k];
            const cur = filters[k];

            const v: [number, number] = [
              cur.min ?? min,
              cur.max ?? max,
            ];
            const active = cur.min !== null || cur.max !== null;
            return (
              <div key={k} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-sm">
                    {INDICATORS[k].label}
                    <InfoTip
                      title={INDICATORS[k].short}
                      fundamentalista={INDICATORS[k].fundamentalista}
                      tecnica={INDICATORS[k].tecnica}
                    />
                  </Label>
                  <span className="font-mono text-xs text-muted-foreground">
                    {active
                      ? `${v[0]} — ${v[1]}`
                      : `${min} — ${max}`}
                  </span>
                </div>
                <Slider
                  min={min}
                  max={max}
                  step={step}
                  value={v}
                  onValueChange={([lo, hi]) =>
                    setFilters({
                      ...filters,
                      [k]: { min: lo, max: hi },
                    })
                  }
                />
              </div>
            );
          })}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setFilters(initialFilters);
              setDebtFilter("ALL");
              setRecFilter("ALL");
              setMinAnosAcimaSelic(0);
            }}

          >
            Limpar todos os filtros
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
