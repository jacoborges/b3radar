import { createMiddleware } from "@tanstack/react-start";
import { readSession } from "@/lib/drive-auth.server";

export const requireDriveAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const user = await readSession();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return next({ context: { userId: user.id, claims: { sub: user.id, email: user.email }, user } });
});
