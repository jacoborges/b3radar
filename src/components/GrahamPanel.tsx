import { InfoTip } from "@/components/InfoTip";
import { grahamFromMultiples } from "@/lib/graham";

const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function GrahamPanel({ preco, pl, pvp }: { preco: number; pl: number; pvp: number }) {
  const g = grahamFromMultiples({ preco, pl, pvp });
  const selo = g.margem == null ? null : g.margem > 10 ? { t: "Barato", c: "border-success/50 bg-success/10 text-success" } : g.margem < -10 ? { t: "Caro", c: "border-destructive/50 bg-destructive/10 text-destructive" } : { t: "Justo", c: "border-border bg-muted text-muted-foreground" };
  return (
    <section className="rounded-xl border border-border/60 bg-card/50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">Preço Justo de Graham
          <InfoTip title="Fórmula de Benjamin Graham" fundamentalista="Preço justo = √(22,5 × LPA × VPA). A constante 22,5 vem dos limites de Graham para o investidor defensivo: P/L ≤ 15 e P/VP ≤ 1,5 (15 × 1,5 = 22,5)." tecnica="Pressupõe lucros consistentes. Não se aplica a empresas com lucro ou patrimônio negativos, de tecnologia/crescimento ou em recuperação; funciona melhor em setores perenes como bancos, energia e saneamento." />
        </h3>
        {selo && <span className={`rounded-md border px-2 py-0.5 text-xs ${selo.c}`}>{selo.t}</span>}
      </div>
      {!g.aplicavel ? (
        <p className="text-sm text-muted-foreground">Não aplicável: o método exige lucro por ação e valor patrimonial por ação positivos.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["LPA (atual)", brl(g.lpa!)], ["VPA", brl(g.vpa!)], ["Preço justo", brl(g.precoJusto!)], ["Margem de segurança", `${g.margem! >= 0 ? "+" : ""}${g.margem!.toFixed(1).replace(".", ",")}%`]].map(([l, v], i) => (
            <div key={l} className="rounded-lg border border-border/50 p-3">
              <div className="text-xs text-muted-foreground">{l}</div>
              <div className={`mt-1 font-mono text-base font-semibold ${i === 3 ? (g.margem! >= 0 ? "text-success" : "text-destructive") : ""}`}>{v}</div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground">LPA = preço ÷ P/L e VPA = preço ÷ P/VP com os dados atuais. Cotação: {brl(preco)}.</p>
    </section>
  );
}
