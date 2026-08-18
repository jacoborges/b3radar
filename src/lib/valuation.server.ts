/**
 * Coleta dos insumos do Valuation (FCD): demonstrativos + mercado (Yahoo e CVM/B3)
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
        operatingMargins?: YNum;
        operatingCashflow?: YNum;
        freeCashflow?: YNum;
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

/* ------------------------------------------------------------------ */
/* Derivação das linhas contábeis                                      */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object") {
    const raw = (v as { raw?: unknown }).raw;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  }
  return null;
}

/** Como as fontes usam 0 como "sem informação" nessas linhas, 0 vira nulo. */
function nz(v: unknown): number | null {
  const x = num(v);
  return x === 0 ? null : x;
}

/** Primeira linha (exercício mais recente) que satisfaz o predicado. */
function pickRow(rows: Row[] | undefined, has: (r: Row) => boolean): Row {
  if (!rows || rows.length === 0) return {};
  return rows.find(has) ?? rows[0] ?? {};
}

export interface LinhasContabeis {
  receita: number | null;
  ebit: number | null;
  lucroLiquido: number | null;
  depreciacao: number | null;
  capex: number | null;
  despesaFinanceira: number | null;
  derivacoes: string[];
}

/**
 * Deriva EBIT, D&A e CAPEX a partir do que a fonte publicar, em cascata.
 * Nunca inventa número: cada aproximação é registrada em `derivacoes`.
 */
