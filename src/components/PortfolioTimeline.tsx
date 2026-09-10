import { useMemo, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TimelinePosition {
  ticker: string;
  lots: Array<{ price: number; quantity: number; boughtAt: string }>;
  sales: Array<{ price: number; quantity: number; soldAt: string }>;
}

const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function tone(v: number) {
  if (v > 0.0001) return "text-success";
  if (v < -0.0001) return "text-destructive";
  return "text-muted-foreground";
}

interface MesResumo {
  compras: number;
  compradoValor: number;
  vendas: number;
  vendidoValor: number;
  ganhoVenda: number;
}

function vazio(): MesResumo {
  return {
    compras: 0,
    compradoValor: 0,
    vendas: 0,
    vendidoValor: 0,
    ganhoVenda: 0,
  };
}

export function PortfolioTimeline({
  positions,
  proventosByMonth,
  proventosLoading,
}: {
  positions: TimelinePosition[];
  proventosByMonth: Map<string, number>;
  proventosLoading: boolean;
}) {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  const porMes = useMemo(() => {
    const map = new Map<string, MesResumo>();
    const get = (k: string) => {
      let m = map.get(k);
      if (!m) {
        m = vazio();
        map.set(k, m);
      }
      return m;
    };

    for (const p of positions) {
      for (const l of p.lots) {
        const m = get(l.boughtAt.slice(0, 7));
        m.compras += 1;
        m.compradoValor += l.price * l.quantity;
      }
      for (const v of p.sales) {
        const m = get(v.soldAt.slice(0, 7));
        m.vendas += 1;
        m.vendidoValor += v.price * v.quantity;
        const antes = p.lots.filter((l) => l.boughtAt <= v.soldAt);
        const q = antes.reduce((s, l) => s + l.quantity, 0);
        const val = antes.reduce((s, l) => s + l.quantity * l.price, 0);
        const media = q > 0 ? val / q : 0;
        m.ganhoVenda += (v.price - media) * v.quantity;
      }
    }
    return map;
  }, [positions]);

  const anos = useMemo(() => {
    const set = new Set<number>([anoAtual]);
    for (const k of porMes.keys()) set.add(Number(k.slice(0, 4)));
    for (const k of proventosByMonth.keys()) set.add(Number(k.slice(0, 4)));
    return Array.from(set)
      .filter((a) => Number.isFinite(a))
      .sort((a, b) => b - a);
  }, [porMes, proventosByMonth, anoAtual]);

  const [ano, setAno] = useState(anoAtual);
  const anoSelecionado = anos.includes(ano) ? ano : (anos[0] ?? anoAtual);

  const meses = useMemo(() => {
    return MESES.map((label, i) => {
      const key = `${anoSelecionado}-${String(i + 1).padStart(2, "0")}`;
      const base = porMes.get(key) ?? vazio();
      const proventos = proventosByMonth.get(key) ?? 0;
      const futuro = anoSelecionado > anoAtual || (anoSelecionado === anoAtual && i > mesAtual);
      const temMovimento =
        base.compras > 0 || base.vendas > 0 || Math.abs(proventos) > 0.0001;
      return {
        label,
        key,
        ...base,
        proventos,
        resultado: base.ganhoVenda + proventos,
        futuro,
        temMovimento,
      };
    });
  }, [porMes, proventosByMonth, anoSelecionado, anoAtual, mesAtual]);

  const totaisAno = useMemo(() => {
    return meses.reduce(
      (acc, m) => ({
        compradoValor: acc.compradoValor + m.compradoValor,
        vendidoValor: acc.vendidoValor + m.vendidoValor,
        ganhoVenda: acc.ganhoVenda + m.ganhoVenda,
        proventos: acc.proventos + m.proventos,
        resultado: acc.resultado + m.resultado,
      }),
      {
        compradoValor: 0,
        vendidoValor: 0,
        ganhoVenda: 0,
        proventos: 0,
        resultado: 0,
      },
    );
  }, [meses]);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Linha do tempo</h3>
        <Select
          value={String(anoSelecionado)}
          onValueChange={(v) => setAno(Number(v))}
        >
          <SelectTrigger className="h-8 w-[104px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {anos.map((a) => (
              <SelectItem key={a} value={String(a)}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TooltipProvider delayDuration={80}>
        <div className="overflow-x-auto pb-1">
          <div className="relative flex min-w-[560px] items-start justify-between gap-1 px-2">
            <div className="absolute left-4 right-4 top-[9px] h-px bg-border" />
            {meses.map((m) => {
              const cor = m.futuro
                ? "bg-muted"
                : m.resultado > 0.0001
                  ? "bg-success"
                  : m.resultado < -0.0001
                    ? "bg-destructive"
                    : m.temMovimento
                      ? "bg-muted-foreground"
                      : "bg-border";
              const tamanho = m.temMovimento ? "h-[18px] w-[18px]" : "h-3 w-3";
              return (
                <Tooltip key={m.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="relative z-10 flex flex-1 flex-col items-center gap-2 outline-none"
                      aria-label={`${m.label} de ${anoSelecionado}`}
                    >
                      <span className="flex h-[18px] w-[18px] items-center justify-center">
                        <span
                          className={`rounded-full ring-2 ring-card transition-transform hover:scale-125 ${cor} ${tamanho} ${
                            m.futuro ? "opacity-40" : ""
                          }`}
                        />
                      </span>
                      <span
                        className={`text-[11px] ${
                          m.futuro
                            ? "text-muted-foreground/50"
                            : m.temMovimento
                              ? "font-medium text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {m.label}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px] space-y-1 text-xs">
                    <p className="font-semibold">
                      {m.label} / {anoSelecionado}
                    </p>
                    {m.futuro ? (
                      <p className="text-muted-foreground">Mês ainda não iniciado.</p>
                    ) : !m.temMovimento ? (
                      <p className="text-muted-foreground">Sem movimento no mês.</p>
                    ) : (
                      <>
                        <p>
                          Compras: {m.compras} · {brl(m.compradoValor)}
                        </p>
                        <p>
                          Vendas: {m.vendas} · {brl(m.vendidoValor)}
                        </p>
                        <p>
                          Ganho na venda{" "}
                          <span className={tone(m.ganhoVenda)}>
                            {brl(m.ganhoVenda)}
                          </span>
                        </p>
                        <p>
                          Proventos{" "}
                          <span className="text-success">
                            {proventosLoading ? "—" : brl(m.proventos)}
                          </span>
                        </p>
                        <p className="border-t border-border/60 pt-1 font-semibold">
                          Resultado do mês{" "}
                          <span className={tone(m.resultado)}>
                            {brl(m.resultado)}
                          </span>
                          {proventosLoading && " (parcial)"}
                        </p>
                      </>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </TooltipProvider>

      <p className="mt-3 text-xs text-muted-foreground">
        {anoSelecionado}: comprado {brl(totaisAno.compradoValor)} · vendido{" "}
        {brl(totaisAno.vendidoValor)} · ganho na venda{" "}
        <span className={tone(totaisAno.ganhoVenda)}>
          {brl(totaisAno.ganhoVenda)}
        </span>{" "}
        · proventos{" "}
        <span className="text-success">
          {proventosLoading ? "—" : brl(totaisAno.proventos)}
        </span>{" "}
        · resultado{" "}
        <span className={`font-semibold ${tone(totaisAno.resultado)}`}>
          {brl(totaisAno.resultado)}
        </span>
        {proventosLoading && " (parcial)"}
      </p>
    </div>
  );
}
