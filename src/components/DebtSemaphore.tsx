import { debtLevel } from "@/lib/indicators";
import { InfoTip } from "./InfoTip";

interface Props {
  divPL: number;
  compact?: boolean;
}

export function DebtSemaphore({ divPL, compact = false }: Props) {
  const level = debtLevel(divPL);
  const colorVar =
    level.color === "success"
      ? "var(--color-success)"
      : level.color === "warning"
        ? "var(--color-warning)"
        : "var(--color-danger)";

  const isActive = (pos: string) => pos === level.color;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex gap-1">
          {["success", "warning", "danger"].map((c) => (
            <span
              key={c}
              className="h-2 w-2 rounded-full transition-opacity"
              style={{
                backgroundColor:
                  c === "success"
                    ? "var(--color-success)"
                    : c === "warning"
                      ? "var(--color-warning)"
                      : "var(--color-danger)",
                opacity: isActive(c) ? 1 : 0.15,
                boxShadow: isActive(c) ? `0 0 6px ${colorVar}` : "none",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Semáforo de Endividamento</h4>
          <InfoTip
            title="Semáforo de Endividamento"
            fundamentalista="Classifica a alavancagem (Dívida Bruta / Patrimônio Líquido). Verde: ≤ 0,5x. Amarelo: 0,5x–1,2x. Vermelho: > 1,2x. Empresas muito alavancadas sofrem mais em ciclos de juros altos."
            tecnica="Ativos vermelhos costumam ter maior volatilidade e beta mais alto — exigem stops mais largos e gestão de risco mais rígida."
          />
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          Dív/PL {divPL.toFixed(2)}x
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {(["success", "warning", "danger"] as const).map((c) => (
            <div
              key={c}
              className="h-8 w-8 rounded-full transition-all"
              style={{
                backgroundColor:
                  c === "success"
                    ? "var(--color-success)"
                    : c === "warning"
                      ? "var(--color-warning)"
                      : "var(--color-danger)",
                opacity: isActive(c) ? 1 : 0.12,
                boxShadow: isActive(c) ? `0 0 18px ${colorVar}` : "none",
              }}
            />
          ))}
        </div>
        <div>
          <div className="text-base font-semibold" style={{ color: colorVar }}>
            {level.label}
          </div>
          <div className="text-xs text-muted-foreground">{level.desc}</div>
        </div>
      </div>
    </div>
  );
}
