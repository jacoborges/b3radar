import { InfoTip } from "@/components/InfoTip";
import { useStockColumns } from "@/hooks/use-stock-columns";
import { useValuationColumns } from "@/hooks/use-valuation-columns";
import { useBazinEvents } from "@/hooks/use-bazin-events";
import { useBazinDivisor } from "@/hooks/use-bazin-divisor";
import { INDICATORS, type IndicatorKey } from "@/lib/indicators";
import { pvpFairCell, PVP_FAIR_TIP } from "@/lib/pvp-fair";
import { stockColumnLabel, stockColumnValue } from "@/lib/stock-columns";
import { VALUATION_COLUMNS, formatValuation, valuationTone, valuationValue, type ValuationStock } from "@/lib/valuation-columns";

type MetricStock = Partial<Record<IndicatorKey, number>> & Omit<ValuationStock, IndicatorKey>;

function useValuationCells(stock: MetricStock) {
  const [enabled] = useValuationColumns();
  const [divisor] = useBazinDivisor();
  const eventos = useBazinEvents(enabled);
  if (!enabled) return [];
  return VALUATION_COLUMNS.map(c => {
    const v = valuationValue(stock as ValuationStock, c.key, divisor, (stock as { ticker?: string }).ticker ? eventos.get((stock as { ticker: string }).ticker) : undefined);
    const tone = valuationTone(c.key, v, stock.preco);
    return { ...c, text: formatValuation(c.key, v), cls: tone === "up" ? "text-success" : tone === "down" ? "text-destructive" : "" };
  });
}

function splitCols(columns: IndicatorKey[]) {
  const i = columns.indexOf("variacaoDia");
  const at = i >= 0 ? i + 1 : columns.length;
  return [columns.slice(0, at), columns.slice(at)] as const;
}

const TH = "px-2 py-2 text-right align-bottom text-[11px] font-medium leading-tight text-muted-foreground";
const TD = "whitespace-nowrap px-2 py-3 text-right font-mono text-xs tabular-nums";

export function StockMetricHeaders() {
  const [all] = useStockColumns();
  const [a, b] = splitCols(all);
  const [valuation] = useValuationColumns();
  const ind = (key: IndicatorKey) => <th key={key} data-indicator={key} className={TH}><span className="inline-flex items-center justify-end gap-0.5 text-balance">{stockColumnLabel(key)}<InfoTip title={INDICATORS[key].short} fundamentalista={INDICATORS[key].fundamentalista} tecnica={INDICATORS[key].tecnica} /></span></th>;
  const indH = (key: IndicatorKey) => key !== "pvp" ? ind(key) : [ind(key), <th key="pvpFair" data-indicator="pvpFair" className={TH}><span className="inline-flex items-center justify-end gap-0.5 text-balance">Justo P/VP=1<InfoTip title="Valor justo com P/VP = 1" fundamentalista={PVP_FAIR_TIP} tecnica="Cotação atual ÷ P/VP. Verde: valor justo acima do preço (descontada); vermelho: abaixo (valorizada)." /></span></th>];
  return <>
    {a.map(indH)}
    {valuation && VALUATION_COLUMNS.map(c => <th key={c.key} data-valuation={c.key} className={TH}><span className="inline-flex items-center justify-end gap-0.5 text-balance">{c.label}<InfoTip title={c.label} fundamentalista={c.tip} tecnica="Valuation estimado com os indicadores da lista; o cálculo detalhado fica no ativo expandido." /></span></th>)}
    {b.map(indH)}
  </>;
}

export function StockMetricCells({ stock }: { stock: MetricStock }) {
  const [all] = useStockColumns();
  const [a, b] = splitCols(all);
  const vals = useValuationCells(stock);
  const ind = (key: IndicatorKey) => <td key={key} data-indicator={key} className={`${TD} ${key === "variacaoDia" && stock[key] != null ? stock[key] >= 0 ? "text-success" : "text-destructive" : ""}`}>{stockColumnValue(stock, key)}</td>;
  const fair = pvpFairCell(stock.preco, stock.pvp);
  const indC = (key: IndicatorKey) => key !== "pvp" ? ind(key) : [ind(key), <td key="pvpFair" data-indicator="pvpFair" className={`${TD} ${fair.cls}`}>{fair.text}</td>];
  return <>
    {a.map(indC)}
    {vals.map(v => <td key={v.key} data-valuation={v.key} className={`${TD} ${v.cls}`}>{v.text}</td>)}
    {b.map(indC)}
  </>;
}

export function StockMetricsStrip({ stock }: { stock: MetricStock }) {
  const [all] = useStockColumns();
  const [a, b] = splitCols(all);
  const vals = useValuationCells(stock);
  const ind = (key: IndicatorKey) => <div key={key} data-indicator={key}><dt className="text-muted-foreground">{stockColumnLabel(key)}</dt><dd className="font-mono">{stockColumnValue(stock, key)}</dd></div>;
  const fair = pvpFairCell(stock.preco, stock.pvp);
  const indS = (key: IndicatorKey) => key !== "pvp" ? ind(key) : [ind(key), <div key="pvpFair" data-indicator="pvpFair"><dt className="text-muted-foreground">Justo P/VP=1</dt><dd className={`font-mono ${fair.cls}`}>{fair.text}</dd></div>];
  return <dl className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border/40 px-4 py-2 text-xs">
    {a.map(indS)}
    {vals.map(v => <div key={v.key} data-valuation={v.key}><dt className="text-muted-foreground">{v.label}</dt><dd className={`font-mono ${v.cls}`}>{v.text}</dd></div>)}
    {b.map(indS)}
  </dl>;
}
