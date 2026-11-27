import type { LedgerDividend } from "./portfolio-ledger";

export interface ExportPosition {
  ticker: string;
  quantity: number;
  avgPrice: number;
  invested: number;
  price: number | null;
  current: number | null;
  lots: Array<{ price: number; quantity: number; boughtAt: string }>;
  sales: Array<{ price: number; quantity: number; soldAt: string; realized: number }>;
  dividends: LedgerDividend[];
}

export interface MonthRow { month: string; total: number; items: Array<{ ticker: string; date: string; quantity: number; price: number; total: number; realized?: number }> }

const groupMonths = <T extends { date: string }>(items: T[], value: (i: T) => number) => {
  const map = new Map<string, { total: number; items: T[] }>();
  for (const i of items) {
    const key = i.date.slice(0, 7);
    const row = map.get(key) ?? { total: 0, items: [] };
    row.total += value(i); row.items.push(i); map.set(key, row);
  }
  return [...map].sort(([a], [b]) => a.localeCompare(b)).map(([month, r]) => ({ month, total: r.total, items: r.items.sort((a, b) => a.date.localeCompare(b.date)) }));
};

/** Pure report data: open positions, payouts already paid (payment date ≤ today), gross monthly purchases and sales. */
export function buildPortfolioExport(positions: ExportPosition[], today: string) {
  const open = positions.filter(p => p.quantity > 1e-8);
  const invested = open.reduce((s, p) => s + p.invested, 0);
  const current = open.reduce((s, p) => s + (p.current ?? p.invested), 0);
  const change = current - invested;
  const payouts = positions.flatMap(p => p.dividends.filter(d => d.dataPagamento && d.dataPagamento <= today).map(d => ({ ticker: p.ticker, ...d })));
  const dividendos = payouts.filter(d => d.tipo === "Dividendo").reduce((s, d) => s + d.total, 0);
  const jcp = payouts.filter(d => d.tipo === "JCP").reduce((s, d) => s + d.total, 0);
  const contributions = groupMonths(positions.flatMap(p => p.lots.map(l => ({ ticker: p.ticker, date: l.boughtAt, quantity: l.quantity, price: l.price, total: l.quantity * l.price }))), i => i.total);
  const sales = groupMonths(positions.flatMap(p => p.sales.map(s => ({ ticker: p.ticker, date: s.soldAt, quantity: s.quantity, price: s.price, total: s.quantity * s.price, realized: s.realized }))), i => i.total);
  return {
    invested, current, change, changePct: invested > 0 ? change / invested * 100 : 0,
    positions: open, payouts: payouts.sort((a, b) => (a.dataPagamento ?? "").localeCompare(b.dataPagamento ?? "")),
    dividendos, jcp, contributions, sales,
  };
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
const date = (d: string | null) => d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const monthName = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const tone = (v: number) => v > 0 ? "pos" : v < 0 ? "neg" : "";

export function renderPortfolioExportHtml(name: string, r: ReturnType<typeof buildPortfolioExport>, generatedAt: Date) {
  const monthTable = (rows: MonthRow[], withResult: boolean) => rows.length === 0 ? `<p class="muted">Nenhum registro.</p>` : rows.map(m => `
    <h3>${esc(monthName(m.month))} <span>${brl(m.total)}</span></h3>
    <table><thead><tr><th>Data</th><th>Ativo</th><th>Qtd.</th><th>Preço</th><th>Total</th>${withResult ? "<th>Resultado</th>" : ""}</tr></thead><tbody>
    ${m.items.map(i => `<tr><td>${date(i.date)}</td><td>${esc(i.ticker)}</td><td>${num(i.quantity)}</td><td>${brl(i.price)}</td><td>${brl(i.total)}</td>${withResult ? `<td class="${tone(i.realized ?? 0)}">${brl(i.realized ?? 0)}</td>` : ""}</tr>`).join("")}
    </tbody></table>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Carteira ${esc(name)}</title><style>
  @page{size:A4;margin:12mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:system-ui,sans-serif;color:#1d232b;font-size:11px;margin:24px}h1{font-size:20px;margin:0}h2{font-size:14px;margin:22px 0 6px;border-bottom:1px solid #d5dae0;padding-bottom:4px}
  h3{font-size:12px;margin:12px 0 4px;text-transform:capitalize;display:flex;justify-content:space-between}
  .muted{color:#6b7480}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}.card{border:1px solid #d5dae0;border-radius:8px;padding:10px}.card b{display:block;font-size:16px;margin-top:4px}
  table{width:100%;border-collapse:collapse}th,td{padding:4px 6px;text-align:right;border-bottom:1px solid #eceff2}th:first-child,td:first-child,th:nth-child(2),td:nth-child(2){text-align:left}th{background:#f2f4f6;font-weight:600}tr{break-inside:avoid}
  .pos{color:#13804b}.neg{color:#c0392b}tfoot td{font-weight:700}</style></head><body>
  <h1>Carteira: ${esc(name)}</h1><div class="muted">Gerado em ${generatedAt.toLocaleString("pt-BR")} · cotações do momento da exportação</div>
  <div class="cards"><div class="card">Valor total investido<b>${brl(r.invested)}</b></div><div class="card">Valor atual da carteira<b>${brl(r.current)}</b></div>
  <div class="card">${r.change >= 0 ? "Valorização" : "Desvalorização"}<b class="${tone(r.change)}">${brl(r.change)} (${r.changePct >= 0 ? "+" : ""}${r.changePct.toFixed(2)}%)</b></div></div>
  <h2>Ações em carteira</h2>${r.positions.length === 0 ? `<p class="muted">Nenhuma posição aberta.</p>` : `<table><thead><tr><th>Ativo</th><th></th><th>Qtd.</th><th>Preço médio</th><th>Preço atual</th><th>Investido</th><th>Valor atual</th><th>Variação</th></tr></thead><tbody>
  ${r.positions.map(p => { const cur = p.current ?? p.invested; const v = p.invested > 0 ? (cur / p.invested - 1) * 100 : 0; return `<tr><td>${esc(p.ticker)}</td><td></td><td>${num(p.quantity)}</td><td>${brl(p.avgPrice)}</td><td>${p.price != null ? brl(p.price) : "—"}</td><td>${brl(p.invested)}</td><td>${brl(cur)}</td><td class="${tone(v)}">${v >= 0 ? "+" : ""}${v.toFixed(2)}%</td></tr>`; }).join("")}
  </tbody></table>`}
  <h2>Proventos recebidos</h2><p>Dividendos: <b>${brl(r.dividendos)}</b> · JCP: <b>${brl(r.jcp)}</b> · Total: <b>${brl(r.dividendos + r.jcp)}</b></p>
  ${r.payouts.length === 0 ? `<p class="muted">Nenhum provento pago no período.</p>` : `<table><thead><tr><th>Pagamento</th><th>Ativo</th><th>Tipo</th><th>Data Com</th><th>Qtd.</th><th>Valor/ação</th><th>Total</th></tr></thead><tbody>
  ${r.payouts.map(d => `<tr><td>${date(d.dataPagamento)}</td><td>${esc(d.ticker)}</td><td>${esc(d.tipo)}</td><td>${date(d.dataCom)}</td><td>${num(d.quantity)}</td><td>${d.valor.toLocaleString("pt-BR", { minimumFractionDigits: 4 })}</td><td>${brl(d.total)}</td></tr>`).join("")}</tbody></table>`}
  <h2>Aportes mensais</h2>${monthTable(r.contributions, false)}
  <h2>Vendas mensais</h2>${monthTable(r.sales, true)}
  <p class="muted" style="margin-top:20px">Relatório informativo gerado pelo B3 Radar. Proventos calculados pelos eventos oficiais da B3 e pela quantidade na Data Com.</p>
  <script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
}
