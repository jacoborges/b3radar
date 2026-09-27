import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SimLot {
  id: string;
  ticker: string;
  price: number;
  quantity: number;
  boughtAt: string;
}

export interface SimPortfolio {
  id: string;
  name: string;
  createdAt: string;
  lots: SimLot[];
}

const idSchema = z.object({ id: z.string().uuid() });
const nameSchema = z.string().trim().min(1, "Informe um nome.").max(60);

const createSchema = z.object({ name: nameSchema });
const renameSchema = z.object({ id: z.string().uuid(), name: nameSchema });

const lotSchema = z.object({
  portfolioId: z.string().uuid(),
  ticker: z.string().trim().min(1).max(12).toUpperCase(),
  price: z.number().positive().max(1_000_000),
  quantity: z.number().positive().max(1_000_000_000),
  boughtAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const updateLotSchema = z.object({
  id: z.string().uuid(),
  price: z.number().positive().max(1_000_000),
  quantity: z.number().positive().max(1_000_000_000),
  boughtAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function mutateSimulations(
  userId: string,
  mutate: (portfolios: SimPortfolio[]) => SimPortfolio[] | Promise<SimPortfolio[]>,
) {
  const { updateUserDocument } = await import("./drive-storage.server");
  return updateUserDocument(userId, "simulations.json", [] as SimPortfolio[], mutate);
}

export const listSimPortfolios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SimPortfolio[]> => {
    const { readUserDocument } = await import("./drive-storage.server");
    return readUserDocument(context.userId, "simulations.json", [] as SimPortfolio[]);
  });

export const createSimPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutateSimulations(context.userId, (items) => [...items, { id: crypto.randomUUID(), name: data.name, createdAt: new Date().toISOString(), lots: [] }]);
    return { ok: true };
  });

export const renameSimPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => renameSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutateSimulations(context.userId, (items) => items.map((item) => item.id === data.id ? { ...item, name: data.name } : item));
    return { ok: true };
  });

export const deleteSimPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutateSimulations(context.userId, (items) => items.filter((item) => item.id !== data.id));
    return { ok: true };
  });

export const addSimLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => lotSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutateSimulations(context.userId, (items) => items.map((item) => item.id === data.portfolioId ? { ...item, lots: [...item.lots, { id: crypto.randomUUID(), ticker: data.ticker, price: data.price, quantity: data.quantity, boughtAt: data.boughtAt }] } : item));
    return { ok: true };
  });

export const updateSimLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateLotSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutateSimulations(context.userId, (items) => items.map((item) => ({ ...item, lots: item.lots.map((lot) => lot.id === data.id ? { ...lot, price: data.price, quantity: data.quantity, boughtAt: data.boughtAt } : lot) })));
    return { ok: true };
  });

export const deleteSimLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutateSimulations(context.userId, (items) => items.map((item) => ({ ...item, lots: item.lots.filter((lot) => lot.id !== data.id) })));
    return { ok: true };
  });
