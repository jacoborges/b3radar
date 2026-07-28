import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { stocksQueryOptions, useAllStocks } from "@/hooks/use-all-stocks";
import { useDividendBatch } from "@/hooks/use-dividend-batch";
import { classMeta, type DividendClass } from "@/lib/dividend-intelligence";
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

function DividendosPage() {
  const { stocks } = useAllStocks();
  const { rows, updatedAt, isLoading, isFetching } = useDividendBatch(stocks, 350);
  const [q, setQ] = useState("");
  const [cls, setCls] = useState<"ALL" | DividendClass>("ALL");
  const [selected, setSelected] = useState<Stock | null>(null);

  const semRetorno = useMemo(
    () => rows.filter((r) => r.raw && r.raw.fonte === null).length,
    [rows],
  );

  const ranked = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (cls !== "ALL" && r.intel?.classification !== cls) return false;
      if (q) {
        const s = q.trim().toUpperCase();
        if (
          !r.stock.ticker.includes(s) &&
          !r.stock.nome.toUpperCase().includes(s)
        )
          return false;
      }
      return true;
    });
    return filtered.sort((a, b) => {
      const sa = a.intel?.score ?? -1;
      const sb = b.intel?.score ?? -1;
      if (sb !== sa) return sb - sa;
      return (b.intel?.dyUltimos12m ?? 0) - (a.intel?.dyUltimos12m ?? 0);
    });
  }, [rows, q, cls]);

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
          <div className="flex flex-wrap gap-1">
            {CLASS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setCls(f.key)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  cls === f.key
                    ? "border-primary text-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/60"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {isLoading
              ? "Carregando eventos oficiais…"
              : `${ranked.length} ativos · top 350 por liquidez${
                  semRetorno > 0 ? ` · ${semRetorno} sem retorno da B3` : ""
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
