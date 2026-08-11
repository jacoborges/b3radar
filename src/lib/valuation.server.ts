/**
 * Coleta dos insumos do Valuation (FCD): demonstrativos + mercado (Yahoo)
 * e taxa livre de risco (API pública do Banco Central).
 * Server-only.
 */
import type { ValuationInputs } from "./valuation";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

interface YahooAuth {
  crumb: string;
  cookie: string;
  expiresAt: number;
}
let cachedAuth: YahooAuth | null = null;

function extractCookies(headers: Headers): string[] {
  const raw =
    (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ??
    headers.get("set-cookie")?.split(/,(?=[^;]+=)/g) ??
    [];
  return raw.map((c) => c.split(";")[0].trim()).filter((c) => c.length > 0);
}

async function getYahooAuth(): Promise<YahooAuth | null> {
  if (cachedAuth && cachedAuth.expiresAt > Date.now()) return cachedAuth;
  try {
    const seed = await fetch("https://fc.yahoo.com/", {
      headers: { "user-agent": UA, accept: "text/html" },
      redirect: "manual",
    });
    let cookies = extractCookies(seed.headers);
    if (cookies.length === 0) {
      const seed2 = await fetch("https://finance.yahoo.com/quote/AAPL/", {
        headers: { "user-agent": UA, accept: "text/html" },
        redirect: "manual",
      });
      cookies = extractCookies(seed2.headers);
    }
    if (cookies.length === 0) return null;
    const cookie = cookies.join("; ");
    const res = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "user-agent": UA, cookie, accept: "text/plain" },
    });
    if (!res.ok) return null;
    const crumb = (await res.text()).trim();
    if (!crumb || crumb.length > 32 || /\s/.test(crumb)) return null;
    cachedAuth = { crumb, cookie, expiresAt: Date.now() + 30 * 60 * 1000 };
    return cachedAuth;
  } catch {
    return null;
  }
}

type YNum = number | { raw?: number } | null | undefined;

function n(v: YNum): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && typeof v.raw === "number" && Number.isFinite(v.raw))
    return v.raw;
  return null;
}

interface YRow {
  [key: string]: YNum | string | undefined;
}

interface YahooSummary {
  quoteSummary?: {
    result?: Array<{
      price?: { regularMarketPrice?: YNum; marketCap?: YNum };
      defaultKeyStatistics?: { beta?: YNum; sharesOutstanding?: YNum };
      financialData?: {
        totalDebt?: YNum;
        totalCash?: YNum;
        totalRevenue?: YNum;
        ebitda?: YNum;
      };
      incomeStatementHistory?: { incomeStatementHistory?: YRow[] };
      cashflowStatementHistory?: { cashflowStatements?: YRow[] };
      balanceSheetHistory?: { balanceSheetStatements?: YRow[] };
    }> | null;
  };
}

async function fetchSelic(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json",
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ valor?: string }>;
    const v = Number.parseFloat((json?.[0]?.valor ?? "").replace(",", "."));
    return Number.isFinite(v) ? v / 100 : null;
  } catch {
    return null;
  }
}

interface BrapiRow {
  [key: string]: number | string | null | undefined;
}

interface BrapiQuote {
  regularMarketPrice?: number | null;
  marketCap?: number | null;
  incomeStatementHistory?: BrapiRow[] | { incomeStatementHistory?: BrapiRow[] };
  cashflowHistory?: BrapiRow[] | { cashflowStatements?: BrapiRow[] };
  defaultKeyStatistics?: BrapiRow;
  financialData?: BrapiRow;
}

function bn(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function firstRow(
  v: BrapiRow[] | { [k: string]: BrapiRow[] | undefined } | undefined,
  key: string,
): BrapiRow {
  if (Array.isArray(v)) return v[0] ?? {};
  return (v?.[key] as BrapiRow[] | undefined)?.[0] ?? {};
}

/** Fonte alternativa quando o Yahoo está indisponível/limitado. */
async function collectFromBrapi(
  ticker: string,
  selic: number,
): Promise<ValuationInputs | null> {
  try {
    const url = new URL(`https://brapi.dev/api/quote/${ticker}`);
    url.searchParams.set(
      "modules",
      "incomeStatementHistory,cashflowHistory,defaultKeyStatistics,financialData",
    );
    const token = process.env["BRAPI_TOKEN"];
    if (token) url.searchParams.set("token", token);

    const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: BrapiQuote[] };
    const q = json.results?.[0];
    if (!q) return null;

    const dre = firstRow(q.incomeStatementHistory as never, "incomeStatementHistory");
    const dfc = firstRow(q.cashflowHistory as never, "cashflowStatements");
    const ks = q.defaultKeyStatistics ?? {};
    const fin = q.financialData ?? {};

    const receita = bn(dre["totalRevenue"]) ?? bn(fin["totalRevenue"]);
    const ebit = bn(dre["ebit"]) ?? bn(dre["operatingIncome"]);
    const lucroLiquido = bn(dre["netIncome"]);
    const despesaFinanceira = (() => {
      const v = bn(dre["financialExpenses"]) ?? bn(dre["interestExpense"]);
      return v == null ? null : Math.abs(v);
    })();

    // A brapi não publica D&A e CAPEX separadamente: aproximamos pelo fluxo de caixa.
    const ocf = bn(dfc["operatingCashFlow"]);
    const invest = bn(dfc["investmentCashFlow"]);
    const depreciacao =
      ocf != null && lucroLiquido != null ? Math.max(ocf - lucroLiquido, 0) : null;
    const capex = invest == null ? null : Math.abs(invest);

    const dividaTotal = bn(fin["totalDebt"]);
    const caixa = bn(fin["totalCash"]);
    const dividaLiquida =
      dividaTotal != null || caixa != null ? (dividaTotal ?? 0) - (caixa ?? 0) : null;

    if (ebit == null && receita == null) return null;

    return {
      ticker,
      precoAtual: bn(q.regularMarketPrice),
      marketCap: bn(q.marketCap),
      acoes: bn(ks["sharesOutstanding"]),
      dividaTotal,
      caixa,
      dividaLiquida,
      beta: bn(ks["beta"]),
      receita,
      ebit,
      lucroLiquido,
      depreciacao,
      capex,
      despesaFinanceira,
      selic,
      fonte: "brapi (CVM/B3) + Banco Central",
      atualizadoEm: new Date().toISOString(),
      observacao:
        "Depreciação/amortização e CAPEX estimados a partir do fluxo de caixa operacional e de investimento.",
      error: null,
    };
  } catch {
    return null;
  }
}

