import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { InfoTip } from "@/components/InfoTip";
import { INDICATORS, FUNDAMENTAL_KEYS } from "@/lib/indicators";
import {
  FILTER_BOUNDS,
  initialFilters,
  type DebtColor,
  type FilterRange,
  type RecOpt,
} from "@/lib/stock-filters";

export function StockFilterSheet({
  filters,
  setFilters,
  activeCount,
  debtColors,
  setDebtColors,
  recFilter,
  setRecFilter,
  minAnosAcimaSelic,
  setMinAnosAcimaSelic,
  minAnosPrecoAcimaSelic,
  setMinAnosPrecoAcimaSelic,
  precoTetoOnly = false,
  setPrecoTetoOnly,
  minDescontoTeto = 0,
  setMinDescontoTeto,
  ddmOnly = false,
  setDdmOnly,
  title = "Filtros por indicadores técnicos",
  extraSection,
  onClearExtra,
}: {
  filters: Record<string, FilterRange>;
  setFilters: (f: Record<string, FilterRange>) => void;
  activeCount: number;
  debtColors: DebtColor[];
  setDebtColors: (v: DebtColor[]) => void;
  recFilter: RecOpt;
  setRecFilter: (v: RecOpt) => void;
  minAnosAcimaSelic: number;
  setMinAnosAcimaSelic: (v: number) => void;
  minAnosPrecoAcimaSelic: number;
  setMinAnosPrecoAcimaSelic: (v: number) => void;
  precoTetoOnly?: boolean;
  setPrecoTetoOnly?: (v: boolean) => void;
  minDescontoTeto?: number;
  setMinDescontoTeto?: (v: number) => void;
  title?: string;
  /** bloco extra renderizado no topo do painel (ex.: inteligência de proventos) */
  extraSection?: ReactNode;
  onClearExtra?: () => void;
}) {
  const bounds = FILTER_BOUNDS;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" className="gap-2 border border-border/60">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6 px-4 pb-8">
          {extraSection}

          {/* Filtros qualitativos */}
          <div className="space-y-4 rounded-lg border border-border/60 bg-background/40 p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm">
                  Semáforo de endividamento
                  <InfoTip
                    title="Semáforo de Endividamento"
                    fundamentalista="Verde: Dív/PL ≤ 0,5x. Amarelo: 0,5x–1,2x. Vermelho: > 1,2x."
                    tecnica="Ativos mais alavancados costumam ter beta e volatilidade maiores."
                  />
                </Label>
                {debtColors.length > 0 && (
                  <button
                    onClick={() => setDebtColors([])}
                    className="text-[10px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ["success", "Baixo", "var(--color-success)"],
                  ["warning", "Moderado", "var(--color-warning)"],
                  ["danger", "Elevado", "var(--color-danger)"],
                ] as const).map(([val, label, color]) => {
                  const active = debtColors.includes(val);
                  return (
                    <button
                      key={val}
                      onClick={() =>
                        setDebtColors(
                          active
                            ? debtColors.filter((c) => c !== val)
                            : [...debtColors, val],
                        )
                      }
                      className="flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors"
                      style={{
                        borderColor: active ? color : "var(--color-border)",
                        color: active ? color : "var(--color-muted-foreground)",
                        backgroundColor: active
                          ? `color-mix(in oklab, ${color} 12%, transparent)`
                          : "transparent",
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: color,
                          boxShadow: active ? `0 0 6px ${color}` : "none",
                          opacity: active ? 1 : 0.5,
                        }}
                      />
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Nenhum selecionado mostra todos.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                Pagamento recorrente de dividendos
                <InfoTip
                  title="Recorrência de proventos"
                  fundamentalista="Considera recorrente quem pagou dividendos ou JCP em todos os últimos 5 anos."
                  tecnica="Papéis 'pagadores' costumam ter menor volatilidade e drawdowns mais amenos."
                />
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ["ALL", "Todos"],
                  ["YES", "Sim (5/5 anos)"],
                  ["NO", "Não"],
                ] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setRecFilter(val as RecOpt)}
                    className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                      recFilter === val
                        ? "border-primary/70 bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm">
                  Dividendo &gt; Selic
                  <InfoTip
                    title="Yield vs. Selic"
                    fundamentalista="Nº de anos (dos últimos 5) em que o yield de proventos superou a Selic média ponderada do ano."
                    tecnica="Papéis que batem a Selic sistematicamente tendem a atrair fluxo em ciclos de queda de juros."
                  />
                </Label>
                <span className="font-mono text-xs text-muted-foreground">
                  ≥ {minAnosAcimaSelic}/5 anos
                </span>
              </div>
              <Slider
                min={0}
                max={5}
                step={1}
                value={[minAnosAcimaSelic]}
                onValueChange={([v]) => setMinAnosAcimaSelic(v)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm">
                  Preço bateu Selic
                  <InfoTip
                    title="Valorização anual vs. Selic"
                    fundamentalista="Nº de anos (dos últimos 5) em que a valorização do preço (01/jan → 31/dez) superou a Selic média ponderada do ano."
                    tecnica="Consistência em bater a Selic no preço indica força relativa duradoura frente à renda fixa."
                  />
                </Label>
                <span className="font-mono text-xs text-muted-foreground">
                  ≥ {minAnosPrecoAcimaSelic}/5 anos
                </span>
              </div>
              <Slider
                min={0}
                max={5}
                step={1}
                value={[minAnosPrecoAcimaSelic]}
                onValueChange={([v]) => setMinAnosPrecoAcimaSelic(v)}
              />
            </div>

            {setPrecoTetoOnly && (
              <div className="space-y-2 border-t border-border/50 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    Preço teto favorável
                    <InfoTip
                      title="Preço teto (método Bazin)"
                      fundamentalista="Preço teto = média dos proventos (dividendos + JCP) dos cinco anos fechados na B3, dividida pelo divisor configurado em Ajustes. Quando o preço atual está abaixo do teto, a ação está descontada."
                      tecnica="Comprar abaixo do teto amplia a margem de segurança; ativos sem histórico suficiente na B3 ficam de fora do filtro."
                    />
                  </Label>
                  <button
                    type="button"
                    onClick={() => setPrecoTetoOnly(!precoTetoOnly)}
                    className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                      precoTetoOnly
                        ? "border-primary/70 bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {precoTetoOnly ? "Somente descontadas" : "Todas"}
                  </button>
                </div>
                {precoTetoOnly && setMinDescontoTeto && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Desconto mínimo</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        ≥ {minDescontoTeto}%
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={80}
                      step={5}
                      value={[minDescontoTeto]}
                      onValueChange={([v]) => setMinDescontoTeto(v)}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Com este filtro ativo sozinho, a lista é ordenada da mais descontada para a
                      menos descontada.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>


          {FUNDAMENTAL_KEYS.map((k) => {
            const [min, max, step] = bounds[k];
            const cur = filters[k];

            const lo = cur.min ?? min;
            const hi = cur.max ?? max;
            const active = cur.min !== null || cur.max !== null;
            const fmt = (n: number) => (step < 1 ? n.toFixed(2) : n.toString());
            return (
              <div key={k} className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  {INDICATORS[k].label}
                  <InfoTip
                    title={INDICATORS[k].short}
                    fundamentalista={INDICATORS[k].fundamentalista}
                    tecnica={INDICATORS[k].tecnica}
                  />
                </Label>

                <div className="px-0.5">
                  <Slider
                    className="w-full"
                    min={min}
                    max={max}
                    step={step}
                    value={[lo, hi]}
                    onValueChange={([newLo, newHi]) =>
                      setFilters({
                        ...filters,
                        [k]: { min: newLo, max: newHi },
                      })
                    }
                  />
                  <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                    <span>
                      <span className="mr-1 text-[9px] uppercase tracking-wide">
                        mín.
                      </span>
                      {fmt(lo)}
                    </span>
                    <span className={active ? "text-primary" : undefined}>
                      {fmt(hi)}
                      <span className="ml-1 text-[9px] uppercase tracking-wide">
                        máx.
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );

          })}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setFilters(initialFilters);
              setDebtColors([]);
              setRecFilter("ALL");
              setMinAnosAcimaSelic(0);
              setMinAnosPrecoAcimaSelic(0);
              setPrecoTetoOnly?.(false);
              setMinDescontoTeto?.(0);
              onClearExtra?.();
            }}
          >
            Limpar todos os filtros
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
