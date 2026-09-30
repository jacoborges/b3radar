import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { authenticateUser, clearSessionCookie, readSession, sessionCookie } from "./drive-auth.server";

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72),
});

export const getDriveSession = createServerFn({ method: "GET" }).handler(async () => {
  const user = await readSession();
  return { user: user ? { id: user.id, email: user.email, role: user.role, suspended: user.suspended } : null };
});

export const signInToDrive = createServerFn({ method: "POST" })
  .inputValidator((input) => credentials.parse(input))
  .handler(async ({ data }) => {
    const user = await authenticateUser(data.email, data.password);
    setResponseHeader("Set-Cookie", sessionCookie(user));
    return { user: { id: user.id, email: user.email, role: user.role } };
  });

export const signOutFromDrive = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader("Set-Cookie", clearSessionCookie());
  return { ok: true as const };
});