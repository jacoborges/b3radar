import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  TrendingDown,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { stocksQueryOptions, useAllStocks } from "@/hooks/use-all-stocks";
import { useLiveQuotes } from "@/hooks/use-live-quotes";
import { PortfolioProventos } from "@/components/PortfolioProventos";
import { PortfolioTimeline } from "@/components/PortfolioTimeline";
import { GroupWatchlist } from "@/components/GroupWatchlist";
import { MarketIndicesList } from "@/components/MarketIndicesList";
import { StockGroupsSheet } from "@/components/StockGroupsSheet";
import { useStockGroups } from "@/hooks/use-stock-groups";
import { PortfolioChartButton } from "@/components/PortfolioChartButton";
import { PortfolioRebalanceButton } from "@/components/PortfolioRebalanceButton";
import { PortfolioSalesTimeline } from "@/components/PortfolioSalesTimeline";
import { StockSortSelect } from "@/components/StockSortSelect";
import { StockColumnsSelect } from "@/components/StockColumnsSelect";
import { StockMetricsStrip } from "@/components/StockMetricColumns";
import { useStockSort } from "@/hooks/use-stock-sort";
import { compareStocks } from "@/lib/stock-sort";
import { useSimProventos } from "@/hooks/use-sim-proventos";
import { portfolioLedger } from "@/lib/portfolio-ledger";
import {
  addSale,
  addLot,
  createPortfolio,
  deleteLot,
  deletePortfolio,
  listPortfolios,
  renamePortfolio,
  deleteSale,
  updateSale,
  updateLot,
  type Portfolio,
  type PortfolioLot,
  type PortfolioSale,
} from "@/lib/portfolio.functions";

