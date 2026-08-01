import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Pause,
  Play,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  createManagedUser,
  deleteManagedUser,
  getMyAccess,
  listManagedUsers,
  resetManagedUserPassword,
  setManagedUserRole,
  setManagedUserSuspended,
  type AppRole,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — B3 Radar" },
      {
        name: "description",
        content:
          "Painel administrativo do B3 Radar: cadastro, perfis, suspensão e exclusão de contas de acesso.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
});

const roleLabel: Record<AppRole, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  usuario: "Usuário",
};

function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchAccess = useServerFn(getMyAccess);
  const fetchUsers = useServerFn(listManagedUsers);
  const createFn = useServerFn(createManagedUser);
  const roleFn = useServerFn(setManagedUserRole);
  const suspendFn = useServerFn(setManagedUserSuspended);
  const passwordFn = useServerFn(resetManagedUserPassword);
  const deleteFn = useServerFn(deleteManagedUser);

  const { data: access } = useQuery({
    queryKey: ["my-access"],
    queryFn: () => fetchAccess(),
    staleTime: 60_000,
  });
  const isAdmin = access?.role === "admin";
  const canManage = isAdmin || access?.role === "gestor";

  const usersQuery = useQuery({
    queryKey: ["managed-users"],
    queryFn: () => fetchUsers(),
    enabled: canManage,
  });

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("usuario");

  function run<T>(promise: Promise<T>, message: string) {
    setError(null);
    setNotice(null);
    return promise
      .then(() => {
        setNotice(message);
        queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Ação não permitida."),
      );
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createFn({ data: { email: newEmail, password: newPassword, role: newRole } }),
    onSuccess: () => {
      setNewEmail("");
      setNewPassword("");
      setNewRole("usuario");
      setError(null);
      setNotice("Usuário cadastrado.");
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
    },
    onError: (err: unknown) =>
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar."),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!canManage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-foreground">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Apenas administradores e gestores podem gerenciar usuários.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/">Voltar ao painel</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <h1 className="text-base font-semibold text-foreground">Usuários</h1>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={signOut}>
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserPlus className="h-4 w-4 text-primary" />
            Novo usuário
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_1fr_0.9fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="new-email">E-mail</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Senha</Label>
              <Input
                id="new-password"
                type="text"
                placeholder="mín. 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select
                value={newRole}
                onValueChange={(v) => setNewRole(v as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario">Usuário</SelectItem>
                  {isAdmin && <SelectItem value="gestor">Gestor</SelectItem>}
                  {isAdmin && <SelectItem value="admin">Administrador</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Cadastrar
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            A conta já nasce ativa. Informe a senha ao usuário — ele entra
            diretamente com e-mail e senha.
          </p>
        </section>

        {error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
            {notice}
          </p>
        )}

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
            Contas cadastradas
            {usersQuery.data && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {usersQuery.data.length}
              </span>
            )}
          </div>

          {usersQuery.isLoading && (
            <p className="px-4 py-6 text-sm text-muted-foreground">Carregando…</p>
          )}

          <ul className="divide-y divide-border">
            {(usersQuery.data ?? []).map((u) => {
              const isSelf = u.id === access?.userId;
              const gestorBlocked = !isAdmin && u.role === "admin";
              return (
                <li
                  key={u.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {u.email}
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Criado em{" "}
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <Badge variant={u.suspended ? "destructive" : "secondary"}>
                    {u.suspended ? "Suspenso" : "Ativo"}
                  </Badge>

                  <div className="w-full sm:w-44">
                    <Select
                      value={u.role}
                      disabled={!isAdmin || isSelf}
                      onValueChange={(v) =>
                        run(
                          roleFn({ data: { userId: u.id, role: v as AppRole } }),
                          `Perfil de ${u.email} atualizado.`,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>{roleLabel[u.role]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usuario">Usuário</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSelf || gestorBlocked}
                      onClick={() =>
                        run(
                          suspendFn({
                            data: { userId: u.id, suspended: !u.suspended },
                          }),
                          u.suspended
                            ? `${u.email} reativado.`
                            : `${u.email} suspenso.`,
                        )
                      }
                    >
                      {u.suspended ? (
                        <Play className="h-4 w-4" />
                      ) : (
                        <Pause className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={gestorBlocked}
                      onClick={() => {
                        const pwd = window.prompt(
                          `Nova senha para ${u.email} (mín. 8 caracteres):`,
                        );
                        if (!pwd) return;
                        void run(
                          passwordFn({ data: { userId: u.id, password: pwd } }),
                          `Senha de ${u.email} redefinida.`,
                        );
                      }}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>

                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSelf}
                        onClick={() => {
                          if (!window.confirm(`Excluir definitivamente ${u.email}?`))
                            return;
                          void run(
                            deleteFn({ data: { userId: u.id } }),
                            `${u.email} excluído.`,
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
