import { InfoTip } from "@/components/InfoTip";
import { useStockColumns } from "@/hooks/use-stock-columns";
import { INDICATORS, type IndicatorKey } from "@/lib/indicators";
import { stockColumnLabel, stockColumnValue } from "@/lib/stock-columns";

export function StockMetricHeaders() {
  const [columns] = useStockColumns();
  return <>{columns.map(key => <th key={key} data-indicator={key} className="min-w-32 px-3 py-3 text-right text-xs font-medium text-muted-foreground"><span className="inline-flex items-center gap-1 whitespace-nowrap">{stockColumnLabel(key)}<InfoTip title={INDICATORS[key].short} fundamentalista={INDICATORS[key].fundamentalista} tecnica={INDICATORS[key].tecnica} /></span></th>)}</>;
}

export function StockMetricCells({ stock }: { stock: Partial<Record<IndicatorKey, number>> }) {
  const [columns] = useStockColumns();
  return <>{columns.map(key => <td key={key} data-indicator={key} className={`min-w-32 whitespace-nowrap px-3 py-3 text-right font-mono text-xs ${key === "variacaoDia" && stock[key] != null ? stock[key] >= 0 ? "text-success" : "text-destructive" : ""}`}>{stockColumnValue(stock, key)}</td>)}</>;
}

export function StockMetricsStrip({ stock }: { stock: Partial<Record<IndicatorKey, number>> }) {
  const [columns] = useStockColumns();
  return <dl className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border/40 px-4 py-2 text-xs">{columns.map(key => <div key={key} data-indicator={key}><dt className="text-muted-foreground">{stockColumnLabel(key)}</dt><dd className="font-mono">{stockColumnValue(stock, key)}</dd></div>)}</dl>;
}