import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CLASS_INFO,
  classMeta,
  type DividendClass,
} from "@/lib/dividend-intelligence";

interface Props {
  title: string;
  fundamentalista: string;
  tecnica: string;
}

export function InfoTip({ title, fundamentalista, tecnica }: Props) {
  return (
    <Popover>
      <ActionTip tip="explicacaoIndicador" label={title}>
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
      </ActionTip>
      <PopoverContent
        side="top"
        className="border-border/60 bg-popover/95 backdrop-blur"
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

const CLASS_ORDER: DividendClass[] = [
  "Elite",
  "Consistente",
  "Regular",
  "Irregular",
  "Sem cobertura",
];

/**
 * Botão de interrogação (?) que explica todas as 5 classes de provento,
 * destacando a classe atual (quando informada) com borda.
 */
export function ClassificationInfoTip({
  current,
  title = "Classificação de proventos",
}: {
  current?: DividendClass;
  title?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        asChild
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-primary"
          aria-label={`Explicação das classes de provento`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-96 border-border/60 bg-popover/95 backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3 text-sm">
          <div className="font-semibold text-foreground">{title}</div>
          <div className="space-y-1.5">
            {CLASS_ORDER.map((c) => {
              const info = CLASS_INFO[c];
              const meta = classMeta(c);
              const isCurrent = current === c;
              return (
                <div
                  key={c}
                  className={`rounded-md border p-2 transition-colors ${
                    isCurrent
                      ? "border-primary/70 bg-primary/5"
                      : "border-border/40 bg-background/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: meta.color }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: meta.color }}
                    >
                      {info.label}
                    </span>
                    {isCurrent && (
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-primary">
                        este ativo
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {info.criterio}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {info.fundamentalista}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
