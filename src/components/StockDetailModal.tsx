import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, CalendarClock } from "lucide-react";
import type { Stock } from "@/lib/stocks-data";
import { INDICATORS, FUNDAMENTAL_KEYS } from "@/lib/indicators";
import { InfoTip } from "./InfoTip";
import { DebtSemaphore } from "./DebtSemaphore";
import {
  DividendStackedChart,
  DividendVsSelicChart,
} from "./DividendChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  stock: Stock | null;
  onClose: () => void;
  onOpenChart: (ticker: string) => void;
}

export function StockDetailModal({ stock, onClose, onOpenChart }: Props) {
  return (
    <Dialog open={!!stock} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto border-border/60">
        {stock && (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="flex items-center gap-3 text-2xl">
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
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-base">
                    {stock.nome}
                  </DialogDescription>
                </div>
                <Button
                  onClick={() => onOpenChart(stock.ticker)}
                  className="gap-2"
                  variant="secondary"
                >
                  <LineChart className="h-4 w-4" />
                  Gráfico TradingView
                </Button>
              </div>
            </DialogHeader>

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


            <div className="mt-4 rounded-lg border border-border/60 bg-card p-4">
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

            <div className="mt-4">
              <DebtSemaphore divPL={stock.divBrutaPatrimonio} />
            </div>

            <div className="mt-4 rounded-lg border border-border/60 bg-card p-4">
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

            <div className="mt-4 rounded-lg border border-border/60 bg-card p-4">
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

