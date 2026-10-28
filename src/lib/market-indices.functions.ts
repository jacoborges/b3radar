import { createServerFn } from "@tanstack/react-start";

export interface MarketIndexDef {
  key: string;
  name: string;
  group: "B3" | "Setorial B3" | "Exterior";
  /** Símbolo consultado no TradingView (pode ser um ETF que replica o índice). */
  symbol: string;
  proxy?: string;
  currency: "BRL" | "USD";
  description: string;
}

export const MARKET_INDICES: MarketIndexDef[] = [
  { key: "IBOV", name: "Ibovespa", group: "B3", symbol: "BMFBOVESPA:IBOV", currency: "BRL", description: "Principal termômetro da bolsa: ações mais negociadas da B3." },
  { key: "IBXX", name: "IBrX 100", group: "B3", symbol: "BMFBOVESPA:BRAX11", proxy: "via ETF BRAX11", currency: "BRL", description: "100 ações mais negociadas, ponderadas por free float." },
  { key: "IBXL", name: "IBrX 50", group: "B3", symbol: "BMFBOVESPA:IBXL", currency: "BRL", description: "50 ações mais negociadas, ponderadas por free float." },
  { key: "SMLL", name: "Small Cap", group: "B3", symbol: "BMFBOVESPA:SMLL", currency: "BRL", description: "Empresas de menor capitalização." },
  { key: "IDIV", name: "Dividendos (IDIV)", group: "B3", symbol: "BMFBOVESPA:DIVO11", proxy: "via ETF DIVO11", currency: "BRL", description: "Empresas com maiores e mais consistentes proventos." },
  { key: "IFIX", name: "IFIX (FIIs)", group: "B3", symbol: "BMFBOVESPA:IFIX", currency: "BRL", description: "Fundos de Investimento Imobiliário." },
  { key: "ISEE", name: "ISE B3", group: "B3", symbol: "BMFBOVESPA:ISEE", currency: "BRL", description: "Sustentabilidade empresarial (ESG)." },
  { key: "ICO2", name: "ICO2 (Carbono Eficiente)", group: "B3", symbol: "BMFBOVESPA:ICO2", currency: "BRL", description: "Empresas com eficiência em emissões." },
  { key: "INDX", name: "Industrial (INDX)", group: "Setorial B3", symbol: "BMFBOVESPA:INDX", currency: "BRL", description: "Setor industrial." },
  { key: "IFNC", name: "Financeiro (IFNC)", group: "Setorial B3", symbol: "BMFBOVESPA:IFNC", currency: "BRL", description: "Bancos, seguradoras e credenciadoras." },
  { key: "ICON", name: "Consumo (ICON)", group: "Setorial B3", symbol: "BMFBOVESPA:ICON", currency: "BRL", description: "Varejo, alimentos e vestuário." },
  { key: "IEEX", name: "Energia Elétrica (IEE)", group: "Setorial B3", symbol: "BMFBOVESPA:IEEX", currency: "BRL", description: "Setor elétrico." },
  { key: "UTIL", name: "Utilidade Pública (UTIL)", group: "Setorial B3", symbol: "BMFBOVESPA:UTIL", currency: "BRL", description: "Energia, água e saneamento." },
  { key: "IMAT", name: "Materiais Básicos (IMAT)", group: "Setorial B3", symbol: "BMFBOVESPA:IMAT", currency: "BRL", description: "Mineração, siderurgia, papel e celulose." },
  { key: "MSCI", name: "MSCI Brazil / EWZ", group: "Exterior", symbol: "AMEX:EWZ", proxy: "ETF iShares EWZ", currency: "USD", description: "Benchmark global da bolsa brasileira, em dólar." },
  { key: "FTSE", name: "FTSE Brazil", group: "Exterior", symbol: "AMEX:FLBR", proxy: "via ETF FLBR", currency: "USD", description: "Grandes e médias empresas brasileiras (FTSE Russell)." },
  { key: "BRF", name: "Brazil Small-Cap (EUA)", group: "Exterior", symbol: "AMEX:BRF", proxy: "ETF VanEck BRF", currency: "USD", description: "Small caps brasileiras negociadas nos EUA." },
  { key: "SPADR", name: "S&P Brazil ADR", group: "Exterior", symbol: "SP:SPBRA15", currency: "USD", description: "Maiores ADRs brasileiros em Nova York." },
];

export interface MarketIndexRow extends MarketIndexDef {
  available: boolean;
  value: number | null;
  day: number | null;
  week: number | null;
  month: number | null;
  year: number | null;
  ytd: number | null;
  /** Consenso técnico TradingView, de -1 (venda forte) a 1 (compra forte). */
  score: number | null;
}

export const getMarketIndices = createServerFn({ method: "GET" }).handler(async () => {
  const columns = ["close", "change", "Perf.W", "Perf.1M", "Perf.Y", "Perf.YTD", "Recommend.All"];
  const map = new Map<string, (number | null)[]>();
  try {
    const res = await fetch("https://scanner.tradingview.com/global/scan", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://br.tradingview.com",
        referer: "https://br.tradingview.com/",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/126.0 Safari/537.36",
      },
      body: JSON.stringify({ symbols: { tickers: MARKET_INDICES.map((i) => i.symbol) }, columns }),
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: { s: string; d: (number | null)[] }[] };
      for (const r of json.data ?? []) map.set(r.s, r.d);
    } else console.error("indices scanner HTTP", res.status);
  } catch (e) {
    console.error("indices scanner", e);
  }
  const rows: MarketIndexRow[] = MARKET_INDICES.map((def) => {
    const d = map.get(def.symbol);
    const n = (i: number) => (d && typeof d[i] === "number" ? (d[i] as number) : null);
    return { ...def, available: n(0) != null, value: n(0), day: n(1), week: n(2), month: n(3), year: n(4), ytd: n(5), score: n(6) };
  });
  return { rows, updatedAt: new Date().toISOString() };
});
