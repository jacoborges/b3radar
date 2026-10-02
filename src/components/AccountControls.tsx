import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/admin-users.functions";

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
      {canManage && (
        <Button
          asChild
          variant="outline"
          size="icon"
          className="shrink-0 border-border/60 bg-input/60"
          title="Usuários"
        >
          <Link to="/usuarios" aria-label="Usuários">
            <Users className="h-4 w-4" />
          </Link>
        </Button>
      )}

      <Button
        variant="outline"
        size="icon"
        className="shrink-0 border-border/60 bg-input/60"
        title="Sair"
        aria-label="Sair"
        onClick={signOut}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </>
  );
}
