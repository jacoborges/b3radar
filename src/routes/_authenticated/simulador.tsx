import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  LineChart,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { stocksQueryOptions, useAllStocks } from "@/hooks/use-all-stocks";
import { useLiveQuotes } from "@/hooks/use-live-quotes";
import { useSimProventos } from "@/hooks/use-sim-proventos";
import { SimReturnChart } from "@/components/SimReturnChart";
import { SectorCompare } from "@/components/SectorCompare";
import { AssetCompare } from "@/components/AssetCompare";
import {
  proventosPorAno,
  simularTicker,
  somarPosicoes,
  type SimPosition,
} from "@/lib/sim-portfolio";
import {
  addSimLot,
  createSimPortfolio,
  deleteSimLot,
  deleteSimPortfolio,
  listSimPortfolios,
  renameSimPortfolio,
  updateSimLot,
  type SimLot,
  type SimPortfolio,
} from "@/lib/sim-portfolio.functions";

export const Route = createFileRoute("/_authenticated/simulador")({
  head: () => ({
    meta: [
      {
        title: "Simulador de Carteira — Rendimento e proventos | B3 Radar",
      },
      {
        name: "description",
        content:
          "Monte carteiras simuladas com ações da B3 e veja valorização, proventos recebidos e ajustes por bonificação e desdobramento desde a data da compra.",
      },
      {
        property: "og:title",
        content: "Simulador de Carteira — Rendimento e proventos | B3 Radar",
      },
      {
        property: "og:description",
        content:
          "Valorização, dividendos e JCP recebidos e correção automática da quantidade de ações por eventos societários.",
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
  component: SimuladorPage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const qtyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: 4 });

function tone(v: number | null | undefined) {
  if (v == null) return "text-muted-foreground";
  if (v > 0) return "text-success";
  if (v < 0) return "text-destructive";
  return "text-muted-foreground";
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function SimuladorPage() {
  const queryClient = useQueryClient();
  const { stocks } = useAllStocks();

  const fetchPortfolios = useServerFn(listSimPortfolios);
  const callCreate = useServerFn(createSimPortfolio);
  const callRename = useServerFn(renameSimPortfolio);
  const callDelete = useServerFn(deleteSimPortfolio);
  const callAddLot = useServerFn(addSimLot);
  const callUpdateLot = useServerFn(updateSimLot);
  const callDeleteLot = useServerFn(deleteSimLot);

  const { data: portfolios = [], isLoading } = useQuery({
    queryKey: ["sim-portfolios"],
    queryFn: () => fetchPortfolios(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["sim-portfolios"] });

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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const selected: SimPortfolio | null =
    portfolios.find((p) => p.id === selectedId) ?? portfolios[0] ?? null;

  const tickers = useMemo(
    () => Array.from(new Set(selected?.lots.map((l) => l.ticker) ?? [])),
    [selected],
  );

  const quotes = useLiveQuotes(tickers);
  const proventos = useSimProventos(tickers);

  const priceOf = (ticker: string): number | null => {
    const live = quotes.map.get(ticker)?.price;
    if (typeof live === "number" && live > 0) return live;
    const base = stocks.find((s) => s.ticker === ticker)?.preco;
    return typeof base === "number" && base > 0 ? base : null;
  };

  const posicoes: SimPosition[] = useMemo(() => {
    if (!selected) return [];
    const hoje = hojeISO();
    const byTicker = new Map<string, SimLot[]>();
    for (const lot of selected.lots) {
      const arr = byTicker.get(lot.ticker) ?? [];
      arr.push(lot);
      byTicker.set(lot.ticker, arr);
    }
    return Array.from(byTicker.entries())
      .map(([ticker, lots]) =>
        simularTicker(
          ticker,
          lots,
          proventos.byTicker.get(ticker) ?? [],
          priceOf(ticker),
          hoje,
        ),
      )
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, proventos.byTicker, quotes.map, stocks]);

  const totals = useMemo(() => somarPosicoes(posicoes), [posicoes]);
  const porAno = useMemo(() => proventosPorAno(posicoes), [posicoes]);
  const tickerList = useMemo(() => stocks.map((s) => s.ticker), [stocks]);
  const [aba, setAba] = useState<"carteiras" | "setor" | "ativo">("carteiras");

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
            <LineChart className="h-5 w-5 text-primary" />
            Simulador de Carteira
          </h1>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-2 text-xs"
            onClick={() => proventos.refetch()}
            disabled={proventos.isFetching}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${proventos.isFetching ? "animate-spin" : ""}`}
            />
            Atualizar histórico
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-2 px-3 pt-4 sm:px-6 md:px-8">
        <Button
          size="sm"
          variant={aba === "carteiras" ? "secondary" : "ghost"}
          onClick={() => setAba("carteiras")}
        >
          Carteiras simuladas
        </Button>
        <Button
          size="sm"
          variant={aba === "setor" ? "secondary" : "ghost"}
          onClick={() => setAba("setor")}
        >
          Comparar setor
        </Button>
        <Button
          size="sm"
          variant={aba === "ativo" ? "secondary" : "ghost"}
          onClick={() => setAba("ativo")}
        >
          Comparar ativo
        </Button>
      </div>

      {aba === "setor" && (
        <main className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 md:px-8">
          <SectorCompare stocks={stocks} />
        </main>
      )}

      {aba === "ativo" && (
        <main className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 md:px-8">
          <AssetCompare stocks={stocks} />
        </main>
      )}

      <main
        className={`mx-auto w-full max-w-6xl gap-6 px-3 py-6 sm:px-6 md:grid-cols-[260px_1fr] md:px-8 ${
          aba === "carteiras" ? "grid" : "hidden"
        }`}
      >
        <aside className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <Label className="text-xs text-muted-foreground">
              Nova carteira simulada
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: Simulação 2024"
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
                aria-label="Criar carteira simulada"
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
                Nenhuma simulação ainda. Crie a primeira acima.
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
                        onClick={() => setSelectedId(p.id)}
                      >
                        {p.name}
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
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
                        className="h-7 w-7 text-destructive"
                        aria-label="Excluir"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Excluir a simulação “${p.name}” e todos os lançamentos?`,
                            )
                          )
                            mDelete.mutate(p.id);
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

        <section className="space-y-4">
          {!selected ? (
            <div className="rounded-xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
              Crie uma carteira simulada para começar.
            </div>
          ) : (
            <>
              <AddLotForm
                stocks={tickerList}
                pending={mAddLot.isPending}
                onSubmit={(v) =>
                  mAddLot.mutate({ ...v, portfolioId: selected.id })
                }
              />

              {posicoes.length === 0 ? (
                <div className="rounded-xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
                  Nenhum ativo nesta simulação. Use “Adicionar compra” para
                  registrar a primeira posição.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard label="Investido" value={brl(totals.investido)} />
                    <SummaryCard
                      label="Valor atual"
                      value={brl(totals.valorMercado)}
                      hint={`Ganho de capital ${brl(totals.ganhoCapital)}`}
                      toneClass={tone(totals.ganhoCapital)}
                    />
                    <SummaryCard
                      label="Proventos recebidos"
                      value={brl(totals.proventos)}
                      hint={`Yield on cost ${totals.yieldOnCost.toFixed(2)}%`}
                      toneClass="text-success"
                    />
                    <SummaryCard
                      label="Retorno total"
                      value={brl(totals.retornoTotal)}
                      hint={pct(totals.retornoTotalPct)}
                      toneClass={tone(totals.retornoTotal)}
                    />
                  </div>

                  {proventos.isLoading && (
                    <p className="text-xs text-muted-foreground">
                      Consultando histórico oficial de proventos e eventos
                      societários…
                    </p>
                  )}
                  {proventos.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {proventos.errors.join(" · ")}
                    </p>
                  )}

                  <SimReturnChart posicoes={posicoes} proventosAno={porAno} />

                  <div className="space-y-2">
                    {posicoes.map((pos) => (
                      <PositionCard
                        key={pos.ticker}
                        pos={pos}
                        lots={
                          selected.lots.filter((l) => l.ticker === pos.ticker) ?? []
                        }
                        onUpdateLot={(v) => mUpdateLot.mutate(v)}
                        onDeleteLot={(id) => mDeleteLot.mutate(id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  toneClass,
}: {
  label: string;
  value: string;
  hint?: string;
  toneClass?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold ${toneClass ?? ""}`}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PositionCard({
  pos,
  lots,
  onUpdateLot,
  onDeleteLot,
}: {
  pos: SimPosition;
  lots: SimLot[];
  onUpdateLot: (v: {
    id: string;
    price: number;
    quantity: number;
    boughtAt: string;
  }) => void;
  onDeleteLot: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ep, setEp] = useState("");
  const [eq, setEq] = useState("");
  const [ed, setEd] = useState("");

  const bonificado = pos.quantidadeAtual !== pos.quantidadeOriginal;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border/60 bg-card"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-mono text-sm font-semibold">{pos.ticker}</span>
          <span className="text-xs text-muted-foreground">
            {qtyFmt(pos.quantidadeAtual)} ações
            {bonificado && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                ajustado
              </Badge>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            PM {brl(pos.precoMedioAjustado)}
          </span>
          <span className="text-xs text-muted-foreground">
            Atual {pos.precoAtual != null ? brl(pos.precoAtual) : "—"}
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-3 text-xs">
            <span className="text-success">
              Proventos {brl(pos.proventos)}
            </span>
            <span className={tone(pos.retornoTotal)}>
              {pos.retornoTotal != null ? brl(pos.retornoTotal) : "—"}{" "}
              {pos.retornoTotalPct != null && `(${pct(pos.retornoTotalPct)})`}
            </span>
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-4 border-t border-border/50 px-4 py-4">
          <div className="grid gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
            <Info label="Investido" value={brl(pos.investido)} />
            <Info
              label="Valor de mercado"
              value={pos.valorMercado != null ? brl(pos.valorMercado) : "—"}
            />
            <Info
              label="Ganho de capital"
              value={`${pos.ganhoCapital != null ? brl(pos.ganhoCapital) : "—"} ${
                pos.ganhoCapitalPct != null ? `(${pct(pos.ganhoCapitalPct)})` : ""
              }`}
              toneClass={tone(pos.ganhoCapital)}
            />
            <Info
              label="Yield on cost"
              value={pos.yieldOnCost != null ? `${pos.yieldOnCost.toFixed(2)}%` : "—"}
              toneClass="text-success"
            />
            <Info
              label="Quantidade original"
              value={qtyFmt(pos.quantidadeOriginal)}
            />
          </div>

          {pos.avisos.length > 0 && (
            <p className="text-[11px] text-destructive">{pos.avisos.join(" ")}</p>
          )}

          {pos.ajustes.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold">
                Ajustes por eventos societários
              </h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {pos.ajustes.map((a) => (
                  <li key={`${a.tipo}-${a.dataCom}-${a.fator}`}>
                    {a.dataCom} · {a.tipo} · fator {a.fator.toFixed(4)} ·{" "}
                    {qtyFmt(a.quantidadeAntes)} → {qtyFmt(a.quantidadeDepois)} ações
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="mb-1 text-xs font-semibold">
              Proventos recebidos desde a compra
            </h4>
            {pos.eventos.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum provento com data com posterior à compra.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="border-b border-border/50">
                      <th className="py-1 text-left font-medium">Tipo</th>
                      <th className="py-1 text-left font-medium">Data com</th>
                      <th className="py-1 text-left font-medium">Pagamento</th>
                      <th className="py-1 text-right font-medium">R$/ação</th>
                      <th className="py-1 text-right font-medium">Qtd.</th>
                      <th className="py-1 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pos.eventos.map((e) => (
                      <tr
                        key={`${e.tipo}-${e.dataCom}-${e.valorPorAcao}`}
                        className="border-b border-border/30"
                      >
                        <td className="py-1">{e.tipo}</td>
                        <td className="py-1">{e.dataCom}</td>
                        <td className="py-1">{e.dataPagamento ?? "—"}</td>
                        <td className="py-1 text-right">
                          {e.valorPorAcao.toLocaleString("pt-BR", {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td className="py-1 text-right">{qtyFmt(e.quantidade)}</td>
                        <td className="py-1 text-right font-medium text-success">
                          {brl(e.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold">Lançamentos</h4>
            <div className="space-y-1">
              {lots.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 px-3 py-2 text-xs"
                >
                  {editingId === l.id ? (
                    <>
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
                        className="h-8 w-40"
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          const price = Number(ep.replace(",", "."));
                          const quantity = Number(eq.replace(",", "."));
                          if (price > 0 && quantity > 0 && ed)
                            onUpdateLot({ id: l.id, price, quantity, boughtAt: ed });
                          setEditingId(null);
                        }}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <span>{l.boughtAt}</span>
                      <span>{qtyFmt(l.quantity)} ações</span>
                      <span>a {brl(l.price)}</span>
                      <span className="text-muted-foreground">
                        = {brl(l.price * l.quantity)}
                      </span>
                      <div className="ml-auto flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          aria-label="Editar lançamento"
                          onClick={() => {
                            setEditingId(l.id);
                            setEp(String(l.price));
                            setEq(String(l.quantity));
                            setEd(l.boughtAt);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          aria-label="Excluir lançamento"
                          onClick={() => onDeleteLot(l.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Info({
  label,
  value,
  toneClass,
}: {
  label: string;
  value: string;
  toneClass?: string;
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`font-medium ${toneClass ?? ""}`}>{value}</p>
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
  const [boughtAt, setBoughtAt] = useState(() => hojeISO());
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
              {suggestions.length > 0 &&
                !stocks.includes(ticker.trim().toUpperCase()) && (
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
              <Label className="text-xs text-muted-foreground">Data da compra</Label>
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
