import { memo, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createStockSearchDebouncer } from "@/lib/stock-search";

export const StockSearchInput = memo(function StockSearchInput({
  onSearch,
}: {
  onSearch: (value: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const debouncer = useMemo(() => createStockSearchDebouncer(onSearch), [onSearch]);
  useEffect(() => () => debouncer.cancel(), [debouncer]);

  return (
    <div className="relative w-full min-w-0">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label="Buscar ticker ou empresa"
        placeholder="Buscar ticker ou empresa…"
        value={draft}
        onChange={(event) => {
          const value = event.target.value;
          setDraft(value);
          debouncer.schedule(value);
        }}
        className="pl-9 bg-input/60 border-border/60"
      />
    </div>
  );
});