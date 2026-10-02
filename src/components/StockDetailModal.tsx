import { useMemo, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Stock } from "@/lib/stocks-data";
import { computeDividendStats, SELIC } from "@/lib/stocks-data";
import { INDICATORS, FUNDAMENTAL_KEYS } from "@/lib/indicators";
import { useTickerData } from "@/hooks/use-ticker-data";
import { usePriceHistory } from "@/hooks/use-price-history";
import { useTickerFundamentals } from "@/hooks/use-ticker-fundamentals";
import { useAnalystConsensus } from "@/hooks/use-consensus";
import { useTradingViewTechnical } from "@/hooks/use-tradingview";
import {
  RATING_META,
  formatScore,
  isConsensusAvailable,
} from "@/lib/consensus-rating";
import {
  TV_TIMEFRAMES,
  isTvAvailable,
  type TvTimeframe,
} from "@/lib/tradingview-rating";
import { InfoTip } from "./InfoTip";
import { HistoryChartButton } from "./IndicatorHistoryDialog";
import { DebtSemaphore } from "./DebtSemaphore";
import { PrecoTetoPanel } from "./PrecoTetoPanel";
import { PrecoTetoProjetivoPanel } from "./PrecoTetoProjetivoPanel";
import { ValuationPanel } from "./ValuationPanel";
import { ValuationDdmPanel } from "./ValuationDdmPanel";
import { isSetorFinanceiroNome } from "@/lib/valuation-ddm";
import { MarketAnalysisDialog } from "./MarketAnalysisDialog";



import {
  DividendStackedChart,
  DividendVsSelicChart,
  PriceVsSelicChart,
} from "./DividendChart";
import { DividendIntelligencePanel } from "./DividendIntelligencePanel";
import { MacroSensitivityPanel } from "./MacroSensitivityPanel";
import { TrendingDown, TrendingUp } from "lucide-react";

interface Props {
  stock: Stock | null;
  onClose: () => void;
}

