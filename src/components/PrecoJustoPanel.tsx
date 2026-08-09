import { Scale } from "lucide-react";
import { InfoTip } from "./InfoTip";

interface Props {
  precoAtual?: number | null;
  pvp?: number | null;
  roe?: number | null;
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const SUCCESS = "var(--color-success)";
const DANGER = "var(--color-danger)";

export function PrecoJustoPanel({ precoAtual, pvp, roe }: Props) {
  const temPreco = typeof precoAtual === "number" && precoAtual > 0;
  const temPvp = typeof pvp === "number" && pvp > 0;
  const precoJusto = temPreco && temPvp ? precoAtual! / pvp! : null;
  const diff =
    precoJusto !== null && temPreco ? ((precoJusto - precoAtual!) / precoAtual!) * 100 : null;
  const descontada = precoJusto !== null ? precoJusto >= precoAtual! : null;

  const temRoe = typeof roe === "number" && Number.isFinite(roe);
  const multiplo = temRoe ? roe! / 15 : null;
  const multiploOk = multiplo !== null && temPvp ? multiplo > pvp! : null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Preço Justo (Valor Patrimonial)
        </h3>
        <InfoTip
          title="Preço justo pelo valor patrimonial"
          fundamentalista="Preço justo = preço atual ÷ P/VP, ou seja, o valor patrimonial por ação (o ponto em que o P/VP vale 1). Abaixo dele a ação é negociada com desconto sobre o patrimônio; acima, com prêmio. O múltiplo de ROE (ROE ÷ 15%) mostra quantas vezes o retorno sobre o patrimônio supera a referência de 15% ao ano — quando esse múltiplo é maior que o P/VP, a rentabilidade tende a justificar o prêmio pago sobre o patrimônio."
          tecnica="P/VP abaixo de 1 costuma marcar regiões de suporte de longo prazo; P/VP muito acima do múltiplo de ROE indica preço esticado e maior risco de correção."
        />
        {precoJusto !== null && (
          <span
            className="ml-auto rounded-md px-2.5 py-1 font-mono text-sm font-semibold"
            style={{
              color: descontada ? SUCCESS : DANGER,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: descontada ? SUCCESS : DANGER,
              backgroundColor: descontada
                ? "color-mix(in srgb, var(--color-success) 10%, transparent)"
                : "color-mix(in srgb, var(--color-danger) 10%, transparent)",
            }}
          >
            {brl(precoJusto)}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Preço atual ÷ P/VP — valor patrimonial por ação</h4>
        </div>

        <div className="grid gap-2 rounded-md border border-border/50 bg-background p-3 text-xs sm:grid-cols-4">
          <div>
            <div className="text-muted-foreground">Preço atual</div>
            <div className="font-mono text-sm font-semibold">
              {temPreco ? brl(precoAtual!) : "—"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">P/VP</div>
            <div className="font-mono text-sm font-semibold">
              {temPvp ? pvp!.toFixed(2) : "—"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Preço justo (P/VP = 1)</div>
            <div
              className="font-mono text-sm font-semibold"
              style={{
                color: precoJusto === null ? undefined : descontada ? SUCCESS : DANGER,
              }}
            >
              {precoJusto === null ? "—" : brl(precoJusto)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Situação</div>
            <div
              className="font-mono text-sm font-semibold"
              style={{
                color: diff === null ? undefined : descontada ? SUCCESS : DANGER,
              }}
            >
              {diff === null
                ? "—"
                : descontada
                  ? `Descontada (${diff.toFixed(1)}% abaixo do justo)`
                  : `Acima do justo (prêmio de ${Math.abs(diff).toFixed(1)}%)`}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2 rounded-md border border-border/50 bg-background p-3 text-xs sm:grid-cols-3">
          <div>
            <div className="text-muted-foreground">ROE</div>
            <div className="font-mono text-sm font-semibold">
              {temRoe ? `${roe!.toFixed(2)}%` : "—"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Múltiplo do ROE (ROE ÷ 15)</div>
            <div
              className="font-mono text-sm font-semibold"
              style={{
                color: multiploOk === null ? undefined : multiploOk ? SUCCESS : DANGER,
              }}
            >
              {multiplo === null ? "—" : `${multiplo.toFixed(2)}×`}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Múltiplo vs. P/VP</div>
            <div
              className="font-mono text-sm font-semibold"
              style={{
                color: multiploOk === null ? undefined : multiploOk ? SUCCESS : DANGER,
              }}
            >
              {multiploOk === null
                ? "—"
                : multiploOk
                  ? "Múltiplo acima do P/VP"
                  : "Múltiplo abaixo do P/VP"}
            </div>
          </div>
        </div>

        {(!temPreco || !temPvp || !temRoe) && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Alguns dados (preço, P/VP ou ROE) não estão disponíveis para este ativo — os campos sem
            informação aparecem como “—”.
          </p>
        )}
      </div>
    </div>
  );
}
