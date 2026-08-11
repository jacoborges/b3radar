/**
 * Motor matemático de Valuation por Fluxo de Caixa Descontado (FCD).
 * Módulo puro — sem I/O, sem dependências de rede.
 *
 * Ke (CAPM adaptado a mercados emergentes):  Ke = Rf + β·(Rm − Rf) + risco-país
 * WACC = Ke·(E/V) + Kd·(1 − t)·(D/V)
 * FCFF = EBIT·(1 − t) + D&A − CAPEX − ΔNIG
 * FCFE = FCFF − desp. financeira·(1 − t) + variação do endividamento
 */

export type TipoFluxo = "FCFF" | "FCFE";

export interface ValuationInputs {
  ticker: string;
  precoAtual: number | null;
  marketCap: number | null;
  acoes: number | null;
  dividaTotal: number | null;
  caixa: number | null;
  dividaLiquida: number | null;
  beta: number | null;
  receita: number | null;
  ebit: number | null;
  lucroLiquido: number | null;
  depreciacao: number | null;
  capex: number | null;
  despesaFinanceira: number | null;
  selic: number | null;
  fonte: string | null;
  atualizadoEm: string | null;
  /** aviso sobre aproximações feitas na coleta (ex.: D&A estimada) */
  observacao: string | null;
  /** código do erro para a UI escolher a mensagem/ação */
  errorCode: "sem-token" | "limite-fonte" | "sem-demonstracoes" | "indisponivel" | null;
  /** banco/seguradora: EBIT e CAPEX não representam a operação */
  setorFinanceiro: boolean;
  error: string | null;


}

export interface Premissas {
  /** taxa livre de risco (decimal, ex.: 0.105) */
  rf: number;
  /** retorno esperado de mercado (decimal) */
  rm: number;
  /** risco-país / EMBI+ (decimal) */
  riscoPais: number;
  /** custo bruto da dívida antes de impostos (decimal) */
  custoDividaPreTax: number;
  /** alíquota IR/CSLL (decimal) */
  aliquota: number;
  beta: number;
  /** crescimento da fase de alta (decimal) */
  gAlta: number;
  /** anos na fase de alta */
  anosAlta: number;
  /** anos na fase de transição */
  anosTransicao: number;
  /** crescimento na perpetuidade (decimal) */
  gPerp: number;
  /** necessidade de capital de giro como % da variação de receita */
  nigPctReceita: number;
}

export const PREMISSAS_PADRAO: Omit<Premissas, "rf" | "beta"> = {
  rm: 0.14,
  riscoPais: 0.02,
  custoDividaPreTax: 0.115,
  aliquota: 0.34,
  gAlta: 0.06,
  anosAlta: 5,
  anosTransicao: 5,
  gPerp: 0.035,
  nigPctReceita: 0.1,
};

export interface CustoCapital {
  ke: number;
  kdLiquido: number;
  wacc: number;
  pesoEquity: number;
  pesoDivida: number;
}

export function calcularCustoCapital(params: {
  rf: number;
  beta: number;
  rm: number;
  riscoPais: number;
  custoDividaPreTax: number;
  aliquota: number;
  equity: number;
  divida: number;
}): CustoCapital {
  const { rf, beta, rm, riscoPais, custoDividaPreTax, aliquota } = params;
  const equity = Math.max(params.equity, 0);
  const divida = Math.max(params.divida, 0);
  const v = equity + divida;
  const ke = rf + beta * (rm - rf) + riscoPais;
  const kdLiquido = custoDividaPreTax * (1 - aliquota);
  const pesoEquity = v > 0 ? equity / v : 1;
  const pesoDivida = v > 0 ? divida / v : 0;
  const wacc = ke * pesoEquity + kdLiquido * pesoDivida;
  return { ke, kdLiquido, wacc, pesoEquity, pesoDivida };
}

/** Taxa de crescimento de cada ano: alta constante → transição linear → g perpétuo. */
export function trajetoriaCrescimento(p: Premissas): number[] {
  const out: number[] = [];
  for (let i = 0; i < p.anosAlta; i++) out.push(p.gAlta);
  for (let i = 1; i <= p.anosTransicao; i++) {
    const passo = (p.gAlta - p.gPerp) * (1 - i / (p.anosTransicao + 1));
    out.push(p.gPerp + passo);
  }
  return out;
}