export async function collectValuationInputs(ticker: string): Promise<ValuationInputs> {
  const symbol = ticker.endsWith(".SA") ? ticker : `${ticker}.SA`;
  const base: ValuationInputs = {
    ticker,
    precoAtual: null,
    marketCap: null,
    acoes: null,
    dividaTotal: null,
    caixa: null,
    dividaLiquida: null,
    beta: null,
    receita: null,
    ebit: null,
    lucroLiquido: null,
    depreciacao: null,
    capex: null,
    despesaFinanceira: null,
    selic: null,
    fonte: null,
    atualizadoEm: new Date().toISOString(),
    observacao: null,
    error: null,
  };

  const [auth, selicRaw] = await Promise.all([getYahooAuth(), fetchSelic()]);
  const selic = selicRaw ?? 0.15;
  base.selic = selic;

  const fallback = async (): Promise<ValuationInputs> => {
    const alt = await collectFromBrapi(ticker, selic);
    return alt ?? { ...base, error: "Fonte de dados indisponível no momento." };
  };

  if (!auth) return fallback();

  const modules = [
    "price",
    "defaultKeyStatistics",
    "financialData",
    "incomeStatementHistory",
    "cashflowStatementHistory",
    "balanceSheetHistory",
  ].join(",");

  const url =
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
    `?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        accept: "application/json,text/plain,*/*",
        cookie: auth.cookie,
      },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) {
      cachedAuth = null;
      return fallback();
    }
    if (!res.ok) return fallback();

    const json = (await res.json()) as YahooSummary;
    const r = json.quoteSummary?.result?.[0];
    if (!r) return fallback();

    const dre = r.incomeStatementHistory?.incomeStatementHistory?.[0] ?? {};
    const dfc = r.cashflowStatementHistory?.cashflowStatements?.[0] ?? {};

    const receita = n(dre["totalRevenue"] as YNum) ?? n(r.financialData?.totalRevenue);
    const ebit = n(dre["ebit"] as YNum) ?? n(dre["operatingIncome"] as YNum);
    const lucroLiquido = n(dre["netIncome"] as YNum);
    const despFin = n(dre["interestExpense"] as YNum);
    const despesaFinanceira = despFin == null ? null : Math.abs(despFin);
    const depreciacao = n(dfc["depreciation"] as YNum);
    const capexRaw = n(dfc["capitalExpenditures"] as YNum);
    const capex = capexRaw == null ? null : Math.abs(capexRaw);

    if (ebit == null || depreciacao == null || capex == null) {
      const alt = await collectFromBrapi(ticker, selic);
      if (alt) return alt;
    }

    const dividaTotal = n(r.financialData?.totalDebt);
    const caixa = n(r.financialData?.totalCash);
    const dividaLiquida =
      dividaTotal != null || caixa != null ? (dividaTotal ?? 0) - (caixa ?? 0) : null;

    return {
      ticker,
      precoAtual: n(r.price?.regularMarketPrice),
      marketCap: n(r.price?.marketCap),
      acoes: n(r.defaultKeyStatistics?.sharesOutstanding),
      dividaTotal,
      caixa,
      dividaLiquida,
      beta: n(r.defaultKeyStatistics?.beta),
      receita,
      ebit,
      lucroLiquido,
      depreciacao,
      capex,
      despesaFinanceira,
      selic,
      fonte: "Yahoo Finance + Banco Central",
      atualizadoEm: new Date().toISOString(),
      observacao: null,
      error: null,
    };
  } catch (err) {
    console.error("[collectValuationInputs] failed", err);
    return fallback();
  } finally {
    clearTimeout(timer);
  }
}

