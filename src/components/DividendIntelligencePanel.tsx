import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InfoTip } from "./InfoTip";
import { useTickerData } from "@/hooks/use-ticker-data";
import type { Stock } from "@/lib/stocks-data";
import {
  computeDividendIntelligence,
  classMeta,
  type EventoTipo,
} from "@/lib/dividend-intelligence";
import {
  analyzeDividendsWithPerplexity,
  type DividendAiResult,
} from "@/lib/dividend-ai.functions";



interface Props {
  stock: Stock;
}

const TIPO_COLOR: Record<EventoTipo, string> = {
  Dividendo: "var(--color-dividend)",
  JCP: "var(--color-jcp)",
  Bonificacao: "hsl(280 70% 65%)",
  Desdobramento: "hsl(200 80% 60%)",
  Grupamento: "hsl(30 85% 60%)",
};

const FILTROS: Array<{ key: "ALL" | EventoTipo; label: string }> = [
  { key: "ALL", label: "Todos" },
  { key: "Dividendo", label: "Div" },
  { key: "JCP", label: "JCP" },
  { key: "Bonificacao", label: "Bonif" },
  { key: "Desdobramento", label: "Split" },
  { key: "Grupamento", label: "Grup" },
];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function DividendIntelligencePanel({ stock }: Props) {
  const { proventos, isLoading, isFetching } = useTickerData(stock.ticker);
  const [filtro, setFiltro] = useState<"ALL" | EventoTipo>("ALL");
  const [showAll, setShowAll] = useState(false);
  const callPplx = useServerFn(analyzeDividendsWithPerplexity);
  const [pplx, setPplx] = useState<DividendAiResult | null>(null);
  const [pplxLoading, setPplxLoading] = useState(false);



  const historico = proventos?.historicoCompleto ?? [];
  const intel = useMemo(
    () =>
      historico.length
        ? computeDividendIntelligence(historico, stock.preco, stock.margemLiquida)
        : null,
    [historico, stock.preco, stock.margemLiquida],
  );

  const provisionados = proventos?.provisionados ?? [];
  const totalPorAcao = provisionados.reduce((s, p) => s + p.valorPorAcao, 0);
  const yieldProv =
    stock.preco > 0 ? (totalPorAcao / stock.preco) * 100 : 0;

  const historicoFiltrado = useMemo(() => {
    if (filtro === "ALL") return historico;
    return historico.filter((e) => e.tipo === filtro);
  }, [historico, filtro]);

  const visible = showAll ? historicoFiltrado : historicoFiltrado.slice(0, 12);

  const classMetaData = intel ? classMeta(intel.classification) : null;

  return (
    <div className="space-y-4">
      {/* Cabeçalho da seção */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Inteligência de proventos
        </h3>
        <InfoTip
          title="Como funciona"
          fundamentalista="Reúne dividendos, JCP, bonificações, desdobramentos e grupamentos oficiais divulgados à B3 nos últimos anos, e usa o histórico para estimar quando o próximo pagamento tende a acontecer."
          tecnica="Ativos com pagamentos regulares e previsíveis tendem a atrair fluxo comprador em torno da data COM. Cortes bruscos ou mudança de frequência costumam sinalizar deterioração de fundamentos."
        />
        {isFetching && !isLoading && (
          <span className="text-xs text-muted-foreground">↻ atualizando…</span>
        )}
      </div>

      {/* Previsão + score */}
      <div className="rounded-lg border-2 border-primary/40 bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold">Próximo pagamento (previsto)</h4>
          <Badge
            variant="outline"
            className="border-border/60 text-xs"
            title="Estimativa estatística — não é anúncio oficial da companhia"
          >
            Modelo quantitativo
          </Badge>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando histórico oficial…</p>
        ) : !intel || intel.amostraCash === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem histórico de proventos em dinheiro para gerar previsão.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Tipo provável"
              value={intel.next.tipoProvavel ?? "—"}
              color={
                intel.next.tipoProvavel
                  ? TIPO_COLOR[intel.next.tipoProvavel]
                  : undefined
              }
            />
            <MetricCard
              label="Frequência"
              value={intel.next.frequencia}
              sub={
                intel.next.gapMedianoDias
                  ? `${intel.next.gapMedianoDias} dias entre pagamentos`
                  : undefined
              }
            />
            <MetricCard
              label="Data COM esperada"
              value={
                intel.next.proximaDataComEstimada
                  ? fmtDate(intel.next.proximaDataComEstimada)
                  : "—"
              }
              sub={
                intel.next.janelaDias > 0
                  ? `± ${intel.next.janelaDias} dias`
                  : undefined
              }
            />
            <MetricCard
              label="Faixa por ação"
              value={
                intel.next.faixaValor
                  ? `R$ ${intel.next.faixaValor.esperado.toFixed(4)}`
                  : "—"
              }
              sub={
                intel.next.faixaValor
                  ? `R$ ${intel.next.faixaValor.min.toFixed(4)} – ${intel.next.faixaValor.max.toFixed(4)}`
                  : undefined
              }
            />
          </div>
        )}

        {intel && intel.amostraCash > 0 && classMetaData && (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Confiabilidade</span>
                <span className="font-mono text-foreground">
                  {intel.score}/100
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary/40">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${intel.score}%`,
                    background: classMetaData.color,
                  }}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-5">
                <BreakdownItem label="Regularidade" v={intel.breakdown.regularidade} />
                <BreakdownItem label="Consecutivos" v={intel.breakdown.consecutividade} />
                <BreakdownItem label="Consist. valor" v={intel.breakdown.consistenciaValor} />
                <BreakdownItem label="Cobertura" v={intel.breakdown.cobertura} />
                <BreakdownItem label="Sem cortes" v={intel.breakdown.ausenciaCortes} />
              </div>
            </div>
            <div className="flex flex-col items-start justify-center gap-1 lg:items-end">
              <Badge
                variant="outline"
                className="border-border/60 text-sm"
                style={{ color: classMetaData.color, borderColor: classMetaData.color }}
              >
                {classMetaData.label}
              </Badge>
              <div className="text-xs text-muted-foreground">
                {intel.anosConsecutivosPagando} anos consecutivos
              </div>
              {intel.dyUltimos12m != null && (
                <div className="text-xs text-muted-foreground">
                  DY 12m:{" "}
                  <span className="font-mono text-foreground">
                    {intel.dyUltimos12m.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>



      {/* Busca ao vivo (Perplexity) — RI, CVM e B3 */}
      <AiCard
        title={`Busca no RI / CVM / B3 (Perplexity) — ${new Date().getFullYear() - 1}, ${new Date().getFullYear()} + próximos 12 meses`}
        description={`Query enviada: "${stock.ticker}" "${stock.nome.split(" ").slice(0,3).join(" ")}" RI dividendos JCP ${new Date().getFullYear() - 1} ${new Date().getFullYear()}. Retorna apenas proventos com Data COM/EX/Pagamento entre 01/01/${new Date().getFullYear() - 1} e 31/12/${new Date().getFullYear() + 1}, com citações [1][2] clicáveis.`}
        ctaLabel={`Buscar proventos ${new Date().getFullYear() - 1}–${new Date().getFullYear() + 1}`}
        loading={pplxLoading}
        result={pplx}
        onRun={async () => {
          setPplxLoading(true);
          try {
            const r = await callPplx({
              data: {
                ticker: stock.ticker,
                nome: stock.nome,
                setor: stock.setor,
                ultimosEventos: historico
                  .filter((e) => e.valor > 0 && (e.tipo === "Dividendo" || e.tipo === "JCP"))
                  .slice(0, 10)
                  .map((e) => ({ tipo: e.tipo, valor: e.valor, dataCom: e.dataCom })),
                proximaDataComEstimada: intel?.next.proximaDataComEstimada ?? null,
                frequencia: intel?.next.frequencia,
                score: intel?.score,
                classificacao: intel?.classification,
              },
            });
            setPplx(r);
          } catch {
            setPplx({
              content: null,
              cached: false,
              updatedAt: new Date().toISOString(),
              error: "Falha ao contatar o servidor.",
            });
          } finally {
            setPplxLoading(false);
          }
        }}
      />




      {/* Provisionados oficiais */}
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <h4 className="text-sm font-semibold">Provisionados oficiais (já anunciados)</h4>
          <InfoTip
            title="Data Com × Data Ex"
            fundamentalista="Data Com é a última data em que ao comprar a ação você tem direito ao provento. Data Ex é o primeiro pregão em que a ação passa a negociar sem o direito. Data de Pagamento é quando o dinheiro cai na conta."
            tecnica="Na Data Ex costuma haver um gap de abertura para baixo próximo ao valor do provento."
          />
        </div>

        {provisionados.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum provento anunciado no momento pela B3.
          </p>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MetricCard label="Anúncios pendentes" value={String(provisionados.length)} />
              <MetricCard
                label="Total por ação"
                value={`R$ ${totalPorAcao.toFixed(4)}`}
              />
              <MetricCard
                label="Yield provisionado"
                value={`${yieldProv.toFixed(2)}%`}
                positive={yieldProv > 0}
              />
            </div>

            <div className="overflow-x-auto rounded-md border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor/ação</TableHead>
                    <TableHead>Data Com</TableHead>
                    <TableHead>Data Ex</TableHead>
                    <TableHead>Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provisionados.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-border/60"
                          style={{ color: TIPO_COLOR[p.tipo] }}
                        >
                          {p.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {p.valorPorAcao.toFixed(4)}
                      </TableCell>
                      <TableCell className="font-mono">{fmtDate(p.dataCom)}</TableCell>
                      <TableCell className="font-mono">{fmtDate(p.dataEx)}</TableCell>
                      <TableCell className="font-mono">{fmtDate(p.dataPagamento)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Histórico completo */}
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold">Histórico completo de eventos</h4>
          <InfoTip
            title="Eventos societários"
            fundamentalista="Dividendos e JCP são pagamentos em dinheiro. Bonificações entregam ações adicionais. Desdobramentos (splits) aumentam o nº de ações reduzindo o preço unitário; grupamentos fazem o contrário."
            tecnica="Splits costumam aumentar liquidez e podem gerar impulso de curto prazo. Grupamentos frequentemente aparecem em ações penny stock — sinal de atenção."
          />
          <div className="ml-auto flex flex-wrap gap-1">
            {FILTROS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  filtro === f.key
                    ? "border-primary text-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/60"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando eventos oficiais…</p>
        ) : historicoFiltrado.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum evento encontrado para este filtro.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Com</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor / Ratio</TableHead>
                    <TableHead>Data Ex</TableHead>
                    <TableHead>Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{fmtDate(e.dataCom)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-border/60"
                          style={{ color: TIPO_COLOR[e.tipo] }}
                        >
                          {e.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {e.valor > 0
                          ? `R$ ${e.valor.toFixed(4)}`
                          : e.ratio ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono">{fmtDate(e.dataEx)}</TableCell>
                      <TableCell className="font-mono">{fmtDate(e.dataPagamento)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {historicoFiltrado.length > 12 && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  {showAll
                    ? "Mostrar menos"
                    : `Mostrar todos (${historicoFiltrado.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  color,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-md border border-border/40 bg-background/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className="mt-1 font-mono text-base font-semibold"
        style={{
          color:
            color ??
            (positive === undefined
              ? undefined
              : positive
                ? "var(--color-success)"
                : "var(--color-danger)"),
        }}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function BreakdownItem({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="font-mono text-foreground">{v}</span>
    </div>
  );
}
function linkifyCitations(text: string, citations?: string[]): string {
  if (!citations || citations.length === 0) return text;
  return text.replace(/\[(\d+)\]/g, (m, n) => {
    const idx = parseInt(n, 10) - 1;
    const url = citations[idx];
    return url ? `[[${n}]](${url})` : m;
  });
}


function AiCard({
  title,
  description,
  ctaLabel,
  loading,
  result,
  onRun,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  loading: boolean;
  result: DividendAiResult | null;
  onRun: () => void;
}) {
  const needsKey = false;


  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">{title}</h4>
        <div className="ml-auto flex items-center gap-2">
          {result?.cached && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              cache 24h
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onRun}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {loading ? "Analisando…" : result ? "Atualizar" : ctaLabel}
          </Button>
        </div>
      </div>

      {!result && !loading && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {result?.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {result.error}
          {needsKey && (
            <div className="mt-2 text-xs">
              <Link to="/configuracoes" className="underline underline-offset-2">
                Abrir configurações →
              </Link>
            </div>
          )}
        </div>
      )}

      {result?.content && (
        <>
          <div className="prose prose-sm prose-invert max-w-none prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-sm prose-headings:font-semibold prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-a:text-primary">
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    {children}
                  </a>
                ),
              }}
            >
              {linkifyCitations(result.content, result.citations)}
            </ReactMarkdown>
          </div>
          {result.citations && result.citations.length > 0 && (
            <div className="mt-3 border-t border-border/40 pt-2">
              <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Fontes consultadas
              </div>
              <ol className="space-y-0.5 text-xs">
                {result.citations.map((url, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-muted-foreground">[{i + 1}]</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-primary underline underline-offset-2 hover:opacity-80"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Gerado por IA a partir de dados públicos. Confirme no RI oficial antes de decidir.
          </p>
        </>
      )}
    </div>
  );
}


