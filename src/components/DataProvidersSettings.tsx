import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyProviderSettings, setMyProviderSettings, testMyProviderKey } from "@/lib/alt-data.functions";
import type { DataMode } from "@/lib/providers/merge";

type Provider = "bolsai" | "hgbrasil" | "partnr";

const PROVIDERS: Array<{ id: Provider; name: string; url: string; info: string }> = [
  { id: "hgbrasil", name: "HG Brasil Finance", url: "https://console.hgbrasil.com", info: "Cotações de ações, índices, moedas e taxas. Usada como 1ª reserva de preço." },
  { id: "bolsai", name: "Bolsai", url: "https://usebolsai.com", info: "27+ indicadores fundamentalistas (P/L, P/VP, ROE, margens). Grátis: 200 consultas/dia." },
  { id: "partnr", name: "Partnr", url: "https://partnr.ai", info: "Demonstrativos CVM e proventos. Chave guardada; integração liberada após verificação da documentação." },
];

const MODES: Array<{ id: DataMode; label: string; hint: string }> = [
  { id: "brapi", label: "Somente BRAPI", hint: "Ignora as outras fontes." },
  { id: "hybrid", label: "Híbrido", hint: "BRAPI primeiro; alternativas completam o que faltar." },
  { id: "alt_first", label: "Prioridade alternativa", hint: "Fontes alternativas primeiro; BRAPI completa." },
];

export function DataProvidersSettings() {
  const qc = useQueryClient();
  const load = useServerFn(getMyProviderSettings);
  const save = useServerFn(setMyProviderSettings);
  const test = useServerFn(testMyProviderKey);
  const { data } = useQuery({ queryKey: ["provider-settings"], queryFn: () => load() });
  const [drafts, setDrafts] = useState<Record<Provider, string>>({ bolsai: "", hgbrasil: "", partnr: "" });
  const [status, setStatus] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<DataMode>("hybrid");
  useEffect(() => { if (data) setMode(data.mode); }, [data]);

  const refreshAll = async () => {
    await qc.invalidateQueries({ queryKey: ["provider-settings"] });
    await qc.invalidateQueries({ queryKey: ["live-quotes"] });
    await qc.invalidateQueries({ queryKey: ["alt-fundamentals"] });
  };

  const onMode = async (m: DataMode) => {
    setMode(m);
    await save({ data: { mode: m } });
    await refreshAll();
  };
  const onSave = async (p: Provider, key: string) => {
    setStatus((s) => ({ ...s, [p]: "Salvando…" }));
    await save({ data: { provider: p, key } });
    setDrafts((d) => ({ ...d, [p]: "" }));
    await refreshAll();
    setStatus((s) => ({ ...s, [p]: key ? "Chave salva." : "Chave removida." }));
  };
  const onTest = async (p: Provider) => {
    setStatus((s) => ({ ...s, [p]: "Testando…" }));
    const r = await test({ data: { provider: p } });
    setStatus((s) => ({ ...s, [p]: r.message }));
  };

  return (
    <section className="mt-6 rounded-xl border border-border/60 bg-card p-5 md:p-6">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Fontes de dados (modo híbrido)</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Combine a BRAPI com outras fontes para manter preços e indicadores sempre atualizados. As chaves
        ficam salvas na sua conta e só são usadas no servidor.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <button key={m.id} type="button" onClick={() => onMode(m.id)}
            className={`rounded-lg border p-3 text-left transition-colors ${mode === m.id ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/40"}`}>
            <div className="text-sm font-medium">{m.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">{m.hint}</div>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-5">
        {PROVIDERS.map((p) => {
          const masked = data?.keys[p.id] ?? "";
          return (
            <div key={p.id} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Label htmlFor={`key-${p.id}`} className="text-sm font-medium">
                  {p.name}{" "}
                  <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline-offset-2 hover:underline">criar chave</a>
                </Label>
                <span className="font-mono text-xs text-muted-foreground">{masked ? `atual: ${masked}` : "sem chave"}</span>
              </div>
              <p className="text-xs text-muted-foreground">{p.info}</p>
              <div className="flex flex-wrap gap-2">
                <Input id={`key-${p.id}`} type="password" autoComplete="off" className="min-w-0 flex-1"
                  placeholder={`cole aqui sua chave ${p.name}`} value={drafts[p.id]}
                  onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))} />
                <Button size="sm" disabled={!drafts[p.id].trim()} onClick={() => onSave(p.id, drafts[p.id].trim())}>Salvar</Button>
                <Button size="sm" variant="outline" disabled={!masked} onClick={() => onTest(p.id)}>Testar chave</Button>
                <Button size="sm" variant="ghost" disabled={!masked} onClick={() => onSave(p.id, "")}>Remover</Button>
              </div>
              {status[p.id] && <p className="text-xs text-muted-foreground">{status[p.id]}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
