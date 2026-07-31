import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { InfoTip } from "@/components/InfoTip";
import { StockFilterSheet } from "@/components/StockFilterSheet";
import {
  activeRanges,
  initialFilters,
  matchesStockFilters,
  type DebtColor,
  type FilterRange,
  type RecOpt,
} from "@/lib/stock-filters";
import { stocksQueryOptions, useAllStocks } from "@/hooks/use-all-stocks";
import { useDividendBatch } from "@/hooks/use-dividend-batch";
import {
  classMeta,
  type DividendClass,
  type Frequencia,
} from "@/lib/dividend-intelligence";
import { StockDetailModal } from "@/components/StockDetailModal";
import type { Stock } from "@/lib/stocks-data";

export const Route = createFileRoute("/dividendos")({
  head: () => ({
    meta: [
      {
        title:
          "Inteligência de proventos — Ranking de dividendos da B3 | B3 Radar",
      },
      {
        name: "description",
        content:
          "Ranking de ações da B3 por qualidade e previsibilidade dos proventos: frequência, consecutividade, DY 12m e classificação Elite, Consistente, Regular ou Irregular.",
      },
      {
        property: "og:title",
        content:
          "Inteligência de proventos — Ranking de dividendos da B3 | B3 Radar",
      },
      {
        property: "og:description",
        content:
          "Ranking com previsões de próximos dividendos e classificação por qualidade dos proventos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index,follow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(stocksQueryOptions),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background p-8 text-sm text-muted-foreground">
      Falha: {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background p-8 text-sm text-muted-foreground">
      Página não encontrada.
    </div>
  ),
  component: DividendosPage,
});

const CLASS_ORDER: DividendClass[] = [
  "Elite",
  "Consistente",
  "Regular",
  "Irregular",
  "Sem cobertura",
];

const CLASS_FILTERS: Array<{ key: "ALL" | DividendClass; label: string }> = [
  { key: "ALL", label: "Todas" },
  { key: "Elite", label: "Elite" },
  { key: "Consistente", label: "Consistente" },
  { key: "Regular", label: "Regular" },
  { key: "Irregular", label: "Irregular" },
];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const FREQ_OPTS: Array<"ALL" | Frequencia> = [
  "ALL",
  "Mensal",
  "Trimestral",
  "Semestral",
  "Anual",
  "Irregular",
];

function DividendosPage() {
  const { stocks } = useAllStocks();
  const { rows, updatedAt, isLoading, isFetching, pendentes, coletando } =
    useDividendBatch(stocks);
  const [q, setQ] = useState("");
  const [cls, setCls] = useState<"ALL" | DividendClass>("ALL");
  const [selected, setSelected] = useState<Stock | null>(null);

  // filtros fundamentalistas / qualitativos (mesmos da tela de ações)
  const [filters, setFilters] =
    useState<Record<string, FilterRange>>(initialFilters);
  const [debtColors, setDebtColors] = useState<DebtColor[]>([]);
  const [recFilter, setRecFilter] = useState<RecOpt>("ALL");
  const [minAnosAcimaSelic, setMinAnosAcimaSelic] = useState(0);
  const [minAnosPrecoAcimaSelic, setMinAnosPrecoAcimaSelic] = useState(0);

  // filtros da inteligência de proventos
  const [minScore, setMinScore] = useState(0);
  const [minDy12m, setMinDy12m] = useState(0);
  const [minConsecutivos, setMinConsecutivos] = useState(0);
  const [freq, setFreq] = useState<"ALL" | Frequencia>("ALL");
  const [comEmDias, setComEmDias] = useState(0); // 0 = sem restrição
  const [somenteComDados, setSomenteComDados] = useState(false);

  const clearIntel = () => {
    setMinScore(0);
    setMinDy12m(0);
    setMinConsecutivos(0);
    setFreq("ALL");
    setComEmDias(0);
    setSomenteComDados(false);
    setCls("ALL");
  };

  const semRetorno = useMemo(
    () => rows.filter((r) => r.raw && r.raw.fonte === null).length,
    [rows],
  );

  const ranges = useMemo(() => activeRanges(filters), [filters]);

  const intelActiveCount =
    (minScore > 0 ? 1 : 0) +
    (minDy12m > 0 ? 1 : 0) +
    (minConsecutivos > 0 ? 1 : 0) +
    (freq.length > 0 ? 1 : 0) +
    (comEmDias > 0 ? 1 : 0) +
    (somenteComDados ? 1 : 0) +
    (cls.length > 0 ? 1 : 0);


  const activeCount =
    ranges.length +
    intelActiveCount +
    (debtColors.length > 0 && debtColors.length < 3 ? 1 : 0) +
    (recFilter !== "ALL" ? 1 : 0) +
    (minAnosAcimaSelic > 0 ? 1 : 0) +
    (minAnosPrecoAcimaSelic > 0 ? 1 : 0);

  const ranked = useMemo(() => {
    const hoje = new Date();
    const filtered = rows.filter((r) => {
      if (
        cls.length > 0 &&
        !(r.intel && cls.includes(r.intel.classification))
      )
        return false;


      if (q) {
        const s = q.trim().toUpperCase();
        if (
          !r.stock.ticker.includes(s) &&
          !r.stock.nome.toUpperCase().includes(s)
        )
          return false;
      }

      if (
        !matchesStockFilters(r.stock, ranges, {
          debtColors,
          recFilter,
          minAnosAcimaSelic,
          minAnosPrecoAcimaSelic,
        })
      )
        return false;

      if (somenteComDados && (!r.raw || r.raw.fonte === null)) return false;

      const intel = r.intel;
      if (minScore > 0 && (intel?.score ?? -1) < minScore) return false;
      if (minDy12m > 0 && (intel?.dyUltimos12m ?? -1) < minDy12m) return false;
      if (
        minConsecutivos > 0 &&
        (intel?.anosConsecutivosPagando ?? -1) < minConsecutivos
      )
        return false;
      if (
        freq.length > 0 &&
        !(intel && freq.includes(intel.next.frequencia))
      )
        return false;

      if (comEmDias > 0) {
        const iso = intel?.next.proximaDataComEstimada;
        if (!iso) return false;
        const diff =
          (new Date(`${iso}T00:00:00`).getTime() - hoje.getTime()) / 86400000;
        if (diff < -1 || diff > comEmDias) return false;
      }
      return true;
    });
    return filtered.sort((a, b) => {
      const sa = a.intel?.score ?? -1;
      const sb = b.intel?.score ?? -1;
      if (sb !== sa) return sb - sa;
      return (b.intel?.dyUltimos12m ?? 0) - (a.intel?.dyUltimos12m ?? 0);
    });
  }, [
    rows,
    q,
    cls,
    ranges,
    debtColors,
    recFilter,
    minAnosAcimaSelic,
    minAnosPrecoAcimaSelic,
    minScore,
    minDy12m,
    minConsecutivos,
    freq,
    comEmDias,
    somenteComDados,
  ]);

  const intelSection = (
    <div className="space-y-4 rounded-lg border border-border/60 bg-background/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Inteligência de proventos</p>
        {intelActiveCount > 0 && (
          <button
            onClick={clearIntel}
            className="text-[10px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm">
          Classe de provento
          <InfoTip
            title="Classificação de proventos"
            fundamentalista="Elite, Consistente, Regular ou Irregular conforme regularidade, consecutividade e consistência dos pagamentos."
            tecnica="Classes superiores costumam apresentar menor volatilidade em torno das datas com/ex."
          />
        </Label>
        <div className="grid grid-cols-3 gap-1.5">
          {CLASS_FILTERS.map((f) => {
            const active =
              f.key === "ALL" ? cls.length === 0 : cls.includes(f.key);
            return (
              <button
                key={f.key}
                onClick={() => (f.key === "ALL" ? setCls([]) : toggleCls(f.key))}
                className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                  active
                    ? "border-primary/70 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Selecione uma ou mais classes. Nenhuma selecionada mostra todas.
        </p>

      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Score mínimo</Label>
          <span className="font-mono text-xs text-muted-foreground">
            ≥ {minScore}
          </span>
        </div>
        <Slider
          min={0}
          max={100}
          step={5}
          value={[minScore]}
          onValueChange={([v]) => setMinScore(v)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">DY 12m mínimo</Label>
          <span className="font-mono text-xs text-muted-foreground">
            ≥ {minDy12m.toFixed(1)}%
          </span>
        </div>
        <Slider
          min={0}
          max={20}
          step={0.5}
          value={[minDy12m]}
          onValueChange={([v]) => setMinDy12m(v)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Anos consecutivos pagando</Label>
          <span className="font-mono text-xs text-muted-foreground">
            ≥ {minConsecutivos}
          </span>
        </div>
        <Slider
          min={0}
          max={10}
          step={1}
          value={[minConsecutivos]}
          onValueChange={([v]) => setMinConsecutivos(v)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Frequência de pagamento</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {FREQ_OPTS.map((f) => {
            const active = f === "ALL" ? freq.length === 0 : freq.includes(f);
            return (
              <button
                key={f}
                onClick={() => (f === "ALL" ? setFreq([]) : toggleFreq(f))}
                className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                  active
                    ? "border-primary/70 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {f === "ALL" ? "Todas" : f}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Selecione uma ou mais frequências. Nenhuma selecionada mostra todas.
        </p>
      </div>


      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-sm">
            Próxima data COM em até
            <InfoTip
              title="Próxima data COM estimada"
              fundamentalista="Estimativa estatística da próxima data com base no histórico oficial da B3. Não é anúncio da companhia."
              tecnica="Útil para posicionar-se antes da data ex, quando o papel costuma ajustar o preço."
            />
          </Label>
          <span className="font-mono text-xs text-muted-foreground">
            {comEmDias === 0 ? "sem limite" : `${comEmDias} dias`}
          </span>
        </div>
        <Slider
          min={0}
          max={180}
          step={15}
          value={[comEmDias]}
          onValueChange={([v]) => setComEmDias(v)}
        />
      </div>

      <button
        onClick={() => setSomenteComDados(!somenteComDados)}
        className={`w-full rounded-md border px-2 py-1.5 text-xs transition-colors ${
          somenteComDados
            ? "border-primary/70 bg-primary/10 text-primary"
            : "border-border/60 text-muted-foreground hover:border-primary/40"
        }`}
      >
        Somente ativos com dados da B3
      </button>
    </div>
  );


  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="border-border/60">
            <Link to="/" aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Inteligência de proventos</h1>
            <p className="text-xs text-muted-foreground">
              Ranking por qualidade e previsibilidade dos dividendos e JCP oficiais
              divulgados à B3
              {updatedAt && (
                <>
                  {" · Atualizado "}
                  {updatedAt.toLocaleString("pt-BR")}
                </>
              )}
              {isFetching && !isLoading && " · ↻"}
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ticker ou empresa…"
            className="max-w-xs border-border/60 bg-input/60"
          />
          <StockFilterSheet
            title="Filtros — proventos e fundamentos"
            filters={filters}
            setFilters={setFilters}
            activeCount={activeCount}
            debtColors={debtColors}
            setDebtColors={setDebtColors}
            recFilter={recFilter}
            setRecFilter={setRecFilter}
            minAnosAcimaSelic={minAnosAcimaSelic}
            setMinAnosAcimaSelic={setMinAnosAcimaSelic}
            minAnosPrecoAcimaSelic={minAnosPrecoAcimaSelic}
            setMinAnosPrecoAcimaSelic={setMinAnosPrecoAcimaSelic}
            extraSection={intelSection}
            onClearExtra={clearIntel}
          />

          <div className="flex flex-wrap gap-1">
            {CLASS_FILTERS.map((f) => {
              const active =
                f.key === "ALL" ? cls.length === 0 : cls.includes(f.key);
              return (
                <button
                  key={f.key}
                  onClick={() =>
                    f.key === "ALL" ? setCls([]) : toggleCls(f.key)
                  }
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    active
                      ? "border-primary text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/60"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="ml-auto text-xs text-muted-foreground">
            {isLoading
              ? "Carregando eventos oficiais…"
              : `${ranked.length} de ${rows.length} ativos${
                  semRetorno > 0 ? ` · ${semRetorno} sem retorno da B3` : ""
                }${
                  coletando
                    ? ` · coletando ${pendentes} pendentes na B3…`
                    : pendentes > 0
                      ? ` · ${pendentes} pendentes`
                      : ""
                }`}
          </div>

        </div>

        {/* Distribuição por classe */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CLASS_ORDER.map((c) => {
            const meta = classMeta(c);
            const count = rows.filter((r) => r.intel?.classification === c).length;
            return (
              <button
                key={c}
                onClick={() => setCls(c === "Sem cobertura" ? "ALL" : c)}
                className="rounded-lg border border-border/60 bg-card p-3 text-left transition-colors hover:border-primary/60"
              >
                <div className="text-xs text-muted-foreground">{meta.label}</div>
                <div
                  className="mt-1 font-mono text-xl font-semibold"
                  style={{ color: meta.color }}
                >
                  {count}
                </div>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/60 bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Ticker</th>
                <th className="p-3 text-left">Classe</th>
                <th className="p-3 text-right">Score</th>
                <th className="p-3 text-left">Frequência</th>
                <th className="p-3 text-right">DY 12m</th>
                <th className="p-3 text-right">Consecutivos</th>
                <th className="p-3 text-left">Próxima COM</th>
                <th className="p-3 text-right">Faixa esperada</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => {
                const intel = r.intel;
                const meta = intel ? classMeta(intel.classification) : null;
                return (
                  <tr
                    key={r.stock.ticker}
                    className="cursor-pointer border-b border-border/40 transition-colors hover:bg-secondary/30"
                    onClick={() => setSelected(r.stock)}
                  >
                    <td className="p-3">
                      <div className="font-mono font-semibold">
                        {r.stock.ticker}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.stock.nome}
                      </div>
                    </td>
                    <td className="p-3">
                      {meta ? (
                        <Badge
                          variant="outline"
                          className="border-border/60"
                          style={{ color: meta.color, borderColor: meta.color }}
                        >
                          {meta.label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {intel ? intel.score : "—"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {intel?.next.frequencia ?? "—"}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {intel?.dyUltimos12m != null
                        ? `${intel.dyUltimos12m.toFixed(2)}%`
                        : "—"}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {intel ? intel.anosConsecutivosPagando : "—"}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {fmtDate(intel?.next.proximaDataComEstimada ?? null)}
                      {intel?.next.janelaDias
                        ? ` ± ${intel.next.janelaDias}d`
                        : ""}
                    </td>
                    <td className="p-3 text-right font-mono text-xs">
                      {intel?.next.faixaValor
                        ? `R$ ${intel.next.faixaValor.min.toFixed(3)}–${intel.next.faixaValor.max.toFixed(3)}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              {!isLoading && ranked.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-sm text-muted-foreground"
                  >
                    Nenhum ativo encontrado para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Previsões geradas por modelo estatístico sobre o histórico oficial da B3.
          Não são anúncios da companhia. Consulte o RI antes de operar por data com/ex.
        </p>
      </div>

      <StockDetailModal stock={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
