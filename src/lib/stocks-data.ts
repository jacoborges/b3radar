import raw from "./stocks-fundamentus.json";

export type ShareType = "ON" | "PN" | "UNIT" | "DIR";

export interface DividendYear {
  year: number;
  dividendo: number;
  jcp: number;
  selicMediaPonderada: number;
  precoMedio: number;
}

export type ProventoTipo = "Dividendo" | "JCP";

export interface ProventoProvisionado {
  tipo: ProventoTipo;
  valorPorAcao: number;
  /** ISO yyyy-mm-dd — última data para ter direito ao provento */
  dataCom: string;
  /** ISO yyyy-mm-dd — primeiro pregão sem o direito */
  dataEx: string;
  /** ISO yyyy-mm-dd — data prevista de pagamento */
  dataPagamento: string;
}

export interface PrecoAnual {
  year: number;
  precoInicio: number;
  precoFim: number;
  valorizacao: number;
  selicMediaPonderada: number;
  bateuSelic: boolean;
}

export interface Stock {
  ticker: string;
  nome: string;
  setor: string;
  tipo: ShareType;
  preco: number;
  variacaoDia: number;
  precoD1: number;
  varD1: number;
  precoD7: number;
  varD7: number;
  precoD30: number;
  varD30: number;
  pl: number;
  pvp: number;
  dy: number;
  roe: number;
  roic: number;
  margemLiquida: number;
  margemEbit: number;
  divBrutaPatrimonio: number;
  liquidezCorrente: number;
  cagrLucros5a: number;
  valorMercado: number;
  liquidezDiaria: number;
  /** Free float estimado (% de ações em circulação no mercado) */
  freeFloat: number;
  dividendos: DividendYear[];
  /** Nº de anos (últimos 5) em que houve pagamento de proventos > 0 */
  anosComProventos: number;
  /** Pagou proventos todos os anos dos últimos 5 */
  dividendosRecorrentes: boolean;
  /** Nº de anos em que o yield superou a Selic média ponderada */
  anosYieldAcimaSelic: number;
  /** Proventos anunciados/provisionados a pagar */
  proventosProvisionados: ProventoProvisionado[];
  /** Preço inicial e final de cada um dos últimos 5 anos vs Selic */
  precosAnuais: PrecoAnual[];
  /** Nº de anos (últimos 5) em que a valorização anual superou a Selic ponderada */
  anosPrecoAcimaSelic: number;
}


export interface RawRow {
  t: string; n: string; s: string; tp: string;
  p: number; pl: number; pvp: number; dy: number;
  roe: number; roic: number; ml: number; me: number;
  dp: number; lc: number; cr: number; vm: number; lq: number;
}


export const SELIC: Record<number, number> = {
  2016: 14.08, 2017: 9.93, 2018: 6.44, 2019: 5.96, 2020: 2.77,
  2021: 4.42, 2022: 12.38, 2023: 13.25, 2024: 10.75, 2025: 11.15, 2026: 14.75,
};
const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];


