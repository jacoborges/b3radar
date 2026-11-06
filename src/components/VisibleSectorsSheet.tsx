import { Suspense, useState } from "react";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Eye, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { getMySectorPresets, setMySectorPresets, type SectorPreset } from "@/lib/user-settings.functions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { stocksQueryOptions } from "@/hooks/use-all-stocks";
import { useVisibleSectors } from "@/hooks/use-visible-sectors";
import { buildStocks, collectSectors } from "@/lib/stocks-data";
import { sectorLabel } from "@/lib/sector-label";

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

function PresetSlots({ sel, setSel }: { sel: string[]; setSel: (v: string[]) => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["sector-presets"], queryFn: () => getMySectorPresets() });
  const presets = data?.presets ?? [];
  const [name, setName] = useState("");
  const save = (next: SectorPreset[]) => {
    qc.setQueryData(["sector-presets"], { presets: next });
    setMySectorPresets({ data: { presets: next } }).catch(() => toast.error("Não foi possível salvar o slot"));
  };
  const create = () => {
    const n = name.trim();
    if (!n) return;
    if (sel.length === 0) return toast.error("Marque ao menos um setor antes de criar o slot");
    save([...presets.filter((p) => p.name !== n), { name: n, sectors: sel }]);
    setName("");
    toast.success(`Slot "${n}" salvo`);
  };
  return (
    <div className="space-y-2 rounded-md border border-border/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meus slots</p>
      {presets.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum slot. Marque setores abaixo e salve com um nome.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => {
            const active = sameSet(p.sectors, sel);
            return (
              <span
                key={p.name}
                className={`inline-flex items-center rounded-full border text-xs ${
                  active ? "border-primary/70 bg-primary/10 text-primary" : "border-border/60 text-foreground"
                }`}
              >
                <button className="py-1 pl-3 pr-1" onClick={() => setSel(p.sectors)} title={p.sectors.map(sectorLabel).join(", ")}>
                  {p.name} <span className="text-muted-foreground">({p.sectors.length})</span>
                </button>
                <button
                  className="px-2 py-1 text-muted-foreground hover:text-destructive"
                  aria-label={`Excluir slot ${p.name}`}
                  onClick={() => save(presets.filter((x) => x.name !== p.name))}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Nome do slot"
          maxLength={40}
          className="h-8"
        />
        <Button size="sm" onClick={create} disabled={!name.trim()} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Salvar seleção
        </Button>
      </div>
    </div>
  );
}

function SectorList() {
  const { data } = useSuspenseQuery(stocksQueryOptions);
  const all = collectSectors(buildStocks(data.rows));
  const [sel, setSel] = useVisibleSectors();
  const toggle = (s: string) => setSel(sel.includes(s) ? sel.filter((x) => x !== s) : [...sel, s]);
  return (
    <div className="mt-4 space-y-3 px-4 pb-8">
      <PresetSlots sel={sel} setSel={setSel} />
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
