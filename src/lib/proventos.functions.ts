import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import type { DividendYear, ProventoProvisionado, ProventoTipo } from "./stocks-data";

const inputSchema = z.object({
  ticker: z.string().trim().min(4).max(7).toUpperCase(),
});

interface B3CashDividend {
  typeStock?: string;
  assetIssued?: string;
  paymentDate?: string;
  rate?: string | number;
  relatedTo?: string;
  approvedOn?: string;
  isinCode?: string;
  label?: string;
  lastDatePrior?: string; // Data Com (última data com direito)
  dateApproval?: string;
  remarks?: string;
  ratio?: string;
  corporateAction?: string;
  valueCash?: string | number;
}

interface B3Response {
  results?: B3CashDividend[];
  cashDividends?: B3CashDividend[];
  stockDividends?: B3CashDividend[];
}

const SELIC: Record<number, number> = {
  2022: 12.38,
  2023: 13.25,
  2024: 10.75,
  2025: 11.15,
  2026: 14.75,
};

function parseNumber(v: string | number | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const cleaned = v.replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseB3Date(d: string | undefined): string | null {
  if (!d) return null;
  // Formato B3: dd/mm/yyyy
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Já ISO?
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  return null;
}

function normalizeTipo(raw: string | undefined): ProventoTipo {
  const s = (raw ?? "").toUpperCase();
  if (s.includes("JCP") || s.includes("JUROS")) return "JCP";
  return "Dividendo";
}

/** Filtra pela classe do ticker: 3=ON, 4=PN, 11=UNT. Se não conseguir inferir, aceita todas. */
function classMatches(ticker: string, typeStock: string | undefined): boolean {
  if (!typeStock) return true;
  const t = typeStock.toUpperCase();
  const suffix = ticker.match(/(\d+)$/)?.[1];
  if (!suffix) return true;
  if (suffix === "3") return t.includes("ON");
  if (suffix === "4") return t.includes("PN");
  if (suffix === "11") return t.includes("UNT") || t.includes("UNIT");
  if (suffix === "5" || suffix === "6" || suffix === "7" || suffix === "8") {
    return t.includes("PN");
  }
  return true;
}

async function fetchB3(issuingCompany: string): Promise<B3CashDividend[]> {
  const payload = JSON.stringify({
    issuingCompany,
    language: "pt-br",
  });
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(payload, "utf-8").toString("base64")
      : btoa(unescape(encodeURIComponent(payload)));

  const url = `https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetListedCashDividends/${b64}`;
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent":
        "Mozilla/5.0 (compatible; B3Radar/1.0; +https://b3radar.lovable.app)",
    },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as B3Response;
  return json.cashDividends ?? json.results ?? [];
}

export interface TickerProventosResult {
  historico: DividendYear[] | null;
  provisionados: ProventoProvisionado[] | null;
  fonte: "B3" | null;
  error: string | null;
}

export const getTickerProventos = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<TickerProventosResult> => {
    const ticker = data.ticker;
    const issuingCompany = ticker.replace(/\d+$/, "").slice(0, 4);
    if (!issuingCompany || issuingCompany.length < 4) {
      return { historico: null, provisionados: null, fonte: null, error: "Ticker inválido" };
    }

    try {
      setResponseHeader("cache-control", "public, s-maxage=3600, stale-while-revalidate=86400");
      const raw = await fetchB3(issuingCompany);
      if (raw.length === 0) {
        return { historico: null, provisionados: null, fonte: null, error: "Sem retorno da B3" };
      }

      const today = new Date().toISOString().slice(0, 10);
      const eventos = raw
        .filter((r) => classMatches(ticker, r.typeStock))
        .map((r) => {
          const valor = parseNumber(r.rate ?? r.valueCash);
          const dataCom = parseB3Date(r.lastDatePrior);
          const dataPag = parseB3Date(r.paymentDate);
          const dataAprov = parseB3Date(r.dateApproval ?? r.approvedOn);
          const tipo = normalizeTipo(r.label ?? r.corporateAction);
          return { valor, dataCom, dataPag, dataAprov, tipo };
        })
        .filter((e) => e.valor > 0);

      // Provisionados: pagamento futuro OU sem data de pagamento mas data com futura
      const provisionados: ProventoProvisionado[] = [];
      for (const e of eventos) {
        const isFuture =
          (e.dataPag && e.dataPag > today) ||
          (!e.dataPag && e.dataCom && e.dataCom > today);
        if (!isFuture) continue;
        const dataCom = e.dataCom ?? e.dataAprov ?? today;
        // Data Ex = pregão seguinte à data com (aproximação: dataCom + 1 dia)
        const comDate = new Date(dataCom + "T00:00:00Z");
        comDate.setUTCDate(comDate.getUTCDate() + 1);
        const dataEx = comDate.toISOString().slice(0, 10);
        const dataPagamento = e.dataPag ?? dataEx;
        provisionados.push({
          tipo: e.tipo,
          valorPorAcao: Number(e.valor.toFixed(4)),
          dataCom,
          dataEx,
          dataPagamento,
        });
      }
      provisionados.sort((a, b) => a.dataCom.localeCompare(b.dataCom));

      // Histórico dos últimos 5 anos (2022..2026), somando dividendo e JCP separadamente
      const anos = [2022, 2023, 2024, 2025, 2026];
      const historico: DividendYear[] = anos.map((y) => {
        const eventosDoAno = eventos.filter((e) => {
          const ref = e.dataPag ?? e.dataCom ?? e.dataAprov;
          return ref?.startsWith(String(y));
        });
        let dividendo = 0;
        let jcp = 0;
        for (const e of eventosDoAno) {
          if (e.tipo === "JCP") jcp += e.valor;
          else dividendo += e.valor;
        }
        return {
          year: y,
          dividendo: Number(dividendo.toFixed(4)),
          jcp: Number(jcp.toFixed(4)),
          selicMediaPonderada: SELIC[y] ?? 12,
          precoMedio: 0, // preenchido no cliente com base no preço do ativo
        };
      });

      return { historico, provisionados, fonte: "B3", error: null };
    } catch (err) {
      console.error("[getTickerProventos] failed", err);
      return { historico: null, provisionados: null, fonte: null, error: "Falha ao consultar B3" };
    }
  });
