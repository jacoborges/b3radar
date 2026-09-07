/**
 * Módulo puro do Simulador de Carteira.
 * Recebe lançamentos + eventos societários e devolve quantidade ajustada,
 * proventos recebidos e retorno total. Sem IO.
 */
import type { EventoSocietario } from "./dividend-intelligence";

export interface SimLotInput {
  id: string;
  ticker: string;
  price: number;
  quantity: number;
  boughtAt: string;
}

export interface ProventoRecebido {
  ticker: string;
  tipo: "Dividendo" | "JCP";
  valorPorAcao: number;
  quantidade: number;
  total: number;
  dataCom: string;
  dataPagamento: string | null;
  ano: number;
}

export interface AjusteQuantidade {
  ticker: string;
  tipo: "Bonificacao" | "Desdobramento" | "Grupamento";
  fator: number;
  dataCom: string;
  quantidadeAntes: number;
  quantidadeDepois: number;
}

export interface SimPosition {
  ticker: string;
  quantidadeOriginal: number;
  quantidadeAtual: number;
  investido: number;
  precoMedioAjustado: number;
  precoAtual: number | null;
  valorMercado: number | null;
  ganhoCapital: number | null;
  ganhoCapitalPct: number | null;
  proventos: number;
  yieldOnCost: number | null;
  retornoTotal: number | null;
  retornoTotalPct: number | null;
  primeiraCompra: string;
  eventos: ProventoRecebido[];
  ajustes: AjusteQuantidade[];
  avisos: string[];
}

