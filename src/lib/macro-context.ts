export interface MacroContext {
  /** Selic meta (decimal) */
  selic: number | null;
  /** risco-país EMBI+ (decimal: 250 pb → 0.025) */
  riscoPais: number | null;
  /** IPCA esperado Focus próximo ano (decimal) */
  ipcaFocus: number | null;
  /** PIB esperado Focus próximo ano (decimal) */
  pibFocus: number | null;
  dolar: number | null;
  /** crescimento nominal de longo prazo = (1+IPCA)(1+PIB)-1 */
  gNominal: number | null;
  dataRef: string | null;
}

interface SeriesLike {
  code: string;
  lastValue: number | null;
  lastDate: string | null;
}

export function buildMacroContext(series: SeriesLike[] | null): MacroContext {
  const get = (c: string) => series?.find((s) => s.code === c) ?? null;
  const pct = (c: string) => {
    const v = get(c)?.lastValue;
    return v == null ? null : v / 100;
  };
  const embi = get("risco_pais")?.lastValue;
  const ipca = pct("focus_ipca");
  const pib = pct("focus_pib");
  const dates = (series ?? []).map((s) => s.lastDate).filter(Boolean) as string[];
  return {
    selic: pct("selic_meta"),
    riscoPais: embi == null ? null : embi / 10000,
    ipcaFocus: ipca,
    pibFocus: pib,
    dolar: get("dolar_venda")?.lastValue ?? null,
    gNominal: ipca != null && pib != null ? (1 + ipca) * (1 + pib) - 1 : null,
    dataRef: dates.sort().at(-1) ?? null,
  };
}
