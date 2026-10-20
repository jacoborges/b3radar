import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStockSort } from "@/hooks/use-stock-sort";
import { isStockSort, STOCK_SORT_OPTIONS } from "@/lib/stock-sort";

export function StockSortSelect() {
  const [sort, setSort] = useStockSort();
  return (
    <Select value={sort} onValueChange={(value) => { if (isStockSort(value)) setSort(value); }}>
      <SelectTrigger aria-label="Organizar ativos" className="w-full min-w-0 border-border/60 bg-input/60 sm:w-[170px] sm:flex-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STOCK_SORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}