export function derivarLinhas(dre: Row, dfc: Row, fin: Row): LinhasContabeis {
  const derivacoes: string[] = [];

  const receita = nz(dre["totalRevenue"]) ?? nz(fin["totalRevenue"]);
  const lucroLiquido = nz(dre["netIncome"]) ?? nz(fin["netIncomeToCommon"]);
  const ebitda = nz(fin["ebitda"]) ?? nz(dre["ebitda"]);
  const ocf = nz(dfc["operatingCashFlow"]) ?? nz(fin["operatingCashflow"]);
  const fcf = nz(dfc["freeCashFlow"]) ?? nz(fin["freeCashflow"]);
  const invest = nz(dfc["investmentCashFlow"]);

  // --- EBIT ---
  let ebit = nz(dre["ebit"]) ?? nz(dre["operatingIncome"]);
  const daDireta = (() => {
    const v =
      nz(dfc["depreciation"]) ??
      nz(dfc["depreciationAndAmortization"]) ??
      nz(dre["depreciationAndAmortization"]);
    return v == null ? null : Math.abs(v);
  })();

  if (ebit == null && ebitda != null && daDireta != null) {
    ebit = ebitda - daDireta;
    derivacoes.push("EBIT estimado por EBITDA − D&A");
  }
  if (ebit == null) {
    const margem = nz(fin["operatingMargins"]);
    if (margem != null && receita != null) {
      ebit = margem * receita;
      derivacoes.push("EBIT estimado por margem operacional × receita");
    }
  }

  // --- Depreciação / amortização ---
  let depreciacao = daDireta;
  if (depreciacao == null && ebitda != null && ebit != null && ebitda - ebit > 0) {
    depreciacao = ebitda - ebit;
    derivacoes.push("D&A estimada por EBITDA − EBIT");
  }
  if (depreciacao == null && ocf != null && lucroLiquido != null && ocf - lucroLiquido > 0) {
    depreciacao = ocf - lucroLiquido;
    derivacoes.push("D&A estimada por caixa operacional − lucro líquido");
  }

  // --- CAPEX ---
  let capex = (() => {
    const v = nz(dfc["capitalExpenditures"]) ?? nz(dfc["capex"]);
    return v == null ? null : Math.abs(v);
  })();
  if (capex == null && ocf != null && fcf != null && ocf - fcf > 0) {
    capex = ocf - fcf;
    derivacoes.push("CAPEX estimado por caixa operacional − fluxo de caixa livre");
  }
  if (capex == null && invest != null && invest < 0) {
    capex = Math.abs(invest);
    derivacoes.push("CAPEX aproximado pelo caixa de investimento");
  }

  const despesaFinanceira = (() => {
    const v =
      num(dre["interestExpense"]) ??
      num(dre["financialExpenses"]) ??
      num(fin["interestExpense"]);
    return v == null ? null : Math.abs(v);
  })();

  return { receita, ebit, lucroLiquido, depreciacao, capex, despesaFinanceira, derivacoes };
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

function rowsOf(
  v: BrapiRow[] | { [k: string]: BrapiRow[] | undefined } | undefined,
  key: string,
): Row[] {
  if (Array.isArray(v)) return v as Row[];
  return ((v?.[key] as BrapiRow[] | undefined) ?? []) as Row[];
}

type BrapiCode =
  | "sem-token"
  | "token-invalido"
  | "plano-sem-modulos"
  | "limite-fonte"
  | "sem-demonstracoes"
  | "indisponivel";

type BrapiOutcome =
  | { ok: true; inputs: ValuationInputs }
  | { ok: false; code: BrapiCode; message?: string };

/** Fonte alternativa (dados CVM/B3) quando o Yahoo está indisponível/limitado. */
async function collectFromBrapi(
  ticker: string,
  selic: number,
  token?: string,
): Promise<BrapiOutcome> {
  try {
    const url = new URL(`https://brapi.dev/api/quote/${ticker}`);
    url.searchParams.set(
      "modules",
      "incomeStatementHistory,cashflowHistory,balanceSheetHistory,defaultKeyStatistics,financialData",
    );
    if (token) url.searchParams.set("token", token);

    const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!res.ok) {
      let message: string | undefined;
      try {
        const body = (await res.json()) as { message?: string; error?: string };
        message = body?.message ?? body?.error;
      } catch {
        /* corpo não-JSON */
      }
      const texto = (message ?? "").toLowerCase();
      if (res.status === 429) return { ok: false, code: "limite-fonte", message };
      if (res.status === 401 || res.status === 403 || res.status === 402) {
        if (!token) return { ok: false, code: "sem-token", message };
        if (/plano|plan|módulo|modulo|module|assinatura|pro\b/.test(texto))
          return { ok: false, code: "plano-sem-modulos", message };
        if (/token/.test(texto)) return { ok: false, code: "token-invalido", message };
        return { ok: false, code: "plano-sem-modulos", message };
      }
      if (/plano|plan|módulo|modulo|module/.test(texto))
        return { ok: false, code: "plano-sem-modulos", message };
      return { ok: false, code: "indisponivel", message };
    }


    const json = (await res.json()) as { results?: BrapiQuote[] };
    const q = json.results?.[0];
    if (!q) return { ok: false, code: "sem-demonstracoes" };

    const dreRows = rowsOf(q.incomeStatementHistory as never, "incomeStatementHistory");
    const dfcRows = rowsOf(q.cashflowHistory as never, "cashflowStatements");
    const dre = pickRow(
      dreRows,
      (r) => nz(r["ebit"]) != null || nz(r["operatingIncome"]) != null,
    );
    const dfc = pickRow(
      dfcRows,
      (r) => nz(r["operatingCashFlow"]) != null || nz(r["investmentCashFlow"]) != null,
    );
    const ks = (q.defaultKeyStatistics ?? {}) as Row;
    const fin = (q.financialData ?? {}) as Row;

    const linhas = derivarLinhas(dre, dfc, fin);

    const dividaTotal = bn(fin["totalDebt"]);
    const caixa = bn(fin["totalCash"]);
    const dividaLiquida =
      dividaTotal != null || caixa != null ? (dividaTotal ?? 0) - (caixa ?? 0) : null;

    if (linhas.ebit == null && linhas.receita == null)
      return { ok: false, code: "sem-demonstracoes" };

    return {
      ok: true,
      inputs: {
        ticker,
        precoAtual: bn(q.regularMarketPrice),
        marketCap: bn(q.marketCap),
        acoes: bn(ks["sharesOutstanding"]),
        dividaTotal,
        caixa,
        dividaLiquida,
        beta: bn(ks["beta"]),
        receita: linhas.receita,
        ebit: linhas.ebit,
        lucroLiquido: linhas.lucroLiquido,
        depreciacao: linhas.depreciacao,
        capex: linhas.capex,
        despesaFinanceira: linhas.despesaFinanceira,
        selic,
        fonte: "CVM/B3 (brapi) + Banco Central",
        atualizadoEm: new Date().toISOString(),
        observacao: null,
        derivacoes: linhas.derivacoes,
        errorCode: null,
        setorFinanceiro: isSetorFinanceiro(
          linhas.ebit,
          linhas.capex,
          linhas.receita,
          linhas.lucroLiquido,
        ),
        error: null,
      },
    };
  } catch {
    return { ok: false, code: "indisponivel" };
  }
}

