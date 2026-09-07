import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSectorSimulation } from "@/hooks/use-sector-simulation";
import type { Stock } from "@/lib/stocks-data";
import type { RankCriterio, SimPosition } from "@/lib/sim-portfolio";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

function tone(v: number | null | undefined) {
  if (v == null) return "text-muted-foreground";
  if (v > 0) return "text-success";
  if (v < 0) return "text-destructive";
  return "text-muted-foreground";
}

function medalha(pos: number) {
  if (pos === 1) return "bg-yellow-500/15 text-yellow-500 border-yellow-500/40";
  if (pos === 2) return "bg-slate-400/15 text-slate-300 border-slate-400/40";
  if (pos === 3) return "bg-amber-700/15 text-amber-600 border-amber-700/40";
  return "bg-muted text-muted-foreground border-border/60";
}

function anosDe(sim: SimPosition) {
  const map = new Map<number, number>();
  for (const e of sim.eventos) map.set(e.ano, (map.get(e.ano) ?? 0) + e.total);
  return [...map.entries()].sort((a, b) => a.ano - b.ano ? a[0] - b[0] : a[0] - b[0]);
}

export function SectorCompare({ stocks }: { stocks: Stock[] }) {
  const sectors = useMemo(
    () =>
      Array.from(new Set(stocks.map((s) => s.setor))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [stocks],
  );

  const [setor, setSetor] = useState<string>("");
  const [dataCompra, setDataCompra] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [quantidade, setQuantidade] = useState<string>("100");
  const [limite, setLimite] = useState<string>("30");
  const [criterio, setCriterio] = useState<RankCriterio>("yieldOnCost");
  const [rodando, setRodando] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);

  const qtd = Math.max(1, Number(quantidade.replace(",", ".")) || 0);
  const max = Math.min(50, Math.max(2, Number(limite) || 30));

  const tickers = useMemo(() => {
    if (!setor) return [];
    return stocks
      .filter((s) => s.setor === setor && s.preco > 0)
      .sort((a, b) => (b.liquidezDiaria ?? 0) - (a.liquidezDiaria ?? 0))
      .slice(0, max)
      .map((s) => s.ticker);
  }, [stocks, setor, max]);

  const sim = useSectorSimulation({
    tickers,
    data: dataCompra,
    quantidade: qtd,
    criterio,
    enabled: rodando && tickers.length > 0,
  });

  const nomeDe = useMemo(
    () => new Map(stocks.map((s) => [s.ticker, s.nome])),
    [stocks],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="text-base font-semibold">Comparar setor</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Simula a mesma compra em todas as ações de um setor e ranqueia quem mais
          devolveu proventos desde a data escolhida. O preço de compra é o
          fechamento de cada ação naquele dia.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs text-muted-foreground" htmlFor="setor">
              Setor
            </Label>
            <select
              id="setor"
              value={setor}
              onChange={(e) => {
                setSetor(e.target.value);
                setRodando(false);
              }}
              className="mt-1 h-9 w-full rounded-md border border-border/60 bg-background px-2 text-sm"
            >
              <option value="">Selecione…</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground" htmlFor="data-compra">
              Data da compra
            </Label>
            <Input
              id="data-compra"
              type="date"
              className="mt-1 h-9"
              value={dataCompra}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDataCompra(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground" htmlFor="qtd">
              Quantidade por ativo
            </Label>
            <Input
              id="qtd"
              type="number"
              min={1}
              className="mt-1 h-9"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground" htmlFor="limite">
              Máximo de ativos (mais líquidos)
            </Label>
            <Input
              id="limite"
              type="number"
              min={2}
              max={50}
              className="mt-1 h-9"
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={!setor || tickers.length === 0 || !dataCompra}
            onClick={() => setRodando(true)}
          >
            Comparar {tickers.length > 0 ? `(${tickers.length} ativos)` : ""}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 text-xs"
            disabled={!rodando || sim.isFetching}
            onClick={() => sim.refetch()}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${sim.isFetching ? "animate-spin" : ""}`} />
            Atualizar histórico
          </Button>
          <div className="ml-auto flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Ordenar por</span>
            <Button
              size="sm"
              variant={criterio === "yieldOnCost" ? "secondary" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setCriterio("yieldOnCost")}
            >
              Proventos
            </Button>
            <Button
              size="sm"
              variant={criterio === "retornoTotal" ? "secondary" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setCriterio("retornoTotal")}
            >
              Retorno total
            </Button>
          </div>
        </div>
      </div>

      {rodando && sim.isLoading && (
        <p className="px-1 text-sm text-muted-foreground">
          Buscando preços da data e o histórico oficial de proventos…
        </p>
      )}

      {rodando && !sim.isLoading && sim.ranking.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">
          Nenhum ativo desse setor tem cotação na data escolhida.
        </p>
      )}

      {sim.ranking.length > 0 && (
        <div className="space-y-2">
          {sim.ranking.map(({ posicao, sim: p }) => {
            const isOpen = aberto === p.ticker;
            return (
              <Collapsible
                key={p.ticker}
                open={isOpen}
                onOpenChange={(v) => setAberto(v ? p.ticker : null)}
              >
                <div className="rounded-xl border border-border/60 bg-card">
                  <CollapsibleTrigger className="flex w-full items-center gap-3 p-3 text-left">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${medalha(
                        posicao,
                      )}`}
                    >
                      {posicao <= 3 ? <Trophy className="h-4 w-4" /> : posicao}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.ticker}</span>
                        <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">
                          {posicao}º lugar
                        </Badge>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {nomeDe.get(p.ticker) ?? ""}
                      </div>
                    </div>
                    <div className="hidden text-right text-xs sm:block">
                      <div className="text-muted-foreground">Investido</div>
                      <div className="font-mono">{brl(p.investido)}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-muted-foreground">Proventos</div>
                      <div className="font-mono text-success">{brl(p.proventos)}</div>
                      <div className="font-mono text-[11px] text-success">
                        {p.yieldOnCost != null ? pct(p.yieldOnCost) : "—"}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-muted-foreground">Retorno total</div>
                      <div className={`font-mono ${tone(p.retornoTotalPct)}`}>
                        {p.retornoTotalPct != null ? pct(p.retornoTotalPct) : "—"}
                      </div>
                      <div className={`font-mono text-[11px] ${tone(p.retornoTotal)}`}>
                        {p.retornoTotal != null ? brl(p.retornoTotal) : "—"}
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="space-y-3 border-t border-border/60 p-3 text-xs">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                        </div>
                      </div>

                      {p.eventos.length > 0 ? (
                        <div>
                          <div className="mb-1 font-medium">Proventos por ano</div>
                          <div className="flex flex-wrap gap-2">
                            {anosDe(p).map(([ano, total]) => (
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
                        <p className="text-muted-foreground">
                          Nenhum provento pago desde a data escolhida.
                        </p>
                      )}

                      {p.ajustes.length > 0 && (
                        <div className="text-muted-foreground">
                          Quantidade corrigida por{" "}
                          {p.ajustes
                            .map((a) => `${a.tipo.toLowerCase()} em ${a.dataCom}`)
                            .join(", ")}
                          .
                        </div>
                      )}
                      {p.avisos.map((a) => (
                        <div key={a} className="text-muted-foreground">
                          {a}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      {sim.semPreco.length > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          Sem cotação na data escolhida (fora da comparação): {sim.semPreco.join(", ")}.
        </p>
      )}
    </section>
  );
}
