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
    error: null,
  };

  const [auth, selic] = await Promise.all([getYahooAuth(), fetchSelic()]);
  base.selic = selic ?? 0.15;
  if (!auth) return { ...base, error: "Fonte de dados indisponível no momento." };

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
      return { ...base, error: "Sessão da fonte expirou — tente novamente." };
    }
    if (!res.ok) return { ...base, error: `Fonte retornou HTTP ${res.status}` };

    const json = (await res.json()) as YahooSummary;
    const r = json.quoteSummary?.result?.[0];
    if (!r) return { ...base, error: "Ativo não encontrado na fonte de dados." };

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
      selic: selic ?? 0.15,
      fonte: "Yahoo Finance + Banco Central",
      atualizadoEm: new Date().toISOString(),
      error: null,
    };
  } catch (err) {
    console.error("[collectValuationInputs] failed", err);
    return { ...base, error: "Falha ao coletar os dados do ativo." };
  } finally {
    clearTimeout(timer);
  }
}
