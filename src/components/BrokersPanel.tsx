import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createBroker, deleteBroker, listBrokers, setPortfolioBroker } from "@/lib/portfolio.functions";

const brokersKey = ["brokers"];
const NONE = "none";

export function useBrokers() {
  const fetchBrokers = useServerFn(listBrokers);
  const query = useQuery({ queryKey: brokersKey, queryFn: () => fetchBrokers() });
  return { brokers: query.data ?? [], query };
}

/** Cadastro das corretoras do usuário; excluir uma corretora deixa suas carteiras sem corretora. */
export function BrokersPanel() {
  const client = useQueryClient();
  const { brokers, query } = useBrokers();
  const callCreate = useServerFn(createBroker);
  const callDelete = useServerFn(deleteBroker);
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: (value: string) => callCreate({ data: { name: value } }),
    onSuccess: () => { setName(""); client.invalidateQueries({ queryKey: brokersKey }); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => callDelete({ data: { id } }),
    onSuccess: () => { client.invalidateQueries({ queryKey: brokersKey }); client.invalidateQueries({ queryKey: ["portfolios"] }); },
  });
  const submit = () => { if (name.trim() && !create.isPending) create.mutate(name.trim()); };
  return (
    <section className="mt-6 rounded-xl border border-border/60 bg-card p-5 md:p-6">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Corretoras</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Cadastre as corretoras onde você opera e vincule cada carteira a uma delas.
        A barra <strong className="text-foreground">Vendas no mês</strong> soma o que
        foi vendido nas carteiras da <strong className="text-foreground">mesma
        corretora</strong>. Excluir uma corretora apenas desvincula suas carteiras —
        nenhuma carteira ou venda é apagada.
      </p>
      <div className="mt-5 flex gap-2">
        <Input value={name} maxLength={60} placeholder="Ex.: XP, BTG, Clear" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        <Button size="icon" disabled={!name.trim() || create.isPending} onClick={submit} aria-label="Cadastrar corretora"><Plus className="h-4 w-4" /></Button>
      </div>
      {create.error instanceof Error && <p role="alert" className="mt-2 text-xs text-destructive">{create.error.message}</p>}
      {remove.error instanceof Error && <p role="alert" className="mt-2 text-xs text-destructive">{remove.error.message}</p>}
      {query.isError && <p role="alert" className="mt-2 text-xs text-destructive">Não foi possível carregar as corretoras.</p>}
      {brokers.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {brokers.map((b) => (
            <li key={b.id} className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 py-0.5 pl-2.5 pr-0.5 text-xs">
              {b.name}
              <Button size="icon" variant="ghost" className="h-5 w-5 rounded-full" aria-label={`Excluir corretora ${b.name}`} disabled={remove.isPending}
                onClick={() => { if (window.confirm(`Excluir a corretora "${b.name}"? As carteiras dela ficarão sem corretora.`)) remove.mutate(b.id); }}>
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PortfolioBrokerSelect({ portfolioId, brokerId }: { portfolioId: string; brokerId: string | null }) {
  const client = useQueryClient();
  const { brokers } = useBrokers();
  const callSet = useServerFn(setPortfolioBroker);
  const mutation = useMutation({
    mutationFn: (value: string | null) => callSet({ data: { portfolioId, brokerId: value } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["portfolios"] }),
  });
  const known = brokerId && brokers.some((b) => b.id === brokerId) ? brokerId : NONE;
  return (
    <div className="mt-1.5">
      <Select value={known} disabled={mutation.isPending} onValueChange={(v) => mutation.mutate(v === NONE ? null : v)}>
        <SelectTrigger className="h-7 text-xs" aria-label="Corretora da carteira"><SelectValue placeholder="Corretora" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Sem corretora</SelectItem>
          {brokers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {brokers.length === 0 && <p className="mt-1 text-[10px] text-muted-foreground">Cadastre corretoras em Ajustes para vincular.</p>}
      {mutation.error instanceof Error && <p role="alert" className="mt-1 text-[10px] text-destructive">{mutation.error.message}</p>}
    </div>
  );
}
