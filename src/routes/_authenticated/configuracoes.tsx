import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  KeyRound,
  ExternalLink,
  Check,
  Trash2,
  Target,
  Droplets,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  useMinLiquidez,
  formatLiquidez,
  MIN_LIQUIDEZ_DEFAULT,
  MIN_LIQUIDEZ_MIN,
  MIN_LIQUIDEZ_MAX,
} from "@/hooks/use-min-liquidez";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useBrapiToken } from "@/hooks/use-live-quotes";
import {
  useBazinDivisor,
  formatDivisor,
  BAZIN_DIVISOR_DEFAULT,
  BAZIN_DIVISOR_MIN,
  BAZIN_DIVISOR_MAX,
} from "@/hooks/use-bazin-divisor";

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
  const [storedToken, setStoredToken, tokenReady] = useBrapiToken();
  const [input, setInput] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const hasToken = storedToken.length > 0;
  const masked = !tokenReady
    ? "carregando…"
    : hasToken
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
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-3 py-4 sm:px-6 md:px-8">
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

      <main className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-6 md:px-8">
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
            copie seu token e cole abaixo — ele fica salvo{" "}
            <strong className="text-foreground">na sua conta</strong>, então ao entrar
            em qualquer dispositivo ele já vem preenchido e ativo. O painel
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

        <LiquidezSection />

      </main>
    </div>
  );
}

function LiquidezSection() {
  const [minLiquidez, setMinLiquidez] = useMinLiquidez();

  return (
    <section className="mt-6 rounded-xl border border-border/60 bg-card p-5 md:p-6">
      <div className="flex items-center gap-2">
        <Droplets className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Liquidez diária mínima</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Ativos com liquidez diária média abaixo deste valor não aparecem nas listas, nos
        setores e nos filtros. Com 0 mi, apenas ações sem negociação são excluídas. O valor
        fica salvo no seu navegador.
      </p>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Limite mínimo
          </Label>
          <span className="font-mono text-sm">{formatLiquidez(minLiquidez)}</span>
        </div>
        <Slider
          min={MIN_LIQUIDEZ_MIN}
          max={MIN_LIQUIDEZ_MAX}
          step={0.1}
          value={[minLiquidez]}
          onValueChange={([v]) => setMinLiquidez(v)}
        />
        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>{formatLiquidez(MIN_LIQUIDEZ_MIN)}</span>
          <span>{formatLiquidez(MIN_LIQUIDEZ_MAX)}</span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-lg border border-border/40 bg-background/40 p-3">
        <div className="text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Limite atual
          </div>
          <div className="mt-1 font-mono">{formatLiquidez(minLiquidez)}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMinLiquidez(null)}
          disabled={minLiquidez === MIN_LIQUIDEZ_DEFAULT}
          className="gap-2 text-muted-foreground"
        >
          <Trash2 className="h-4 w-4" />
          Restaurar padrão
        </Button>
      </div>
    </section>
  );
}

function BazinSection() {
  const [divisor, setDivisor] = useBazinDivisor();
  const [input, setInput] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const parsed = Number.parseFloat(input.replace(",", "."));
  const valid =
    Number.isFinite(parsed) && parsed >= BAZIN_DIVISOR_MIN && parsed <= BAZIN_DIVISOR_MAX;

  const onSave = () => {
    if (!valid) return;
    setDivisor(parsed);
    setInput("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <section className="mt-6 rounded-xl border border-border/60 bg-card p-5 md:p-6">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Bazin — divisor do preço teto</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        O preço teto do método Bazin é calculado como{" "}
        <strong className="text-foreground">
          média ponderada dos proventos (5 anos) ÷ divisor
        </strong>
        . O divisor é o yield mínimo desejado — 0,06 equivale a 6% ao ano. Ajuste
        conforme sua necessidade (entre {formatDivisor(BAZIN_DIVISOR_MIN)} e{" "}
        {formatDivisor(BAZIN_DIVISOR_MAX)}). O valor fica salvo apenas no seu navegador e
        recalcula o preço teto na hora, sem nova consulta à IA.
      </p>

      <div className="mt-5 space-y-2">
        <Label
          htmlFor="bazin-divisor"
          className="text-xs uppercase tracking-wide text-muted-foreground"
        >
          Novo divisor
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="bazin-divisor"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="0,06"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={8}
            className="bg-input/60 border-border/60 font-mono"
          />
          <Button onClick={onSave} disabled={!valid} className="gap-2">
            {saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Salvo" : "Salvar"}
          </Button>
        </div>
        {input.trim() !== "" && !valid && (
          <p className="text-xs text-destructive">
            Informe um número entre {formatDivisor(BAZIN_DIVISOR_MIN)} e{" "}
            {formatDivisor(BAZIN_DIVISOR_MAX)} (ex.: 0,06).
          </p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-lg border border-border/40 bg-background/40 p-3">
        <div className="text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Divisor atual
          </div>
          <div className="mt-1 font-mono">{formatDivisor(divisor)}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDivisor(null);
            setInput("");
          }}
          disabled={divisor === BAZIN_DIVISOR_DEFAULT}
          className="gap-2 text-muted-foreground"
        >
          <Trash2 className="h-4 w-4" />
          Restaurar padrão
        </Button>
      </div>
    </section>
  );
}
