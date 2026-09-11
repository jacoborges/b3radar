import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Minus,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionTip } from "@/components/ActionTip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { stocksQueryOptions, useAllStocks } from "@/hooks/use-all-stocks";
import { useLiveQuotes } from "@/hooks/use-live-quotes";
import { PortfolioProventos } from "@/components/PortfolioProventos";
import { usePortfolioProventosRecebidos } from "@/hooks/use-portfolio-proventos-recebidos";
import { PortfolioTimeline } from "@/components/PortfolioTimeline";
import {
  addLot,
  addSale,
  createPortfolio,
  deleteLot,
  deletePortfolio,
  deleteSale,
  listPortfolios,
  renamePortfolio,
  updateLot,
  updateSale,
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
          "Crie carteiras, registre suas compras de ações da B3 e acompanhe preço médio, quantidade total e lucro ou prejuízo em tempo real.",
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
  /** saldo atual = comprado − vendido */
  totalQty: number;
  boughtQty: number;
  soldQty: number;
  avgPrice: number;
  invested: number;
  current: number | null;
  pl: number | null;
  plPct: number | null;
  /** resultado já realizado nas vendas */
  realized: number;
  lots: PortfolioLot[];
  sales: PortfolioSale[];
}

function toneClass(v: number | null | undefined) {
  if (v == null) return "text-muted-foreground";
  if (v > 0) return "text-success";
  if (v < 0) return "text-destructive";
  return "text-muted-foreground";
}

