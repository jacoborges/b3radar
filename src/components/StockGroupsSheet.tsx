import { useState } from "react";
import { Tags, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useStockGroups } from "@/hooks/use-stock-groups";
import { GROUP_COLORS, type StockGroup } from "@/lib/stock-groups";

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {GROUP_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Cor ${c}`}
          onClick={() => onChange(c)}
          className={`h-5 w-5 rounded-full ring-offset-2 ring-offset-background ${value === c ? "ring-2 ring-foreground" : ""}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function GroupRow({
  g, active, onToggleFilter,
}: { g: StockGroup; active: boolean; onToggleFilter: () => void }) {
  const { updateGroup, deleteGroup } = useStockGroups();
  const [name, setName] = useState(g.name);
  return (
    <div className="space-y-2 rounded-md border border-border/60 p-3">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: g.color }} />
        <Input
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name.trim() !== g.name && updateGroup({ id: g.id, name: name.trim(), color: g.color })}
          className="h-8 text-sm"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 text-destructive"
          aria-label="Excluir grupo"
          onClick={() => confirm(`Excluir o grupo "${g.name}"?`) && deleteGroup(g.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <ColorPicker value={g.color} onChange={(c) => updateGroup({ id: g.id, name: g.name, color: c })} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{g.tickers.length} {g.tickers.length === 1 ? "ação" : "ações"}</span>
        <Button size="sm" variant={active ? "default" : "outline"} className="h-7 text-xs" onClick={onToggleFilter}>
          {active ? "✓ Mostrando só este" : "Mostrar só este"}
        </Button>
      </div>
    </div>
  );
}

export function StockGroupsSheet({
  filter, onFilterChange,
}: { filter: string[]; onFilterChange: (ids: string[]) => void }) {
  const { groups, createGroup } = useStockGroups();
  const [name, setName] = useState("");
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const activeCount = filter.filter((id) => groups.some((g) => g.id === id)).length;

  const add = async () => {
    if (!name.trim()) return;
    await createGroup({ name: name.trim(), color });
    setName("");
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="shrink-0 gap-2 border-border/60 bg-input/60">
          <Tags className="h-4 w-4" />
          Grupos
          {activeCount > 0 && (
            <span className="rounded-full bg-primary-foreground px-1.5 text-[10px] font-bold text-primary">{activeCount}</span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Grupos</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 px-4 pb-8">
          <p className="text-xs text-muted-foreground">
            Marque ações pelo quadrado à esquerda do ticker. Uma ação pode estar em vários grupos.
          </p>
          <div className="space-y-2 rounded-md border border-primary/40 p-3">
            <div className="flex gap-2">
              <Input value={name} maxLength={40} placeholder="Nome do novo grupo" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className="h-9" />
              <Button onClick={add} className="h-9 gap-1"><Plus className="h-4 w-4" />Criar</Button>
            </div>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          {activeCount > 0 && (
            <Button size="sm" variant="outline" onClick={() => onFilterChange([])}>Mostrar todas as ações</Button>
          )}
          {groups.map((g) => (
            <GroupRow
              key={g.id + g.name}
              g={g}
              active={filter.includes(g.id)}
              onToggleFilter={() => onFilterChange(filter.includes(g.id) ? filter.filter((x) => x !== g.id) : [...filter, g.id])}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
