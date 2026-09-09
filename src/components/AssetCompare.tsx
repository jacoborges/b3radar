import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSectorSimulation } from "@/hooks/use-sector-simulation";
import type { Stock } from "@/lib/stocks-data";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

function tone(v: number | null | undefined) {
  if (v == null) return "text-muted-foreground";
  if (v > 0) return "text-success";
  if (v < 0) return "text-destructive";
  return "text-muted-foreground";
}

/** Simulação de um único ativo: valorização, proventos e yield on cost. */
export function AssetCompare({ stocks }: { stocks: Stock[] }) {
  const [ticker, setTicker] = useState("");
  const [dataCompra, setDataCompra] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [quantidade, setQuantidade] = useState("100");
  const [rodando, setRodando] = useState(false);

  const alvo = ticker.trim().toUpperCase();
  const existe = useMemo(
    () => stocks.some((s) => s.ticker === alvo),
    [stocks, alvo],
  );
  const nome = useMemo(
    () => stocks.find((s) => s.ticker === alvo)?.nome ?? "",
    [stocks, alvo],
  );
  const qtd = Math.max(1, Number(quantidade.replace(",", ".")) || 0);

  const sim = useSectorSimulation({
    tickers: existe ? [alvo] : [],
    data: dataCompra,
    quantidade: qtd,
    criterio: "yieldOnCost",
    enabled: rodando && existe,
    cacheKey: ["ativo", alvo],
  });

  const p = sim.ranking[0]?.sim ?? null;

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="text-base font-semibold">Comparar ativo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe o ativo, a data da compra e a quantidade: o app usa o fechamento
          daquele dia como preço de compra e mostra a valorização, os proventos
          recebidos e o yield on cost.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs text-muted-foreground" htmlFor="ativo-cmp">
              Ativo
            </Label>
            <Input
              id="ativo-cmp"
              list="ativos-compare"
              placeholder="Ex.: TAEE11"
              className="mt-1 h-9 uppercase"
              value={ticker}
              onChange={(e) => {
                setTicker(e.target.value);
                setRodando(false);
              }}
            />
            <datalist id="ativos-compare">
              {stocks.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.nome}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground" htmlFor="ativo-data">
              Data da compra
            </Label>
            <Input
              id="ativo-data"
              type="date"
              className="mt-1 h-9"
              value={dataCompra}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDataCompra(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground" htmlFor="ativo-qtd">
              Quantidade
            </Label>
            <Input
              id="ativo-qtd"
              type="number"
              min={1}
              className="mt-1 h-9"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={!existe || !dataCompra}
            onClick={() => setRodando(true)}
          >
            Simular {existe ? alvo : ""}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 text-xs"
            disabled={!rodando || sim.isFetching}
            onClick={() => sim.refetch()}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${sim.isFetching ? "animate-spin" : ""}`}
            />
            Atualizar simulação
          </Button>
          {sim.computedAt && (
            <span className="text-xs text-muted-foreground">
              Resultado de{" "}
              {sim.computedAt.toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
              {sim.fromCache ? " (guardado no app)" : ""}
            </span>
          )}
        </div>

        {alvo && !existe && (
          <p className="mt-2 text-xs text-muted-foreground">
            Ativo não encontrado na lista do app.
          </p>
        )}
      </div>

      {rodando && sim.isLoading && (
        <p className="px-1 text-sm text-muted-foreground">
          Buscando o preço da data e o histórico oficial de proventos…
        </p>
      )}

      {rodando && !sim.isLoading && !p && (
        <p className="px-1 text-sm text-muted-foreground">
          Sem cotação para {alvo} na data escolhida.
        </p>
      )}

      {p && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
          <div>
            <div className="text-sm font-semibold">{p.ticker}</div>
            <div className="text-xs text-muted-foreground">{nome}</div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div>
              <div className="text-muted-foreground">Investido</div>
              <div className="font-mono">{brl(p.investido)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Preço na compra</div>
              <div className="font-mono">
                {brl(p.investido / (p.quantidadeOriginal || 1))}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Preço hoje</div>
              <div className="font-mono">
                {p.precoAtual != null ? brl(p.precoAtual) : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Quantidade hoje</div>
              <div className="font-mono">
                {p.quantidadeAtual.toLocaleString("pt-BR", {
                  maximumFractionDigits: 4,
                })}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Valorização</div>
              <div className={`font-mono ${tone(p.ganhoCapitalPct)}`}>
                {p.ganhoCapitalPct != null ? pct(p.ganhoCapitalPct) : "—"}
              </div>
              <div className={`font-mono text-[11px] ${tone(p.ganhoCapital)}`}>
                {p.ganhoCapital != null ? brl(p.ganhoCapital) : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Proventos</div>
              <div className="font-mono text-success">{brl(p.proventos)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Yield on cost</div>
              <div className="font-mono text-success">
                {p.yieldOnCost != null ? pct(p.yieldOnCost) : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Retorno total</div>
              <div className={`font-mono ${tone(p.retornoTotalPct)}`}>
                {p.retornoTotalPct != null ? pct(p.retornoTotalPct) : "—"}
              </div>
              <div className={`font-mono text-[11px] ${tone(p.retornoTotal)}`}>
                {p.retornoTotal != null ? brl(p.retornoTotal) : "—"}
              </div>
            </div>
          </div>

          {p.eventos.length > 0 ? (
            <div className="text-xs">
              <div className="mb-1 font-medium">Proventos por ano</div>
              <div className="flex flex-wrap gap-2">
                {[
                  ...p.eventos
                    .reduce((m, e) => {
                      m.set(e.ano, (m.get(e.ano) ?? 0) + e.total);
                      return m;
                    }, new Map<number, number>())
                    .entries(),
                ]
                  .sort((a, b) => a[0] - b[0])
                  .map(([ano, total]) => (
                    <span
                      key={ano}
                      className="rounded-md border border-border/60 px-2 py-1 font-mono"
                    >
                      {ano}: {brl(total)}
                    </span>
                  ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhum provento pago desde a data escolhida.
            </p>
          )}

          {p.ajustes.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Quantidade corrigida por{" "}
              {p.ajustes
                .map((a) => `${a.tipo.toLowerCase()} em ${a.dataCom}`)
                .join(", ")}
              .
            </div>
          )}
          {p.avisos.map((a) => (
            <div key={a} className="text-xs text-muted-foreground">
              {a}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
