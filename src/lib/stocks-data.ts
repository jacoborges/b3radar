export type Sector =
  | "Financeiro"
  | "Energia"
  | "Materiais Básicos"
  | "Consumo Cíclico"
  | "Consumo não Cíclico"
  | "Saúde"
  | "Tecnologia"
  | "Utilidade Pública"
  | "Industrial"
  | "Comunicações";

export type ShareType = "ON" | "PN" | "UNIT";

export interface DividendYear {
  year: number;
  dividendo: number; // R$/ação
  jcp: number; // R$/ação
  selicMediaPonderada: number; // % a.a.
  precoMedio: number; // R$
}

export interface Stock {
  ticker: string;
  nome: string;
  setor: Sector;
  tipo: ShareType;
  preco: number;
  variacaoDia: number; // %
  // Fundamentais
  pl: number;
  pvp: number;
  dy: number; // %
  roe: number; // %
  roic: number; // %
  margemLiquida: number; // %
  margemEbit: number; // %
  divBrutaPatrimonio: number; // ex 0.75
  liquidezCorrente: number;
  cagrLucros5a: number; // %
  valorMercado: number; // R$ bilhões
  liquidezDiaria: number; // R$ milhões
  dividendos: DividendYear[];
}

const yrs = [2021, 2022, 2023, 2024, 2025];
const selicByYear: Record<number, number> = {
  2021: 4.42,
  2022: 12.38,
  2023: 13.25,
  2024: 10.75,
  2025: 11.15,
};

function makeDivs(
  base: number,
  jcpFactor: number,
  preco: number,
  vol = 0.35,
): DividendYear[] {
  return yrs.map((y, i) => {
    const growth = 1 + (i - 2) * 0.08;
    const noise = 1 + (Math.sin(y + base * 7) * vol) / 2;
    const total = Math.max(0.05, base * growth * noise);
    const jcp = total * jcpFactor;
    const div = total - jcp;
    return {
      year: y,
      dividendo: Number(div.toFixed(2)),
      jcp: Number(jcp.toFixed(2)),
      selicMediaPonderada: selicByYear[y],
      precoMedio: Number((preco * (0.7 + i * 0.09)).toFixed(2)),
    };
  });
}

