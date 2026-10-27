import { useState } from "react";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { simulateAveragePrice } from "@/lib/rebalance";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

export function PortfolioRebalanceButton({
  ticker, qty, avgPrice, price,
}: { ticker: string; qty: number; avgPrice: number; price: number | null }) {
  const [q, setQ] = useState("");
  const [p, setP] = useState("");
  const addQty = num(q);
  const buyPrice = num(p);
  const valid = addQty > 0 && buyPrice > 0;
  const r = valid ? simulateAveragePrice(qty, avgPrice, addQty, buyPrice) : null;

  return (
    <Dialog onOpenChange={(o) => { if (o) { setQ(""); setP(price != null ? price.toFixed(2).replace(".", ",") : ""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
          <Scale className="h-3.5 w-3.5" /> Balanceamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Balanceamento · {ticker}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2 rounded-md border border-border p-3 text-xs">
          <div><span className="block text-muted-foreground">Qtd. atual</span>{qty.toLocaleString("pt-BR")}</div>
          <div><span className="block text-muted-foreground">PM atual</span>{brl(avgPrice)}</div>
          <div><span className="block text-muted-foreground">Cotação</span>{price != null ? brl(price) : "—"}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label htmlFor="rb-q">Quantidade a comprar</Label>
            <Input id="rb-q" inputMode="numeric" value={q} onChange={(e) => setQ(e.target.value)} placeholder="0" /></div>
          <div className="space-y-1"><Label htmlFor="rb-p">Preço da compra (R$)</Label>
            <Input id="rb-p" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} placeholder="0,00" /></div>
        </div>
        <div className="space-y-2 rounded-md bg-muted/40 p-3 text-sm">
          {r ? (<>
            <div className="flex justify-between"><span className="text-muted-foreground">Quantidade final</span><b>{r.finalQty.toLocaleString("pt-BR")}</b></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Novo preço médio</span><b>{brl(r.newAvg)}</b></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Valor do aporte</span><span>{brl(r.cost)}</span></div>
            {r.changePct != null && (
              <div className="flex justify-between"><span className="text-muted-foreground">Variação do PM</span>
                <span className={r.changePct < 0 ? "text-success" : r.changePct > 0 ? "text-destructive" : ""}>
                  {(r.changePct > 0 ? "+" : "") + r.changePct.toFixed(2).replace(".", ",")}%</span></div>
            )}
          </>) : <p className="text-xs text-muted-foreground">Informe quantidade e preço para simular.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