function CarteiraPage() {
  const queryClient = useQueryClient();
  const { stocks } = useAllStocks();

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
    mutationFn: (v: {
      portfolioId: string;
      ticker: string;
      price: number;
      quantity: number;
      soldAt: string;
    }) => callAddSale({ data: v }),
    onSuccess: invalidate,
  });
  const mUpdateSale = useMutation({
    mutationFn: (v: {
      id: string;
      price: number;
      quantity: number;
      soldAt: string;
    }) => callUpdateSale({ data: v }),
    onSuccess: invalidate,
  });
  const mDeleteSale = useMutation({
    mutationFn: (id: string) => callDeleteSale({ data: { id } }),
    onSuccess: invalidate,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const selected: Portfolio | null =
    portfolios.find((p) => p.id === selectedId) ?? portfolios[0] ?? null;

  const tickers = useMemo(
    () =>
      Array.from(
        new Set(
          portfolios.flatMap((p) => [
            ...p.lots.map((l) => l.ticker),
            ...p.sales.map((s) => s.ticker),
          ]),
        ),
      ),
    [portfolios],
  );
  const quotes = useLiveQuotes(tickers);

  const priceOf = (ticker: string): number | null => {
    const live = quotes.map.get(ticker)?.price;
    if (typeof live === "number" && live > 0) return live;
    const base = stocks.find((s) => s.ticker === ticker)?.preco;
    return typeof base === "number" && base > 0 ? base : null;
  };

  const positions: Position[] = useMemo(() => {
    if (!selected) return [];
    const tickersSet = new Set<string>([
      ...selected.lots.map((l) => l.ticker),
      ...selected.sales.map((s) => s.ticker),
    ]);

    return Array.from(tickersSet)
      .map((ticker) => {
        const lots = selected.lots.filter((l) => l.ticker === ticker);
        const sales = selected.sales
          .filter((s) => s.ticker === ticker)
          .sort((a, b) => a.soldAt.localeCompare(b.soldAt));

        const boughtQty = lots.reduce((s, l) => s + l.quantity, 0);
        const boughtValue = lots.reduce((s, l) => s + l.quantity * l.price, 0);
        const avgPrice = boughtQty > 0 ? boughtValue / boughtQty : 0;
        const soldQty = sales.reduce((s, v) => s + v.quantity, 0);
        const totalQty = boughtQty - soldQty;

        // Resultado realizado: preço de venda − preço médio das compras até a data.
        const realized = sales.reduce((acc, v) => {
          const before = lots.filter((l) => l.boughtAt <= v.soldAt);
          const q = before.reduce((s, l) => s + l.quantity, 0);
          const val = before.reduce((s, l) => s + l.quantity * l.price, 0);
          const media = q > 0 ? val / q : avgPrice;
          return acc + (v.price - media) * v.quantity;
        }, 0);

        const invested = totalQty * avgPrice;
        const price = priceOf(ticker);
        const current = price != null ? price * totalQty : null;
        const pl = current != null ? current - invested : null;
        const plPct =
          current != null && invested > 0 ? (current / invested - 1) * 100 : null;

        return {
          ticker,
          totalQty,
          boughtQty,
          soldQty,
          avgPrice,
          invested,
          current,
          pl,
          plPct,
          realized,
          lots,
          sales,
        };
      })
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, quotes.map, stocks]);

  const posicoesAtivas = useMemo(
    () => positions.filter((p) => p.totalQty > 1e-9),
    [positions],
  );
  const posicoesEncerradas = useMemo(
    () => positions.filter((p) => p.totalQty <= 1e-9),
    [positions],
  );

  const posicoesResumo = useMemo(
    () =>
      positions.map((p) => ({
        ticker: p.ticker,
        lots: p.lots.map((l) => ({ quantity: l.quantity, boughtAt: l.boughtAt })),
        sales: p.sales.map((s) => ({ quantity: s.quantity, soldAt: s.soldAt })),
        encerrada: p.totalQty <= 1e-9,
      })),
    [positions],
  );

  const recebidos = usePortfolioProventosRecebidos(posicoesResumo);

  const totals = useMemo(() => {
    const invested = posicoesAtivas.reduce((s, p) => s + p.invested, 0);
    const current = posicoesAtivas.reduce(
      (s, p) => s + (p.current ?? p.invested),
      0,
    );
    const realized = positions.reduce((s, p) => s + p.realized, 0);
    const proventos = recebidos.total;
    return {
      invested,
      current,
      realized,
      proventos,
      realizadoTotal: realized + proventos,
      pl: current - invested,
      plPct: invested > 0 ? (current / invested - 1) * 100 : 0,
    };
  }, [positions, posicoesAtivas, recebidos.total]);

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
              <ActionTip tip="criarCarteira">
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
              </ActionTip>
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
              const isActive = selected?.id === p.id;
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
                      <ActionTip tip="salvar">
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
                      </ActionTip>
                      <ActionTip tip="cancelar">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label="Cancelar"
                          onClick={() => setRenamingId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </ActionTip>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="flex-1 truncate text-left text-sm font-medium"
                        onClick={() => setSelectedId(p.id)}
                      >
                        {p.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p.lots.length} lanç.
                        </span>
                      </button>
                      <ActionTip tip="renomear">
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
                      </ActionTip>
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
        </aside>

        {/* Detalhe da carteira */}
        <section className="space-y-4">
          {!selected ? (
            <div className="rounded-xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
              Selecione ou crie uma carteira para começar.
            </div>
          ) : (
            <>
              <PortfolioTimeline
                positions={positions}
                proventosByMonth={recebidos.byMonth}
                proventosLoading={recebidos.isLoading}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-4">
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    Investido {brl(totals.invested)} · Atual {brl(totals.current)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ganho na venda{" "}
                    <span className={toneClass(totals.realized)}>
                      {brl(totals.realized)}
                    </span>
                    {" · "}Proventos recebidos{" "}
                    <span className="text-success">
                      {recebidos.isLoading ? "—" : brl(totals.proventos)}
                    </span>
                    {" · "}Realizado total{" "}
                    <span className={`font-semibold ${toneClass(totals.realizadoTotal)}`}>
                      {brl(totals.realizadoTotal)}
                    </span>
                    {recebidos.isLoading && " (parcial)"}
                  </p>
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

              <PortfolioProventos posicoes={posicoesResumo} />



              {positions.length === 0 ? (
                <div className="rounded-xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
                  Nenhum ativo nesta carteira. Use o botão “+” para registrar sua
                  primeira compra.
                </div>
              ) : (
                <div className="space-y-2">
                  {posicoesAtivas.map((pos) => (
                    <PositionRow
                      key={pos.ticker}
                      pos={pos}
                      price={priceOf(pos.ticker)}
                      proventos={recebidos.byTicker.get(pos.ticker) ?? null}
                      onUpdateLot={(v) => mUpdateLot.mutate(v)}
                      onDeleteLot={(id) => mDeleteLot.mutate(id)}
                      onAddSale={(v) =>
                        mAddSale.mutate({ portfolioId: selected.id, ...v })
                      }
                      onUpdateSale={(v) => mUpdateSale.mutate(v)}
                      onDeleteSale={(id) => mDeleteSale.mutate(id)}
                    />
                  ))}

                  {posicoesEncerradas.length > 0 && (
                    <>
                      <p className="pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Posições encerradas
                      </p>
                      {posicoesEncerradas.map((pos) => (
                        <PositionRow
                          key={pos.ticker}
                          pos={pos}
                          price={priceOf(pos.ticker)}
                          proventos={recebidos.byTicker.get(pos.ticker) ?? null}
                          onUpdateLot={(v) => mUpdateLot.mutate(v)}
                          onDeleteLot={(id) => mDeleteLot.mutate(id)}
                          onAddSale={(v) =>
                            mAddSale.mutate({ portfolioId: selected.id, ...v })
                          }
                          onUpdateSale={(v) => mUpdateSale.mutate(v)}
                          onDeleteSale={(id) => mDeleteSale.mutate(id)}
                        />
                      ))}
                    </>
                  )}
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

function PositionRow({
  pos,
  price,
  proventos,
  onUpdateLot,
  onDeleteLot,
  onAddSale,
  onUpdateSale,
  onDeleteSale,
}: {
  pos: Position;
  price: number | null;
  proventos: number | null;
  onUpdateLot: (v: {
    id: string;
    price: number;
    quantity: number;
    boughtAt: string;
  }) => void;
  onDeleteLot: (id: string) => void;
  onAddSale: (v: { ticker: string; price: number; quantity: number; soldAt: string }) => void;
  onUpdateSale: (v: {
    id: string;
    price: number;
    quantity: number;
    soldAt: string;
  }) => void;
  onDeleteSale: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ep, setEp] = useState("");
  const [eq, setEq] = useState("");
  const [ed, setEd] = useState("");
  const [sellOpen, setSellOpen] = useState(false);
  const [sp, setSp] = useState("");
  const [sq, setSq] = useState("");
  const [sd, setSd] = useState(() => new Date().toISOString().slice(0, 10));
  const [sErr, setSErr] = useState<string | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [vp, setVp] = useState("");
  const [vq, setVq] = useState("");
  const [vd, setVd] = useState("");

  const submitSale = () => {
    const p = Number(sp.replace(",", "."));
    const q = Number(sq.replace(",", "."));
    if (!(p > 0)) return setSErr("Informe um preço de venda válido.");
    if (!(q > 0)) return setSErr("Informe uma quantidade válida.");
    if (q > pos.totalQty + 1e-9)
      return setSErr(`Você tem apenas ${qty(pos.totalQty)} un. disponíveis.`);
    setSErr(null);
    onAddSale({ ticker: pos.ticker, price: p, quantity: q, soldAt: sd });
    setSp("");
    setSq("");
    setSellOpen(false);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-mono font-semibold">{pos.ticker}</span>
        <Badge variant="outline" className="font-mono text-xs">
          {qty(pos.totalQty)} un.
        </Badge>
        {pos.totalQty <= 1e-9 && (
          <Badge variant="secondary" className="text-[10px]">
            Vendida
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          PM {brl(pos.avgPrice)} · Atual {price != null ? brl(price) : "—"}
        </span>
        <span className="ml-auto text-right">
          <span className={`block text-sm font-semibold ${toneClass(pos.pl)}`}>
            {pos.totalQty > 1e-9 && pos.pl != null ? brl(pos.pl) : "—"}
          </span>
          <span className={`block text-xs ${toneClass(pos.plPct)}`}>
            {pos.totalQty > 1e-9 && pos.plPct != null ? pct(pos.plPct) : "—"}
          </span>
        </span>
      </button>

      {open && (
        <div className="border-t border-border/50 px-4 py-3">
          <p className="mb-1 text-xs text-muted-foreground">
            Investido {brl(pos.invested)} · Valor atual{" "}
            {pos.current != null ? brl(pos.current) : "—"}
            {pos.soldQty > 0 && <> · Vendido {qty(pos.soldQty)} un.</>}
          </p>
          <p className="mb-2 text-xs text-muted-foreground">
            Ganho na venda{" "}
            <span className={toneClass(pos.realized)}>{brl(pos.realized)}</span>
            {" · "}Proventos recebidos{" "}
            <span className="text-success">
              {proventos == null ? "—" : brl(proventos)}
            </span>
            {" · "}Realizado total{" "}
            <span
              className={`font-semibold ${toneClass(pos.realized + (proventos ?? 0))}`}
            >
              {brl(pos.realized + (proventos ?? 0))}
            </span>
          </p>

          {/* Registrar venda */}
          {pos.totalQty > 1e-9 && (
            <div className="mb-3">
              {!sellOpen ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setSellOpen(true)}
                >
                  <Minus className="h-3.5 w-3.5" />
                  Vender ativo
                </Button>
              ) : (
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Preço de venda
                      </Label>
                      <Input
                        value={sp}
                        onChange={(e) => setSp(e.target.value)}
                        className="mt-1 h-8"
                        inputMode="decimal"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Quantidade (máx. {qty(pos.totalQty)})
                      </Label>
                      <Input
                        value={sq}
                        onChange={(e) => setSq(e.target.value)}
                        className="mt-1 h-8"
                        inputMode="decimal"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Data da venda
                      </Label>
                      <Input
                        type="date"
                        value={sd}
                        onChange={(e) => setSd(e.target.value)}
                        className="mt-1 h-8"
                      />
                    </div>
                  </div>
                  {sErr && (
                    <p className="mt-2 text-xs text-destructive">{sErr}</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={submitSale}>
                      Registrar venda
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSellOpen(false);
                        setSErr(null);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="space-y-1">
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
                  className="flex items-center gap-3 rounded-md bg-muted/30 px-3 py-1.5 text-xs"
                >
                  <span className="text-muted-foreground">
                    {new Date(`${lot.boughtAt}T12:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="font-mono">{qty(lot.quantity)} un.</span>
                  <span className="font-mono">{brl(lot.price)}</span>
                  <span className="ml-auto flex gap-1">
                    <ActionTip tip="editarLancamento">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Editar lançamento"
                        onClick={() => {
                          setEditingId(lot.id);
                          setEp(String(lot.price));
                          setEq(String(lot.quantity));
                          setEd(lot.boughtAt);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </ActionTip>
                    <ActionTip tip="excluirLancamento">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        aria-label="Excluir lançamento"
                        onClick={() => onDeleteLot(lot.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </ActionTip>
                  </span>
                </div>
              ),
            )}
          </div>

          {pos.sales.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Vendas
              </p>
              {pos.sales.map((sale) =>
                editingSaleId === sale.id ? (
                  <div key={sale.id} className="flex flex-wrap items-end gap-2">
                    <Input
                      value={vp}
                      onChange={(e) => setVp(e.target.value)}
                      className="h-8 w-24"
                      inputMode="decimal"
                    />
                    <Input
                      value={vq}
                      onChange={(e) => setVq(e.target.value)}
                      className="h-8 w-24"
                      inputMode="decimal"
                    />
                    <Input
                      type="date"
                      value={vd}
                      onChange={(e) => setVd(e.target.value)}
                      className="h-8 w-36"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const p = Number(vp.replace(",", "."));
                        const q = Number(vq.replace(",", "."));
                        if (p > 0 && q > 0)
                          onUpdateSale({
                            id: sale.id,
                            price: p,
                            quantity: q,
                            soldAt: vd,
                          });
                        setEditingSaleId(null);
                      }}
                    >
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingSaleId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div
                    key={sale.id}
                    className="flex items-center gap-3 rounded-md bg-destructive/10 px-3 py-1.5 text-xs"
                  >
                    <span className="text-muted-foreground">
                      {new Date(`${sale.soldAt}T12:00:00`).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="font-mono">−{qty(sale.quantity)} un.</span>
                    <span className="font-mono">{brl(sale.price)}</span>
                    <span className="ml-auto flex gap-1">
                      <ActionTip tip="editarVenda">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          aria-label="Editar venda"
                          onClick={() => {
                            setEditingSaleId(sale.id);
                            setVp(String(sale.price));
                            setVq(String(sale.quantity));
                            setVd(sale.soldAt);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </ActionTip>
                      <ActionTip tip="excluirVenda">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          aria-label="Excluir venda"
                          onClick={() => onDeleteSale(sale.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </ActionTip>
                    </span>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
