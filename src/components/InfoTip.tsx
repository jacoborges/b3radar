import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Props {
  title: string;
  fundamentalista: string;
  tecnica: string;
}

export function InfoTip({ title, fundamentalista, tecnica }: Props) {
  return (
    <Popover>
      <PopoverTrigger
        asChild
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-primary"
          aria-label={`Explicação de ${title}`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-80 border-border/60 bg-popover/95 backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3 text-sm">
          <div className="font-semibold text-foreground">{title}</div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-primary">
              Análise fundamentalista
            </div>
            <p className="mt-1 text-muted-foreground leading-relaxed">
              {fundamentalista}
            </p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-warning)]">
              Análise técnica
            </div>
            <p className="mt-1 text-muted-foreground leading-relaxed">
              {tecnica}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
