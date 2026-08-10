import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  
  Settings,
  TrendingUp,
  TrendingDown,
  Coins,
  Wallet,
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
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { StockFilterSheet } from "@/components/StockFilterSheet";
import { useBazinDivisor } from "@/hooks/use-bazin-divisor";
import { useDividendBatch } from "@/hooks/use-dividend-batch";
import { calcPrecoTetoFromEventos, descontoTetoPct } from "@/lib/preco-teto";
import {
  initialFilters,
  type DebtColor,
  type FilterRange,
  type RecOpt,
} from "@/lib/stock-filters";
import { type Stock } from "@/lib/stocks-data";
import { INDICATORS, FUNDAMENTAL_KEYS, debtLevel } from "@/lib/indicators";
import { InfoTip } from "@/components/InfoTip";
import { DebtSemaphore } from "@/components/DebtSemaphore";
import { StockDetailModal } from "@/components/StockDetailModal";
import { stocksQueryOptions, useAllStocks } from "@/hooks/use-all-stocks";
import { AccountControls } from "@/components/AccountControls";


import { useLiveQuotes } from "@/hooks/use-live-quotes";


export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "B3 Radar — Ações da Bovespa com fundamentos, dividendos e gráfico" },
      {
        name: "description",
        content:
          "Painel escuro para acompanhar todas as ações ON, PN e Units da B3: fundamentos, dividendos vs. Selic, semáforo de endividamento, filtros técnicos e gráficos TradingView.",
      },
      { property: "og:title", content: "B3 Radar — Ações da Bovespa com fundamentos, dividendos e gráfico" },
      {
        property: "og:description",
        content:
          "Painel escuro para acompanhar todas as ações ON, PN e Units da B3: fundamentos, dividendos vs. Selic, semáforo de endividamento, filtros técnicos e gráficos TradingView.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(stocksQueryOptions),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background p-8 text-sm text-muted-foreground">
      Falha ao carregar dados: {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background p-8 text-sm text-muted-foreground">
      Página não encontrada.
    </div>
  ),
  component: HomePage,
});


type Tipo = "ALL" | "ON" | "PN" | "UNIT";
type SortKey = "ticker" | "preco" | "dy" | "pl" | "pvp" | "roe";