export const Route = createFileRoute("/_authenticated/carteira")({
  head: () => ({
    meta: [
      { title: "Carteira — Controle de posições e preço médio | B3 Radar" },
      {
        name: "description",
        content:
          "Registre compras e vendas de ações da B3, acompanhe resultados realizados e preserve o histórico de proventos e posições encerradas.",
      },
      {
        property: "og:title",
        content: "Carteira — Controle de posições e preço médio | B3 Radar",
      },
      {
        property: "og:description",
        content:
          "Acompanhe o desempenho das suas compras com preço médio ponderado e cotação em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(stocksQueryOptions),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background p-8 text-sm text-muted-foreground">
      Falha: {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background p-8 text-sm text-muted-foreground">
      Página não encontrada.
    </div>
  ),
  component: CarteiraPage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const qty = (v: number) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: 6 });

interface Position {
  ticker: string;
  totalQty: number;
  avgPrice: number;
  invested: number;
  current: number | null;
  pl: number | null;
  plPct: number | null;
  lots: PortfolioLot[];
  sales: PortfolioSale[];
  realized: number;
  proceeds: number;
  dividends: ReturnType<typeof portfolioLedger>["dividends"];
  adjustments: ReturnType<typeof portfolioLedger>["adjustments"];
  realizedSales: ReturnType<typeof portfolioLedger>["realizedSales"];
  price: number | null;
  result: number | null;
  resultPct: number | null;
}

interface AddSaleInput {
  portfolioId: string;
  ticker: string;
  price: number;
  quantity: number;
  soldAt: string;
  expectedLots: Array<{ id: string; ticker: string; price: number; quantity: number; bought_at: string }>;
  expectedSales: Array<{ id: string; ticker: string; price: number; quantity: number; sold_at: string }>;
}

function toneClass(v: number | null | undefined) {
  if (v == null) return "text-muted-foreground";
  if (v > 0) return "text-success";
  if (v < 0) return "text-destructive";
  return "text-muted-foreground";
}

function CarteiraPage() {
  const queryClient = useQueryClient();
  const { stocks } = useAllStocks({ allSectors: true });
  const [sort] = useStockSort();
  const [timelineYear, setTimelineYear] = useState(new Date().getFullYear());

  const fetchPortfolios = useServerFn(listPortfolios);
  const callCreate = useServerFn(createPortfolio);
  const callRename = useServerFn(renamePortfolio);
  const callDelete = useServerFn(deletePortfolio);
  const callAddLot = useServerFn(addLot);
  const callUpdateLot = useServerFn(updateLot);
  const callDeleteLot = useServerFn(deleteLot);
  const callAddSale = useServerFn(addSale);
  const callUpdateSale = useServerFn(updateSale);
  const callDeleteSale = useServerFn(deleteSale);

  const { data: portfolios = [], isLoading } = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => fetchPortfolios(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["portfolios"] });

  const mCreate = useMutation({
    mutationFn: (name: string) => callCreate({ data: { name } }),
    onSuccess: invalidate,
  });
  const mRename = useMutation({
    mutationFn: (v: { id: string; name: string }) => callRename({ data: v }),
    onSuccess: invalidate,
  });
  const mDelete = useMutation({
    mutationFn: (id: string) => callDelete({ data: { id } }),
    onSuccess: invalidate,
  });
  const mAddLot = useMutation({
    mutationFn: (v: {
      portfolioId: string;
      ticker: string;
      price: number;
      quantity: number;
      boughtAt: string;
    }) => callAddLot({ data: v }),
    onSuccess: invalidate,
  });
  const mUpdateLot = useMutation({
    mutationFn: (v: {
      id: string;
      price: number;
      quantity: number;
      boughtAt: string;
    }) => callUpdateLot({ data: v }),
    onSuccess: invalidate,
  });
  const mDeleteLot = useMutation({
    mutationFn: (id: string) => callDeleteLot({ data: { id } }),
    onSuccess: invalidate,
  });
  const mAddSale = useMutation({
    mutationFn: (v: AddSaleInput) => callAddSale({ data: v }),
    onSuccess: invalidate,
  });
  const mUpdateSale = useMutation({
    mutationFn: (v: { id: string; price: number; quantity: number; soldAt: string }) => callUpdateSale({ data: v }),
    onSuccess: invalidate,
  });
  const mDeleteSale = useMutation({ mutationFn: (id: string) => callDeleteSale({ data: { id } }), onSuccess: invalidate });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { groups } = useStockGroups();
  const [groupId, setGroupId] = useState<string | null>(null);
  const selectedGroup = groups.find((g) => g.id === groupId) ?? null;
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const selected: Portfolio | null =
    portfolios.find((p) => p.id === selectedId) ?? portfolios[0] ?? null;

  const tickers = useMemo(
    () => Array.from(new Set(portfolios.flatMap((p) => [...p.lots.map((l) => l.ticker), ...p.sales.map((s) => s.ticker)]))),
    [portfolios],
  );
  const quotes = useLiveQuotes(tickers);
  const corporateEvents = useSimProventos(tickers);

  const priceOf = (ticker: string): number | null => {
    const live = quotes.map.get(ticker)?.price;
    if (typeof live === "number" && live > 0) return live;
    const base = stocks.find((s) => s.ticker === ticker)?.preco;
    return typeof base === "number" && base > 0 ? base : null;
  };

  // Full ledger history is independent of the active-only summary and row presentation.
  const allPositions: Position[] = useMemo(() => {
    if (!selected) return [];
    const byTicker = new Map<string, { lots: PortfolioLot[]; sales: PortfolioSale[] }>();
    for (const lot of selected.lots) {
      const entry = byTicker.get(lot.ticker) ?? { lots: [], sales: [] };
      entry.lots.push(lot); byTicker.set(lot.ticker, entry);
    }
    for (const sale of selected.sales) { const entry = byTicker.get(sale.ticker) ?? { lots: [], sales: [] }; entry.sales.push(sale); byTicker.set(sale.ticker, entry); }
    return Array.from(byTicker.entries())
      .map(([ticker, transactions]) => {
        const ledger = portfolioLedger(transactions.lots, transactions.sales, corporateEvents.byTicker.get(ticker) ?? [], new Date().toISOString().slice(0, 10));
        const totalQty = ledger.quantity;
        const invested = ledger.cost;
        const avgPrice = ledger.avgPrice;
        const price = priceOf(ticker);
        const current = price != null ? price * totalQty : null;
        const pl = current != null ? current - invested : null;
        const plPct =
          current != null && invested > 0 ? (current / invested - 1) * 100 : null;
        const result = pl != null ? pl + ledger.realized : ledger.realized;
        const historicalCost = transactions.lots.reduce((sum, lot) => sum + lot.price * lot.quantity, 0);
        const resultPct = historicalCost > 0 ? result / historicalCost * 100 : null;
        return { ticker, totalQty, avgPrice, invested, current, pl, plPct, lots: transactions.lots, sales: transactions.sales, realized: ledger.realized, proceeds: ledger.proceeds, dividends: ledger.dividends, adjustments: ledger.adjustments, realizedSales: ledger.realizedSales, price, result, resultPct };
      })
      .sort((a, b) => Number(a.totalQty <= 1e-8) - Number(b.totalQty <= 1e-8) || a.ticker.localeCompare(b.ticker));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, quotes.map, stocks, corporateEvents.byTicker]);

  const positions = useMemo(() => {
    const byTicker = new Map(stocks.map((stock) => [stock.ticker, stock]));
    return [...allPositions].sort((a, b) =>
      Number(a.totalQty <= 1e-8) - Number(b.totalQty <= 1e-8) || compareStocks(
        { ...byTicker.get(a.ticker), ticker: a.ticker, preco: a.price },
        { ...byTicker.get(b.ticker), ticker: b.ticker, preco: b.price },
        sort,
      ),
    );
  }, [allPositions, stocks, sort]);

  const taxPositions = useMemo(() => portfolios.flatMap(portfolio => {
    const grouped = new Map<string, { lots: PortfolioLot[]; sales: PortfolioSale[] }>();
    for (const lot of portfolio.lots) {
      const item = grouped.get(lot.ticker) ?? { lots: [], sales: [] };
      item.lots.push(lot); grouped.set(lot.ticker, item);
    }
    for (const sale of portfolio.sales) {
      const item = grouped.get(sale.ticker) ?? { lots: [], sales: [] };
      item.sales.push(sale); grouped.set(sale.ticker, item);
    }
    return Array.from(grouped, ([ticker, item]) => portfolioLedger(item.lots, item.sales, corporateEvents.byTicker.get(ticker) ?? [], new Date().toISOString().slice(0, 10)));
  }), [portfolios, corporateEvents.byTicker]);
  const posicoesResumo = useMemo(
    () =>
      positions.map((p) => ({
        ticker: p.ticker,
        lots: p.lots,
        sales: p.sales,
      })),
    [positions],
  );

  const totals = useMemo(() => {
    // Only the current summary excludes closed positions; the timeline retains them.
    const positions = allPositions.filter((p) => p.totalQty > 1e-8);

    const invested = positions.reduce((s, p) => s + p.invested, 0);
    const current = positions.reduce((s, p) => s + (p.current ?? p.invested), 0);
    const realized = positions.reduce((s, p) => s + p.realized, 0);
    const historicalCost = positions.reduce((s, p) => s + p.lots.reduce((sum, lot) => sum + lot.price * lot.quantity, 0), 0);
    return {
      invested,
      current,
      pl: current - invested + realized,
      plPct: historicalCost > 0 ? (current - invested + realized) / historicalCost * 100 : 0,
      realized,
    };
  }, [allPositions]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-3 py-4 sm:px-6 md:px-8">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div
            className="h-6 w-1 rounded-full"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Wallet className="h-5 w-5 text-primary" />
            Carteira
          </h1>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {quotes.isFetching
              ? "Atualizando cotações…"
              : quotes.updatedAt
                ? `Cotações ${quotes.updatedAt.toLocaleTimeString("pt-BR")}`
                : "Cotações do último fechamento"}
          </span>
        </div>
        {quotes.error && (
          <div className="mx-auto w-full max-w-6xl px-3 pb-3 text-xs text-destructive sm:px-6 md:px-8">
            {quotes.error}{" "}
            <Link to="/configuracoes" className="underline">
              Ajustar token brapi
            </Link>
          </div>
        )}
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-3 py-6 sm:px-6 md:grid-cols-[260px_1fr] md:px-8">
        {/* Lista de carteiras */}
        <aside className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <Label className="text-xs text-muted-foreground">Nova carteira</Label>
            <div className="mt-2 flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: Longo prazo"
                maxLength={60}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    mCreate.mutate(newName.trim());
                    setNewName("");
                  }
                }}
              />
              <Button
                size="icon"
                disabled={!newName.trim() || mCreate.isPending}
                onClick={() => {
                  mCreate.mutate(newName.trim());
                  setNewName("");
                }}
                aria-label="Criar carteira"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            {isLoading && (
              <p className="px-2 text-sm text-muted-foreground">Carregando…</p>
            )}
            {!isLoading && portfolios.length === 0 && (
              <p className="px-2 text-sm text-muted-foreground">
                Nenhuma carteira ainda. Crie a primeira acima.
              </p>
            )}
            {portfolios.map((p) => {
              const isActive = !selectedGroup && selected?.id === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-lg border px-3 py-2 ${
                    isActive
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/50 bg-card"
                  }`}
                >
                  {renamingId === p.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={renameValue}
                        maxLength={60}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-8"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label="Salvar nome"
                        onClick={() => {
                          if (renameValue.trim())
                            mRename.mutate({ id: p.id, name: renameValue.trim() });
                          setRenamingId(null);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label="Cancelar"
                        onClick={() => setRenamingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="flex-1 truncate text-left text-sm font-medium"
                        onClick={() => { setSelectedId(p.id); setGroupId(null); }}
                      >
                        {p.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p.lots.length + p.sales.length} lanç.
                        </span>
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label="Renomear"
                        onClick={() => {
                          setRenamingId(p.id);
                          setRenameValue(p.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        aria-label="Excluir carteira"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Excluir a carteira "${p.name}" e todos os seus lançamentos?`,
                            )
                          ) {
                            mDelete.mutate(p.id);
                            if (selected?.id === p.id) setSelectedId(null);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-2">
            <p className="px-2 pb-1 pt-1 text-xs font-medium text-muted-foreground">Grupos</p>
            {groups.length === 0 ? (
              <div className="space-y-2 p-2 text-xs text-muted-foreground">
                <p>Você ainda não criou grupos.</p>
                <StockGroupsSheet filter={[]} onFilterChange={() => {}} />
              </div>
            ) : groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroupId(g.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${groupId === g.id ? "bg-primary/10 text-primary" : "hover:bg-muted/40"}`}
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                <span className="flex-1 truncate font-medium">{g.name}</span>
                <span className="text-xs text-muted-foreground">{g.tickers.length}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Detalhe da carteira */}
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StockSortSelect />
            <div className="ml-auto"><StockColumnsSelect /></div>
          </div>
          {selectedGroup ? (
            <GroupWatchlist group={selectedGroup} />
          ) : !selected ? (
            <div className="rounded-xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
              Selecione ou crie uma carteira para começar.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-4">
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    Investido {brl(totals.invested)} · Atual {brl(totals.current)}
                  </p>
                  <p className="text-xs text-muted-foreground">Resultado realizado {brl(totals.realized)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${toneClass(totals.pl)}`}>
                    {brl(totals.pl)}
                  </p>
                  <p className={`text-xs font-medium ${toneClass(totals.pl)}`}>
                    {pct(totals.plPct)}
                  </p>
                </div>
              </div>

              <AddLotForm
                stocks={stocks.map((s) => s.ticker)}
                pending={mAddLot.isPending}
                onSubmit={(v) =>
                  mAddLot.mutate({ portfolioId: selected.id, ...v })
                }
              />

              <AddSaleForm
                positions={positions}
                pending={mAddSale.isPending}
                serverError={mAddSale.error instanceof Error ? mAddSale.error.message : null}
                onSubmit={(v) => {
                  const position = positions.find((p) => p.ticker === v.ticker);
                  if (!position) return;
                  mAddSale.mutate({ portfolioId: selected.id, ...v,
                    expectedLots: position.lots.map(l => ({ id: l.id, ticker: l.ticker, price: l.price, quantity: l.quantity, bought_at: l.boughtAt })).sort((a,b) => a.id.localeCompare(b.id)),
                    expectedSales: position.sales.map(s => ({ id: s.id, ticker: s.ticker, price: s.price, quantity: s.quantity, sold_at: s.soldAt })).sort((a,b) => a.id.localeCompare(b.id)),
                  });
                }}
              />

              <PortfolioProventos posicoes={posicoesResumo} />
              <PortfolioTimeline name={selected.name} positions={allPositions} year={timelineYear} onYearChange={setTimelineYear} />
              <PortfolioSalesTimeline positions={taxPositions} selectedPositions={allPositions} year={timelineYear} loading={corporateEvents.isLoading} />
              {corporateEvents.isLoading && <p className="text-xs text-muted-foreground">Carregando histórico oficial de proventos e eventos…</p>}
              {corporateEvents.errors.map(error => <p key={error} className="text-xs text-destructive">{error}</p>)}
              {[mAddLot.error, mUpdateLot.error, mDeleteLot.error, mUpdateSale.error, mDeleteSale.error].filter((error): error is Error => error instanceof Error).map((error, i) => <p key={i} role="alert" className="text-xs text-destructive">{error.message}</p>)}

              {positions.length === 0 ? (
                <div className="rounded-xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
                  Nenhum ativo nesta carteira. Use o botão “+” para registrar sua
                  primeira compra.
                </div>
              ) : (
                <div className="space-y-2">
                  {positions.map((pos) => (
                    <PositionRow
                      key={pos.ticker}
                      pos={pos}
                      price={priceOf(pos.ticker)}
                      stock={stocks.find(s => s.ticker === pos.ticker)}
                      onUpdateLot={(v) => mUpdateLot.mutate(v)}
                      onDeleteLot={(id) => mDeleteLot.mutate(id)}
                      onUpdateSale={(v) => mUpdateSale.mutate(v)}
                      onDeleteSale={(id) => mDeleteSale.mutate(id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function AddLotForm({
  stocks,
  pending,
  onSubmit,
}: {
  stocks: string[];
  pending: boolean;
  onSubmit: (v: {
    ticker: string;
    price: number;
    quantity: number;
    boughtAt: string;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ticker, setTicker] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [boughtAt, setBoughtAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    const q = ticker.trim().toUpperCase();
    if (!q) return [];
    return stocks.filter((t) => t.startsWith(q)).slice(0, 8);
  }, [ticker, stocks]);

  const submit = () => {
    const t = ticker.trim().toUpperCase();
    const p = Number(price.replace(",", "."));
    const q = Number(quantity.replace(",", "."));
    if (!stocks.includes(t)) return setError("Selecione um ativo válido da base.");
    if (!(p > 0)) return setError("Informe um preço de compra válido.");
    if (!(q > 0)) return setError("Informe uma quantidade válida.");
    setError(null);
    onSubmit({ ticker: t, price: p, quantity: q, boughtAt });
    setTicker("");
    setPrice("");
    setQuantity("");
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Plus className="h-4 w-4" />
        </span>
        Adicionar compra
      </button>

      {open && (
        <div className="border-t border-border/50 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="relative">
              <Label className="text-xs text-muted-foreground">Ativo</Label>
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="PETR4"
                maxLength={12}
                className="mt-1 font-mono"
              />
              {suggestions.length > 0 && !stocks.includes(ticker.trim().toUpperCase()) && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border/60 bg-popover shadow-lg">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="block w-full px-3 py-1.5 text-left font-mono text-sm hover:bg-accent"
                      onClick={() => setTicker(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Preço de compra
              </Label>
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="32,50"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Quantidade</Label>
              <Input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputMode="decimal"
                placeholder="100"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data</Label>
              <Input
                type="date"
                value={boughtAt}
                onChange={(e) => setBoughtAt(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <div className="mt-3 flex justify-end">
            <Button size="sm" disabled={pending} onClick={submit}>
              Registrar compra
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddSaleForm({ positions, pending, serverError, onSubmit }: {
  positions: Position[];
  pending: boolean;
  serverError: string | null;
  onSubmit: (v: { ticker: string; price: number; quantity: number; soldAt: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ticker, setTicker] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [soldAt, setSoldAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const active = positions.filter(p => p.totalQty > 1e-8);
  const selected = active.find(p => p.ticker === ticker);
  const submit = () => {
    const p = Number(price.replace(",", "."));
    const q = Number(quantity.replace(",", "."));
    if (!selected) return setError("Selecione um ativo com posição aberta.");
    if (!(p > 0)) return setError("Informe um preço de venda válido.");
    if (!(q > 0) || q > selected.totalQty + 1e-8) return setError(`Informe até ${qty(selected.totalQty)} ações disponíveis.`);
    if (!soldAt || soldAt > new Date().toISOString().slice(0, 10)) return setError("Informe uma data de venda válida, sem data futura.");
    setError(null); onSubmit({ ticker, price: p, quantity: q, soldAt }); setPrice(""); setQuantity("");
  };
  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <Button variant="ghost" className="h-auto w-full justify-start gap-2 rounded-xl px-4 py-3 text-sm font-medium" onClick={() => setOpen(v => !v)}>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/15 text-destructive"><TrendingDown className="h-4 w-4" /></span>
        Adicionar venda
      </Button>
      {open && <div className="border-t border-border/50 px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div><Label className="text-xs text-muted-foreground">Ativo</Label><select aria-label="Ativo da venda" value={ticker} onChange={e => setTicker(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm"><option value="">Selecione</option>{active.map(p => <option key={p.ticker} value={p.ticker}>{p.ticker} · {qty(p.totalQty)} un.</option>)}</select></div>
          <div><Label className="text-xs text-muted-foreground">Preço de venda</Label><Input aria-label="Preço de venda" value={price} onChange={e => setPrice(e.target.value)} inputMode="decimal" placeholder="32,50" className="mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Quantidade</Label><Input aria-label="Quantidade vendida" value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" placeholder={selected ? qty(selected.totalQty) : "100"} className="mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Data</Label><Input aria-label="Data da venda" type="date" max={new Date().toISOString().slice(0, 10)} value={soldAt} onChange={e => setSoldAt(e.target.value)} className="mt-1" /></div>
        </div>
        {(error || serverError) && <p className="mt-2 text-xs text-destructive">{error || serverError}</p>}
        <div className="mt-3 flex justify-end"><Button size="sm" variant="destructive" disabled={pending || active.length === 0} onClick={submit}>Registrar venda</Button></div>
      </div>}
    </div>
  );
}

function PositionRow({
  stock,
  pos,
  price,
  onUpdateLot,
  onDeleteLot,
  onUpdateSale,
  onDeleteSale,
}: {
  stock?: Partial<Record<import("@/lib/indicators").IndicatorKey, number>>;
  pos: Position;
  price: number | null;
  onUpdateLot: (v: {
    id: string;
    price: number;
    quantity: number;
    boughtAt: string;
  }) => void;
  onDeleteLot: (id: string) => void;
  onUpdateSale: (v: { id: string; price: number; quantity: number; soldAt: string }) => void;
  onDeleteSale: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ep, setEp] = useState("");
  const [eq, setEq] = useState("");
  const [ed, setEd] = useState("");
  const closed = pos.totalQty <= 1e-8;

  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <div className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left">
      <Button
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Ver histórico de ${pos.ticker}`}
        className="h-auto flex-wrap justify-start gap-3 p-0 hover:bg-transparent"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className={`font-mono font-semibold ${closed ? "text-muted-foreground/50" : "text-foreground"}`}>{pos.ticker}</span>
        <Badge variant="outline" className="font-mono text-xs">
          {closed ? "Encerrada" : `${qty(pos.totalQty)} un.`}
        </Badge>
      </Button>
        <span className="text-xs text-muted-foreground">
          PM {brl(pos.avgPrice)} · Atual {price != null ? brl(price) : "—"}
        </span>
        <PortfolioChartButton ticker={pos.ticker} />
        <PortfolioRebalanceButton ticker={pos.ticker} qty={pos.totalQty} avgPrice={pos.avgPrice} price={price ?? null} />
        {!closed && (
          <span className="ml-auto text-right">
            <span className={`block text-sm font-semibold ${toneClass(pos.result)}`}>
              {pos.result != null ? brl(pos.result) : "—"}
            </span>
            <span className={`block text-xs ${toneClass(pos.resultPct)}`}>
              {pos.resultPct != null ? pct(pos.resultPct) : "—"}
            </span>
          </span>
        )}
      </div>
      <div className={closed ? "text-muted-foreground/50" : ""}><StockMetricsStrip stock={{ ...stock, preco: price ?? undefined }} /></div>

      {open && (
        <div className="border-t border-border/50 px-4 py-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Investido {brl(pos.invested)} · Valor atual{" "}
            {pos.current != null ? brl(pos.current) : "—"}
            {" · "}Realizado <span className={toneClass(pos.realized)}>{brl(pos.realized)}</span>
          </p>
          <h4 className="mb-1 text-xs font-semibold">Compras</h4><div className="space-y-1">
            {pos.lots.map((lot) =>
              editingId === lot.id ? (
                <div key={lot.id} className="flex flex-wrap items-end gap-2">
                  <Input
                    value={ep}
                    onChange={(e) => setEp(e.target.value)}
                    className="h-8 w-24"
                    inputMode="decimal"
                  />
                  <Input
                    value={eq}
                    onChange={(e) => setEq(e.target.value)}
                    className="h-8 w-24"
                    inputMode="decimal"
                  />
                  <Input
                    type="date"
                    value={ed}
                    onChange={(e) => setEd(e.target.value)}
                    className="h-8 w-36"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const p = Number(ep.replace(",", "."));
                      const q = Number(eq.replace(",", "."));
                      if (p > 0 && q > 0)
                        onUpdateLot({ id: lot.id, price: p, quantity: q, boughtAt: ed });
                      setEditingId(null);
                    }}
                  >
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div
                  key={lot.id}
                  className="flex flex-wrap items-center gap-3 rounded-md bg-muted/30 px-3 py-1.5 text-xs"
                >
                  <span className="text-muted-foreground">
                    {new Date(`${lot.boughtAt}T12:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="font-mono">{qty(lot.quantity)} un.</span>
                  <span className="font-mono">{brl(lot.price)}</span>
                  <span className="ml-auto flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      aria-label="Editar lançamento"
                      disabled={pos.sales.length > 0}
                      onClick={() => {
                        setEditingId(lot.id);
                        setEp(String(lot.price));
                        setEq(String(lot.quantity));
                        setEd(lot.boughtAt);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      aria-label="Excluir lançamento"
                      disabled={pos.sales.length > 0}
                      onClick={() => onDeleteLot(lot.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </div>
              ),
            )}
          </div>
          <h4 className="mb-1 mt-4 text-xs font-semibold">Vendas realizadas</h4>
          <div className="space-y-1">{pos.sales.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma venda registrada.</p> : pos.sales.map(sale => <div key={sale.id} className="flex items-center gap-3 rounded-md bg-muted/30 px-3 py-1.5 text-xs"><span className="text-muted-foreground">{new Date(`${sale.soldAt}T12:00:00`).toLocaleDateString("pt-BR")}</span><span className="font-mono">{qty(sale.quantity)} un.</span><span className="font-mono">{brl(sale.price)}</span><span className="ml-auto flex gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Editar venda" onClick={() => { const p = prompt("Preço da venda", String(sale.price)); const q = prompt("Quantidade vendida", String(sale.quantity)); const d = prompt("Data da venda (AAAA-MM-DD)", sale.soldAt); if (p && q && d) onUpdateSale({ id: sale.id, price: Number(p.replace(",", ".")), quantity: Number(q.replace(",", ".")), soldAt: d }); }}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="Excluir venda" onClick={() => onDeleteSale(sale.id)}><Trash2 className="h-3.5 w-3.5" /></Button></span></div>)}</div>
          <h4 className="mb-1 mt-4 text-xs font-semibold">Proventos e eventos do período</h4>
          <div className="space-y-1">{pos.dividends.length === 0 && pos.adjustments.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum evento oficial encontrado no período.</p> : <>{pos.dividends.map((d, i) => <div key={`d-${d.dataCom}-${i}`} className="rounded-md bg-muted/30 px-3 py-1.5 text-xs">{d.tipo} · Data Com {new Date(`${d.dataCom}T12:00:00`).toLocaleDateString("pt-BR")} · Pagamento {d.dataPagamento ? new Date(`${d.dataPagamento}T12:00:00`).toLocaleDateString("pt-BR") : "a definir"} · {qty(d.quantity)} un. · <span className="text-success">{brl(d.total)}</span></div>)}{pos.adjustments.map((a, i) => <div key={`a-${a.date}-${i}`} className="rounded-md bg-muted/30 px-3 py-1.5 text-xs">{a.tipo} · {new Date(`${a.date}T12:00:00`).toLocaleDateString("pt-BR")} · {qty(a.before)} → {qty(a.after)} un.</div>)}</>}</div>
        </div>
      )}
    </div>
  );
}
