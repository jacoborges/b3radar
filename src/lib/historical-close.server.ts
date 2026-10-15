const DAY_MS = 24 * 60 * 60 * 1000;

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
}

export interface HistoricalClose {
  price: number;
  date: string;
}

function utcTimestamp(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);
}

export function selectExactHistoricalClose(
  date: string,
  timestamps: number[],
  closes: Array<number | null>,
): HistoricalClose | null {
  for (let index = 0; index < timestamps.length; index += 1) {
    const close = closes[index];
    const quoteDate = new Date(timestamps[index] * 1000)
      .toISOString()
      .slice(0, 10);
    if (quoteDate === date && close != null && Number.isFinite(close) && close > 0) {
      return { price: Number(close.toFixed(2)), date: quoteDate };
    }
  }
  return null;
}

/** Busca o fechamento regular da sessão informada, sem ajuste retroativo. */
export async function fetchHistoricalClose(
  ticker: string,
  date: string,
): Promise<HistoricalClose> {
  const period1 = utcTimestamp(date);
  const period2 = period1 + DAY_MS / 1000;
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.SA` +
    `?period1=${period1}&period2=${period2}&interval=1d&events=history`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (compatible; B3Radar/1.0; +https://b3radar.lovable.app)",
      },
    });
  } catch {
    throw new Error("Não foi possível consultar o fechamento histórico agora.");
  }

  if (!response.ok) {
    throw new Error("Não foi possível consultar o fechamento histórico agora.");
  }

  const json = (await response.json()) as YahooChartResponse;
  const result = json.chart?.result?.[0];
  const exact = selectExactHistoricalClose(
    date,
    result?.timestamp ?? [],
    result?.indicators?.quote?.[0]?.close ?? [],
  );
  if (!exact) {
    throw new Error(
      `Não há preço de fechamento para ${date}. Informe o preço manualmente ou escolha um dia de pregão.`,
    );
  }
  return exact;
}