function HomePage() {
  const { stocks: STOCKS, sectors: SECTORS, fonte, updatedAt, error: dataError } = useAllStocks();
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<Tipo>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("ticker");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, FilterRange>>(initialFilters);
  const [debtColors, setDebtColors] = useState<DebtColor[]>([]);
  const [recFilter, setRecFilter] = useState<RecOpt>("ALL");
  const [minAnosAcimaSelic, setMinAnosAcimaSelic] = useState<number>(0);
  const [minAnosPrecoAcimaSelic, setMinAnosPrecoAcimaSelic] = useState<number>(0);
  const [precoTetoOnly, setPrecoTetoOnly] = useState(false);
  const [minDescontoTeto, setMinDescontoTeto] = useState(0);
  const [selected, setSelected] = useState<Stock | null>(null);

  const [openSectors, setOpenSectors] = useState<string[]>([]);

  const [divisor] = useBazinDivisor();
  const dividendos = useDividendBatch(STOCKS, { enabled: precoTetoOnly });

  const descontoMap = useMemo(() => {
    const m = new Map<string, number>();
    if (!precoTetoOnly) return m;
    for (const row of dividendos.rows) {
      const { teto } = calcPrecoTetoFromEventos(row.raw?.historicoCompleto, divisor);
      const d = descontoTetoPct(teto, row.stock.preco);
      if (d !== null) m.set(row.stock.ticker, d);
    }
    return m;
  }, [precoTetoOnly, dividendos.rows, divisor]);

  const activeFilters = useMemo(
    () =>
      Object.entries(filters).filter(
        ([, r]) => r.min !== null || r.max !== null,
      ),
    [filters],
  );

  const extraActiveCount =
    (debtColors.length > 0 && debtColors.length < 3 ? 1 : 0) +
    (recFilter !== "ALL" ? 1 : 0) +
    (minAnosAcimaSelic > 0 ? 1 : 0) +
    (minAnosPrecoAcimaSelic > 0 ? 1 : 0) +
    (precoTetoOnly ? 1 : 0);

  /** true quando o preço teto é o único filtro ativo → ranqueia por desconto */
  const rankByDesconto =
    precoTetoOnly && activeFilters.length === 0 && extraActiveCount === 1;

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
      if (debtColors.length > 0 && !debtColors.includes(debtLevel(s.divBrutaPatrimonio).color as DebtColor))
        return false;
      if (recFilter === "YES" && !s.dividendosRecorrentes) return false;
      if (recFilter === "NO" && s.dividendosRecorrentes) return false;
      if (s.anosYieldAcimaSelic < minAnosAcimaSelic) return false;
      if (s.anosPrecoAcimaSelic < minAnosPrecoAcimaSelic) return false;
      if (precoTetoOnly) {
        const d = descontoMap.get(s.ticker);
        if (d === undefined || d < minDescontoTeto) return false;
      }
      return true;
    });
  }, [STOCKS, search, tipo, activeFilters, debtColors, recFilter, minAnosAcimaSelic, minAnosPrecoAcimaSelic, precoTetoOnly, minDescontoTeto, descontoMap]);

  // Live prices via brapi.dev (polled every 30s) for the currently filtered set.
  const requestedTickers = useMemo(() => filtered.map((s) => s.ticker), [filtered]);
  const live = useLiveQuotes(requestedTickers);

  const filteredLive = useMemo<Stock[]>(() => {
    if (live.map.size === 0) return filtered;
    return filtered.map((s) => {
      const q = live.map.get(s.ticker);
      if (!q) return s;
      return {
        ...s,
        preco: q.price,
        variacaoDia: q.changePercent,
        precoD1: q.previousClose ?? s.precoD1,
      };
    });
  }, [filtered, live.map]);

  const bySector = useMemo(() => {
    const map = new Map<string, Stock[]>();
    for (const sec of SECTORS) map.set(sec, []);
    for (const s of filteredLive) map.get(s.setor)?.push(s);
    for (const [, arr] of map) {
      arr.sort((a, b) => {
        if (rankByDesconto) {
          const ad = descontoMap.get(a.ticker) ?? -Infinity;
          const bd = descontoMap.get(b.ticker) ?? -Infinity;
          if (ad !== bd) return bd - ad;
        }
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
  }, [SECTORS, filteredLive, sortKey, sortDir, rankByDesconto, descontoMap]);

  const total = filtered.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] px-4 py-4 md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  />
                  <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                    B3 <span className="text-primary">Radar</span>
                  </h1>
                </div>
                <LiveBadge
                  updatedAt={live.updatedAt}
                  isFetching={live.isFetching}
                  hasError={!!live.error}
                  count={live.map.size}
                />
                <DataSourceBadge fonte={fonte} updatedAt={updatedAt} error={dataError} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {total} ativos · ON, PN e Units organizados por setor econômico
              </p>
            </div>



            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar ticker ou empresa…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-input/60 border-border/60"
                />
              </div>

              <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
                <SelectTrigger className="min-w-0 flex-1 bg-input/60 border-border/60 sm:w-[110px] sm:flex-none">
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
                <SelectTrigger className="min-w-0 flex-1 bg-input/60 border-border/60 sm:w-[170px] sm:flex-none">
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

              <StockFilterSheet
                filters={filters}
                setFilters={setFilters}
                activeCount={activeFilters.length + extraActiveCount}
                debtColors={debtColors}
                setDebtColors={setDebtColors}
                recFilter={recFilter}
                setRecFilter={setRecFilter}
                minAnosAcimaSelic={minAnosAcimaSelic}
                setMinAnosAcimaSelic={setMinAnosAcimaSelic}
                minAnosPrecoAcimaSelic={minAnosPrecoAcimaSelic}
                setMinAnosPrecoAcimaSelic={setMinAnosPrecoAcimaSelic}
                precoTetoOnly={precoTetoOnly}
                setPrecoTetoOnly={setPrecoTetoOnly}
                minDescontoTeto={minDescontoTeto}
                setMinDescontoTeto={setMinDescontoTeto}
              />




              <Button
                asChild
                variant="outline"
                size="icon"
                className="shrink-0 border-border/60 bg-input/60"
                title="Carteira"
              >
                <Link to="/carteira" aria-label="Carteira">
                  <Wallet className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="icon"
                className="shrink-0 border-border/60 bg-input/60"
                title="Proventos"
              >
                <Link to="/dividendos" aria-label="Proventos">
                  <Coins className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="icon"
                className="shrink-0 border-border/60 bg-input/60"
                title="Configurações"
              >
                <Link to="/configuracoes" aria-label="Configurações">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>

              <AccountControls />

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
      />


      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Preços em tempo real via brapi.dev · Fundamentos atualizados do Fundamentus a cada 1 h · Proventos oficiais via B3
      </footer>


    </div>
  );
}

