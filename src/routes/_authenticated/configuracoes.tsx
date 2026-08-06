import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, ExternalLink, Check, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useBrapiToken } from "@/hooks/use-live-quotes";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — B3 Radar" },
      {
        name: "description",
        content:
          "Ajuste seu token da brapi.dev para acelerar a atualização das cotações em tempo real do B3 Radar.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [storedToken, setStoredToken] = useBrapiToken();
  const [input, setInput] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const hasToken = storedToken.length > 0;
  const masked = hasToken
    ? `${storedToken.slice(0, 4)}…${storedToken.slice(-4)}`
    : "nenhum";

  const onSave = () => {
    setStoredToken(input);
    setInput("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const onClear = () => {
    setStoredToken("");
    setInput("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 md:px-8">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div
            className="h-6 w-1 rounded-full"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
          <h1 className="text-xl font-bold tracking-tight">Configurações</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <section className="rounded-xl border border-border/60 bg-card p-5 md:p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Token brapi.dev</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            As cotações em tempo real vêm da{" "}
            <a
              href="https://brapi.dev"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              brapi.dev
              <ExternalLink className="h-3 w-3" />
            </a>
            . Sem token o serviço funciona, mas é limitado. Crie uma conta grátis,
            copie seu token e cole abaixo — ele fica salvo apenas no seu navegador
            (localStorage) e é enviado só quando o painel busca preços. O painel
            atualiza a cada <strong className="text-foreground">15 segundos</strong>.
          </p>

          <div className="mt-5 space-y-2">
            <Label htmlFor="brapi-token" className="text-xs uppercase tracking-wide text-muted-foreground">
              Novo token
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="brapi-token"
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="cole aqui seu token brapi.dev"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={120}
                className="bg-input/60 border-border/60 font-mono"
              />
              <Button onClick={onSave} disabled={!input.trim()} className="gap-2">
                {saved ? <Check className="h-4 w-4" /> : null}
                {saved ? "Salvo" : "Salvar"}
              </Button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-lg border border-border/40 bg-background/40 p-3">
            <div className="text-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Token atual
              </div>
              <div className="mt-1 font-mono">{masked}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={!hasToken}
              className="gap-2 text-muted-foreground"
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Dica: se preferir não usar token pessoal, você pode deixar em branco —
            o painel continuará funcionando com o limite público da brapi.
          </p>
        </section>

        <BazinSection />



      </main>
    </div>
  );
}