// Deterministic pseudo-random from ticker string
function seed(str: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Deterministic "variação do dia" and dividend series based on real DY
/** Renomeia setores para rótulos mais claros na interface */
const SECTOR_LABELS: Record<string, string> = {
  "Intermediários Financeiros": "Bancos e Intermediários Financeiros",
};

export function sectorLabel(setor: string): string {
  return SECTOR_LABELS[setor] ?? setor;
}

export function buildStock(r: RawRow): Stock {
  const rand = seed(r.t);
  const variacaoDia = Number(((rand() - 0.5) * 6).toFixed(2)); // -3% .. +3%
  const jcpBias = rand() * 0.5; // 0..0.5 fraction as JCP

  // Preços históricos determinísticos derivados do preço atual
  const mkPrev = (amp: number) => {
    const delta = (rand() - 0.5) * 2 * amp; // ±amp
    const prev = r.p / (1 + delta);
    return { preco: Number(prev.toFixed(2)), variacao: Number((delta * 100).toFixed(2)) };
  };
  const d1 = mkPrev(0.02); // ±2%
  const d7 = mkPrev(0.05); // ±5%
  const d30 = mkPrev(0.1); // ±10%

  // Real DY (%) applied to real price gives current provento/ano
  const proventoAtual = (r.dy / 100) * r.p;
  const paysDivs = r.dy > 0;
  const dividendos: DividendYear[] = YEARS.map((y, i) => {
    const growth = 1 + (i - 2) * 0.08;
    const noise = 0.75 + rand() * 0.5;
    const skip = paysDivs ? rand() < 0.08 : true; // ocasionalmente pula um ano
    const total = skip ? 0 : Math.max(0.01, proventoAtual * growth * noise);
    const jcp = total * jcpBias;
    const div = total - jcp;
    return {
      year: y,
      dividendo: Number(div.toFixed(2)),
      jcp: Number(jcp.toFixed(2)),
      selicMediaPonderada: SELIC[y],
      precoMedio: Number((r.p * (0.7 + i * 0.1) + rand() * r.p * 0.1).toFixed(2)),
    };
  });

  const anoCorrente = YEARS[YEARS.length - 1];
  const anosFechados = dividendos.filter((d) => d.year < anoCorrente);
  const anosComProventos = anosFechados.filter((d) => d.dividendo + d.jcp > 0).length;
  const dividendosRecorrentes = anosComProventos === anosFechados.length;
  const anosYieldAcimaSelic = anosFechados.filter((d) => {
    const yieldAno = ((d.dividendo + d.jcp) / d.precoMedio) * 100;
    return yieldAno > d.selicMediaPonderada;
  }).length;

  // Provisionamento de novos proventos (0–3 anúncios futuros)
  const proventosProvisionados: ProventoProvisionado[] = [];
  if (paysDivs) {
    const n = 1 + Math.floor(rand() * 3); // 1..3
    // âncora determinística de referência (hoje simulado): 2026-07-09
    const baseMs = Date.UTC(2026, 6, 9);
    const dayMs = 86_400_000;
    for (let i = 0; i < n; i++) {
      const comOffset = 10 + Math.floor(rand() * 80) + i * 25; // dias no futuro
      const exDate = new Date(baseMs + (comOffset + 1) * dayMs);
      const comDate = new Date(baseMs + comOffset * dayMs);
      const payDate = new Date(baseMs + (comOffset + 20 + Math.floor(rand() * 40)) * dayMs);
      const isJcp = rand() < jcpBias + 0.15;
      const valor = Math.max(0.01, (proventoAtual / (2 + rand() * 3)) * (0.6 + rand() * 0.9));
      proventosProvisionados.push({
        tipo: isJcp ? "JCP" : "Dividendo",
        valorPorAcao: Number(valor.toFixed(4)),
        dataCom: comDate.toISOString().slice(0, 10),
        dataEx: exDate.toISOString().slice(0, 10),
        dataPagamento: payDate.toISOString().slice(0, 10),
      });
    }
    proventosProvisionados.sort((a, b) => a.dataCom.localeCompare(b.dataCom));
  }

  // Preços anuais determinísticos (01/jan e 31/dez de cada um dos últimos 5 anos)
  // Ancora: precoFim do ano corrente = preço atual. Recuando ano a ano, o
  // precoInicio de um ano vira o precoFim do ano anterior, com variação
  // anual pseudo-aleatória em torno da Selic daquele ano.
  const precosAnuais: PrecoAnual[] = [];
  let precoFimAno = r.p;
  for (let i = YEARS.length - 1; i >= 0; i--) {
    const y = YEARS[i];
    const selic = SELIC[y];
    // variação anual: -25%..+45%, enviesada levemente pela Selic
    const varAnual = (rand() - 0.45) * 0.7 + (selic / 100) * (rand() - 0.3);
    const precoInicio = Number((precoFimAno / (1 + varAnual)).toFixed(2));
    const valorizacao = Number((((precoFimAno / precoInicio) - 1) * 100).toFixed(2));
    precosAnuais.unshift({
      year: y,
      precoInicio,
      precoFim: Number(precoFimAno.toFixed(2)),
      valorizacao,
      selicMediaPonderada: selic,
      bateuSelic: valorizacao > selic,
    });
    precoFimAno = precoInicio;
  }
  const anosPrecoAcimaSelic = precosAnuais.filter(
    (p) => p.year < anoCorrente && p.bateuSelic,
  ).length;



  return {
    ticker: r.t,
    nome: r.n,
    setor: sectorLabel(r.s),
    tipo: (r.tp as ShareType),
    preco: r.p,
    variacaoDia,
    precoD1: d1.preco,
    varD1: d1.variacao,
    precoD7: d7.preco,
    varD7: d7.variacao,
    precoD30: d30.preco,
    varD30: d30.variacao,
    pl: r.pl,
    pvp: r.pvp,
    dy: r.dy,
    roe: r.roe,
    roic: r.roic,
    margemLiquida: r.ml,
    margemEbit: r.me,
    // Fundamentus é Dív.Líq/Patrim. — mesma leitura de alavancagem
    divBrutaPatrimonio: r.dp,
    liquidezCorrente: r.lc,
    cagrLucros5a: r.cr,
    valorMercado: r.vm,
    liquidezDiaria: r.lq,
    // Free float estimado determinístico (30% – 95%), atrelado à liquidez
    freeFloat: Number(
      Math.min(95, Math.max(25, 30 + rand() * 55 + Math.min(20, r.lq / 20))).toFixed(1),
    ),
    dividendos,
    anosComProventos,
    dividendosRecorrentes,
    anosYieldAcimaSelic,
    proventosProvisionados,
    precosAnuais,
    anosPrecoAcimaSelic,
  };
}


export function buildStocks(rows: RawRow[]): Stock[] {
  return rows.map(buildStock);
}

export function collectSectors(stocks: Stock[]): string[] {
  return Array.from(new Set(stocks.map((s) => s.setor))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

export const STOCKS: Stock[] = buildStocks(raw as RawRow[]);

export const SECTORS: string[] = collectSectors(STOCKS);


/**
 * Recalcula estatísticas derivadas quando substituímos `dividendos` por dados reais.
 * `precoAtual` é usado para preencher `precoMedio` quando a série real não traz.
 */
export function computeDividendStats(
  dividendos: DividendYear[],
  precoAtual: number,
): {
  dividendos: DividendYear[];
  anosComProventos: number;
  dividendosRecorrentes: boolean;
  anosYieldAcimaSelic: number;
} {
  const preenchidos = dividendos.map((d) => ({
    ...d,
    precoMedio: d.precoMedio > 0 ? d.precoMedio : precoAtual,
  }));
  // Contadores consideram apenas os anos já fechados (exclui o ano corrente parcial).
  const anoAtual = new Date().getUTCFullYear();
  const fechados = preenchidos.filter(
    (d) => d.year < anoAtual && d.year >= anoAtual - 5,
  );
  const base = fechados.length > 0 ? fechados : preenchidos;

  const anosComProventos = base.filter((d) => d.dividendo + d.jcp > 0).length;
  const anosYieldAcimaSelic = base.filter((d) => {
    if (!d.precoMedio) return false;
    const yieldAno = ((d.dividendo + d.jcp) / d.precoMedio) * 100;
    return yieldAno > d.selicMediaPonderada;
  }).length;
  return {
    dividendos: preenchidos,
    anosComProventos,
    dividendosRecorrentes: anosComProventos === base.length,
    anosYieldAcimaSelic,
  };
}