function StockTable({
  stocks,
  onSelect,
}: {
  stocks: Stock[];
  onSelect: (s: Stock) => void;
}) {
  return (
    <>
      {/* Mobile: card list */}
      <div className="flex flex-col divide-y divide-border/30 border-t border-border/60 md:hidden">
        {stocks.map((s) => {
          const positive = s.variacaoDia >= 0;
          const color = positive ? "var(--color-success)" : "var(--color-danger)";
          return (
            <button
              key={s.ticker}
              onClick={() => onSelect(s)}
              className="flex flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-primary/5 active:bg-primary/10"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-semibold text-primary">
                      {s.ticker}
                    </span>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-border/50 px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                    >
                      {s.tipo}
                    </Badge>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {s.nome}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-sm font-semibold">
                    R$ {s.preco.toFixed(2)}
                  </div>
                  <div
                    className="inline-flex items-center gap-0.5 font-mono text-xs"
                    style={{ color }}
                  >
                    {positive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {positive ? "+" : ""}
                    {s.variacaoDia.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-[11px]">
                {(["dy", "pl", "pvp", "roe"] as const).map((k) => {
                  const val = s[k] as number;
                  return (
                    <div key={k} className="min-w-0 rounded-md bg-background/40 px-2 py-1">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {INDICATORS[k].label}
                      </div>
                      <div className="truncate font-mono">
                        {INDICATORS[k].format(val)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-end">
                <DebtSemaphore divPL={s.divBrutaPatrimonio} compact />
              </div>
            </button>
          );
        })}
      </div>

      {/* Tablet+ : real table with progressive columns */}
      <div className="hidden overflow-x-auto border-t border-border/60 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-background/30 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">Ticker</th>
              <th className="px-3 py-2.5 text-right font-medium">Preço</th>
              <th className="px-3 py-2.5 text-right font-medium">Dia</th>
              {FUNDAMENTAL_KEYS.slice(0, 6).map((k, i) => (
                <th
                  key={k}
                  className={`px-3 py-2.5 text-right font-medium ${i >= 4 ? "hidden lg:table-cell" : i >= 2 ? "hidden md:table-cell lg:table-cell" : ""}`}
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
                    <div className="truncate text-xs text-muted-foreground">
                      {s.nome}
                    </div>
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
                  {FUNDAMENTAL_KEYS.slice(0, 6).map((k, i) => {
                    const val = s[k as keyof Stock] as number;
                    return (
                      <td
                        key={k}
                        className={`px-3 py-3 text-right font-mono ${i >= 4 ? "hidden lg:table-cell" : i >= 2 ? "hidden md:table-cell lg:table-cell" : ""}`}
                      >
                        {INDICATORS[k].format(val)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center" title={dl.label}>
                    <div className="flex justify-center">
                      <DebtSemaphore divPL={s.divBrutaPatrimonio} compact />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}



function LiveBadge({
  updatedAt,
  isFetching,
  hasError,
  count,
}: {
  updatedAt: Date | null;
  isFetching: boolean;
  hasError: boolean;
  count: number;
}) {
  const time = updatedAt
    ? updatedAt.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  const color = hasError
    ? "var(--color-danger)"
    : updatedAt
      ? "var(--color-success)"
      : "var(--color-warning)";

  const label = hasError
    ? "Cotações indisponíveis"
    : updatedAt
      ? `Ao vivo · ${count} tickers · ${time}`
      : "Conectando…";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
      style={{
        borderColor: "var(--color-border)",
        color: "var(--color-muted-foreground)",
      }}
      title="Preços atualizados a cada 30 s via brapi.dev"
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}`,
          animation: isFetching ? "pulse 1.2s ease-in-out infinite" : undefined,
        }}
      />
      {label}
    </span>
  );
}

function DataSourceBadge({
  fonte,
  updatedAt,
  error,
}: {
  fonte: "fundamentus" | "snapshot";
  updatedAt: Date;
  error: string | null;
}) {
  const diffMin = Math.max(0, Math.round((Date.now() - updatedAt.getTime()) / 60000));
  const ago =
    diffMin < 1 ? "agora" : diffMin < 60 ? `${diffMin} min` : `${Math.round(diffMin / 60)} h`;
  const isLive = fonte === "fundamentus";
  const color = isLive ? "var(--color-success)" : "var(--color-warning)";
  const label = isLive
    ? `Fundamentus · ${ago}`
    : "Snapshot offline";
  const title = isLive
    ? `Dados fundamentalistas atualizados do Fundamentus ${ago === "agora" ? "agora" : `há ${ago}`}. Cache de 1 h.`
    : `Não foi possível consultar o Fundamentus (${error ?? "erro desconhecido"}). Usando snapshot local.`;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
      style={{ borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}
      title={title}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
      {label}
    </span>
  );
}


