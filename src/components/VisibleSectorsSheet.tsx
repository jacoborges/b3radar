import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { stocksQueryOptions } from "@/hooks/use-all-stocks";
import { useVisibleSectors } from "@/hooks/use-visible-sectors";
import { buildStocks, collectSectors } from "@/lib/stocks-data";
import { sectorLabel } from "@/lib/sector-label";

function SectorList() {
  const { data } = useSuspenseQuery(stocksQueryOptions);
  const all = collectSectors(buildStocks(data.rows));
  const [sel, setSel] = useVisibleSectors();
  const toggle = (s: string) => setSel(sel.includes(s) ? sel.filter((x) => x !== s) : [...sel, s]);
  return (
    <div className="mt-4 space-y-3 px-4 pb-8">
      <p className="text-xs text-muted-foreground">
        Vale para todo o app. Nenhum marcado mostra todos os setores.
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setSel(all)}>Selecionar todos</Button>
        <Button size="sm" variant="outline" onClick={() => setSel([])}>Limpar</Button>
      </div>
      <div className="grid gap-1.5">
        {all.map((s) => {
          const on = sel.includes(s);
          return (
            <button
              key={s}
              onClick={() => toggle(s)}
              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                on ? "border-primary/70 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"
              }`}
            >
              {on ? "✓ " : ""}{sectorLabel(s)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VisibleSectorsSheet() {
  const [sel] = useVisibleSectors();
  return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="shrink-0 gap-2 border-border/60 bg-input/60" title="Visualizar somente">
            <Eye className="h-4 w-4" />
            Visualizar somente
            {sel.length > 0 && (
              <span className="rounded-full bg-primary-foreground px-1.5 text-[10px] font-bold text-primary">
                {sel.length} {sel.length === 1 ? "setor" : "setores"}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Visualizar somente</SheetTitle>
          </SheetHeader>
          <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Carregando setores…</p>}>
            <SectorList />
          </Suspense>
        </SheetContent>
      </Sheet>
  );
}
