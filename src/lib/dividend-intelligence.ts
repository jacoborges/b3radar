/**
 * Módulo puro de inteligência de proventos.
 * Sem IO — recebe o histórico bruto e devolve previsão, score e classificação.
 */

export type EventoTipo =
  | "Dividendo"
  | "JCP"
  | "Bonificacao"
  | "Grupamento"
  | "Desdobramento";

export interface EventoSocietario {
  tipo: EventoTipo;
  /** valor em R$ para Dividendo/JCP; 0 para eventos societários */
  valor: number;
  /** ratio para bonif/split/grup (ex.: "10%", "1:2"). null para dinheiro */
  ratio: string | null;
  /** ISO yyyy-mm-dd */
  dataCom: string | null;
  dataEx: string | null;
  dataPagamento: string | null;
  dataAprovacao: string | null;
}

export type Frequencia =
  | "Mensal"
  | "Trimestral"
  | "Semestral"
  | "Anual"
  | "Irregular"
  | "Sem histórico";

export type DividendClass =
  | "Elite"
  | "Consistente"
  | "Regular"
  | "Irregular"
  | "Sem cobertura";

export interface NextPayoutEstimate {
  proximaDataComEstimada: string | null; // ISO
  janelaDias: number; // ± dias de incerteza
  faixaValor: { min: number; esperado: number; max: number } | null;
  tipoProvavel: "Dividendo" | "JCP" | null;
  frequencia: Frequencia;
  gapMedianoDias: number | null;
}

export interface DividendIntelligence {
  next: NextPayoutEstimate;
  score: number; // 0..100
  classification: DividendClass;
  breakdown: {
    regularidade: number;
    consecutividade: number;
    consistenciaValor: number;
    cobertura: number;
    ausenciaCortes: number;
  };
  anosConsecutivosPagando: number;
  dyUltimos12m: number | null;
  totalUltimos12m: number;
  amostraCash: number;
}

const CLASS_META: Record<DividendClass, { color: string; label: string }> = {
  Elite: { color: "var(--color-success)", label: "Elite" },
  Consistente: { color: "hsl(160 70% 55%)", label: "Consistente" },
  Regular: { color: "var(--color-warning)", label: "Regular" },
  Irregular: { color: "hsl(20 85% 60%)", label: "Irregular" },
  "Sem cobertura": { color: "var(--muted-foreground)", label: "Sem cobertura" },
};

export function classMeta(c: DividendClass) {
  return CLASS_META[c];
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function percentile(nums: number[], p: number): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

function stddev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = nums.reduce((a, b) => a + b, 0) / nums.length;
  const v = nums.reduce((a, b) => a + (b - m) ** 2, 0) / nums.length;
  return Math.sqrt(v);
}

function toDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}

