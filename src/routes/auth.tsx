import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { adminExists, bootstrapFirstAdmin } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — B3 Radar" },
      {
        name: "description",
        content:
          "Acesso restrito ao B3 Radar. Informe o e-mail e a senha fornecidos pelo administrador.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const checkAdmin = useServerFn(adminExists);
  const setupAdmin = useServerFn(bootstrapFirstAdmin);
  const { data: adminState, refetch } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: () => checkAdmin(),
    staleTime: 0,
  });
  const needsSetup = adminState?.exists === false;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (needsSetup) {
        if (password.length < 8) {
          throw new Error("A senha do administrador precisa ter ao menos 8 caracteres.");
        }
        await setupAdmin({ data: { email, password } });
        await refetch();
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw new Error("E-mail ou senha inválidos.");
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-foreground">
          B3 <span className="text-primary">Radar</span>
        </h1>

        {needsSetup && (
          <p className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-center text-xs text-muted-foreground">
            Primeiro acesso: defina o e-mail e a senha do administrador.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {needsSetup ? "Criar administrador e entrar" : "Entrar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
