import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "admin" | "gestor" | "usuario";

export interface ManagedUser {
  id: string;
  email: string;
  role: AppRole;
  suspended: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

const ROLES: AppRole[] = ["admin", "gestor", "usuario"];

function assertRole(value: unknown): AppRole {
  if (typeof value !== "string" || !ROLES.includes(value as AppRole)) {
    throw new Error("Perfil inválido.");
  }
  return value as AppRole;
}

function assertEmail(value: unknown): string {
  const email = String(value ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 255) {
    throw new Error("E-mail inválido.");
  }
  return email;
}

function assertPassword(value: unknown): string {
  const password = String(value ?? "");
  if (password.length < 8 || password.length > 72) {
    throw new Error("A senha deve ter entre 8 e 72 caracteres.");
  }
  return password;
}

function assertId(value: unknown): string {
  const id = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Usuário inválido.");
  return id;
}

/** Reads the caller's own role + status through RLS (no admin client). */
async function readAccess(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<{ role: AppRole; suspended: boolean }> {
  const [{ data: roleRow }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("suspended").eq("id", userId).maybeSingle(),
  ]);
  return {
    role: (roleRow?.role as AppRole) ?? "usuario",
    suspended: Boolean(profile?.suspended),
  };
}

/** Caller must be an active admin (or gestor when allowed). */
async function requireManager(
  context: { supabase: any; userId: string },
  allowGestor: boolean,
): Promise<AppRole> {
  const { role, suspended } = await readAccess(context.supabase, context.userId);
  if (suspended) throw new Error("Sua conta está suspensa.");
  if (role === "admin") return role;
  if (allowGestor && role === "gestor") return role;
  throw new Error("Você não tem permissão para esta ação.");
}

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await readAccess(context.supabase, context.userId);
    return { userId: context.userId, ...access };
  });

export const listManagedUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedUser[]> => {
    await requireManager(context, true);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles, error }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, suspended, created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (error) throw error;

    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const lastSignIn = new Map<string, string | null>(
      (authUsers?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]),
    );
    const roleById = new Map<string, AppRole>(
      (roles ?? []).map((r) => [r.user_id, r.role as AppRole]),
    );

    return (profiles ?? [])
      .map((p) => ({
        id: p.id,
        email: p.email,
        role: roleById.get(p.id) ?? "usuario",
        suspended: p.suspended,
        createdAt: p.created_at,
        lastSignInAt: lastSignIn.get(p.id) ?? null,
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
  });

export const createManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password: string; role: AppRole }) => ({
    email: assertEmail(input.email),
    password: assertPassword(input.password),
    role: assertRole(input.role),
  }))
  .handler(async ({ data, context }) => {
    const callerRole = await requireManager(context, true);
    if (callerRole === "gestor" && data.role !== "usuario") {
      throw new Error("Gestores só podem criar contas de usuário.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created?.user) {
      throw new Error(error?.message ?? "Não foi possível criar o usuário.");
    }

    const userId = created.user.id;
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, email: data.email, suspended: false });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });

    return { ok: true as const, id: userId };
  });

export const setManagedUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: AppRole }) => ({
    userId: assertId(input.userId),
    role: assertRole(input.role),
  }))
  .handler(async ({ data, context }) => {
    await requireManager(context, false);
    if (data.userId === context.userId) {
      throw new Error("Você não pode alterar o próprio perfil.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw error;
    return { ok: true as const };
  });

export const setManagedUserSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; suspended: boolean }) => ({
    userId: assertId(input.userId),
    suspended: Boolean(input.suspended),
  }))
  .handler(async ({ data, context }) => {
    const callerRole = await requireManager(context, true);
    if (data.userId === context.userId) {
      throw new Error("Você não pode suspender a própria conta.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (callerRole === "gestor") {
      const { data: target } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", data.userId)
        .maybeSingle();
      if (target?.role === "admin") {
        throw new Error("Gestores não podem alterar contas de administrador.");
      }
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ suspended: data.suspended })
      .eq("id", data.userId);
    if (error) throw error;
    return { ok: true as const };
  });

export const resetManagedUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; password: string }) => ({
    userId: assertId(input.userId),
    password: assertPassword(input.password),
  }))
  .handler(async ({ data, context }) => {
    const callerRole = await requireManager(context, true);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (callerRole === "gestor") {
      const { data: target } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", data.userId)
        .maybeSingle();
      if (target?.role === "admin") {
        throw new Error("Gestores não podem alterar contas de administrador.");
      }
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw error;
    return { ok: true as const };
  });

export const deleteManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => ({ userId: assertId(input.userId) }))
  .handler(async ({ data, context }) => {
    await requireManager(context, false);
    if (data.userId === context.userId) {
      throw new Error("Você não pode excluir a própria conta.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;
    return { ok: true as const };
  });

/** First-run only: allowed exclusively while the system has no admin at all. */
export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string }) => ({
    email: assertEmail(input.email),
    password: assertPassword(input.password),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) {
      throw new Error("O administrador já foi configurado.");
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created?.user) {
      throw new Error(error?.message ?? "Não foi possível criar o administrador.");
    }

    const userId = created.user.id;
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, email: data.email, suspended: false });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });

    return { ok: true as const };
  });

/** Public: tells the login screen whether first-run setup is still needed. */
export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});
