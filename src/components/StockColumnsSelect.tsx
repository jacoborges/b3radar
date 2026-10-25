import { Columns3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStockColumns } from "@/hooks/use-stock-columns";
import { FUNDAMENTAL_KEYS } from "@/lib/indicators";
import { DEFAULT_STOCK_COLUMNS, stockColumnLabel } from "@/lib/stock-columns";

export function StockColumnsSelect() {
  const [columns, setColumns] = useStockColumns();
  return <Popover>
    <PopoverTrigger asChild><Button variant="outline" size="sm" aria-label="Personalizar cabeçalho" title="Personalizar cabeçalho"><Columns3 className="h-4 w-4" /><span>Cabeçalho</span></Button></PopoverTrigger>
    <PopoverContent align="end" collisionPadding={12} className="max-h-[min(70dvh,var(--radix-popover-content-available-height))]" aria-label="Indicadores do cabeçalho">
      <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Indicadores do cabeçalho</h3><Button size="icon" variant="ghost" title="Restaurar padrão" aria-label="Restaurar padrão" onClick={() => setColumns([...DEFAULT_STOCK_COLUMNS])}><RotateCcw className="h-4 w-4" /></Button></div>
      <div className="space-y-3">{FUNDAMENTAL_KEYS.map(key => <label key={key} className="flex cursor-pointer items-center gap-3 text-sm"><Checkbox aria-label={stockColumnLabel(key)} checked={columns.includes(key)} onCheckedChange={checked => setColumns(checked === true ? [...columns, key] : columns.filter(column => column !== key))} /><span>{stockColumnLabel(key)}</span></label>)}</div>
    </PopoverContent>
  </Popover>;
}