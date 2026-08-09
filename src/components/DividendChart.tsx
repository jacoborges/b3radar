import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import type { DividendYear, PrecoAnual } from "@/lib/stocks-data";

interface Props {
  data: DividendYear[];
}

export function DividendStackedChart({ data }: Props) {
  const chartData = data.map((d) => ({
    year: String(d.year),
    dividendo: d.dividendo,
    jcp: d.jcp,
    total: Number((d.dividendo + d.jcp).toFixed(2)),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 24, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="year" stroke="var(--color-muted-foreground)" fontSize={11} interval={0} angle={-35} height={40} textAnchor="end" />
          <YAxis
            stroke="var(--color-muted-foreground)"
            fontSize={12}
            tickFormatter={(v) => `R$ ${v}`}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            contentStyle={{
              backgroundColor: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number, name: string) => [
              `R$ ${v.toFixed(2)}`,
              name === "dividendo" ? "Dividendo" : "JCP",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(v) => (v === "dividendo" ? "Dividendo" : "JCP")}
          />
          <Bar dataKey="jcp" stackId="a" fill="var(--color-jcp)" radius={[0, 0, 0, 0]}>
            <LabelList
              dataKey="jcp"
              position="center"
              fill="#0b0b12"
              fontSize={10}
              formatter={(v: number) => (v > 0.15 ? v.toFixed(2) : "")}
            />
          </Bar>
          <Bar dataKey="dividendo" stackId="a" fill="var(--color-dividend)" radius={[6, 6, 0, 0]}>
            <LabelList
              dataKey="dividendo"
              position="center"
              fill="#0b0b12"
              fontSize={10}
              formatter={(v: number) => (v > 0.15 ? v.toFixed(2) : "")}
            />
            <LabelList
              dataKey="total"
              position="top"
              fill="var(--color-foreground)"
              fontSize={11}
              formatter={(v: number) => `R$ ${v.toFixed(2)}`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DividendVsSelicChart({ data }: Props) {
  const chartData = data.map((d) => {
    const totalProv = d.dividendo + d.jcp;
    const dyAno = (totalProv / d.precoMedio) * 100;
    return {
      year: String(d.year),
      dyAcao: Number(dyAno.toFixed(2)),
      selic: d.selicMediaPonderada,
    };
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 20, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="year" stroke="var(--color-muted-foreground)" fontSize={11} interval={0} angle={-35} height={40} textAnchor="end" />
          <YAxis
            stroke="var(--color-muted-foreground)"
            fontSize={12}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            contentStyle={{
              backgroundColor: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number, name: string) => [
              `${v.toFixed(2)}%`,
              name === "dyAcao" ? "Yield da ação" : "Selic média",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(v) => (v === "dyAcao" ? "Yield da ação" : "Selic média")}
          />
          <Bar dataKey="dyAcao" fill="var(--color-dividend)" radius={[6, 6, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={
                  d.dyAcao >= d.selic ? "var(--color-success)" : "var(--color-danger)"
                }
              />
            ))}
            <LabelList
              dataKey="dyAcao"
              position="top"
              fill="var(--color-foreground)"
              fontSize={11}
              formatter={(v: number) => `${v.toFixed(1)}%`}
            />
          </Bar>
          <Line
            type="monotone"
            dataKey="selic"
            stroke="var(--color-selic)"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "var(--color-selic)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PriceVsSelicChart({ data }: { data: PrecoAnual[] }) {
  const chartData = data.map((d) => ({
    year: String(d.year),
    valorizacao: d.valorizacao,
    selic: d.selicMediaPonderada,
    precoInicio: d.precoInicio,
    precoFim: d.precoFim,
    bateuSelic: d.bateuSelic,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 24, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="year" stroke="var(--color-muted-foreground)" fontSize={11} interval={0} angle={-35} height={40} textAnchor="end" />
          <YAxis
            stroke="var(--color-muted-foreground)"
            fontSize={12}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            contentStyle={{
              backgroundColor: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number, name: string, item: { payload?: typeof chartData[number] }) => {
              if (name === "valorizacao") {
                const p = item.payload;
                return [
                  `${v.toFixed(2)}%  (R$ ${p?.precoInicio.toFixed(2)} → R$ ${p?.precoFim.toFixed(2)})`,
                  "Valorização do ativo",
                ];
              }
              return [`${v.toFixed(2)}%`, "Selic ponderada"];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(v) => (v === "valorizacao" ? "Valorização do ativo" : "Selic ponderada")}
          />
          <Bar dataKey="valorizacao" fill="var(--color-dividend)" radius={[6, 6, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={d.bateuSelic ? "var(--color-success)" : "var(--color-danger)"}
              />
            ))}
            <LabelList
              dataKey="valorizacao"
              position="top"
              fill="var(--color-foreground)"
              fontSize={11}
              formatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`}
            />
          </Bar>
          <Line
            type="monotone"
            dataKey="selic"
            stroke="var(--color-selic)"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "var(--color-selic)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
