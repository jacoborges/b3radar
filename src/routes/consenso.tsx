import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw, TrendingDown, TrendingUp, Gauge } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { stocksQueryOptions, useAllStocks } from "@/hooks/use-all-stocks";
import { useConsensusBatch } from "@/hooks/use-consensus";
import {
  RATING_KEYS,
  RATING_META,
  formatScore,
  isConsensusAvailable,
  type ConsensusData,
  type ConsensusRating,
} from "@/lib/consensus-rating";
import { StockDetailModal } from "@/components/StockDetailModal";
import type { Stock } from "@/lib/stocks-data";

const DEFAULT_LIMIT = 60;

export const Route = createFileRoute("/consenso")({
  head: () => ({
    meta: [
      { title: "Consenso de Analistas — B3 Radar" },
      {
        name: "description",
        content:
          "Semáforo de compra/venda das ações da B3 agregando recomendações das principais casas via Yahoo Finance/Refinitiv. Atualização em tempo quase real.",
      },
      { property: "og:title", content: "Consenso de Analistas — B3 Radar" },
      {
        property: "og:description",
        content:
          "Ranking de ações da B3 por consenso de analistas: Compra Forte, Compra, Neutro, Venda, Venda Forte.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(stocksQueryOptions),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background p-8 text-sm text-muted-foreground">
      Falha ao carregar: {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background p-8 text-sm text-muted-foreground">
      Página não encontrada.
    </div>
  ),
  component: ConsensoPage,
});

function ConsensoPage() {
  const { stocks, sectors } = useAllStocks();
  const [sector, setSector] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<Set<ConsensusRating>>(new Set());
  const [selected, setSelected] = useState<Stock | null>(null);

  const stocksBySector = useMemo(() => {
    const filtered =
      sector === "all"
        ? stocks
            .slice()
            .sort((a, b) => b.liquidezDiaria - a.liquidezDiaria)
            .slice(0, DEFAULT_LIMIT)
        : stocks.filter((s) => s.setor === sector);
    // Só ações "normais" (ON/PN) — Yahoo raramente cobre units/FIIs/BDRs.
    return filtered.filter((s) => /\d{1,2}$/.test(s.ticker) && !s.ticker.endsWith("11"));
  }, [stocks, sector]);

  const tickers = useMemo(() => stocksBySector.map((s) => s.ticker), [stocksBySector]);
  const stockByTicker = useMemo(() => {
    const m = new Map<string, Stock>();
    for (const s of stocks) m.set(s.ticker, s);
    return m;
  }, [stocks]);

  const { results, updatedAt, isFetching, refetch } = useConsensusBatch(tickers);

  const rows = useMemo(() => {
    const list: Array<{ stock: Stock; consensus: ConsensusData }> = [];
    for (const t of tickers) {
      const c = results[t];
      const s = stockByTicker.get(t);
      if (!s || !isConsensusAvailable(c)) continue;
      if (ratingFilter.size > 0 && !ratingFilter.has(c.rating)) continue;
      list.push({ stock: s, consensus: c });
    }
    list.sort((a, b) => b.consensus.score - a.consensus.score);
    return list;
  }, [tickers, results, stockByTicker, ratingFilter]);

  const withoutCoverage = tickers.filter((t) => {
    const c = results[t];
    return c && !isConsensusAvailable(c);
  }).length;

  const toggleRating = (r: ConsensusRating) => {
    setRatingFilter((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="shrink-0">
              <Link to="/" aria-label="Voltar">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold sm:text-xl">Consenso de analistas</h1>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <UpdatedBadge date={updatedAt} isFetching={isFetching} />
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={isFetching}
                className="gap-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Semáforo agregando recomendações das principais casas via Yahoo Finance/Refinitiv
            (BTG, XP, Itaú BBA, JP Morgan, Morgan Stanley, Goldman, Bradesco BBI e outras).
            Atualiza automaticamente a cada 5 min. Conteúdo educacional — não é recomendação
            de investimento.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger className="h-9 w-full sm:w-64 border-border/60 bg-input/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Top {DEFAULT_LIMIT} por liquidez (default)
                </SelectItem>
                {sectors.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap items-center gap-1.5">
              {RATING_KEYS.map((r) => {
                const meta = RATING_META[r];
                const active = ratingFilter.has(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRating(r)}
                    className="rounded-full border px-3 py-1 text-xs font-medium transition"
                    style={{
                      borderColor: active ? meta.color : "hsl(var(--border) / 0.6)",
                      background: active ? meta.bg : "transparent",
                      color: active ? meta.color : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {meta.short}
                  </button>
                );
              })}
              {ratingFilter.size > 0 && (
                <button
                  type="button"
                  onClick={() => setRatingFilter(new Set())}
                  className="text-xs text-muted-foreground underline"
                >
                  limpar
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {isFetching && rows.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl border border-border/60 bg-card/50"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Nenhum ativo com consenso disponível para os filtros selecionados.
          </div>
        ) : (
          <>
            <div className="mb-3 text-xs text-muted-foreground">
              Mostrando <span className="font-semibold text-foreground">{rows.length}</span>{" "}
              ativos com cobertura de {tickers.length} consultados
              {withoutCoverage > 0 && (
                <> · {withoutCoverage} sem cobertura</>
              )}
              .
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map(({ stock, consensus }) => (
                <ConsensusCard
                  key={stock.ticker}
                  stock={stock}
                  consensus={consensus}
                  onClick={() => setSelected(stock)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
        Consenso agregado por Yahoo Finance/Refinitiv. Dados de recomendação podem estar
        defasados e não constituem recomendação de investimento.
      </footer>

      <StockDetailModal stock={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function UpdatedBadge({ date, isFetching }: { date: Date | null; isFetching: boolean }) {
  const label = date
    ? `Atualizado ${relative(date)}`
    : isFetching
      ? "Carregando..."
      : "Aguardando dados";
  return (
    <Badge variant="outline" className="border-border/60 bg-input/40 font-mono text-[11px]">
      {label}
    </Badge>
  );
}

function relative(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `há ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  return `há ${h}h`;
}

function ConsensusCard({
  stock,
  consensus,
  onClick,
}: {
  stock: Stock;
  consensus: ConsensusData;
  onClick: () => void;
}) {
  const meta = RATING_META[consensus.rating];
  const trendUp = consensus.trend > 0.05;
  const trendDown = consensus.trend < -0.05;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border bg-card/60 p-4 text-left transition hover:bg-card"
      style={{ borderColor: meta.border }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-semibold">{stock.ticker}</span>
            <span className="text-[10px] uppercase text-muted-foreground">{stock.tipo}</span>
          </div>
          <div className="truncate text-xs text-muted-foreground">{stock.nome}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{stock.setor}</div>
        </div>
        <div
          className="shrink-0 rounded-md border px-2.5 py-1 text-center"
          style={{ borderColor: meta.border, background: meta.bg, color: meta.color }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide">{meta.label}</div>
          <div className="font-mono text-lg font-bold leading-tight">{formatScore(consensus.score)}</div>
        </div>
      </div>

      <div className="mt-3">
        <StackedDistribution distribution={consensus.distribution} />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{consensus.totalAnalysts}</span>{" "}
          casas (últ. mês)
        </span>
        <span className="flex items-center gap-1">
          {trendUp && (
            <>
              <TrendingUp className="h-3 w-3" style={{ color: "var(--color-success)" }} />
              <span style={{ color: "var(--color-success)" }}>Melhorando</span>
            </>
          )}
          {trendDown && (
            <>
              <TrendingDown className="h-3 w-3" style={{ color: "var(--color-danger)" }} />
              <span style={{ color: "var(--color-danger)" }}>Piorando</span>
            </>
          )}
          {!trendUp && !trendDown && <span>Estável</span>}
        </span>
      </div>
    </button>
  );
}

function StackedDistribution({
  distribution,
}: {
  distribution: ConsensusData["distribution"];
}) {
  const segments = [
    { key: "SB", pct: distribution.strongBuy, color: "var(--color-success)", opacity: 1 },
    { key: "B", pct: distribution.buy, color: "var(--color-success)", opacity: 0.65 },
    { key: "H", pct: distribution.hold, color: "var(--color-warning)", opacity: 0.9 },
    { key: "S", pct: distribution.sell, color: "var(--color-danger)", opacity: 0.65 },
    { key: "SS", pct: distribution.strongSell, color: "var(--color-danger)", opacity: 1 },
  ];
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-border/40">
        {segments.map((s) =>
          s.pct > 0 ? (
            <div
              key={s.key}
              title={`${s.key}: ${s.pct.toFixed(0)}%`}
              style={{
                width: `${s.pct}%`,
                background: s.color,
                opacity: s.opacity,
              }}
            />
          ) : null,
        )}
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
        <span>C.Forte {distribution.strongBuy.toFixed(0)}%</span>
        <span>Compra {distribution.buy.toFixed(0)}%</span>
        <span>Neutro {distribution.hold.toFixed(0)}%</span>
        <span>Venda {distribution.sell.toFixed(0)}%</span>
        <span>V.Forte {distribution.strongSell.toFixed(0)}%</span>
      </div>
    </div>
  );
}
