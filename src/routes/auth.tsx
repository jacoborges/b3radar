import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { adminExists, bootstrapFirstAdmin } from "@/lib/admin-users.functions";
import { getDriveSession, signInToDrive } from "@/lib/drive-auth.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
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
  const [bootstrapKey, setBootstrapKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const checkAdmin = useServerFn(adminExists);
  const setupAdmin = useServerFn(bootstrapFirstAdmin);
  const getSession = useServerFn(getDriveSession);
  const signIn = useServerFn(signInToDrive);
  const { data: adminState, refetch } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: () => checkAdmin(),
    staleTime: 0,
  });
  const needsSetup = adminState?.exists === false;
  const serviceError = adminState?.error ?? null;

  useEffect(() => {
    getSession().then(({ user }) => {
      if (user) navigate({ to: "/", replace: true });
    }).catch(() => {});
  }, [getSession, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (needsSetup) {
        if (password.length < 8) {
          throw new Error("A senha do administrador precisa ter ao menos 8 caracteres.");
        }
        const setupResult = await setupAdmin({ data: { email: "b3radar@gmail.com", password, bootstrapKey } });
        if (!setupResult.ok) throw new Error(setupResult.error);
        await refetch();
      }
      await signIn({ data: { email: needsSetup ? "b3radar@gmail.com" : email.trim(), password } });
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

        {serviceError && (
          <p className="mt-4 rounded-lg border border-destructive/40 bg-card px-3 py-2 text-center text-sm text-destructive">
            {serviceError}
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
              value={needsSetup ? "b3radar@gmail.com" : email}
              readOnly={needsSetup}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {needsSetup && (
            <div className="space-y-2">
              <Label htmlFor="bootstrap-key">Chave de primeiro acesso</Label>
              <Input
                id="bootstrap-key"
                type="password"
                autoComplete="one-time-code"
                required
                value={bootstrapKey}
                onChange={(e) => setBootstrapKey(e.target.value)}
              />
            </div>
          )}
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

          <Button type="submit" className="w-full" disabled={busy || Boolean(serviceError)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {needsSetup ? "Criar administrador e entrar" : "Entrar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