function classifyFrequency(gapDias: number | null): Frequencia {
  if (gapDias == null) return "Sem histórico";
  if (gapDias <= 45) return "Mensal";
  if (gapDias <= 130) return "Trimestral";
  if (gapDias <= 240) return "Semestral";
  if (gapDias <= 450) return "Anual";
  return "Irregular";
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

/**
 * Estima o próximo pagamento com base nos eventos em dinheiro (Div + JCP).
 */
export function estimateNextPayout(eventos: EventoSocietario[]): NextPayoutEstimate {
  const cash = eventos
    .filter((e) => (e.tipo === "Dividendo" || e.tipo === "JCP") && e.valor > 0 && e.dataCom)
    .map((e) => ({
      tipo: e.tipo as "Dividendo" | "JCP",
      valor: e.valor,
      dataCom: e.dataCom!,
      t: toDate(e.dataCom)!.getTime(),
    }))
    .sort((a, b) => a.t - b.t);

  if (cash.length === 0) {
    return {
      proximaDataComEstimada: null,
      janelaDias: 0,
      faixaValor: null,
      tipoProvavel: null,
      frequencia: "Sem histórico",
      gapMedianoDias: null,
    };
  }

  // gaps entre datas COM (últimos 24 meses)
  const cutoff = Date.now() - 24 * 30 * 86_400_000;
  const recent = cash.filter((e) => e.t >= cutoff);
  const base = recent.length >= 2 ? recent : cash;
  const gaps: number[] = [];
  for (let i = 1; i < base.length; i++) {
    gaps.push((base[i].t - base[i - 1].t) / 86_400_000);
  }
  const gapMediano = gaps.length ? Math.round(median(gaps)) : null;
  const gapStd = gaps.length ? stddev(gaps) : 0;

  const ultima = cash[cash.length - 1];
  const proxima = gapMediano
    ? addDays(ultima.dataCom, gapMediano)
    : null;

  // valores do mesmo tipo mais recente (últimos 8 do tipo)
  const mesmoTipo = cash.filter((e) => e.tipo === ultima.tipo).slice(-8).map((e) => e.valor);
  const amostra = mesmoTipo.length ? mesmoTipo : cash.slice(-8).map((e) => e.valor);
  const p25 = percentile(amostra, 0.25);
  const p50 = median(amostra);
  const p75 = percentile(amostra, 0.75);

  return {
    proximaDataComEstimada: proxima,
    janelaDias: Math.round(Math.min(30, gapStd)),
    faixaValor: amostra.length
      ? {
          min: Number(p25.toFixed(4)),
          esperado: Number(p50.toFixed(4)),
          max: Number(p75.toFixed(4)),
        }
      : null,
    tipoProvavel: ultima.tipo,
    frequencia: classifyFrequency(gapMediano),
    gapMedianoDias: gapMediano,
  };
}

/**
 * Score de confiabilidade 0-100.
 */
export function computeDividendIntelligence(
  eventos: EventoSocietario[],
  precoAtual: number,
  margemLiquida?: number | null,
): DividendIntelligence {
  const cash = eventos
    .filter((e) => (e.tipo === "Dividendo" || e.tipo === "JCP") && e.valor > 0 && e.dataCom)
    .map((e) => ({
      valor: e.valor,
      t: toDate(e.dataCom!)!.getTime(),
      dataCom: e.dataCom!,
    }))
    .sort((a, b) => a.t - b.t);

  const next = estimateNextPayout(eventos);

  if (cash.length === 0) {
    return {
      next,
      score: 0,
      classification: "Sem cobertura",
      breakdown: {
        regularidade: 0,
        consecutividade: 0,
        consistenciaValor: 0,
        cobertura: 0,
        ausenciaCortes: 0,
      },
      anosConsecutivosPagando: 0,
      dyUltimos12m: null,
      totalUltimos12m: 0,
      amostraCash: 0,
    };
  }

  // Regularidade — coef. de variação dos gaps
  const gaps: number[] = [];
  for (let i = 1; i < cash.length; i++) {
    gaps.push((cash[i].t - cash[i - 1].t) / 86_400_000);
  }
  const gMed = gaps.length ? median(gaps) : 0;
  const gStd = gaps.length ? stddev(gaps) : 0;
  const cvGap = gMed > 0 ? gStd / gMed : 1;
  const regularidade = Math.round(Math.max(0, Math.min(1, 1 - cvGap)) * 100);

  // Consecutividade — anos consecutivos com pagamento (a partir do ano atual)
  const anoAtual = new Date().getUTCFullYear();
  const anosPagos = new Set(cash.map((e) => Number(e.dataCom.slice(0, 4))));
  let consec = 0;
  for (let y = anoAtual; y >= anoAtual - 10; y--) {
    // considera "pagando" se pagou nesse ano OU (ano atual e ainda não fechou)
    if (anosPagos.has(y)) consec++;
    else if (y === anoAtual && anosPagos.has(y - 1)) {
      // ano corrente ainda sem pagamento não zera a série
      continue;
    } else break;
  }
  const consecutividade = Math.round(Math.min(1, consec / 8) * 100);

  // Consistência de valor — 1 − CV dos valores
  const valores = cash.map((e) => e.valor);
  const vMed = valores.reduce((a, b) => a + b, 0) / valores.length;
  const vStd = stddev(valores);
  const cvValor = vMed > 0 ? vStd / vMed : 1;
  const consistenciaValor = Math.round(Math.max(0, Math.min(1, 1 - cvValor / 1.5)) * 100);

  // Cobertura — usa margem líquida como proxy (>15% ótimo, <0 zero)
  let cobertura = 50;
  if (typeof margemLiquida === "number" && Number.isFinite(margemLiquida)) {
    cobertura = Math.round(Math.max(0, Math.min(1, margemLiquida / 20)) * 100);
  }

  // Ausência de cortes — quantidade de anos com queda > 50% vs. ano anterior
  const porAno = new Map<number, number>();
  for (const e of cash) {
    const y = Number(e.dataCom.slice(0, 4));
    porAno.set(y, (porAno.get(y) ?? 0) + e.valor);
  }
  const anos = [...porAno.keys()].sort();
  let cortes = 0;
  for (let i = 1; i < anos.length; i++) {
    const prev = porAno.get(anos[i - 1])!;
    const cur = porAno.get(anos[i])!;
    if (prev > 0 && cur / prev < 0.5) cortes++;
  }
  const ausenciaCortes = Math.round(Math.max(0, 1 - cortes * 0.35) * 100);

  const score = Math.round(
    regularidade * 0.35 +
      consecutividade * 0.25 +
      consistenciaValor * 0.2 +
      cobertura * 0.1 +
      ausenciaCortes * 0.1,
  );

  // DY últimos 12m
  const cutoff12 = Date.now() - 365 * 86_400_000;
  const total12 = cash.filter((e) => e.t >= cutoff12).reduce((s, e) => s + e.valor, 0);
  const dy12 = precoAtual > 0 ? (total12 / precoAtual) * 100 : null;

  const classification = classifyDividendQuality(score, next.frequencia);

  return {
    next,
    score,
    classification,
    breakdown: {
      regularidade,
      consecutividade,
      consistenciaValor,
      cobertura,
      ausenciaCortes,
    },
    anosConsecutivosPagando: consec,
    dyUltimos12m: dy12 == null ? null : Number(dy12.toFixed(2)),
    totalUltimos12m: Number(total12.toFixed(4)),
    amostraCash: cash.length,
  };
}

export function classifyDividendQuality(
  score: number,
  freq: Frequencia,
): DividendClass {
  if (score >= 80 && (freq === "Mensal" || freq === "Trimestral")) return "Elite";
  if (score >= 65) return "Consistente";
  if (score >= 45) return "Regular";
  if (score >= 20) return "Irregular";
  return "Sem cobertura";
}
