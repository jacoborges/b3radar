import { InfoTip } from "@/components/InfoTip";
import { useStockColumns } from "@/hooks/use-stock-columns";
import { useValuationColumns } from "@/hooks/use-valuation-columns";
import { useBazinDivisor } from "@/hooks/use-bazin-divisor";
import { INDICATORS, type IndicatorKey } from "@/lib/indicators";
import { stockColumnLabel, stockColumnValue } from "@/lib/stock-columns";
import { VALUATION_COLUMNS, formatValuation, valuationTone, valuationValue, type ValuationStock } from "@/lib/valuation-columns";

type MetricStock = Partial<Record<IndicatorKey, number>> & Omit<ValuationStock, IndicatorKey>;

function useValuationCells(stock: MetricStock) {
  const [enabled] = useValuationColumns();
  const [divisor] = useBazinDivisor();
  if (!enabled) return [];
  return VALUATION_COLUMNS.map(c => {
    const v = valuationValue(stock as ValuationStock, c.key, divisor);
    const tone = valuationTone(c.key, v, stock.preco);
    return { ...c, text: formatValuation(c.key, v), cls: tone === "up" ? "text-success" : tone === "down" ? "text-destructive" : "" };
  });
}

export function StockMetricHeaders() {
  const [columns] = useStockColumns();
  const [valuation] = useValuationColumns();
  return <>
    {columns.map(key => <th key={key} data-indicator={key} className="min-w-32 px-3 py-3 text-right text-xs font-medium text-muted-foreground"><span className="inline-flex items-center gap-1 whitespace-nowrap">{stockColumnLabel(key)}<InfoTip title={INDICATORS[key].short} fundamentalista={INDICATORS[key].fundamentalista} tecnica={INDICATORS[key].tecnica} /></span></th>)}
    {valuation && VALUATION_COLUMNS.map(c => <th key={c.key} data-valuation={c.key} className="min-w-32 px-3 py-3 text-right text-xs font-medium text-muted-foreground"><span className="inline-flex items-center gap-1 whitespace-nowrap">{c.label}<InfoTip title={c.label} fundamentalista={c.tip} tecnica="Valuation estimado com os indicadores da lista; o cálculo detalhado fica no ativo expandido." /></span></th>)}
  </>;
}

export function StockMetricCells({ stock }: { stock: MetricStock }) {
  const [columns] = useStockColumns();
  const vals = useValuationCells(stock);
  return <>
    {columns.map(key => <td key={key} data-indicator={key} className={`min-w-32 whitespace-nowrap px-3 py-3 text-right font-mono text-xs ${key === "variacaoDia" && stock[key] != null ? stock[key] >= 0 ? "text-success" : "text-destructive" : ""}`}>{stockColumnValue(stock, key)}</td>)}
    {vals.map(v => <td key={v.key} data-valuation={v.key} className={`min-w-32 whitespace-nowrap px-3 py-3 text-right font-mono text-xs ${v.cls}`}>{v.text}</td>)}
  </>;
}

export function StockMetricsStrip({ stock }: { stock: MetricStock }) {
  const [columns] = useStockColumns();
  const vals = useValuationCells(stock);
  return <dl className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border/40 px-4 py-2 text-xs">
    {columns.map(key => <div key={key} data-indicator={key}><dt className="text-muted-foreground">{stockColumnLabel(key)}</dt><dd className="font-mono">{stockColumnValue(stock, key)}</dd></div>)}
    {vals.map(v => <div key={v.key} data-valuation={v.key}><dt className="text-muted-foreground">{v.label}</dt><dd className={`font-mono ${v.cls}`}>{v.text}</dd></div>)}
  </dl>;
}
