import { createHash, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { requireDriveAuth } from "@/integrations/drive-auth-middleware";
import { hashPassword, type AppRole, type DriveUser } from "./drive-auth.server";

export type { AppRole } from "./drive-auth.server";

export interface ManagedUser {
  id: string;
  email: string;
  role: AppRole;
  suspended: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

const ROLES: AppRole[] = ["admin", "gestor", "usuario"];
const PRIMARY_ADMIN = "b3radar@gmail.com";

function assertRole(value: unknown): AppRole {
  if (typeof value !== "string" || !ROLES.includes(value as AppRole)) throw new Error("Perfil inválido.");
  return value as AppRole;
}

function assertEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 255) throw new Error("E-mail inválido.");
  return email;
}

function assertPassword(value: unknown) {
  const password = String(value ?? "");
  if (password.length < 8 || password.length > 72) throw new Error("A senha deve ter entre 8 e 72 caracteres.");
  return password;
}

function assertId(value: unknown) {
  const id = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Usuário inválido.");
  return id;
}

async function readUsers() {
  const { readSystemDocument } = await import("./drive-storage.server");
  return readSystemDocument<DriveUser[]>("users.json", []);
}

async function updateUsers(mutate: (users: DriveUser[]) => DriveUser[]) {
  const { updateSystemDocument } = await import("./drive-storage.server");
  return updateSystemDocument<DriveUser[]>("users.json", [], mutate);
}

function requireManager(user: DriveUser, allowGestor: boolean) {
  if (user.suspended) throw new Error("Sua conta está suspensa.");
  if (user.role === "admin" || (allowGestor && user.role === "gestor")) return user.role;
  throw new Error("Você não tem permissão para esta ação.");
}

function toManaged(user: DriveUser): ManagedUser {
  return { id: user.id, email: user.email, role: user.role, suspended: user.suspended, createdAt: user.createdAt, lastSignInAt: user.lastSignInAt };
}

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireDriveAuth])
  .handler(async ({ context }) => ({ userId: context.userId, role: context.user.role, suspended: context.user.suspended }));

export const listManagedUsers = createServerFn({ method: "GET" })
  .middleware([requireDriveAuth])
  .handler(async ({ context }): Promise<ManagedUser[]> => {
    requireManager(context.user, true);
    return (await readUsers()).map(toManaged).sort((a, b) => a.email.localeCompare(b.email));
  });

export const createManagedUser = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((input: { email: string; password: string; role: AppRole }) => ({ email: assertEmail(input.email), password: assertPassword(input.password), role: assertRole(input.role) }))
  .handler(async ({ data, context }) => {
    const callerRole = requireManager(context.user, true);
    if (callerRole === "gestor" && data.role !== "usuario") throw new Error("Gestores só podem criar contas de usuário.");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await updateUsers((users) => {
      if (users.some((user) => user.email === data.email)) throw new Error("Este e-mail já está cadastrado.");
      return [...users, { id, email: data.email, role: data.role, suspended: false, createdAt: now, lastSignInAt: null, passwordHash: hashPassword(data.password), sessionVersion: 1, failedAttempts: 0, lockedUntil: null }];
    });
    return { ok: true as const, id };
  });

export const setManagedUserRole = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((input: { userId: string; role: AppRole }) => ({ userId: assertId(input.userId), role: assertRole(input.role) }))
  .handler(async ({ data, context }) => {
    requireManager(context.user, false);
    if (data.userId === context.userId) throw new Error("Você não pode alterar o próprio perfil.");
    await updateUsers((users) => users.map((user) => user.id === data.userId ? { ...user, role: data.role, sessionVersion: user.sessionVersion + 1 } : user));
    return { ok: true as const };
  });

export const setManagedUserSuspended = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((input: { userId: string; suspended: boolean }) => ({ userId: assertId(input.userId), suspended: Boolean(input.suspended) }))
  .handler(async ({ data, context }) => {
    const callerRole = requireManager(context.user, true);
    if (data.userId === context.userId) throw new Error("Você não pode suspender a própria conta.");
    await updateUsers((users) => users.map((user) => {
      if (user.id !== data.userId) return user;
      if (callerRole === "gestor" && user.role === "admin") throw new Error("Gestores não podem alterar contas de administrador.");
      return { ...user, suspended: data.suspended, sessionVersion: user.sessionVersion + 1 };
    }));
    return { ok: true as const };
  });

export const resetManagedUserPassword = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((input: { userId: string; password: string }) => ({ userId: assertId(input.userId), password: assertPassword(input.password) }))
  .handler(async ({ data, context }) => {
    const callerRole = requireManager(context.user, true);
    await updateUsers((users) => users.map((user) => {
      if (user.id !== data.userId) return user;
      if (callerRole === "gestor" && user.role === "admin") throw new Error("Gestores não podem alterar contas de administrador.");
      return { ...user, passwordHash: hashPassword(data.password), sessionVersion: user.sessionVersion + 1, failedAttempts: 0, lockedUntil: null };
    }));
    return { ok: true as const };
  });

export const deleteManagedUser = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((input: { userId: string }) => ({ userId: assertId(input.userId) }))
  .handler(async ({ data, context }) => {
    requireManager(context.user, false);
    if (data.userId === context.userId) throw new Error("Você não pode excluir a própria conta.");
    await updateUsers((users) => users.filter((user) => user.id !== data.userId));
    return { ok: true as const };
  });

export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string; bootstrapKey: string }) => ({ email: assertEmail(input.email), password: assertPassword(input.password), bootstrapKey: String(input.bootstrapKey ?? "") }))
  .handler(async ({ data }) => {
    try {
      if (data.email !== PRIMARY_ADMIN) return { ok: false as const, error: `O primeiro administrador deve usar ${PRIMARY_ADMIN}.` };
      const expected = process.env["B3_RADAR_BOOTSTRAP_KEY"];
      if (!expected) throw new Error("A chave de primeiro acesso não está configurada.");
      const suppliedDigest = createHash("sha256").update(data.bootstrapKey).digest();
      const expectedDigest = createHash("sha256").update(expected).digest();
      if (!timingSafeEqual(suppliedDigest, expectedDigest)) return { ok: false as const, error: "Chave de primeiro acesso inválida." };
      const now = new Date().toISOString();
      await updateUsers((users) => {
        if (users.some((user) => user.role === "admin")) throw new Error("O administrador já foi configurado.");
        return [...users, { id: crypto.randomUUID(), email: PRIMARY_ADMIN, role: "admin", suspended: false, createdAt: now, lastSignInAt: null, passwordHash: hashPassword(data.password), sessionVersion: 1, failedAttempts: 0, lockedUntil: null }];
      });
      return { ok: true as const, error: null };
    } catch (error) {
      console.error("[bootstrap-first-admin]", error);
      return { ok: false as const, error: error instanceof Error ? error.message : "Não foi possível criar o administrador." };
    }
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return { exists: (await readUsers()).some((user) => user.role === "admin"), error: null };
  } catch (error) {
    console.error("[admin-exists]", error);
    return { exists: null, error: error instanceof Error ? error.message : "Não foi possível acessar o Google Drive." };
  }
});