/**
 * Heurística: em bancos/seguradoras o EBIT e o CAPEX não representam a operação
 * (EBIT negativo ou irrisório frente ao lucro líquido, CAPEX ausente).
 */
function isSetorFinanceiro(
  ebit: number | null,
  capex: number | null,
  receita: number | null,
  lucroLiquido: number | null,
): boolean {
  if (lucroLiquido != null && lucroLiquido > 0) {
    if (ebit == null || ebit <= 0) return true;
    if (ebit < lucroLiquido * 0.6) return true;
  }
  // EBIT negativo (ou ausente) com receita relevante: típico de banco/seguradora
  if (receita != null && receita > 0 && (ebit == null || ebit <= 0)) return true;
  if (receita != null && receita > 0 && ebit != null && ebit > receita) return true;
  if (capex == null) return true;
  return false;
}

const ERROR_TEXT: Record<string, string> = {
  "sem-token":
    "A fonte de demonstrações financeiras exige um token. Cadastre seu token brapi em Ajustes para liberar o Valuation.",
  "limite-fonte":
    "Fonte temporariamente limitada (muitas consultas). Tente novamente em alguns minutos.",
  "sem-demonstracoes": "Este ativo não possui demonstrações financeiras publicadas nesta fonte.",
  indisponivel: "Fonte de dados indisponível no momento.",
};

const CAMPOS_CHAVE = ["ebit", "depreciacao", "capex"] as const;

function completo(v: ValuationInputs): boolean {
  return CAMPOS_CHAVE.every((k) => v[k] != null);
}

/** Preenche no primeiro o que estiver faltando, usando o segundo. */
function mesclar(base: ValuationInputs, extra: ValuationInputs): ValuationInputs {
  const out: ValuationInputs = { ...base };
  const campos: Array<keyof ValuationInputs> = [
    "precoAtual",
    "marketCap",
    "acoes",
    "dividaTotal",
    "caixa",
    "dividaLiquida",
    "beta",
    "receita",
    "ebit",
    "lucroLiquido",
    "depreciacao",
    "capex",
    "despesaFinanceira",
  ];
  const usados: string[] = [];
  for (const c of campos) {
    if (out[c] == null && extra[c] != null) {
      (out as unknown as Record<string, unknown>)[c] = extra[c];
      usados.push(c);
    }
  }
  if (usados.length > 0) {
    const extraFonte = (extra.fonte ?? "Yahoo Finance").replace(" + Banco Central", "");
    out.fonte = `${base.fonte ?? "CVM/B3 (brapi) + Banco Central"} + ${extraFonte}`;
    out.derivacoes = [
      ...(base.derivacoes ?? []),
      ...(extra.derivacoes ?? []),
      `Complementado pela fonte alternativa: ${usados.join(", ")}`,
    ];
  }
  out.setorFinanceiro = isSetorFinanceiro(out.ebit, out.capex, out.receita, out.lucroLiquido);
  return out;
}

function faltantes(v: ValuationInputs): string[] {
  const nomes: Record<string, string> = {
    ebit: "EBIT",
    depreciacao: "depreciação/amortização",
    capex: "CAPEX",
  };
  return CAMPOS_CHAVE.filter((k) => v[k] == null).map((k) => nomes[k]!);
}

