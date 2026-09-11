import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/admin-users.functions";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { ActionTip } from "@/components/ActionTip";

/** Realtime count of signed-in users — admin only. */
function OnlineBadge() {
  const users = useOnlineUsers();
  const total = users.length;

  return (
    <ActionTip
      tip="online"
      how={
        total
          ? `Online agora: ${users.map((u) => u.email).join(", ")}`
          : "Nenhum usuário conectado neste momento."
      }
    >
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-input/60 px-2 py-1.5 text-xs font-medium text-muted-foreground"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      <span className="tabular-nums text-foreground">{total}</span>
      <span className="hidden sm:inline">online</span>
      </span>
    </ActionTip>
  );
}


/** Header controls for the signed-in session: users panel (admin/gestor) + sign out. */
export function AccountControls() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getMyAccess);

  const { data } = useQuery({
    queryKey: ["my-access"],
    queryFn: () => fetchAccess(),
    staleTime: 60_000,
  });

  const canManage = data?.role === "admin" || data?.role === "gestor";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      {data?.role === "admin" && <OnlineBadge />}

      {canManage && (
        <ActionTip tip="usuarios">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="shrink-0 border-border/60 bg-input/60"
          >
            <Link to="/usuarios" aria-label="Usuários">
              <Users className="h-4 w-4" />
            </Link>
          </Button>
        </ActionTip>
      )}

      <ActionTip tip="sair">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 border-border/60 bg-input/60"
          aria-label="Sair"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </ActionTip>
    </>
  );
}
