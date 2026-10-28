import { Columns3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStockColumns } from "@/hooks/use-stock-columns";
import { useValuationColumns } from "@/hooks/use-valuation-columns";
import { DEFAULT_STOCK_COLUMNS, STOCK_COLUMN_KEYS, stockColumnLabel } from "@/lib/stock-columns";

export function StockColumnsSelect() {
  const [columns, setColumns] = useStockColumns();
  const [valuation, setValuation] = useValuationColumns();
  return <Popover>
    <PopoverTrigger asChild><Button variant="outline" size="sm" aria-label="Personalizar cabeçalho" title="Personalizar cabeçalho"><Columns3 className="h-4 w-4" /><span>Cabeçalho</span></Button></PopoverTrigger>
    <PopoverContent align="end" collisionPadding={12} className="max-h-[min(70dvh,var(--radix-popover-content-available-height))]" aria-label="Indicadores do cabeçalho">
      <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Indicadores do cabeçalho</h3><Button size="icon" variant="ghost" title="Restaurar padrão" aria-label="Restaurar padrão" onClick={() => setColumns([...DEFAULT_STOCK_COLUMNS])}><RotateCcw className="h-4 w-4" /></Button></div>
      <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-md border border-primary/40 bg-primary/5 p-2 text-sm"><Checkbox aria-label="Valuation" checked={valuation} onCheckedChange={c => setValuation(c === true)} /><span><span className="font-semibold">Valuation</span><span className="block text-[11px] text-muted-foreground">Graham, Bazin e DDM de cada ativo</span></span></label>
      <div className="space-y-3">{STOCK_COLUMN_KEYS.map(key => {
        const id = `header-column-${key}`;
        return <div key={key} className="flex items-center gap-3">
          <Checkbox id={id} aria-label={stockColumnLabel(key)} checked={columns.includes(key)} onCheckedChange={checked => setColumns(checked === true ? [...columns, key] : columns.filter(column => column !== key))} />
          <label htmlFor={id} className="text-sm">{stockColumnLabel(key)}</label>
        </div>;
      })}</div>
    </PopoverContent>
  </Popover>;
}