import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAllStocks } from "@/hooks/use-all-stocks";
import { sectorLabel } from "@/lib/sector-label";
import { RANKING_PERIODS, RANKING_SHARES, type RankingPeriod } from "@/lib/ranking";
import { getSectorRanking } from "@/lib/ranking.functions";
import { StockGroupMarker } from "@/components/StockGroupMarker";
import { PortfolioChartButton } from "@/components/PortfolioChartButton";

export const Route = createFileRoute("/_authenticated/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking por setor — Retorno com proventos | B3 Radar" },
      { name: "description", content: "Compare ações do mesmo setor: valorização e proventos de 100 ações em 1 ano, 6 meses ou 1 mês." },
      { property: "og:title", content: "Ranking por setor | B3 Radar" },
      { property: "og:description", content: "Quem rendeu mais no setor: valorização + proventos em 1 ano, 6 meses e 1 mês." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RankingPage,
});

const brl = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number | null) =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const tone = (v: number | null) =>
  v == null ? "text-muted-foreground" : v >= 0 ? "text-success" : "text-destructive";
const fmtDate = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");

function RankingPage() {
  const { stocks, sectors } = useAllStocks();
  const [sector, setSector] = useState<string>("");
  const [period, setPeriod] = useState<RankingPeriod>("1y");
  const [req, setReq] = useState<{ sector: string; period: RankingPeriod } | null>(null);
  const call = useServerFn(getSectorRanking);

  const sectorOptions = useMemo(
    () => sectors.filter((s) => stocks.some((x) => x.setor === s)),
    [sectors, stocks],
  );
  const tickers = useMemo(
    () =>
      req
        ? stocks
            .filter((s) => s.setor === req.sector)
            .sort((a, b) => (b.liquidezDiaria ?? 0) - (a.liquidezDiaria ?? 0))
            .slice(0, 150)
            .map((s) => s.ticker)
        : [],
    [req, stocks],
  );

  const q = useQuery({
    queryKey: ["ranking", req?.period, tickers.join("|"), new Date().toISOString().slice(0, 10)],
    queryFn: () => call({ data: { tickers, period: req!.period } }),
    enabled: !!req && tickers.length > 0,
    staleTime: 60 * 60 * 1000,
  });

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Button asChild variant="outline" size="icon">
          <Link to="/" aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <Trophy className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">Ranking por setor</h1>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="min-w-[220px] flex-1">
          <p className="mb-1 text-xs text-muted-foreground">Setor</p>
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger><SelectValue placeholder="Escolha um setor" /></SelectTrigger>
            <SelectContent>
              {sectorOptions.map((s) => (
                <SelectItem key={s} value={s}>{sectorLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Prazo</p>
          <div className="flex gap-1">
            {RANKING_PERIODS.map((p) => (
              <Button key={p.value} size="sm" variant={period === p.value ? "default" : "outline"} onClick={() => setPeriod(p.value)}>
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <Button disabled={!sector || q.isFetching} onClick={() => setReq({ sector, period })}>
          {q.isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Gerar ranking
        </Button>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Simula a compra de {RANKING_SHARES} ações pelo fechamento no início do prazo e compara com o fechamento mais recente,
        somando dividendos e JCP com Data Com no período e ajustando desdobramentos e bonificações.
      </p>

      {q.isFetching && <p className="text-sm text-muted-foreground">Calculando {tickers.length} ativos…</p>}
      {q.error && <p className="text-sm text-destructive">Não foi possível gerar o ranking agora.</p>}

      {q.data && !q.isFetching && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <p className="px-4 pt-3 text-xs text-muted-foreground">
            {sectorLabel(req!.sector)} · de {fmtDate(q.data.dataInicio)} até {fmtDate(q.data.hoje)}
          </p>
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Ticker</th>
                <th className="p-2 text-right">Preço inicial</th>
                <th className="p-2 text-right">Preço atual</th>
                <th className="p-2 text-right">Valorização</th>
                <th className="p-2 text-right">Proventos</th>
                <th className="p-2 text-right">Retorno total</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {q.data.rows.map((r, i) => {
                const semDados = r.retornoPct == null;
                const base = r.precoInicial ? r.precoInicial * RANKING_SHARES : null;
                return (
                  <tr key={r.ticker} className="border-b border-border/50">
                    <td className="p-2 font-semibold text-muted-foreground">{semDados ? "—" : `${i + 1}º`}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <StockGroupMarker ticker={r.ticker} />
                        <span className="font-semibold text-foreground">{r.ticker}</span>
                        {r.quantidadeFinal !== RANKING_SHARES && (
                          <span className="text-xs text-muted-foreground">({r.quantidadeFinal} ações)</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      {brl(r.precoInicial)}
                      <div className="text-xs text-muted-foreground">{fmtDate(r.dataInicial)}</div>
                    </td>
                    <td className="p-2 text-right">{brl(r.precoAtual)}</td>
                    {semDados ? (
                      <td colSpan={3} className="p-2 text-right text-muted-foreground">sem dados</td>
                    ) : (
                      <>
                        <td className={`p-2 text-right ${tone(r.valorizacao)}`}>
                          {brl(r.valorizacao)}
                          <div className="text-xs">{pct(base ? (r.valorizacao! / base) * 100 : null)}</div>
                        </td>
                        <td className="p-2 text-right text-success">
                          {brl(r.proventos)}
                          <div className="text-xs">{pct(base ? (r.proventos / base) * 100 : null)}</div>
                        </td>
                        <td className={`p-2 text-right font-semibold ${tone(r.retorno)}`}>
                          {brl(r.retorno)}
                          <div className="text-xs">{pct(r.retornoPct)}</div>
                        </td>
                      </>
                    )}
                    <td className="p-2 text-right"><PortfolioChartButton ticker={r.ticker} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
