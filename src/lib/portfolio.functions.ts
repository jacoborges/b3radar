import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PortfolioLot {
  id: string;
  ticker: string;
  price: number;
  quantity: number;
  boughtAt: string;
}

export interface PortfolioSale {
  id: string;
  ticker: string;
  price: number;
  quantity: number;
  soldAt: string;
}

export interface Portfolio {
  id: string;
  name: string;
  createdAt: string;
  lots: PortfolioLot[];
  sales: PortfolioSale[];
}

const idSchema = z.object({ id: z.string().uuid() });
const nameSchema = z.string().trim().min(1, "Informe um nome.").max(60);

const createPortfolioSchema = z.object({ name: nameSchema });
const renamePortfolioSchema = z.object({ id: z.string().uuid(), name: nameSchema });

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

export const listPortfolios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Portfolio[]> => {
    const { supabase, userId } = context;

    const { data: portfolios, error } = await supabase
      .from("portfolios")
      .select("id, name, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (portfolios ?? []).map((p) => p.id);
    let lots: Array<{
      id: string;
      portfolio_id: string;
      ticker: string;
      price: number | string;
      quantity: number | string;
      bought_at: string;
    }> = [];

    if (ids.length > 0) {
      const { data, error: lotsError } = await supabase
        .from("portfolio_lots")
        .select("id, portfolio_id, ticker, price, quantity, bought_at")
        .in("portfolio_id", ids)
        .order("bought_at", { ascending: true });
      if (lotsError) throw new Error(lotsError.message);
      lots = data ?? [];
    }

    return (portfolios ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.created_at,
      lots: lots
        .filter((l) => l.portfolio_id === p.id)
        .map((l) => ({
          id: l.id,
          ticker: l.ticker,
          price: Number(l.price),
          quantity: Number(l.quantity),
          boughtAt: l.bought_at,
        })),
    }));
  });

export const createPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createPortfolioSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("portfolios")
      .insert({ name: data.name, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renamePortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => renamePortfolioSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("portfolios")
      .update({ name: data.name })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("portfolios")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => lotSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("portfolio_lots").insert({
      portfolio_id: data.portfolioId,
      ticker: data.ticker,
      price: data.price,
      quantity: data.quantity,
      bought_at: data.boughtAt,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateLotSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("portfolio_lots")
      .update({
        price: data.price,
        quantity: data.quantity,
        bought_at: data.boughtAt,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("portfolio_lots")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
