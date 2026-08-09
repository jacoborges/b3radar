export type IndicatorHistory = "preco" | "valorizacao" | "dy" | "proventos" | "selic";

export interface IndicatorInfo {
  key: string;
  label: string;
  short: string;
  format: (v: number) => string;
  fundamentalista: string;
  tecnica: string;
  /**
   * Quando definido, o indicador tem série histórica real de 10 anos
   * (cotações da Yahoo Finance e/ou proventos da B3) e ganha o ícone de gráfico.
   */
  history?: IndicatorHistory;
}


const pct = (v: number) => `${v.toFixed(2)}%`;
const num = (v: number) => v.toFixed(2);
const money = (v: number) =>
  v >= 1000
    ? `R$ ${(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`
    : `R$ ${v.toFixed(2)}`;

export const INDICATORS: Record<string, IndicatorInfo> = {
  preco: {
    key: "preco",
    label: "Preço",
    short: "Cotação atual",
    format: (v) => `R$ ${v.toFixed(2)}`,
    fundamentalista:
      "Preço de mercado da ação. Isoladamente diz pouco: compare sempre com Lucro, VPA e Dividendo por ação.",
    tecnica:
      "É o insumo básico dos gráficos. Suportes, resistências, médias móveis e volume derivam do preço.",
  },
  pl: {
    key: "pl",
    label: "P/L",
    short: "Preço / Lucro",
    format: num,
    fundamentalista:
      "Quantos anos de lucro atual seriam necessários para pagar o preço da ação. P/L baixo pode indicar barganha; P/L alto pode indicar expectativa de crescimento — ou preço esticado.",
    tecnica:
      "Ajuda a filtrar setores. Não é usado em gráficos, mas orienta o viés (comprado em empresa cara exige tendência clara).",
  },
  pvp: {
    key: "pvp",
    label: "P/VP",
    short: "Preço / Valor Patrimonial",
    format: num,
    fundamentalista:
      "Compara o preço com o patrimônio líquido por ação. Abaixo de 1 sinaliza que o mercado paga menos que o patrimônio contábil.",
    tecnica:
      "Bom para identificar ativos descontados dentro do mesmo setor — útil em rotação setorial.",
  },
  dy: {
    key: "dy",
    label: "DY",
    short: "Dividend Yield 12m",
    format: pct,
    fundamentalista:
      "Percentual pago em proventos nos últimos 12 meses sobre o preço atual. Central para carteiras de renda.",
    tecnica:
      "DY muito alto após queda forte pode ser 'armadilha de yield'. Confirme com gráfico de tendência.",
  },
  roe: {
    key: "roe",
    label: "ROE",
    short: "Retorno sobre Patrimônio",
    format: pct,
    fundamentalista:
      "Quanto a empresa gera de lucro para cada real de patrimônio líquido. ROE alto e consistente indica qualidade.",
    tecnica:
      "Empresas com ROE alto tendem a ter tendências de longo prazo mais estáveis — bom para swing/position.",
  },
  roic: {
    key: "roic",
    label: "ROIC",
    short: "Retorno sobre Capital Investido",
    format: pct,
    fundamentalista:
      "Retorno sobre todo capital (próprio + dívida). Se ROIC > custo de capital, a empresa cria valor.",
    tecnica:
      "Filtro de qualidade. Combine com tendência de alta no gráfico semanal para posições longas.",
  },
  margemLiquida: {
    key: "margemLiquida",
    label: "Marg. Líq.",
    short: "Margem Líquida",
    format: pct,
    fundamentalista:
      "Quanto sobra de lucro para cada R$ 1 de receita. Margens altas indicam poder de precificação.",
    tecnica:
      "Empresas de margem alta absorvem melhor volatilidade e crises setoriais.",
  },
  margemEbit: {
    key: "margemEbit",
    label: "Marg. EBIT",
    short: "Margem Operacional",
    format: pct,
    fundamentalista:
      "Eficiência da operação, antes de juros e impostos. Melhor comparador entre empresas do mesmo setor.",
    tecnica:
      "Queda persistente antecede reversões — sinal de alerta para posições compradas.",
  },
  divBrutaPatrimonio: {
    key: "divBrutaPatrimonio",
    label: "Dív/PL",
    short: "Dívida Bruta / Patrimônio",
    format: (v) => v.toFixed(2) + "x",
    fundamentalista:
      "Alavancagem: acima de 1x já exige atenção; acima de 2x é risco elevado, especialmente em ciclos de juros altos.",
    tecnica:
      "Ativos muito alavancados amplificam movimentos — betas mais altos, stops mais largos.",
  },
  liquidezCorrente: {
    key: "liquidezCorrente",
    label: "Liq. Corr.",
    short: "Liquidez Corrente",
    format: num,
    fundamentalista:
      "Capacidade de pagar obrigações de curto prazo. Acima de 1 é saudável; abaixo, exige análise de caixa.",
    tecnica: "Baixa liquidez corrente aumenta risco de gaps negativos.",
  },
  cagrLucros5a: {
    key: "cagrLucros5a",
    label: "CAGR L. 5a",
    short: "Crescimento anual médio do lucro",
    format: pct,
    fundamentalista:
      "Ritmo composto de crescimento do lucro nos últimos 5 anos. Consistência importa mais que picos.",
    tecnica:
      "Empresas com CAGR alto tendem a formar tendências de alta claras — bom para setups de rompimento.",
  },
  valorMercado: {
    key: "valorMercado",
    label: "Valor Merc.",
    short: "Valor de Mercado (bi)",
    format: (v) => `R$ ${v.toFixed(1)} bi`,
    fundamentalista:
      "Preço × total de ações. Large caps são mais estáveis; small caps oferecem mais crescimento e mais risco.",
    tecnica:
      "Small caps têm mais 'ruído' gráfico e exigem gestão de risco mais rígida.",
  },
  liquidezDiaria: {
    key: "liquidezDiaria",
    label: "Liq. Diária",
    short: "Volume médio diário (R$ mi)",
    format: (v) => `R$ ${v.toFixed(0)} mi`,
    fundamentalista:
      "Facilidade de comprar e vender sem impactar o preço. Fundos exigem liquidez mínima.",
    tecnica:
      "Volume valida rompimentos. Sem volume, breakout tende a ser falso.",
  },
  freeFloat: {
    key: "freeFloat",
    label: "Free Float",
    short: "% de ações em circulação",
    format: pct,
    fundamentalista:
      "Percentual do capital em circulação livre no mercado (fora das mãos de controladores e tesouraria). Free float alto tende a indicar governança mais dispersa e maior escrutínio do mercado; muito baixo concentra decisões no controlador.",
    tecnica:
      "Free float baixo reduz liquidez e amplifica volatilidade — movimentos bruscos com pouco volume. Free float alto favorece formação de preço mais eficiente e menor slippage.",
  },
  variacaoDia: {
    key: "variacaoDia",
    label: "Var. Dia",
    short: "Variação no dia (%)",
    format: pct,
    fundamentalista:
      "Movimento do preço no pregão atual. Isoladamente é ruído; ganha sentido junto a notícias, resultados e fluxo do setor.",
    tecnica:
      "Variações intradiárias muito acima da média sinalizam mudança de regime — reavalie stops e alvos.",
  },
  varD7: {
    key: "varD7",
    label: "Var. 7d",
    short: "Variação em 7 dias (%)",
    format: pct,
    fundamentalista:
      "Movimento semanal ajuda a contextualizar o preço atual dentro do ciclo recente de notícias e resultados.",
    tecnica:
      "Filtro comum para setups de pullback e continuação de tendência de curto prazo.",
  },
  varD30: {
    key: "varD30",
    label: "Var. 30d",
    short: "Variação em 30 dias (%)",
    format: pct,
    fundamentalista:
      "Retorno mensal aproxima o desempenho recente do ativo ao ciclo de resultados e macro.",
    tecnica:
      "Base para momentum: ativos com forte variação em 30d costumam manter o viés no curto prazo.",
  },
};

export const FUNDAMENTAL_KEYS = [
  "preco",
  "valorMercado",
  "liquidezDiaria",
  "pl",
  "pvp",
  "dy",
  "roe",
  "roic",
  "margemLiquida",
  "margemEbit",
  "divBrutaPatrimonio",
  "liquidezCorrente",
  "cagrLucros5a",
  "freeFloat",
  "variacaoDia",
  "varD7",
  "varD30",
] as const;

export type IndicatorKey = (typeof FUNDAMENTAL_KEYS)[number];

// Semáforo de endividamento
export function debtLevel(divPL: number): {
  color: string;
  label: string;
  desc: string;
} {
  if (divPL <= 0.5)
    return {
      color: "success",
      label: "Baixo",
      desc: "Dívida bruta ≤ 50% do patrimônio. Estrutura saudável.",
    };
  if (divPL <= 1.2)
    return {
      color: "warning",
      label: "Moderado",
      desc: "Alavancagem controlada, mas exige atenção em cenários de juros altos.",
    };
  return {
    color: "danger",
    label: "Elevado",
    desc: "Dívida acima de 1,2x o patrimônio. Risco financeiro relevante.",
  };
}