export function StockDetailModal({ stock: baseStock, onClose }: Props) {
  const ticker = baseStock?.ticker ?? null;
  const [chartLoaded, setChartLoaded] = useState(false);
  const queryClient = useQueryClient();
  const { proventos, isLoading, isFetching } = useTickerData(ticker);
  const {
    data: liveFund,
    isLoading: fundLoading,
    isFetching: fundFetching,
  } = useTickerFundamentals(ticker);
  const { data: priceHistory } = usePriceHistory(ticker, !!ticker);


  useEffect(() => {
    setChartLoaded(false);
  }, [ticker]);

  const mergedStock: Stock | null = useMemo(() => {
    if (!baseStock) return null;
    const stock = baseStock;
    const historico = proventos?.historico ?? null;

    const provisionados = proventos?.provisionados ?? null;

    // Merge fundamentalistas: sempre priorizar Fundamentus (baseStock já vem do snapshot).
    // brapi não sobrescreve mais nenhum campo fundamentalista nem preço/valor de mercado/liquidez.
    const merged: Stock = { ...stock };

    // Sobrescreve campos numéricos com os dados ao vivo do detalhes.php quando disponíveis.
    const f = liveFund?.fields;
    if (f) {
      if (f.preco != null) merged.preco = f.preco;
      if (f.pl != null) merged.pl = f.pl;
      if (f.pvp != null) merged.pvp = f.pvp;
      if (f.dy != null) merged.dy = f.dy;
      if (f.roe != null) merged.roe = f.roe;
      if (f.roic != null) merged.roic = f.roic;
      if (f.margemLiquida != null) merged.margemLiquida = f.margemLiquida;
      if (f.margemEbit != null) merged.margemEbit = f.margemEbit;
      if (f.divBrutaPatrimonio != null)
        merged.divBrutaPatrimonio = f.divBrutaPatrimonio;
      if (f.liquidezCorrente != null) merged.liquidezCorrente = f.liquidezCorrente;
      if (f.cagrLucros5a != null) merged.cagrLucros5a = f.cagrLucros5a;
      if (f.valorMercado != null) merged.valorMercado = f.valorMercado;
      if (f.liquidezDiaria != null) merged.liquidezDiaria = f.liquidezDiaria;
    }

    if (historico && historico.length > 0) {
      const stats = computeDividendStats(historico, merged.preco);
      merged.dividendos = stats.dividendos;
      merged.anosComProventos = stats.anosComProventos;
      merged.dividendosRecorrentes = stats.dividendosRecorrentes;
      merged.anosYieldAcimaSelic = stats.anosYieldAcimaSelic;
    }
    if (provisionados) {
      merged.proventosProvisionados = provisionados;
    }

    // Série real de preços (Yahoo Finance) substitui a série sintética.
    const reais = priceHistory?.anos ?? [];
    if (reais.length > 0) {
      merged.precosAnuais = reais.map((p) => {
        const selic = SELIC[p.year] ?? 12;
        return {
          year: p.year,
          precoInicio: p.precoInicio,
          precoFim: p.precoFim,
          valorizacao: p.valorizacao,
          selicMediaPonderada: selic,
          bateuSelic: p.valorizacao > selic,
        };
      });
      const anoAtual = new Date().getUTCFullYear();
      merged.anosPrecoAcimaSelic = merged.precosAnuais.filter(
        (p) => p.year < anoAtual && p.bateuSelic,
      ).length;
    }
    return merged;
  }, [baseStock, proventos, liveFund, priceHistory]);
  const stock = mergedStock;

  const proventosOk = !!proventos?.historico;
  const liveOk = !!liveFund?.fields;
  const liveTime = liveFund?.updatedAt
    ? new Date(liveFund.updatedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const sourceLabel = fundLoading
    ? "Atualizando fundamentos…"
    : liveOk
      ? `Fundamentos: Fundamentus (ao vivo${liveTime ? ` · ${liveTime}` : ""}) · Proventos: ${proventosOk ? "B3" : "—"}`
      : isLoading
        ? "Carregando dados reais…"
        : proventosOk
          ? "Fundamentos + Preço: Fundamentus · Proventos: B3"
          : "Fundamentos + Preço: Fundamentus (offline)";

  // Carimbo do cache: momento em que os dados guardados deste ativo foram atualizados.
  const cachedAtLabel = useMemo(() => {
    if (!ticker) return null;
    const keys = [
      ["fundamentus-ticker", ticker],
      ["proventos", ticker],
      ["price-history", ticker],
    ];
    const times = keys
      .map((k) => queryClient.getQueryState(k)?.dataUpdatedAt ?? 0)
      .filter((t) => t > 0);
    if (times.length === 0) return null;
    return new Date(Math.max(...times)).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, queryClient, liveFund, proventos, priceHistory, isFetching, fundFetching]);

  const refreshTicker = () => {
    if (!ticker) return;
    void queryClient.invalidateQueries({
      predicate: (q) => q.queryKey.some((part) => part === ticker),
      refetchType: "active",
    });
  };



  const chartUrl = useMemo(() => {
    if (!ticker) return "";
    const params = new URLSearchParams({
      symbol: `BMFBOVESPA:${ticker}`,
      interval: "D",
      timezone: "America/Sao_Paulo",
      theme: "dark",
      style: "1",
      locale: "br",
      allow_symbol_change: "1",
      hide_side_toolbar: "0",
      withdateranges: "1",
      details: "1",
      hotlist: "0",
      calendar: "0",
      support_host: "https://www.tradingview.com",
    });
    params.append("studies", "MASimple@tv-basicstudies");
    params.append("studies", "Volume@tv-basicstudies");
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [ticker]);

  return (
    <Dialog open={!!stock} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl border-border/60">
        {stock && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-3 text-2xl">
                <span className="font-mono text-primary">{stock.ticker}</span>
                <MarketAnalysisDialog
                  ticker={stock.ticker}
                  nome={stock.nome}
                  setor={stock.setor}
                />
                <Badge variant="outline" className="border-border/60">
                  {stock.tipo}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-border/60 text-muted-foreground"
                >
                  {stock.setor}
                </Badge>
                <Badge
                  variant="outline"
                  className="ml-auto border-border/60 text-xs font-normal text-muted-foreground"
                  title={
                    isFetching || fundFetching
                      ? "Atualizando dados oficiais…"
                      : "Dados oficiais consultados sob demanda"
                  }
                >
                  {(isFetching && !isLoading) || (fundFetching && !fundLoading) ? "↻ " : ""}
                  {sourceLabel}
                </Badge>
              </DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-3 text-base">
                <span>{stock.nome}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {cachedAtLabel && <span>Atualizado em {cachedAtLabel}</span>}
                  <button
                    type="button"
                    onClick={refreshTicker}
                    disabled={isFetching || fundFetching}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1 text-xs font-medium hover:bg-muted/50 disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isFetching || fundFetching ? "animate-spin" : ""}`}
                    />
                    Atualizar
                  </button>
                </span>
              </DialogDescription>
            </DialogHeader>

            <section className="mt-4 rounded-xl border border-border/60 bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Gráfico — TradingView
                </h2>
                <span className="text-xs text-muted-foreground">
                  BMFBOVESPA:{ticker}
                </span>
              </div>
              <div className="relative mx-auto aspect-video max-h-[70dvh] w-full overflow-hidden rounded-lg border border-border/40 bg-background landscape:max-h-[80dvh]">
                {!chartLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    Carregando gráfico…
                  </div>
                )}
                {chartUrl && (
                  <iframe
                    key={chartUrl}
                    title={`Gráfico TradingView ${ticker}`}
                    src={chartUrl}
                    className="h-full w-full border-0"
                    allow="clipboard-write; fullscreen"
                    referrerPolicy="origin-when-cross-origin"
                    onLoad={() => setChartLoaded(true)}
                  />
                )}
              </div>
            </section>

            <section className="mt-8 rounded-xl border border-border/60 bg-card p-4">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Dados e Indicadores Fundamentalistas
              </h2>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <PriceCard label="Preço" value={`R$ ${stock.preco.toFixed(2)}`} />
                <PriceCard
                  label="Variação Dia"
                  value={`${stock.variacaoDia >= 0 ? "+" : ""}${stock.variacaoDia.toFixed(2)}%`}
                  positive={stock.variacaoDia >= 0}
                />
                <PriceCard
                  label="Valor de Mercado"
                  value={`R$ ${stock.valorMercado.toFixed(1)} bi`}
                />
                <PriceCard
                  label="Liq. Diária"
                  value={`R$ ${stock.liquidezDiaria.toFixed(0)} mi`}
                />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <HistoryCard
                  label="Fech. D-1 (ontem)"
                  preco={stock.precoD1}
                  variacao={stock.varD1}
                />
                <HistoryCard
                  label="D-7 (semana)"
                  preco={stock.precoD7}
                  variacao={stock.varD7}
                />
                <HistoryCard
                  label="D-30 (mês)"
                  preco={stock.precoD30}
                  variacao={stock.varD30}
                />
              </div>

              <div className="mt-6 rounded-lg border border-border/60 bg-background p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Indicadores Fundamentais
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {FUNDAMENTAL_KEYS.map((k) => {
                    const ind = INDICATORS[k];
                    const val = stock[k as keyof Stock] as number;
                    return (
                      <div
                        key={k}
                        className="rounded-md border border-border/40 bg-card p-3"
                      >
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {ind.label}
                          <InfoTip
                            title={ind.short}
                            fundamentalista={ind.fundamentalista}
                            tecnica={ind.tecnica}
                          />
                          {ind.history && (
                            <HistoryChartButton
                              ticker={stock.ticker}
                              kind={ind.history}
                              historico={proventos?.historico ?? null}
                              label={ind.label}
                            />
                          )}
                        </div>
                        <div className="mt-1 font-mono text-base font-semibold">
                          {ind.format(val)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DebtSemaphore divPL={stock.divBrutaPatrimonio} />

              <PrecoTetoPanel
                ticker={stock.ticker}
                nome={stock.nome}
                precoAtual={stock.preco}
                historico={proventos?.historico ?? null}
              />

              <PrecoTetoProjetivoPanel
                ticker={stock.ticker}
                nome={stock.nome}
                precoAtual={stock.preco}
                historico={proventos?.historico ?? null}
              />

              {isSetorFinanceiroNome(stock.setor) && (
                <ValuationDdmPanel
                  ticker={stock.ticker}
                  nome={stock.nome}
                  precoAtual={stock.preco}
                  roe={stock.roe}
                  historico={proventos?.historico ?? null}
                />
              )}

              <ValuationPanel ticker={stock.ticker} precoAtual={stock.preco} />






              <div className="mt-4 rounded-lg border border-border/60 bg-background p-4">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Dividendos + JCP — ano atual e últimos dez anos
                  </h3>
                  <InfoTip
                    title="Dividendos e JCP"
                    fundamentalista="Dividendo é lucro distribuído após impostos (isento para o investidor PF). JCP é remunerado como despesa financeira e sofre IR de 15% na fonte. Ambos compõem o retorno em proventos."
                    tecnica="Séries consistentes e crescentes de proventos costumam sustentar tendências de alta de longo prazo — 'ações de renda'."
                  />
                  <HistoryChartButton
                    ticker={stock.ticker}
                    kind="proventos"
                    historico={proventos?.historico ?? null}
                    label="Dividendos + JCP"
                  />
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    ano corrente parcial
                  </span>
                </div>
                <DividendStackedChart data={stock.dividendos} />
              </div>

              <div className="mt-4 rounded-lg border border-border/60 bg-background p-4">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Yield da ação vs. Selic média ponderada
                  </h3>
                  <InfoTip
                    title="Yield vs. Selic"
                    fundamentalista="Compara o yield de proventos do ano (proventos ÷ preço médio) com a Selic média ponderada. Barras verdes: proventos superaram a Selic; vermelhas: ficaram abaixo."
                    tecnica="Yield persistentemente abaixo da Selic tende a pressionar o preço da ação — juro básico é o principal 'concorrente' da renda variável."
                  />
                  <HistoryChartButton
                    ticker={stock.ticker}
                    kind="dy"
                    historico={proventos?.historico ?? null}
                    label="Yield vs. Selic"
                  />
                </div>
                <DividendVsSelicChart data={stock.dividendos} />
              </div>

              <div className="mt-4 rounded-lg border border-border/60 bg-background p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Valorização anual do ativo vs. Selic ponderada
                  </h3>
                  <InfoTip
                    title="Preço 01/jan → 31/dez vs. Selic"
                    fundamentalista="Compara a variação percentual do preço da ação (01/jan → 31/dez) com a Selic média ponderada do mesmo ano. Barras verdes: o ativo bateu a Selic no ano; vermelhas: rendeu menos que o CDI/Selic."
                    tecnica="Mostra se, ano a ano, apenas a variação de preço (sem contar dividendos) foi suficiente para superar o custo de oportunidade da renda fixa atrelada à Selic."
                  />
                  <HistoryChartButton
                    ticker={stock.ticker}
                    kind="valorizacao"
                    historico={proventos?.historico ?? null}
                    label="Valorização vs. Selic"
                  />
                  <span className="ml-auto text-xs text-muted-foreground">
                    Bateu a Selic em{" "}
                    <span className="font-semibold text-foreground">
                      {stock.anosPrecoAcimaSelic}
                    </span>{" "}
                    de {stock.precosAnuais.length} anos
                  </span>
                </div>
                <PriceVsSelicChart data={stock.precosAnuais} />
              </div>

              <div className="mt-4">
                <DividendIntelligencePanel stock={stock} />
              </div>

              <div className="mt-4">
                <MacroSensitivityPanel
                  ticker={stock.ticker}
                  nome={stock.nome}
                  setor={stock.setor}
                />
              </div>

              <div className="mt-4">
                <MarketConsensusPanel ticker={stock.ticker} />
              </div>

            </section>


          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PriceCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className="mt-1 font-mono text-lg font-semibold"
        style={{
          color:
            positive === undefined
              ? undefined
              : positive
                ? "var(--color-success)"
                : "var(--color-danger)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function HistoryCard({
  label,
  preco,
  variacao,
}: {
  label: string;
  preco: number;
  variacao: number;
}) {
  const positive = variacao >= 0;
  const color = positive ? "var(--color-success)" : "var(--color-danger)";
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="font-mono text-base font-semibold">
          R$ {preco.toFixed(2)}
        </span>
        <span className="font-mono text-sm" style={{ color }}>
          {positive ? "+" : ""}
          {variacao.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}



function MarketConsensusPanel({ ticker }: { ticker: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Consenso do mercado
        </h3>
        <InfoTip
          title="Dois semáforos independentes"
          fundamentalista="À esquerda, o consenso dos analistas sell-side (BTG, XP, Itaú BBA, JPM, Morgan Stanley, Goldman etc.) via Yahoo/Refinitiv. À direita, o resumo técnico do TradingView (médias móveis + osciladores) em vários timeframes."
          tecnica="Use os dois em conjunto: quando analistas e técnico apontam na mesma direção, o sinal é mais confiável. Divergências pedem cautela e leitura contextual (resultados, fluxo, macro)."
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalystConsensusCard ticker={ticker} />
        <TradingViewCard ticker={ticker} />
      </div>
    </div>
  );
}

function AnalystConsensusCard({ ticker }: { ticker: string }) {
  const { data, isLoading, isError } = useAnalystConsensus(ticker);

  return (
    <div className="rounded-md border border-border/40 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Analistas
        </div>
        <span className="text-[10px] text-muted-foreground">Yahoo/Refinitiv</span>
      </div>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-md bg-border/30" />
      ) : isError || !data ? (
        <p className="text-sm text-muted-foreground">Não foi possível carregar.</p>
      ) : !isConsensusAvailable(data) ? (
        <p className="text-sm text-muted-foreground">
          Sem cobertura de analistas ({data.reason}).
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="rounded-lg border px-3 py-1.5 text-center"
              style={{
                borderColor: RATING_META[data.rating].border,
                background: RATING_META[data.rating].bg,
                color: RATING_META[data.rating].color,
              }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide">
                {RATING_META[data.rating].label}
              </div>
              <div className="font-mono text-xl font-bold leading-tight">
                {formatScore(data.score)}
              </div>
              <div className="text-[9px] text-muted-foreground">score 1–5</div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">
                  {data.totalAnalysts}
                </span>{" "}
                casas · último mês
              </div>
              <div className="mt-0.5 flex items-center gap-1">
                {data.trend > 0.05 ? (
                  <>
                    <TrendingUp
                      className="h-3 w-3"
                      style={{ color: "var(--color-success)" }}
                    />
                    <span style={{ color: "var(--color-success)" }}>
                      melhorando (+{data.trend.toFixed(2)})
                    </span>
                  </>
                ) : data.trend < -0.05 ? (
                  <>
                    <TrendingDown
                      className="h-3 w-3"
                      style={{ color: "var(--color-danger)" }}
                    />
                    <span style={{ color: "var(--color-danger)" }}>
                      piorando ({data.trend.toFixed(2)})
                    </span>
                  </>
                ) : (
                  <span>estável</span>
                )}
              </div>
            </div>
          </div>

          <RatingDistributionBar
            segments={[
              { pct: data.distribution.strongBuy, color: "var(--color-success)", opacity: 1 },
              { pct: data.distribution.buy, color: "var(--color-success)", opacity: 0.65 },
              { pct: data.distribution.hold, color: "var(--color-warning)", opacity: 0.9 },
              { pct: data.distribution.sell, color: "var(--color-danger)", opacity: 0.65 },
              { pct: data.distribution.strongSell, color: "var(--color-danger)", opacity: 1 },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function TradingViewCard({ ticker }: { ticker: string }) {
  const { data, isLoading, isError } = useTradingViewTechnical(ticker);
  const [tf, setTf] = useState<TvTimeframe>("1D");

  return (
    <div className="rounded-md border border-border/40 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Técnico
        </div>
        <span className="text-[10px] text-muted-foreground">
          TradingView · tempo real
        </span>
      </div>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-md bg-border/30" />
      ) : isError || !data ? (
        <p className="text-sm text-muted-foreground">Não foi possível carregar.</p>
      ) : !isTvAvailable(data) ? (
        <p className="text-sm text-muted-foreground">
          Sem sinal técnico ({data.reason}).
        </p>
      ) : (() => {
        const current = data.signals.find((s) => s.timeframe === tf) ?? data.signals[0];
        if (!current) {
          return (
            <p className="text-sm text-muted-foreground">Sem sinal para este timeframe.</p>
          );
        }
        const meta = RATING_META[current.rating];
        const metaMA = RATING_META[current.ratingMA];
        const metaOsc = RATING_META[current.ratingOsc];
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {TV_TIMEFRAMES.map((t) => {
                const sig = data.signals.find((s) => s.timeframe === t.key);
                const active = t.key === tf;
                const dotColor = sig ? RATING_META[sig.rating].color : "var(--color-border)";
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTf(t.key)}
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition"
                    style={{
                      borderColor: active ? meta.color : "var(--color-border)",
                      background: active ? meta.bg : "transparent",
                      color: active
                        ? meta.color
                        : "var(--color-muted-foreground)",
                    }}
                    title={sig ? RATING_META[sig.rating].label : "sem dado"}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: dotColor }}
                    />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <div
                className="rounded-lg border px-3 py-1.5 text-center"
                style={{
                  borderColor: meta.border,
                  background: meta.bg,
                  color: meta.color,
                }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide">
                  {meta.label}
                </div>
                <div className="font-mono text-xl font-bold leading-tight">
                  {(current.overall >= 0 ? "+" : "") + current.overall.toFixed(2)}
                </div>
                <div className="text-[9px] text-muted-foreground">-1 a +1</div>
              </div>
              <div className="grid gap-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Médias:</span>
                  <span style={{ color: metaMA.color }}>{metaMA.label}</span>
                  <span className="font-mono text-muted-foreground">
                    ({(current.ma >= 0 ? "+" : "") + current.ma.toFixed(2)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Oscilad.:</span>
                  <span style={{ color: metaOsc.color }}>{metaOsc.label}</span>
                  <span className="font-mono text-muted-foreground">
                    ({(current.oscillators >= 0 ? "+" : "") + current.oscillators.toFixed(2)})
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Réplica do resumo técnico exibido em{" "}
              <span className="font-mono">tradingview.com/.../technicals/</span>.
            </p>
          </div>
        );
      })()}
    </div>
  );
}

function RatingDistributionBar({
  segments,
}: {
  segments: { pct: number; color: string; opacity: number }[];
}) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-border/40">
      {segments.map((s, i) =>
        s.pct > 0 ? (
          <div
            key={i}
            title={`${s.pct.toFixed(0)}%`}
            style={{ width: `${s.pct}%`, background: s.color, opacity: s.opacity }}
          />
        ) : null,
      )}
    </div>
  );
}



