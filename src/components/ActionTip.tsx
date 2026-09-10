import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ACTION_TIPS, type ActionTipKey } from "@/lib/action-tips";

interface ActionTipProps {
  /** Chave do mapa central de dicas. */
  tip?: ActionTipKey;
  /** Nome da função (sobrescreve o do mapa). */
  label?: string;
  /** Como usar (sobrescreve o do mapa). */
  how?: string;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactElement;
}

/**
 * Balão explicativo ao passar o mouse (ou tocar) num ícone de função:
 * mostra o nome da função e uma frase de "como usar".
 */
export function ActionTip({ tip, label, how, side = "bottom", children }: ActionTipProps) {
  const [open, setOpen] = React.useState(false);
  const base = tip ? ACTION_TIPS[tip] : undefined;
  const title = label ?? base?.label;
  const usage = how ?? base?.how;

  if (!title && !usage) return children;

  return (
    <Tooltip open={open} onOpenChange={setOpen} delayDuration={200}>
      <TooltipTrigger
        asChild
        onPointerDown={(e) => {
          // Em telas de toque não há hover: abre ao tocar sem bloquear o clique.
          if (e.pointerType === "touch") setOpen(true);
        }}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className="max-w-[min(18rem,calc(100vw-2rem))] whitespace-normal rounded-lg border border-border/60 bg-card px-3 py-2 text-card-foreground shadow-lg"
      >
        {title && (
          <div className="text-xs font-semibold text-foreground">{title}</div>
        )}
        {usage && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {usage}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