export interface FluxoAno {
  ano: number;
  crescimento: number;
  receita: number;
  fluxo: number;
  fatorDesconto: number;
  valorPresente: number;
}

export interface ResultadoFCD {
  tipo: TipoFluxo;
  taxaDesconto: number;
  fluxoBase: number;
  fluxos: FluxoAno[];
  vpFluxos: number;
  valorTerminal: number;
  vpValorTerminal: number;
  /** enterprise value (FCFF) ou equity value (FCFE) */
  valorTotal: number;
  equityValue: number;
  precoJusto: number | null;
  margemSeguranca: number | null;
}

function fluxoBaseFCFF(i: ValuationInputs, p: Premissas): number | null {
  if (i.ebit == null || i.depreciacao == null || i.capex == null) return null;
  const deltaNIG =
    i.receita != null ? p.nigPctReceita * i.receita * p.gAlta : 0;
  return i.ebit * (1 - p.aliquota) + i.depreciacao - i.capex - deltaNIG;
}

function fluxoBaseFCFE(i: ValuationInputs, p: Premissas): number | null {
  const fcff = fluxoBaseFCFF(i, p);
  if (fcff == null) return null;
  const despesa = i.despesaFinanceira ?? 0;
  return fcff - despesa * (1 - p.aliquota);
}

export function projetarFCD(
  inputs: ValuationInputs,
  premissas: Premissas,
  tipo: TipoFluxo,
  overrides: { taxaDesconto?: number; gPerp?: number } = {},
): ResultadoFCD | null {
  const p = { ...premissas, ...(overrides.gPerp != null ? { gPerp: overrides.gPerp } : {}) };
  const base = tipo === "FCFF" ? fluxoBaseFCFF(inputs, p) : fluxoBaseFCFE(inputs, p);
  if (base == null || !Number.isFinite(base)) return null;

  const equity = inputs.marketCap ?? 0;
  const divida = inputs.dividaTotal ?? Math.max(inputs.dividaLiquida ?? 0, 0);
  const cc = calcularCustoCapital({
    rf: p.rf,
    beta: p.beta,
    rm: p.rm,
    riscoPais: p.riscoPais,
    custoDividaPreTax: p.custoDividaPreTax,
    aliquota: p.aliquota,
    equity,
    divida,
  });
  const taxa = overrides.taxaDesconto ?? (tipo === "FCFF" ? cc.wacc : cc.ke);
  if (!Number.isFinite(taxa) || taxa <= p.gPerp) return null;

  const gs = trajetoriaCrescimento(p);
  let fluxo = base;
  let receita = inputs.receita ?? 0;
  let vpFluxos = 0;
  const fluxos: FluxoAno[] = [];

  gs.forEach((g, idx) => {
    const ano = idx + 1;
    fluxo = fluxo * (1 + g);
    receita = receita * (1 + g);
    const fator = Math.pow(1 + taxa, ano);
    const vp = fluxo / fator;
    vpFluxos += vp;
    fluxos.push({
      ano,
      crescimento: g,
      receita,
      fluxo,
      fatorDesconto: fator,
      valorPresente: vp,
    });
  });

  const fluxoTerminal = fluxo * (1 + p.gPerp);
  const valorTerminal = fluxoTerminal / (taxa - p.gPerp);
  const vpValorTerminal = valorTerminal / Math.pow(1 + taxa, gs.length);
  const valorTotal = vpFluxos + vpValorTerminal;

  const dividaLiquida =
    inputs.dividaLiquida ?? (inputs.dividaTotal ?? 0) - (inputs.caixa ?? 0);
  const equityValue = tipo === "FCFF" ? valorTotal - dividaLiquida : valorTotal;

  const acoes = inputs.acoes && inputs.acoes > 0 ? inputs.acoes : null;
  const precoJusto = acoes ? equityValue / acoes : null;
  const margemSeguranca =
    precoJusto != null && inputs.precoAtual && inputs.precoAtual > 0
      ? ((precoJusto - inputs.precoAtual) / inputs.precoAtual) * 100
      : null;

  return {
    tipo,
    taxaDesconto: taxa,
    fluxoBase: base,
    fluxos,
    vpFluxos,
    valorTerminal,
    vpValorTerminal,
    valorTotal,
    equityValue,
    precoJusto,
    margemSeguranca,
  };
}