export async function collectValuationInputs(
  ticker: string,
  userToken?: string,
): Promise<ValuationInputs> {
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
    derivacoes: [],
    errorCode: null,
    setorFinanceiro: false,
    error: null,
  };

  const [auth, selicRaw] = await Promise.all([getYahooAuth(), fetchSelic()]);
  const selic = selicRaw ?? 0.15;
  base.selic = selic;

  const envToken = process.env["BRAPI_TOKEN"];
  const tokens = [userToken, envToken, undefined].filter(
    (t, i, arr) => arr.indexOf(t) === i,
  ) as Array<string | undefined>;

  /** Tenta a fonte alternativa com token do usuário, do projeto e anônimo. */
  const brapi = async (): Promise<ValuationInputs | { erro: string }> => {
    let last: BrapiOutcome = { ok: false, code: "indisponivel" };
    for (const t of tokens) {
      const out = await collectFromBrapi(ticker, selic, t);
      if (out.ok) return out.inputs;
      last = out;
      if (out.code === "sem-demonstracoes") break;
    }
    const code = last.ok ? "indisponivel" : last.code;
    return { erro: code };
  };

  /** Finaliza: aplica mensagem de linha faltante quando ainda estiver incompleto. */
  const finalizar = (v: ValuationInputs): ValuationInputs => {
    if (completo(v)) return v;
    const falta = faltantes(v);
    return {
      ...v,
      observacao:
        v.observacao ??
        `Fonte não publica ${falta.join(", ")} para este ativo — o FCD fica incompleto.`,
    };
  };


  /** Coleta no Yahoo (usado como complemento das demonstrações da CVM/B3). */
  const yahooCollect = async (): Promise<ValuationInputs | null> => {
  if (!auth) return null;

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
      return null;
    }
    if (!res.ok) return null;

    const json = (await res.json()) as YahooSummary;
    const r = json.quoteSummary?.result?.[0];
    if (!r) return null;

    const dreRows = (r.incomeStatementHistory?.incomeStatementHistory ?? []) as Row[];
    const dfcRows = (r.cashflowStatementHistory?.cashflowStatements ?? []) as Row[];
    const dre = pickRow(
      dreRows,
      (row) => nz(row["ebit"]) != null || nz(row["operatingIncome"]) != null,
    );
    const dfc = pickRow(
      dfcRows,
      (row) =>
        nz(row["capitalExpenditures"]) != null || nz(row["operatingCashFlow"]) != null,
    );
    const fin = (r.financialData ?? {}) as Row;

    const linhas = derivarLinhas(dre, dfc, fin);

    const dividaTotal = n(r.financialData?.totalDebt);
    const caixa = n(r.financialData?.totalCash);
    const dividaLiquida =
      dividaTotal != null || caixa != null ? (dividaTotal ?? 0) - (caixa ?? 0) : null;

    const yahoo: ValuationInputs = {
      ticker,
      precoAtual: n(r.price?.regularMarketPrice),
      marketCap: n(r.price?.marketCap),
      acoes: n(r.defaultKeyStatistics?.sharesOutstanding),
      dividaTotal,
      caixa,
      dividaLiquida,
      beta: n(r.defaultKeyStatistics?.beta),
      receita: linhas.receita,
      ebit: linhas.ebit,
      lucroLiquido: linhas.lucroLiquido,
      depreciacao: linhas.depreciacao,
      capex: linhas.capex,
      despesaFinanceira: linhas.despesaFinanceira,
      selic,
      fonte: "Yahoo Finance + Banco Central",
      atualizadoEm: new Date().toISOString(),
      observacao: null,
      derivacoes: linhas.derivacoes,
      errorCode: null,
      setorFinanceiro: isSetorFinanceiro(
        linhas.ebit,
        linhas.capex,
        linhas.receita,
        linhas.lucroLiquido,
      ),
      error: null,
    };

    return yahoo;
  } catch (err) {
    console.error("[collectValuationInputs] yahoo failed", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
  };

  // A fonte CVM/B3 publica em reais e segue as demonstrações oficiais: vem primeiro.
  const principal = await brapi();

  if (!("erro" in principal)) {
    if (completo(principal)) return principal;
    const y = await yahooCollect();
    if (y) {
      const merged = mesclar(principal, y);
      if (completo(merged)) return merged;
      return finalizar(merged);
    }
    return finalizar(principal);
  }

  // Fonte principal indisponível: tenta o Yahoo antes de reportar erro.
  const y = await yahooCollect();
  if (y) return finalizar(y);

  const code = principal.erro as keyof typeof ERROR_TEXT;
  return {
    ...base,
    errorCode: code as ValuationInputs["errorCode"],
    error: ERROR_TEXT[code] ?? ERROR_TEXT["indisponivel"]!,
  };
}
