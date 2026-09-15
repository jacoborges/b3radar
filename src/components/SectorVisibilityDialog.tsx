import { Eye } from "lucide-react";
import { ActionTip } from "@/components/ActionTip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface SectorVisibilityDialogProps {
  sectors: string[];
  selected: string[];
  onChange: (sectors: string[]) => void;
}

export function SectorVisibilityDialog({ sectors, selected, onChange }: SectorVisibilityDialogProps) {
  const selectedSet = new Set(selected);
  const allSelected = sectors.length > 0 && selected.length === sectors.length;

  const toggle = (sector: string) => {
    onChange(
      selectedSet.has(sector)
        ? selected.filter((item) => item !== sector)
        : sectors.filter((item) => selectedSet.has(item) || item === sector),
    );
  };

  return (
    <Dialog>
      <ActionTip tip="visualizarSetores">
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2 border-border/60 bg-input/60">
            <Eye className="h-4 w-4" />
            Visualizar somente
            {!allSelected && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {selected.length}
              </span>
            )}
          </Button>
        </DialogTrigger>
      </ActionTip>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col overflow-hidden border-border/60 p-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-4 pb-4 pt-5 pr-12 sm:px-6 sm:pt-6">
          <DialogTitle>Visualizar somente</DialogTitle>
          <DialogDescription>
            Marque os setores que deseja ver. A escolha vale na página inicial e na Inteligência de Proventos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3 sm:px-6">
          <span className="text-xs text-muted-foreground">
            {selected.length} de {sectors.length} setores selecionados
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => onChange(sectors)}>
              Selecionar todos
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onChange([])} disabled={selected.length === 0}>
              Limpar seleção
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto overscroll-contain px-4 py-4 sm:grid-cols-2 sm:px-6">
          {sectors.map((sector) => {
            const id = `visible-sector-${sector.replace(/[^a-zA-Z0-9]/g, "-")}`;
            return (
              <Label
                key={sector}
                htmlFor={id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border/60 bg-card px-3 py-2 text-sm hover:border-primary/50"
              >
                <Checkbox
                  id={id}
                  checked={selectedSet.has(sector)}
                  onCheckedChange={() => toggle(sector)}
                />
                <span className="min-w-0 leading-snug">{sector}</span>
              </Label>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}