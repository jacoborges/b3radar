import { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Stock } from "@/lib/stocks-data";
import { computeDividendStats } from "@/lib/stocks-data";
import { INDICATORS, FUNDAMENTAL_KEYS } from "@/lib/indicators";
import { useTickerData } from "@/hooks/use-ticker-data";
import { InfoTip } from "./InfoTip";
import { DebtSemaphore } from "./DebtSemaphore";
import {
  DividendStackedChart,
  DividendVsSelicChart,
  PriceVsSelicChart,
} from "./DividendChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  stock: Stock | null;
  onClose: () => void;
}

export function StockDetailModal({ stock: baseStock, onClose }: Props) {
  const ticker = baseStock?.ticker ?? null;
  const [chartLoaded, setChartLoaded] = useState(false);
  const { proventos, isLoading, isFetching } = useTickerData(ticker);

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
    return merged;
  }, [baseStock, fundamentals, proventos]);
  const stock = mergedStock;

  const proventosOk = !!proventos?.historico;
  const sourceLabel = isLoading
    ? "Carregando dados reais…"
    : proventosOk
      ? "Fundamentos + Preço: Fundamentus · Proventos: B3"
      : "Fundamentos + Preço: Fundamentus (offline)";


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
      <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto border-border/60">
        {stock && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-3 text-2xl">
                <span className="font-mono text-primary">{stock.ticker}</span>
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
                    isFetching
                      ? "Atualizando dados oficiais…"
                      : "Dados oficiais consultados sob demanda"
                  }
                >
                  {isFetching && !isLoading ? "↻ " : ""}
                  {sourceLabel}
                </Badge>
              </DialogTitle>
              <DialogDescription className="mt-1 text-base">
                {stock.nome}
              </DialogDescription>
            </DialogHeader>

            <div className="relative mt-4 h-[320px] w-full overflow-hidden rounded-xl border border-border/60 bg-background md:h-[480px]">
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

            <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
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

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
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


            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-border/60 bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Indicadores Fundamentais
                </h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  {FUNDAMENTAL_KEYS.map((k) => {
                    const ind = INDICATORS[k];
                    const val = stock[k as keyof Stock] as number;
                    return (
                      <div
                        key={k}
                        className="rounded-md border border-border/40 bg-background/40 p-3"
                      >
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {ind.label}
                          <InfoTip
                            title={ind.short}
                            fundamentalista={ind.fundamentalista}
                            tecnica={ind.tecnica}
                          />
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

              <div className="rounded-lg border border-border/60 bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Dividendos + JCP — últimos 5 anos
                  </h3>
                  <InfoTip
                    title="Dividendos e JCP"
                    fundamentalista="Dividendo é lucro distribuído após impostos (isento para o investidor PF). JCP é remunerado como despesa financeira e sofre IR de 15% na fonte. Ambos compõem o retorno em proventos."
                    tecnica="Séries consistentes e crescentes de proventos costumam sustentar tendências de alta de longo prazo — 'ações de renda'."
                  />
                </div>
                <DividendStackedChart data={stock.dividendos} />
              </div>

              <div className="rounded-lg border border-border/60 bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Yield da ação vs. Selic média ponderada
                  </h3>
                  <InfoTip
                    title="Yield vs. Selic"
                    fundamentalista="Compara o yield de proventos do ano (proventos ÷ preço médio) com a Selic média ponderada. Barras verdes: proventos superaram a Selic; vermelhas: ficaram abaixo."
                    tecnica="Yield persistentemente abaixo da Selic tende a pressionar o preço da ação — juro básico é o principal 'concorrente' da renda variável."
                  />
                </div>
                <DividendVsSelicChart data={stock.dividendos} />
              </div>

              <div className="rounded-lg border border-border/60 bg-card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Valorização anual do ativo vs. Selic ponderada
                  </h3>
                  <InfoTip
                    title="Preço 01/jan → 31/dez vs. Selic"
                    fundamentalista="Compara a variação percentual do preço da ação (01/jan → 31/dez) com a Selic média ponderada do mesmo ano. Barras verdes: o ativo bateu a Selic no ano; vermelhas: rendeu menos que o CDI/Selic."
                    tecnica="Mostra se, ano a ano, apenas a variação de preço (sem contar dividendos) foi suficiente para superar o custo de oportunidade da renda fixa atrelada à Selic."
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

              <ProvisionamentoPanel stock={stock} />
            </div>


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

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function ProvisionamentoPanel({ stock }: { stock: Stock }) {
  const items = stock.proventosProvisionados;
  const totalPorAcao = items.reduce((s, p) => s + p.valorPorAcao, 0);
  const yieldProvisionado = stock.preco > 0 ? (totalPorAcao / stock.preco) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Provisionamento de novos dividendos
          </h3>
          <InfoTip
            title="Data Com × Data Ex"
            fundamentalista="Data Com é a última data em que ao comprar a ação você tem direito ao provento. Data Ex é o primeiro pregão em que a ação passa a negociar sem o direito — o preço tende a abrir descontado do valor do provento. A Data de Pagamento é quando o dinheiro cai na conta."
            tecnica="Na Data Ex costuma haver um 'gap' de abertura para baixo, próximo ao valor do provento. Estratégias de 'dividend capture' exploram esse comportamento — mas o efeito prático em ativos líquidos é pequeno."
          />
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum provento provisionado no momento.
          </p>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
              <PriceCard
                label="Anúncios pendentes"
                value={String(items.length)}
              />
              <PriceCard
                label="Total por ação"
                value={`R$ ${totalPorAcao.toFixed(4)}`}
              />
              <PriceCard
                label="Yield provisionado"
                value={`${yieldProvisionado.toFixed(2)}%`}
                positive={yieldProvisionado > 0}
              />
            </div>

            <div className="overflow-x-auto rounded-md border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor/ação</TableHead>
                    <TableHead>Data Com</TableHead>
                    <TableHead>Data Ex</TableHead>
                    <TableHead>Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-border/60"
                          style={{
                            color:
                              p.tipo === "JCP"
                                ? "var(--color-jcp)"
                                : "var(--color-dividend)",
                          }}
                        >
                          {p.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {p.valorPorAcao.toFixed(4)}
                      </TableCell>
                      <TableCell className="font-mono">{fmtDate(p.dataCom)}</TableCell>
                      <TableCell className="font-mono">{fmtDate(p.dataEx)}</TableCell>
                      <TableCell className="font-mono">
                        {fmtDate(p.dataPagamento)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Dados estimados. Consulte o RI da companhia e comunicados na B3 antes de
              operar por data com/ex.
            </p>
          </>
        )}
      </div>
    </div>
  );
}


