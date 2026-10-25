import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMonthlySalesLimit } from "@/hooks/use-monthly-sales-limit";
import { monthlySalesControl, type SalesControlPosition } from "@/lib/portfolio-sales-control";

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const tones = {
  success: "border-success bg-success/10 text-success",
  warning: "border-warning bg-warning/10 text-warning",
  destructive: "border-destructive bg-destructive/10 text-destructive",
};

export function PortfolioSalesTimeline({ positions, selectedPositions, year, loading }: { positions: SalesControlPosition[]; selectedPositions: SalesControlPosition[]; year: number; loading: boolean }) {
  const { limit, query } = useMonthlySalesLimit();
  const [open, setOpen] = useState(new Date().getMonth());
  const data = useMemo(() => monthlySalesControl(positions, year, limit), [positions, year, limit]);
  const selectedData = useMemo(() => monthlySalesControl(selectedPositions, year, limit), [selectedPositions, year, limit]);
  const detail = data[open];
  const alerts = data.filter(m => m.exceeded);
  return (
    <section aria-label="Total vendido neste mês" className="min-w-0 border-t border-border/60 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="text-sm font-semibold">Total vendido neste mês</h3><p className="mt-1 text-xs text-muted-foreground">Todas as carteiras · {year} · Limite {brl(limit)}</p></div>
        <Button asChild size="icon" variant="ghost" aria-label="Ajustar limite mensal"><Link to="/configuracoes"><Settings2 className="h-4 w-4" /></Link></Button>
      </div>
      {query.isError ? <p role="alert" className="text-xs text-destructive">Não foi possível carregar seu limite mensal.</p> : (
        <>
          <div className="overflow-x-auto pb-2">
            <div className="relative grid min-w-[720px] grid-cols-12 gap-2">
              <div className="absolute left-6 right-6 top-6 h-px bg-border" />
              {data.map((m, i) => (
                <Button key={m.month} variant="ghost" aria-pressed={open === i} aria-label={`${months[i]}: ${brl(m.sold)}, ${m.percentage.toFixed(1)}% do limite`} onClick={() => setOpen(i)} className="relative h-auto flex-col gap-1 px-0 py-0 hover:bg-transparent">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-[10px] tabular-nums ${tones[m.tone]} ${open === i ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>{m.percentage.toLocaleString("pt-BR", { maximumFractionDigits: m.percentage < 1000 ? 1 : 0 })}%</span>
                  <span className="text-[11px] text-muted-foreground">{months[i]}</span>
                </Button>
              ))}
            </div>
          </div>
          {detail && <div className="mt-3 border-l-2 border-border pl-3 text-xs">
            <h4 className="mb-2 font-semibold">{months[open]} · {year}</h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Total vendido</dt><dd className="mt-1 font-mono font-semibold">{brl(detail.sold)}</dd></div>
              <div><dt className="text-muted-foreground">Disponível até o limite</dt><dd className="mt-1 font-mono">{brl(detail.remaining)}</dd></div>
              <div><dt className="text-muted-foreground">Nesta carteira</dt><dd className="mt-1 font-mono">{brl(selectedData[open]?.sold ?? 0)}</dd></div>
              <div><dt className="text-muted-foreground">Lucro das vendas positivas</dt><dd className="mt-1 font-mono text-success">{brl(detail.positiveGains)}</dd></div>
              <div><dt className="text-muted-foreground">Prejuízos no mês</dt><dd className="mt-1 font-mono text-destructive">{brl(detail.losses)}</dd></div>
              <div><dt className="text-muted-foreground">Estimativa bruta · 15%</dt><dd className="mt-1 font-mono font-semibold">{brl(detail.estimatedTax)}</dd></div>
            </dl>
          </div>}
          {alerts.length > 0 && <div role="alert" className="mt-3 flex items-start gap-2 border-l-2 border-destructive pl-3 text-xs text-destructive"><AlertTriangle className="h-4 w-4 shrink-0" /><div><strong>Impostos a recolher — verificar apuração</strong><p className="mt-1">Limite ultrapassado: {alerts.map(m => months[m.month - 1]).join(", ")}. {detail?.exceeded && `Excesso no mês selecionado: ${brl(detail.sold - limit)}.`}</p></div></div>}
          {(loading || query.isPending) && <p role="status" className="mt-2 text-xs text-muted-foreground">Atualizando limite e eventos; valores provisórios…</p>}
        </>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Estimativa de 15% sobre ganhos positivos, sem compensar prejuízos, custos ou IRRF. Não é imposto definitivo. A isenção de R$ 20 mil refere-se a ações em operações comuns; day trade e ETFs têm regras próprias. Vendas fora do app também contam. <a href="https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/isencoes" target="_blank" rel="noreferrer" className="underline">Receita Federal</a></p>
    </section>
  );
}