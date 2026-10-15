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

const saleSchema = z.object({
  portfolioId: z.string().uuid(),
  ticker: z.string().trim().min(1).max(12).toUpperCase(),
  price: z.number().positive().max(1_000_000),
  quantity: z.number().positive().max(1_000_000_000),
  soldAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedLots: z.array(z.object({ id: z.string().uuid(), ticker: z.string(), price: z.number(), quantity: z.number(), bought_at: z.string() })),
  expectedSales: z.array(z.object({ id: z.string().uuid(), ticker: z.string(), price: z.number(), quantity: z.number(), sold_at: z.string() })),
});

const updateSaleSchema = z.object({
  id: z.string().uuid(),
  price: z.number().positive().max(1_000_000),
  quantity: z.number().positive().max(1_000_000_000),
  soldAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
    let sales: Array<{ id: string; portfolio_id: string; ticker: string; price: number | string; quantity: number | string; sold_at: string }> = [];

    if (ids.length > 0) {
      const { data, error: lotsError } = await supabase
        .from("portfolio_lots")
        .select("id, portfolio_id, ticker, price, quantity, bought_at")
        .in("portfolio_id", ids)
        .order("bought_at", { ascending: true });
      if (lotsError) throw new Error(lotsError.message);
      lots = data ?? [];
      const { data: salesData, error: salesError } = await supabase
        .from("portfolio_sales")
        .select("id, portfolio_id, ticker, price, quantity, sold_at")
        .in("portfolio_id", ids)
        .order("sold_at", { ascending: true });
      if (salesError) throw new Error(salesError.message);
      sales = salesData ?? [];
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
      sales: sales.filter((s) => s.portfolio_id === p.id).map((s) => ({
        id: s.id, ticker: s.ticker, price: Number(s.price), quantity: Number(s.quantity), soldAt: s.sold_at,
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

export const addSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => saleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const [{ portfolioLedger }, cache] = await Promise.all([
      import("./portfolio-ledger"),
      import("./proventos-cache.server"),
    ]);
    const eventsResult = await cache.readCachedTicker(data.ticker, 24 * 60 * 60 * 1000) ?? await cache.refreshOneTicker(data.ticker);
    const before = portfolioLedger(
      data.expectedLots.map((l) => ({ id: l.id, ticker: l.ticker, price: l.price, quantity: l.quantity, boughtAt: l.bought_at })),
      data.expectedSales.map((s) => ({ id: s.id, ticker: s.ticker, price: s.price, quantity: s.quantity, soldAt: s.sold_at })),
      eventsResult.historicoCompleto ?? [],
      data.soldAt,
    );
    if (data.quantity > before.quantity + 1e-8) throw new Error(`Saldo insuficiente na data da venda: ${before.quantity.toLocaleString("pt-BR")} ações disponíveis.`);
    const { error } = await context.supabase.rpc("record_portfolio_sale", {
      _portfolio_id: data.portfolioId,
      _ticker: data.ticker,
      _price: data.price,
      _quantity: data.quantity,
      _sold_at: data.soldAt,
      _expected_lots: data.expectedLots,
      _expected_sales: data.expectedSales,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateSaleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("portfolio_sales")
      .update({ price: data.price, quantity: data.quantity, sold_at: data.soldAt }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("portfolio_sales").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