/** Converte o "ratio"/fator da B3 em multiplicador de quantidade. */
export function parseFatorEvento(
  tipo: AjusteQuantidade["tipo"],
  ratio: string | null,
): { fator: number; ok: boolean } {
  const raw = (ratio ?? "").trim();
  if (!raw) return { fator: 1, ok: false };

  const colon = raw.match(/^(\d+(?:[.,]\d+)?)\s*[:/]\s*(\d+(?:[.,]\d+)?)$/);
  if (colon) {
    const a = Number(colon[1].replace(",", "."));
    const b = Number(colon[2].replace(",", "."));
    if (a > 0 && b > 0) {
      const f = b / a;
      return sane(f);
    }
    return { fator: 1, ok: false };
  }

  const n = Number(raw.replace("%", "").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return { fator: 1, ok: false };

  // A B3 informa o fator em percentual (ex.: 10 = 10% de bonificação).
  if (tipo === "Grupamento") return sane(1 / (1 + n / 100));
  return sane(1 + n / 100);
}

function sane(f: number): { fator: number; ok: boolean } {
  if (!Number.isFinite(f) || f <= 0 || f < 0.01 || f > 100)
    return { fator: 1, ok: false };
  return { fator: f, ok: true };
}

function anoDe(iso: string | null | undefined, fallback: string): number {
  const s = iso ?? fallback;
  return Number(s.slice(0, 4)) || new Date().getUTCFullYear();
}

/**
 * Simula um ticker: aplica eventos societários em ordem cronológica sobre
 * cada lote e acumula os proventos recebidos com a quantidade vigente.
 */
export function simularTicker(
  ticker: string,
  lots: SimLotInput[],
  eventos: EventoSocietario[],
  precoAtual: number | null,
  hoje: string,
): SimPosition {
  const ordenados = [...eventos]
    .filter((e) => !!e.dataCom && e.dataCom <= hoje)
    .sort((a, b) => (a.dataCom ?? "").localeCompare(b.dataCom ?? ""));

  const investido = lots.reduce((s, l) => s + l.price * l.quantity, 0);
  const quantidadeOriginal = lots.reduce((s, l) => s + l.quantity, 0);
  const primeiraCompra = lots
    .map((l) => l.boughtAt)
    .sort()[0] ?? hoje;

  const recebidos: ProventoRecebido[] = [];
  const ajustesMap = new Map<string, AjusteQuantidade>();
  const avisos = new Set<string>();

  let quantidadeAtual = 0;

  for (const lot of lots) {
    let qty = lot.quantity;
    for (const ev of ordenados) {
      const dataCom = ev.dataCom!;
      // Só participa quem já era acionista antes da data com.
      if (dataCom <= lot.boughtAt) continue;

      if (ev.tipo === "Dividendo" || ev.tipo === "JCP") {
        if (!(ev.valor > 0)) continue;
        recebidos.push({
          ticker,
          tipo: ev.tipo,
          valorPorAcao: ev.valor,
          quantidade: qty,
          total: ev.valor * qty,
          dataCom,
          dataPagamento: ev.dataPagamento,
          ano: anoDe(ev.dataPagamento, dataCom),
        });
        continue;
      }

      const { fator, ok } = parseFatorEvento(ev.tipo, ev.ratio);
      if (!ok) {
        avisos.add(
          `Evento de ${ev.tipo.toLowerCase()} em ${dataCom} sem proporção interpretável — quantidade mantida.`,
        );
        continue;
      }
      const antes = qty;
      qty = qty * fator;
      const key = `${ev.tipo}|${dataCom}|${fator}`;
      const existente = ajustesMap.get(key);
      ajustesMap.set(key, {
        ticker,
        tipo: ev.tipo,
        fator,
        dataCom,
        quantidadeAntes: (existente?.quantidadeAntes ?? 0) + antes,
        quantidadeDepois: (existente?.quantidadeDepois ?? 0) + qty,
      });
    }
    quantidadeAtual += qty;
  }

  // Agrupa proventos idênticos (mesmo evento em lotes diferentes).
  const merged = new Map<string, ProventoRecebido>();
  for (const p of recebidos) {
    const key = `${p.tipo}|${p.dataCom}|${p.valorPorAcao}`;
    const prev = merged.get(key);
    if (prev) {
      prev.quantidade += p.quantidade;
      prev.total += p.total;
    } else {
      merged.set(key, { ...p });
    }
  }

  const eventosProventos = [...merged.values()].sort((a, b) =>
    (b.dataPagamento ?? b.dataCom).localeCompare(a.dataPagamento ?? a.dataCom),
  );

  const proventos = eventosProventos.reduce((s, p) => s + p.total, 0);
  const valorMercado =
    precoAtual != null ? precoAtual * quantidadeAtual : null;
  const ganhoCapital = valorMercado != null ? valorMercado - investido : null;
  const retornoTotal = ganhoCapital != null ? ganhoCapital + proventos : null;

  return {
    ticker,
    quantidadeOriginal,
    quantidadeAtual,
    investido,
    precoMedioAjustado: quantidadeAtual > 0 ? investido / quantidadeAtual : 0,
    precoAtual,
    valorMercado,
    ganhoCapital,
    ganhoCapitalPct:
      ganhoCapital != null && investido > 0
        ? (ganhoCapital / investido) * 100
        : null,
    proventos,
    yieldOnCost: investido > 0 ? (proventos / investido) * 100 : null,
    retornoTotal,
    retornoTotalPct:
      retornoTotal != null && investido > 0
        ? (retornoTotal / investido) * 100
        : null,
    primeiraCompra,
    eventos: eventosProventos,
    ajustes: [...ajustesMap.values()].sort((a, b) =>
      a.dataCom.localeCompare(b.dataCom),
    ),
    avisos: [...avisos],
  };
}

export interface SimTotals {
  investido: number;
  valorMercado: number;
  ganhoCapital: number;
  proventos: number;
  retornoTotal: number;
  retornoTotalPct: number;
  yieldOnCost: number;
}

export function somarPosicoes(posicoes: SimPosition[]): SimTotals {
  const investido = posicoes.reduce((s, p) => s + p.investido, 0);
  const valorMercado = posicoes.reduce(
    (s, p) => s + (p.valorMercado ?? p.investido),
    0,
  );
  const proventos = posicoes.reduce((s, p) => s + p.proventos, 0);
  const ganhoCapital = valorMercado - investido;
  const retornoTotal = ganhoCapital + proventos;
  return {
    investido,
    valorMercado,
    ganhoCapital,
    proventos,
    retornoTotal,
    retornoTotalPct: investido > 0 ? (retornoTotal / investido) * 100 : 0,
    yieldOnCost: investido > 0 ? (proventos / investido) * 100 : 0,
  };
}

export interface AnoResumo {
  ano: number;
  proventos: number;
}

export function proventosPorAno(posicoes: SimPosition[]): AnoResumo[] {
  const map = new Map<number, number>();
  for (const p of posicoes) {
    for (const e of p.eventos) {
      map.set(e.ano, (map.get(e.ano) ?? 0) + e.total);
    }
  }
  return [...map.entries()]
    .map(([ano, proventos]) => ({ ano, proventos }))
    .sort((a, b) => a.ano - b.ano);
}

export type RankCriterio = "yieldOnCost" | "retornoTotal";

export interface RankedPosition {
  posicao: number;
  sim: SimPosition;
}

/** Ordena as posições do comparador e atribui 1º, 2º, 3º lugar… */
export function rankearPosicoes(
  posicoes: SimPosition[],
  criterio: RankCriterio = "yieldOnCost",
): RankedPosition[] {
  const valor = (p: SimPosition) =>
    criterio === "yieldOnCost" ? (p.yieldOnCost ?? -Infinity) : (p.retornoTotalPct ?? -Infinity);
  return [...posicoes]
    .sort((a, b) => valor(b) - valor(a) || a.ticker.localeCompare(b.ticker))
    .map((sim, i) => ({ posicao: i + 1, sim }));
}
