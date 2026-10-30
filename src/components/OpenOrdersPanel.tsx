import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveQuotes } from "@/hooks/use-live-quotes";
import { isOrderFilled, orderAmount, sumOpenOrdersByDate } from "@/lib/open-orders";

type Order = { id: string; portfolio_id: string; ticker: string; price: number; quantity: number; created_at: string; filled_at: string | null };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateLabel = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function useOpenOrders() {
  return useQuery({
    queryKey: ["open-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("open_orders").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []).map((o) => ({ ...o, price: Number(o.price), quantity: Number(o.quantity) })) as Order[];
    },
  });
}

export function OpenOrdersPanel({
  portfolios,
  defaultPortfolioId,
  fallbackPrice,
  onConfirm,
}: {
  portfolios: { id: string; name: string }[];
  defaultPortfolioId: string | null;
  fallbackPrice: (ticker: string) => number | null;
  onConfirm: (o: { portfolioId: string; ticker: string; price: number; quantity: number; boughtAt: string }) => Promise<unknown>;
}) {
  const qc = useQueryClient();
  const { data: orders = [] } = useOpenOrders();
  const tickers = useMemo(() => Array.from(new Set(orders.map((o) => o.ticker))), [orders]);
  const quotes = useLiveQuotes(tickers);
  const priceOf = (t: string) => {
    const p = quotes.map.get(t)?.price;
    return typeof p === "number" && p > 0 ? p : fallbackPrice(t);
  };

  const [ticker, setTicker] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [portfolioId, setPortfolioId] = useState(defaultPortfolioId ?? portfolios[0]?.id ?? "");
  useEffect(() => { if (!portfolioId && portfolios[0]) setPortfolioId(defaultPortfolioId ?? portfolios[0].id); }, [portfolios, defaultPortfolioId, portfolioId]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["open-orders"] });

  const add = useMutation({
    mutationFn: async () => {
      const p = Number(price.replace(",", ".")), q = Number(qty.replace(",", "."));
      if (!ticker.trim() || !(p > 0) || !(q > 0) || !portfolioId) throw new Error("Preencha ativo, quantidade e preço.");
      const { error } = await supabase.from("open_orders").insert({ portfolio_id: portfolioId, ticker: ticker.trim().toUpperCase(), price: p, quantity: q });
      if (error) throw error;
    },
    onSuccess: () => { setTicker(""); setQty(""); setPrice(""); refresh(); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("open_orders").delete().eq("id", id); if (error) throw error; },
    onSuccess: refresh,
  });
  const confirm = useMutation({
    mutationFn: async (o: Order) => {
      await onConfirm({ portfolioId: o.portfolio_id, ticker: o.ticker, price: o.price, quantity: o.quantity, boughtAt: (o.filled_at ?? new Date().toISOString()).slice(0, 10) });
      const { error } = await supabase.from("open_orders").delete().eq("id", o.id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  // Persist the moment an order is taken so it stays filled even if the price moves back up.
  useEffect(() => {
    const newly = orders.filter((o) => !o.filled_at && isOrderFilled(o.price, priceOf(o.ticker)));
    if (newly.length === 0) return;
    void supabase.from("open_orders").update({ filled_at: new Date().toISOString() }).in("id", newly.map((o) => o.id)).then(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, quotes.map]);

  const nameOf = (id: string) => portfolios.find((p) => p.id === id)?.name ?? "—";
  const dateTotals = useMemo(() => sumOpenOrdersByDate(orders), [orders]);
  const totalAmount = useMemo(() => orders.reduce((s, o) => s + orderAmount(o), 0), [orders]);
  const err = [add.error, remove.error, confirm.error].find((e) => e instanceof Error) as Error | undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Ordens abertas</h2>
        <form className="grid grid-cols-2 gap-2 sm:grid-cols-5" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
          <Input placeholder="Ativo (ex: PETR4)" value={ticker} onChange={(e) => setTicker(e.target.value)} />
          <Input placeholder="Quantidade" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Input placeholder="Preço da ordem" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)}>
            {portfolios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Button type="submit" disabled={add.isPending}>Adicionar ordem</Button>
        </form>
        {err && <p role="alert" className="mt-2 text-xs text-destructive">{err.message}</p>}
      </div>
      <div className="space-y-2">
        {orders.length === 0 && <p className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">Nenhuma ordem aberta.</p>}
        {orders.map((o) => {
          const cur = priceOf(o.ticker);
          const filled = !!o.filled_at || isOrderFilled(o.price, cur);
          return (
            <div key={o.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm ${filled ? "animate-pulse border-emerald-500 bg-emerald-500/15" : "border-border/60 bg-card"}`}>
              <span className="w-20 font-semibold">{o.ticker}</span>
              <span>{o.quantity} × {brl(o.price)}</span>
              <span className="text-xs text-muted-foreground" title="Data em que a ordem foi registrada">{dateLabel(o.created_at)} {timeLabel(o.created_at)}</span>
              <span>Valor {brl(orderAmount(o))}</span>
              <span className="text-muted-foreground">Atual {cur != null ? brl(cur) : "—"}</span>
              <span className="text-xs text-muted-foreground">{nameOf(o.portfolio_id)}</span>
              <span className="ml-auto flex items-center gap-2">
                {filled ? (
                  <>
                    <span className="font-medium text-emerald-400">Ordem executada</span>
                    <Button size="sm" onClick={() => confirm.mutate(o)} disabled={confirm.isPending}><Check className="mr-1 h-4 w-4" />Incorporar</Button>
                  </>
                ) : <span className="text-xs text-muted-foreground">Aguardando</span>}
                <Button size="icon" variant="ghost" aria-label="Cancelar ordem" onClick={() => remove.mutate(o.id)}>
                  {filled ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
