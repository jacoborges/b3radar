import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketIndicesList } from "@/components/MarketIndicesList";

export const Route = createFileRoute("/_authenticated/indices")({
  head: () => ({
    meta: [
      { title: "Índices de Mercado — Bovespa Radar" },
      { name: "description", content: "Ibovespa, IBrX, SMLL, IDIV, IFIX, setoriais B3 e MSCI Brazil/EWZ com variação e sensação do mercado." },
      { property: "og:title", content: "Índices de Mercado — Bovespa Radar" },
      { property: "og:description", content: "Principais índices da bolsa brasileira no Brasil e no exterior." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IndicesPage,
});

function IndicesPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-3 py-6 sm:px-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <Gauge className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Índices</h1>
      </div>
      <MarketIndicesList />
    </main>
  );
}
