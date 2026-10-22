// Coleta de dados macroeconômicos em fontes públicas oficiais:
// SGS do Banco Central, Focus (Olinda/BCB) e Ipeadata (risco-país EMBI+).
// Equivalente às bibliotecas python-bcb / pyBACEN, executado direto no servidor.

export interface MacroSeriesRow {
  code: string;
  source: string;
  source_id: string;
  last_date: string | null;
}

export interface Observation {
  date: string; // YYYY-MM-DD
  value: number;
}

/** Fontes podem repetir meses entre janelas ou devolver pontos fora do período. */
export function normalizeObservations(rows: Observation[], from: string, to: string): Observation[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(row.date) && row.date >= from && row.date <= to && Number.isFinite(row.value)) {
      byDate.set(row.date, row.value);
    }
  }
  return [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}

function brDateToIso(d: string): string {
  const [dd, mm, yyyy] = d.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

function isoToBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function addYears(iso: string, years: number): string {
  const dt = new Date(`${iso}T00:00:00Z`);
  dt.setUTCFullYear(dt.getUTCFullYear() + years);
  return dt.toISOString().slice(0, 10);
}

/** SGS limita séries diárias a janelas de 10 anos por consulta. */
export async function fetchSgs(id: string, fromIso: string): Promise<Observation[]> {
  const today = new Date().toISOString().slice(0, 10);
  const out: Observation[] = [];
  let start = fromIso;
  while (start <= today) {
    const endCandidate = addYears(start, 9);
    const end = endCandidate > today ? today : endCandidate;
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${id}/dados?formato=json&dataInicial=${isoToBr(start)}&dataFinal=${isoToBr(end)}`;
    const res = await bcbFetch(url);
    if (res.ok) {
      const text = await res.text();
      if (text.trimStart().startsWith("<")) throw new Error(`SGS ${id}: requisição recusada pelo Banco Central`);
      const json = JSON.parse(text) as Array<{ data?: string; valor?: string }>;
      if (Array.isArray(json)) {
        for (const r of json) {
          const v = Number.parseFloat(String(r.valor ?? "").replace(",", "."));
          if (r.data && Number.isFinite(v)) out.push({ date: brDateToIso(r.data), value: v });
        }
      }
    } else if (res.status !== 404) {
      throw new Error(`SGS ${id} HTTP ${res.status}`);
    }
    start = nextDay(end);
  }
  return normalizeObservations(out, fromIso, today);
}

const HEADERS = {
  accept: "application/json",
  "user-agent": "Mozilla/5.0 (compatible; BovespaRadar/1.0)",
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** O BCB bloqueia rajadas de requisições: espaçamos e tentamos de novo. */
async function bcbFetch(url: string): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    await sleep(attempt === 0 ? 250 : 1500 * attempt);
    try {
      const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
      if (response.status < 500 || attempt === 1) return response;
      await response.body?.cancel();
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
  throw new Error("Banco Central indisponível no momento");
}

function nextDay(iso: string): string {
  const dt = new Date(`${iso}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

export async function fetchIpea(id: string, fromIso: string): Promise<Observation[]> {
  const url = `http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='${id}')`;
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Ipeadata ${id} HTTP ${res.status}`);
  const json = (await res.json()) as { value?: Array<{ VALDATA?: string; VALVALOR?: number }> };
  return (json.value ?? [])
    .flatMap((r) => r.VALDATA && typeof r.VALVALOR === "number" ? [{ date: r.VALDATA.slice(0, 10), value: r.VALVALOR }] : [])
    .filter((r) => r.date >= fromIso);
}

/** Mediana Focus para o próximo ano-calendário, uma observação por data de pesquisa. */
export async function fetchFocus(indicador: string, fromIso: string): Promise<Observation[]> {
  const ref = String(new Date().getFullYear() + 1);
  const filter = `Indicador eq '${indicador}' and DataReferencia eq '${ref}' and baseCalculo eq 0 and Data ge '${fromIso}'`;
  const url =
    "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais" +
    `?$filter=${encodeURIComponent(filter)}&$select=Data,Mediana&$orderby=Data%20asc&$format=json&$top=5000`;
  const res = await bcbFetch(url);
  if (!res.ok) throw new Error(`Focus ${indicador} HTTP ${res.status}`);
  const json = (await res.json()) as { value?: Array<{ Data?: string; Mediana?: number }> };
  const byDate = new Map<string, number>();
  for (const r of json.value ?? []) {
    if (r.Data && typeof r.Mediana === "number") byDate.set(r.Data.slice(0, 10), r.Mediana);
  }
  return [...byDate.entries()].map(([date, value]) => ({ date, value }));
}

export function startDateFor(s: MacroSeriesRow): string {
  if (s.last_date) return s.last_date; // incremental: reprocessa o último ponto
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - (s.source === "focus" ? 2 : 10));
  return d.toISOString().slice(0, 10);
}

export async function fetchSeries(s: MacroSeriesRow): Promise<Observation[]> {
  const from = startDateFor(s);
  let observations: Observation[];
  if (s.source === "sgs") observations = await fetchSgs(s.source_id, from);
  else if (s.source === "ipea") observations = await fetchIpea(s.source_id, from);
  else if (s.source === "focus") observations = await fetchFocus(s.source_id, from);
  else throw new Error(`Fonte não suportada: ${s.source}`);
  return normalizeObservations(observations, from, new Date().toISOString().slice(0, 10));
}

/** Atualiza todas as séries do catálogo no banco. Requer cliente com privilégio de escrita. */
export async function refreshAllMacro(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  codes?: string[],
): Promise<{ updated: number; failed: string[] }> {
  let query = admin
    .from("macro_series")
    .select("code, source, source_id, last_date");
  if (codes) query = query.in("code", codes);
  const { data: series, error } = await query;
  if (error) throw new Error(error.message);
  const failed: string[] = [];
  let updated = 0;
  const list = (series ?? []) as MacroSeriesRow[];
  let cursor = 0;
  const worker = async () => {
    for (;;) {
      const s = list[cursor++];
      if (!s) return;
      try {
        const obs = await fetchSeries(s);
        if (obs.length === 0) throw new Error("A fonte não retornou observações válidas para o período");
        for (let i = 0; i < obs.length; i += 1000) {
          const rows = obs.slice(i, i + 1000).map((o) => ({ series_code: s.code, ...o }));
          const { error: e } = await admin.from("macro_observations").upsert(rows, { onConflict: "series_code,date" });
          if (e) throw new Error(e.message);
        }
        const last = obs.at(-1);
        const { error: updateError } = await admin
          .from("macro_series")
          .update({
            updated_at: new Date().toISOString(),
            ...(last ? { last_value: last.value, last_date: last.date } : {}),
          })
          .eq("code", s.code);
        if (updateError) throw new Error(updateError.message);
        updated++;
      } catch (err) {
        console.error("[macro] falha", s.code, err);
        failed.push(s.code);
      }
    }
  };
  await Promise.all(Array.from({ length: 2 }, worker));
  return { updated, failed };
}
