import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStockGroups } from "@/hooks/use-stock-groups";
import { GROUP_COLORS } from "@/lib/stock-groups";

export function StockGroupMarker({ ticker }: { ticker: string }) {
  const { groups, byTicker, toggleTicker, createGroup } = useStockGroups();
  const mine = byTicker.get(ticker) ?? [];
  const [name, setName] = useState("");
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const bg =
    mine.length === 0
      ? undefined
      : `linear-gradient(to right, ${mine
          .map((g, i) => `${g.color} ${(i / mine.length) * 100}% ${((i + 1) / mine.length) * 100}%`)
          .join(", ")})`;

  const addNew = async () => {
    const n = name.trim();
    if (!n) return;
    const { id } = await createGroup({ name: n, color: GROUP_COLORS[groups.length % GROUP_COLORS.length] });
    toggleTicker({ groupId: id, ticker, on: true });
    setName("");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label={`Grupos de ${ticker}`}
          title={mine.length ? mine.map((g) => g.name).join(", ") : "Adicionar a um grupo"}
          onClick={stop}
          onKeyDown={stop}
          className="inline-block h-3.5 w-3.5 shrink-0 cursor-pointer rounded-[3px] border border-muted-foreground/60 transition-transform hover:scale-110"
          style={bg ? { background: bg, borderColor: "transparent" } : undefined}
        />
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2" onClick={stop} align="start">
        <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Grupos · {ticker}</p>
        {groups.length === 0 && <p className="px-1 pb-2 text-xs text-muted-foreground">Nenhum grupo criado ainda.</p>}
        <div className="max-h-60 space-y-0.5 overflow-y-auto">
          {groups.map((g) => {
            const on = g.tickers.includes(ticker);
            return (
              <button
                key={g.id}
                onClick={() => toggleTicker({ groupId: g.id, ticker, on: !on })}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-primary/10"
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: g.color }} />
                <span className="flex-1 truncate">{g.name}</span>
                {on && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1 border-t border-border/50 pt-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") addNew(); }}
            placeholder="Novo grupo"
            maxLength={40}
            className="h-8 text-sm"
          />
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={addNew} aria-label="Criar grupo">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
