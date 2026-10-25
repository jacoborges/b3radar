import { useState } from "react";
import { Check, ReceiptText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMonthlySalesLimit } from "@/hooks/use-monthly-sales-limit";
import { DEFAULT_MONTHLY_SALES_LIMIT } from "@/lib/portfolio-sales-control";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function MonthlySalesLimitSettings() {
  const { limit, query, mutation } = useMonthlySalesLimit();
  const [input, setInput] = useState("");
  const value = Number(input.replace(/\./g, "").replace(",", "."));
  const valid = input.trim() !== "" && Number.isFinite(value) && value >= 0.01 && value <= 1_000_000_000;
  return (
    <section className="mt-6 border-t border-border/60 py-5 md:py-6">
      <h2 className="flex items-center gap-2 text-base font-semibold"><ReceiptText className="h-4 w-4 text-primary" />Limite mensal de vendas de ações</h2>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Limite atual <span className="font-mono text-foreground">{query.isPending ? "…" : brl(limit)}</span></p>
        <Button variant="ghost" size="sm" className="gap-2" disabled={mutation.isPending || query.isPending || limit === DEFAULT_MONTHLY_SALES_LIMIT} onClick={() => mutation.mutate(DEFAULT_MONTHLY_SALES_LIMIT)}><RotateCcw className="h-4 w-4" />Restaurar R$ 20.000</Button>
      </div>
      <div className="mt-4 space-y-2">
        <Label htmlFor="monthly-sales-limit">Novo limite (R$)</Label>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (valid) mutation.mutate(value, { onSuccess: () => setInput("") }); }}>
          <Input id="monthly-sales-limit" inputMode="decimal" placeholder="20.000,00" value={input} onChange={(e) => setInput(e.target.value)} />
          <Button type="submit" disabled={!valid || mutation.isPending || query.isPending || query.isError} className="gap-2"><Check className="h-4 w-4" />{mutation.isPending ? "Salvando…" : "Salvar limite"}</Button>
        </form>
        {mutation.isSuccess && <p role="status" className="text-xs text-success">Limite salvo na sua conta.</p>}
        {(mutation.isError || query.isError) && <p role="alert" className="text-xs text-destructive">Não foi possível carregar ou salvar o limite. Tente novamente.</p>}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Referência de controle pessoal, não altera o limite legal. A apuração depende do tipo de operação e das regras fiscais aplicáveis.</p>
    </section>
  );
}