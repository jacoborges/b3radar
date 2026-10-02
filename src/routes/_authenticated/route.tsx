import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getMyAccess } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const fetchAccess = useServerFn(getMyAccess);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-access"],
    queryFn: () => fetchAccess(),
    staleTime: 60_000,
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (data?.suspended) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-warning" />
          <h1 className="mt-4 text-lg font-semibold text-foreground">
            Acesso suspenso
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta está cadastrada, mas o acesso aos dados do aplicativo está
            suspenso no momento. Entre em contato com o administrador.
          </p>
          <Button variant="outline" className="mt-6" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
