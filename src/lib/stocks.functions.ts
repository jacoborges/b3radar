import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import snapshot from "./stocks-fundamentus.json";

/**
 * Linha "crua" no mesmo formato consumido por src/lib/stocks-data.ts (buildStock).
 * Mantido idêntico ao snapshot embarcado para não quebrar consumidores.
 */
export interface RawStockRow {
  t: string; n: string; s: string; tp: string;
  p: number; pl: number; pvp: number; dy: number;
  roe: number; roic: number; ml: number; me: number;
  dp: number; lc: number; cr: number; vm: number; lq: number;
}

export interface StocksPayload {
  rows: RawStockRow[];
  fonte: "fundamentus" | "snapshot";
  updatedAt: string;
  error: string | null;
}

const SNAPSHOT = snapshot as RawStockRow[];

/** Converte "3,25" / "10,16%" / "1.083.050.000,00" / "-0,40%" para número. */
function parseBr(s: string): number {
  const t = s.replace(/&nbsp;/g, "").replace(/%/g, "").replace(/\./g, "").replace(",", ".").trim();
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function inferTipo(ticker: string): string {
  const m = ticker.match(/(\d+)$/);
  const suf = m?.[1];
  if (suf === "3") return "ON";
  if (suf === "4" || suf === "5" || suf === "6" || suf === "7" || suf === "8") return "PN";
  if (suf === "11") return "UNIT";
  return "ON";
}

/**
 * Faz o parse do HTML de fundamentus.com.br/resultado.php e devolve linhas no
 * mesmo formato do snapshot. Mescla com o snapshot para preservar `n` (nome)
 * e `s` (setor) — que essa página não traz.
 */
function parseFundamentus(html: string): RawStockRow[] {
  const tableMatch = html.match(/<table[^>]*id="resultado"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) throw new Error("tabela #resultado não encontrada");
  const body = tableMatch[1];
  const rows = body.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  if (rows.length < 2) throw new Error("nenhuma linha de dados");

  const byTicker = new Map<string, RawStockRow>();
  for (const r of SNAPSHOT) byTicker.set(r.t, r);

  const out: RawStockRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cells || cells.length < 22) continue;
    const text = cells.map((c) => c.replace(/<[^>]+>/g, "").trim());
    const ticker = text[0].toUpperCase();
    if (!/^[A-Z]{4}\d{1,2}$/.test(ticker)) continue;

    const base = byTicker.get(ticker);
    const nome = base?.n ?? ticker;
    const setor = base?.s ?? "Outros";
    const tipo = base?.tp ?? inferTipo(ticker);

    const p = parseBr(text[1]);
    const pl = parseBr(text[2]);
    const pvp = parseBr(text[3]);
    const dy = parseBr(text[5]);
    const me = parseBr(text[13]);
    const ml = parseBr(text[14]);
    const lc = parseBr(text[15]);
    const roic = parseBr(text[16]);
    const roe = parseBr(text[17]);
    const lq = parseBr(text[18]);
    const patrimLiq = parseBr(text[19]);
    const dp = parseBr(text[20]);
    const cr = parseBr(text[21]);

    out.push({
      t: ticker,
      n: nome,
      s: setor,
      tp: tipo,
      p,
      pl,
      pvp,
      dy,
      roe,
      roic,
      ml,
      me,
      dp,
      lc,
      cr,
      // Convenção herdada do snapshot: vm em bilhões (a partir de Patrim.Líq).
      vm: Number((patrimLiq / 1_000_000_000).toFixed(2)),
      lq,
    });
  }

  if (out.length < 200) throw new Error(`parse suspeito: apenas ${out.length} linhas`);
  return out;
}

async function fetchFundamentusHtml(): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch("https://www.fundamentus.com.br/resultado.php", {
      headers: {
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "pt-BR,pt;q=0.9",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Fundamentus responde em ISO-8859-1 (latin-1).
    const buf = await res.arrayBuffer();
    return new TextDecoder("iso-8859-1").decode(buf);
  } finally {
    clearTimeout(timer);
  }
}

export const getAllStocks = createServerFn({ method: "GET" }).handler(
  async (): Promise<StocksPayload> => {
    // Cache HTTP: 1h fresco, 24h stale-while-revalidate.
    setResponseHeader(
      "cache-control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );

    try {
      const html = await fetchFundamentusHtml();
      const rows = parseFundamentus(html);
      return {
        rows,
        fonte: "fundamentus",
        updatedAt: new Date().toISOString(),
        error: null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[getAllStocks] fallback para snapshot:", msg);
      return {
        rows: SNAPSHOT,
        fonte: "snapshot",
        updatedAt: new Date().toISOString(),
        error: msg,
      };
    }
  },
);