export const STOCKS: Stock[] = [
  // Financeiro
  { ticker: "ITUB4", nome: "Itaú Unibanco", setor: "Financeiro", tipo: "PN", preco: 34.82, variacaoDia: 0.62, pl: 9.1, pvp: 1.7, dy: 6.2, roe: 21.4, roic: 18.2, margemLiquida: 29.5, margemEbit: 45.2, divBrutaPatrimonio: 0.45, liquidezCorrente: 1.4, cagrLucros5a: 8.2, valorMercado: 342, liquidezDiaria: 950, dividendos: makeDivs(2.15, 0.55, 30) },
  { ticker: "ITUB3", nome: "Itaú Unibanco", setor: "Financeiro", tipo: "ON", preco: 31.10, variacaoDia: 0.42, pl: 8.6, pvp: 1.6, dy: 6.4, roe: 21.4, roic: 18.2, margemLiquida: 29.5, margemEbit: 45.2, divBrutaPatrimonio: 0.45, liquidezCorrente: 1.4, cagrLucros5a: 8.2, valorMercado: 342, liquidezDiaria: 220, dividendos: makeDivs(2.0, 0.55, 28) },
  { ticker: "BBDC4", nome: "Bradesco", setor: "Financeiro", tipo: "PN", preco: 14.25, variacaoDia: -0.85, pl: 8.4, pvp: 0.9, dy: 5.8, roe: 11.8, roic: 10.1, margemLiquida: 18.2, margemEbit: 30.1, divBrutaPatrimonio: 0.52, liquidezCorrente: 1.3, cagrLucros5a: 2.1, valorMercado: 152, liquidezDiaria: 780, dividendos: makeDivs(1.05, 0.4, 15) },
  { ticker: "BBAS3", nome: "Banco do Brasil", setor: "Financeiro", tipo: "ON", preco: 28.40, variacaoDia: 1.12, pl: 4.6, pvp: 0.9, dy: 9.8, roe: 20.1, roic: 17.5, margemLiquida: 25.5, margemEbit: 42.0, divBrutaPatrimonio: 0.38, liquidezCorrente: 1.5, cagrLucros5a: 15.5, valorMercado: 162, liquidezDiaria: 620, dividendos: makeDivs(2.6, 0.45, 24) },
  { ticker: "SANB11", nome: "Santander Brasil", setor: "Financeiro", tipo: "UNIT", preco: 28.90, variacaoDia: -0.35, pl: 8.9, pvp: 1.3, dy: 4.5, roe: 14.2, roic: 12.5, margemLiquida: 20.1, margemEbit: 36.4, divBrutaPatrimonio: 0.48, liquidezCorrente: 1.35, cagrLucros5a: 3.2, valorMercado: 108, liquidezDiaria: 210, dividendos: makeDivs(1.4, 0.5, 26) },
  { ticker: "BPAC11", nome: "BTG Pactual", setor: "Financeiro", tipo: "UNIT", preco: 32.10, variacaoDia: 1.85, pl: 12.5, pvp: 2.3, dy: 3.2, roe: 22.5, roic: 19.8, margemLiquida: 32.1, margemEbit: 48.5, divBrutaPatrimonio: 0.62, liquidezCorrente: 1.25, cagrLucros5a: 18.3, valorMercado: 130, liquidezDiaria: 380, dividendos: makeDivs(1.1, 0.3, 28) },

  // Energia (Petróleo/Gás)
  { ticker: "PETR4", nome: "Petrobras", setor: "Energia", tipo: "PN", preco: 38.75, variacaoDia: 2.15, pl: 4.2, pvp: 1.1, dy: 14.8, roe: 28.5, roic: 22.1, margemLiquida: 25.8, margemEbit: 42.5, divBrutaPatrimonio: 0.42, liquidezCorrente: 1.2, cagrLucros5a: 12.5, valorMercado: 502, liquidezDiaria: 1850, dividendos: makeDivs(5.8, 0.15, 34) },
  { ticker: "PETR3", nome: "Petrobras", setor: "Energia", tipo: "ON", preco: 42.30, variacaoDia: 1.98, pl: 4.5, pvp: 1.2, dy: 14.2, roe: 28.5, roic: 22.1, margemLiquida: 25.8, margemEbit: 42.5, divBrutaPatrimonio: 0.42, liquidezCorrente: 1.2, cagrLucros5a: 12.5, valorMercado: 502, liquidezDiaria: 820, dividendos: makeDivs(5.9, 0.15, 38) },
  { ticker: "PRIO3", nome: "PRIO", setor: "Energia", tipo: "ON", preco: 46.85, variacaoDia: -1.25, pl: 6.8, pvp: 2.5, dy: 2.8, roe: 38.5, roic: 32.1, margemLiquida: 42.5, margemEbit: 58.2, divBrutaPatrimonio: 0.55, liquidezCorrente: 1.6, cagrLucros5a: 42.5, valorMercado: 42, liquidezDiaria: 320, dividendos: makeDivs(1.2, 0.2, 42) },
  { ticker: "RECV3", nome: "PetroReconcavo", setor: "Energia", tipo: "ON", preco: 16.40, variacaoDia: 0.85, pl: 5.2, pvp: 1.4, dy: 8.5, roe: 25.8, roic: 21.5, margemLiquida: 28.5, margemEbit: 45.2, divBrutaPatrimonio: 0.68, liquidezCorrente: 1.3, cagrLucros5a: 22.5, valorMercado: 5.8, liquidezDiaria: 45, dividendos: makeDivs(1.4, 0.25, 18) },

  // Materiais Básicos
  { ticker: "VALE3", nome: "Vale", setor: "Materiais Básicos", tipo: "ON", preco: 62.15, variacaoDia: -0.95, pl: 5.8, pvp: 1.5, dy: 8.5, roe: 22.5, roic: 18.5, margemLiquida: 22.5, margemEbit: 38.5, divBrutaPatrimonio: 0.35, liquidezCorrente: 1.8, cagrLucros5a: 6.5, valorMercado: 285, liquidezDiaria: 1450, dividendos: makeDivs(5.2, 0.2, 68) },
  { ticker: "CSNA3", nome: "CSN", setor: "Materiais Básicos", tipo: "ON", preco: 12.85, variacaoDia: -2.15, pl: 15.2, pvp: 1.1, dy: 3.5, roe: 7.2, roic: 5.8, margemLiquida: 4.5, margemEbit: 15.2, divBrutaPatrimonio: 1.85, liquidezCorrente: 1.1, cagrLucros5a: -8.5, valorMercado: 17, liquidezDiaria: 180, dividendos: makeDivs(0.85, 0.3, 15) },
  { ticker: "GGBR4", nome: "Gerdau", setor: "Materiais Básicos", tipo: "PN", preco: 18.55, variacaoDia: 0.35, pl: 6.2, pvp: 0.95, dy: 7.8, roe: 15.8, roic: 13.2, margemLiquida: 12.5, margemEbit: 18.5, divBrutaPatrimonio: 0.42, liquidezCorrente: 2.1, cagrLucros5a: 18.2, valorMercado: 38, liquidezDiaria: 285, dividendos: makeDivs(1.55, 0.25, 22) },
  { ticker: "SUZB3", nome: "Suzano", setor: "Materiais Básicos", tipo: "ON", preco: 54.80, variacaoDia: 1.45, pl: 8.5, pvp: 1.8, dy: 4.2, roe: 18.5, roic: 12.5, margemLiquida: 22.5, margemEbit: 42.5, divBrutaPatrimonio: 1.25, liquidezCorrente: 1.5, cagrLucros5a: 12.5, valorMercado: 72, liquidezDiaria: 320, dividendos: makeDivs(2.2, 0.15, 48) },

  // Consumo não Cíclico
  { ticker: "ABEV3", nome: "Ambev", setor: "Consumo não Cíclico", tipo: "ON", preco: 13.45, variacaoDia: -0.55, pl: 15.2, pvp: 2.5, dy: 5.5, roe: 16.8, roic: 15.2, margemLiquida: 18.5, margemEbit: 28.5, divBrutaPatrimonio: 0.18, liquidezCorrente: 0.9, cagrLucros5a: 3.5, valorMercado: 212, liquidezDiaria: 385, dividendos: makeDivs(0.75, 0.3, 14) },
  { ticker: "BRFS3", nome: "BRF", setor: "Consumo não Cíclico", tipo: "ON", preco: 22.85, variacaoDia: 2.45, pl: 18.5, pvp: 2.8, dy: 1.2, roe: 12.5, roic: 8.5, margemLiquida: 5.5, margemEbit: 12.5, divBrutaPatrimonio: 1.45, liquidezCorrente: 1.4, cagrLucros5a: 8.5, valorMercado: 38, liquidezDiaria: 220, dividendos: makeDivs(0.35, 0.2, 20) },
  { ticker: "JBSS3", nome: "JBS", setor: "Consumo não Cíclico", tipo: "ON", preco: 34.20, variacaoDia: 1.15, pl: 12.5, pvp: 2.1, dy: 4.5, roe: 18.5, roic: 12.5, margemLiquida: 4.5, margemEbit: 8.5, divBrutaPatrimonio: 1.15, liquidezCorrente: 1.6, cagrLucros5a: 15.5, valorMercado: 75, liquidezDiaria: 285, dividendos: makeDivs(1.4, 0.15, 30) },

  // Consumo Cíclico
  { ticker: "MGLU3", nome: "Magazine Luiza", setor: "Consumo Cíclico", tipo: "ON", preco: 8.15, variacaoDia: -3.85, pl: 42.5, pvp: 2.1, dy: 0.5, roe: 4.5, roic: 3.2, margemLiquida: 1.2, margemEbit: 3.5, divBrutaPatrimonio: 2.15, liquidezCorrente: 1.1, cagrLucros5a: -25.5, valorMercado: 8, liquidezDiaria: 320, dividendos: makeDivs(0.08, 0.4, 12, 0.6) },
  { ticker: "LREN3", nome: "Lojas Renner", setor: "Consumo Cíclico", tipo: "ON", preco: 15.85, variacaoDia: 0.65, pl: 18.5, pvp: 2.5, dy: 3.2, roe: 14.5, roic: 11.5, margemLiquida: 8.5, margemEbit: 15.5, divBrutaPatrimonio: 0.65, liquidezCorrente: 1.9, cagrLucros5a: 5.5, valorMercado: 15, liquidezDiaria: 180, dividendos: makeDivs(0.45, 0.35, 18) },
  { ticker: "LWSA3", nome: "Locaweb", setor: "Consumo Cíclico", tipo: "ON", preco: 4.25, variacaoDia: -1.85, pl: 25.5, pvp: 1.2, dy: 1.5, roe: 5.5, roic: 4.2, margemLiquida: 3.5, margemEbit: 8.5, divBrutaPatrimonio: 0.35, liquidezCorrente: 1.5, cagrLucros5a: -18.5, valorMercado: 2.5, liquidezDiaria: 45, dividendos: makeDivs(0.05, 0.5, 5, 0.5) },

  // Utilidade Pública
  { ticker: "TAEE11", nome: "Taesa", setor: "Utilidade Pública", tipo: "UNIT", preco: 35.60, variacaoDia: 0.25, pl: 8.5, pvp: 2.1, dy: 10.5, roe: 25.5, roic: 15.5, margemLiquida: 42.5, margemEbit: 68.5, divBrutaPatrimonio: 1.85, liquidezCorrente: 1.3, cagrLucros5a: 4.5, valorMercado: 12, liquidezDiaria: 85, dividendos: makeDivs(3.4, 0.6, 36) },
  { ticker: "EGIE3", nome: "Engie Brasil", setor: "Utilidade Pública", tipo: "ON", preco: 42.80, variacaoDia: 0.55, pl: 9.5, pvp: 2.5, dy: 8.5, roe: 22.5, roic: 14.5, margemLiquida: 25.5, margemEbit: 42.5, divBrutaPatrimonio: 1.45, liquidezCorrente: 1.4, cagrLucros5a: 8.5, valorMercado: 35, liquidezDiaria: 120, dividendos: makeDivs(3.2, 0.55, 42) },
  { ticker: "CMIG4", nome: "Cemig", setor: "Utilidade Pública", tipo: "PN", preco: 11.25, variacaoDia: 0.95, pl: 4.5, pvp: 0.9, dy: 11.5, roe: 22.5, roic: 15.5, margemLiquida: 18.5, margemEbit: 28.5, divBrutaPatrimonio: 0.85, liquidezCorrente: 1.5, cagrLucros5a: 12.5, valorMercado: 32, liquidezDiaria: 220, dividendos: makeDivs(1.3, 0.4, 10) },
  { ticker: "SBSP3", nome: "Sabesp", setor: "Utilidade Pública", tipo: "ON", preco: 88.50, variacaoDia: -0.45, pl: 12.5, pvp: 2.5, dy: 3.5, roe: 18.5, roic: 12.5, margemLiquida: 22.5, margemEbit: 38.5, divBrutaPatrimonio: 0.95, liquidezCorrente: 1.2, cagrLucros5a: 15.5, valorMercado: 60, liquidezDiaria: 320, dividendos: makeDivs(3.1, 0.5, 78) },

  // Saúde
  { ticker: "RDOR3", nome: "Rede D'Or", setor: "Saúde", tipo: "ON", preco: 32.15, variacaoDia: 1.25, pl: 22.5, pvp: 3.5, dy: 1.8, roe: 15.5, roic: 8.5, margemLiquida: 8.5, margemEbit: 15.5, divBrutaPatrimonio: 1.65, liquidezCorrente: 1.4, cagrLucros5a: 12.5, valorMercado: 72, liquidezDiaria: 285, dividendos: makeDivs(0.58, 0.25, 30) },
  { ticker: "HAPV3", nome: "Hapvida", setor: "Saúde", tipo: "ON", preco: 3.15, variacaoDia: -2.15, pl: 45.5, pvp: 1.1, dy: 0.5, roe: 2.5, roic: 1.8, margemLiquida: 2.5, margemEbit: 8.5, divBrutaPatrimonio: 1.25, liquidezCorrente: 0.9, cagrLucros5a: -15.5, valorMercado: 22, liquidezDiaria: 185, dividendos: makeDivs(0.02, 0.5, 4, 0.6) },

  // Tecnologia
  { ticker: "TOTS3", nome: "Totvs", setor: "Tecnologia", tipo: "ON", preco: 28.85, variacaoDia: 0.85, pl: 32.5, pvp: 5.5, dy: 2.5, roe: 18.5, roic: 15.5, margemLiquida: 12.5, margemEbit: 22.5, divBrutaPatrimonio: 0.42, liquidezCorrente: 1.8, cagrLucros5a: 22.5, valorMercado: 18, liquidezDiaria: 120, dividendos: makeDivs(0.75, 0.4, 26) },

  // Comunicações
  { ticker: "VIVT3", nome: "Vivo (Telefônica)", setor: "Comunicações", tipo: "ON", preco: 52.40, variacaoDia: 0.35, pl: 14.5, pvp: 1.4, dy: 8.5, roe: 10.5, roic: 8.5, margemLiquida: 12.5, margemEbit: 22.5, divBrutaPatrimonio: 0.28, liquidezCorrente: 1.1, cagrLucros5a: 5.5, valorMercado: 88, liquidezDiaria: 180, dividendos: makeDivs(4.4, 0.55, 48) },
  { ticker: "TIMS3", nome: "TIM", setor: "Comunicações", tipo: "ON", preco: 18.25, variacaoDia: 0.55, pl: 12.5, pvp: 2.1, dy: 6.5, roe: 16.5, roic: 12.5, margemLiquida: 15.5, margemEbit: 28.5, divBrutaPatrimonio: 0.45, liquidezCorrente: 1.0, cagrLucros5a: 12.5, valorMercado: 44, liquidezDiaria: 145, dividendos: makeDivs(1.15, 0.5, 16) },

  // Industrial
  { ticker: "WEGE3", nome: "WEG", setor: "Industrial", tipo: "ON", preco: 42.15, variacaoDia: 0.95, pl: 32.5, pvp: 8.5, dy: 1.5, roe: 28.5, roic: 25.5, margemLiquida: 15.5, margemEbit: 22.5, divBrutaPatrimonio: 0.12, liquidezCorrente: 2.5, cagrLucros5a: 25.5, valorMercado: 178, liquidezDiaria: 420, dividendos: makeDivs(0.6, 0.35, 40) },
  { ticker: "EMBR3", nome: "Embraer", setor: "Industrial", tipo: "ON", preco: 68.50, variacaoDia: 2.85, pl: 22.5, pvp: 2.8, dy: 0.8, roe: 12.5, roic: 8.5, margemLiquida: 5.5, margemEbit: 12.5, divBrutaPatrimonio: 0.85, liquidezCorrente: 1.5, cagrLucros5a: 35.5, valorMercado: 52, liquidezDiaria: 385, dividendos: makeDivs(0.4, 0.2, 55, 0.5) },
  { ticker: "RAIL3", nome: "Rumo", setor: "Industrial", tipo: "ON", preco: 20.15, variacaoDia: -0.85, pl: 25.5, pvp: 2.5, dy: 1.5, roe: 10.5, roic: 6.5, margemLiquida: 8.5, margemEbit: 22.5, divBrutaPatrimonio: 1.25, liquidezCorrente: 1.4, cagrLucros5a: 18.5, valorMercado: 38, liquidezDiaria: 180, dividendos: makeDivs(0.3, 0.4, 20) },
];

export const SECTORS: Sector[] = Array.from(
  new Set(STOCKS.map((s) => s.setor)),
) as Sector[];
