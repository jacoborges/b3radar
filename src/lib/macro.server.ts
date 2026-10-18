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
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (res.ok) {
      const json = (await res.json()) as Array<{ data?: string; valor?: string }>;
      if (Array.isArray(json)) {
        for (const r of json) {
          const v = Number.parseFloat(String(r.valor ?? "").replace(",", "."));
          if (r.data && Number.isFinite(v)) out.push({ date: brDateToIso(r.data), value: v });
        }
      }
    } else if (res.status !== 404) {
      throw new Error(`SGS ${id} HTTP ${res.status}`);
    }
    start = addYears(end, 0) === end ? nextDay(end) : end;
  }
  return out;
}

function nextDay(iso: string): string {
  const dt = new Date(`${iso}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

export async function fetchIpea(id: string, fromIso: string): Promise<Observation[]> {
  const url = `http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='${id}')`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Ipeadata ${id} HTTP ${res.status}`);
  const json = (await res.json()) as { value?: Array<{ VALDATA?: string; VALVALOR?: number }> };
  return (json.value ?? [])
    .filter((r) => r.VALDATA && typeof r.VALVALOR === "number")
    .map((r) => ({ date: r.VALDATA!.slice(0, 10), value: r.VALVALOR! }))
    .filter((r) => r.date >= fromIso);
}

/** Mediana Focus para o próximo ano-calendário, uma observação por data de pesquisa. */
export async function fetchFocus(indicador: string, fromIso: string): Promise<Observation[]> {
  const ref = String(new Date().getFullYear() + 1);
  const filter = `Indicador eq '${indicador}' and DataReferencia eq '${ref}' and baseCalculo eq 0 and Data ge '${fromIso}'`;
  const url =
    "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais" +
    `?$filter=${encodeURIComponent(filter)}&$select=Data,Mediana&$orderby=Data%20asc&$format=json&$top=5000`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
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
  if (s.source === "sgs") return fetchSgs(s.source_id, from);
  if (s.source === "ipea") return fetchIpea(s.source_id, from);
  if (s.source === "focus") return fetchFocus(s.source_id, from);
  return [];
}

/** Atualiza todas as séries do catálogo no banco. Requer cliente com privilégio de escrita. */
export async function refreshAllMacro(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): Promise<{ updated: number; failed: string[] }> {
  const { data: series, error } = await admin
    .from("macro_series")
    .select("code, source, source_id, last_date");
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
        for (let i = 0; i < obs.length; i += 1000) {
          const rows = obs.slice(i, i + 1000).map((o) => ({ series_code: s.code, ...o }));
          const { error: e } = await admin.from("macro_observations").upsert(rows);
          if (e) throw new Error(e.message);
        }
        const last = obs.at(-1);
        await admin
          .from("macro_series")
          .update({
            updated_at: new Date().toISOString(),
            ...(last ? { last_value: last.value, last_date: last.date } : {}),
          })
          .eq("code", s.code);
        updated++;
      } catch (err) {
        console.error("[macro] falha", s.code, err);
        failed.push(s.code);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return { updated, failed };
}
