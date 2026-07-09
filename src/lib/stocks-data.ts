import raw from "./stocks-fundamentus.json";

export type ShareType = "ON" | "PN" | "UNIT" | "DIR";

export interface DividendYear {
  year: number;
  dividendo: number;
  jcp: number;
  selicMediaPonderada: number;
  precoMedio: number;
}

export interface Stock {
  ticker: string;
  nome: string;
  setor: string;
  tipo: ShareType;
  preco: number;
  variacaoDia: number;
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
  dividendos: DividendYear[];
}

interface RawRow {
  t: string; n: string; s: string; tp: string;
  p: number; pl: number; pvp: number; dy: number;
  roe: number; roic: number; ml: number; me: number;
  dp: number; lc: number; cr: number; vm: number; lq: number;
}

const SELIC: Record<number, number> = {
  2021: 4.42, 2022: 12.38, 2023: 13.25, 2024: 10.75, 2025: 11.15,
};
const YEARS = [2021, 2022, 2023, 2024, 2025];

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
function buildStock(r: RawRow): Stock {
  const rand = seed(r.t);
  const variacaoDia = Number(((rand() - 0.5) * 6).toFixed(2)); // -3% .. +3%
  const jcpBias = rand() * 0.5; // 0..0.5 fraction as JCP

  // Real DY (%) applied to real price gives current provento/ano
  const proventoAtual = (r.dy / 100) * r.p;
  const dividendos: DividendYear[] = YEARS.map((y, i) => {
    const growth = 1 + (i - 2) * 0.08;
    const noise = 0.75 + rand() * 0.5;
    const total = Math.max(0.01, proventoAtual * growth * noise);
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

  return {
    ticker: r.t,
    nome: r.n,
    setor: r.s,
    tipo: (r.tp as ShareType),
    preco: r.p,
    variacaoDia,
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
    dividendos,
  };
}

export const STOCKS: Stock[] = (raw as RawRow[]).map(buildStock);

export const SECTORS: string[] = Array.from(
  new Set(STOCKS.map((s) => s.setor)),
).sort((a, b) => a.localeCompare(b, "pt-BR"));