export interface MatrizSensibilidade {
  taxas: number[];
  crescimentos: number[];
  /** células[linhaTaxa][colunaG] = preço justo por ação (ou null) */
  celulas: (number | null)[][];
  taxaBase: number;
  gBase: number;
  min: number | null;
  max: number | null;
}

/** Grade 5×5 em torno das premissas base, passos de ±0,5 p.p. */
export function matrizSensibilidade(
  inputs: ValuationInputs,
  premissas: Premissas,
  tipo: TipoFluxo,
  taxaBase: number,
  passo = 0.005,
): MatrizSensibilidade {
  const taxas = [-2, -1, 0, 1, 2].map((k) => taxaBase + k * passo);
  const crescimentos = [-2, -1, 0, 1, 2].map((k) => premissas.gPerp + k * passo);
  const celulas = taxas.map((taxa) =>
    crescimentos.map((g) => {
      const r = projetarFCD(inputs, premissas, tipo, { taxaDesconto: taxa, gPerp: g });
      return r?.precoJusto ?? null;
    }),
  );
  const vals = celulas.flat().filter((v): v is number => v != null && Number.isFinite(v));
  return {
    taxas,
    crescimentos,
    celulas,
    taxaBase,
    gBase: premissas.gPerp,
    min: vals.length ? Math.min(...vals) : null,
    max: vals.length ? Math.max(...vals) : null,
  };
}

export type Veredito =
  | "margem-extrema"
  | "assimetria-favoravel"
  | "preco-justo"
  | "esticada"
  | "indisponivel";

export interface VereditoInfo {
  tipo: Veredito;
  label: string;
  desc: string;
  color: "success" | "warning" | "danger" | "muted";
}

/** Interpretação por quadrantes descrita na proposta. */
export function classificarMargem(
  matriz: MatrizSensibilidade,
  precoAtual: number | null | undefined,
): VereditoInfo {
  if (!precoAtual || precoAtual <= 0 || matriz.min == null || matriz.max == null) {
    return {
      tipo: "indisponivel",
      label: "Sem dados suficientes",
      desc: "Faltam dados contábeis ou de mercado para concluir a análise.",
      color: "muted",
    };
  }
  if (matriz.min > precoAtual) {
    return {
      tipo: "margem-extrema",
      label: "Margem de segurança extrema",
      desc: "Mesmo no pior cenário (maior taxa de desconto e menor crescimento) o preço justo supera a cotação atual.",
      color: "success",
    };
  }
  if (matriz.max < precoAtual) {
    return {
      tipo: "esticada",
      label: "Ação esticada / sem margem de segurança",
      desc: "Nem no melhor cenário da matriz o preço justo alcança a cotação atual.",
      color: "danger",
    };
  }
  const acima = matriz.celulas
    .flat()
    .filter((v): v is number => v != null && Number.isFinite(v))
    .filter((v) => v > precoAtual).length;
  const total = matriz.celulas.flat().filter((v) => v != null).length || 1;
  const ratio = acima / total;
  if (ratio >= 0.6) {
    return {
      tipo: "assimetria-favoravel",
      label: "Assimetria favorável",
      desc: "A maior parte dos cenários aponta preço justo acima da cotação atual.",
      color: "success",
    };
  }
  if (ratio <= 0.3) {
    return {
      tipo: "esticada",
      label: "Ação esticada / sem margem de segurança",
      desc: "Só cenários otimistas de crescimento e desconto justificam o preço atual.",
      color: "danger",
    };
  }
  return {
    tipo: "preco-justo",
    label: "Próxima do preço justo",
    desc: "Os cenários se dividem em torno da cotação atual — pouca margem de segurança.",
    color: "warning",
  };
}
