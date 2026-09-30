import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDriveAuth } from "@/integrations/drive-auth-middleware";

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
});

const updateSaleSchema = z.object({
  id: z.string().uuid(),
  price: z.number().positive().max(1_000_000),
  quantity: z.number().positive().max(1_000_000_000),
  soldAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function mutatePortfolios(
  userId: string,
  mutate: (portfolios: Portfolio[]) => Portfolio[] | Promise<Portfolio[]>,
) {
  const { updateUserDocument } = await import("./drive-storage.server");
  return updateUserDocument(userId, "portfolios.json", [] as Portfolio[], mutate);
}

export const listPortfolios = createServerFn({ method: "GET" })
  .middleware([requireDriveAuth])
  .handler(async ({ context }): Promise<Portfolio[]> => {
    const { readUserDocument } = await import("./drive-storage.server");
    return readUserDocument(context.userId, "portfolios.json", [] as Portfolio[]);
  });

export const createPortfolio = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((data) => createPortfolioSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutatePortfolios(context.userId, (items) => [...items, {
      id: crypto.randomUUID(), name: data.name, createdAt: new Date().toISOString(), lots: [], sales: [],
    }]);
    return { ok: true };
  });

export const renamePortfolio = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((data) => renamePortfolioSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutatePortfolios(context.userId, (items) => items.map((item) => item.id === data.id ? { ...item, name: data.name } : item));
    return { ok: true };
  });

export const deletePortfolio = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutatePortfolios(context.userId, (items) => items.filter((item) => item.id !== data.id));
    return { ok: true };
  });

export const addLot = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((data) => lotSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutatePortfolios(context.userId, (items) => items.map((item) => item.id === data.portfolioId ? {
      ...item, lots: [...item.lots, { id: crypto.randomUUID(), ticker: data.ticker, price: data.price, quantity: data.quantity, boughtAt: data.boughtAt }],
    } : item));
    return { ok: true };
  });

export const updateLot = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((data) => updateLotSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutatePortfolios(context.userId, (items) => items.map((item) => ({ ...item, lots: item.lots.map((lot) => lot.id === data.id ? { ...lot, price: data.price, quantity: data.quantity, boughtAt: data.boughtAt } : lot) })));
    return { ok: true };
  });

export const deleteLot = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutatePortfolios(context.userId, (items) => items.map((item) => ({ ...item, lots: item.lots.filter((lot) => lot.id !== data.id) })));
    return { ok: true };
  });

function availableForSale(portfolio: Portfolio, ticker: string, date: string, ignoredSaleId?: string) {
  const bought = portfolio.lots.filter((lot) => lot.ticker === ticker && lot.boughtAt <= date).reduce((sum, lot) => sum + lot.quantity, 0);
  const sold = portfolio.sales.filter((sale) => sale.ticker === ticker && sale.soldAt <= date && sale.id !== ignoredSaleId).reduce((sum, sale) => sum + sale.quantity, 0);
  return bought - sold;
}

export const addSale = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((data) => saleSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutatePortfolios(context.userId, (items) => items.map((item) => {
      if (item.id !== data.portfolioId) return item;
      const available = availableForSale(item, data.ticker, data.soldAt);
      if (data.quantity > available + 1e-9) throw new Error(`Quantidade maior que o saldo disponível nessa data (${available}).`);
      return { ...item, sales: [...item.sales, { id: crypto.randomUUID(), ticker: data.ticker, price: data.price, quantity: data.quantity, soldAt: data.soldAt }] };
    }));
    return { ok: true };
  });

export const updateSale = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((data) => updateSaleSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutatePortfolios(context.userId, (items) => items.map((item) => {
      const current = item.sales.find((sale) => sale.id === data.id);
      if (!current) return item;
      const available = availableForSale(item, current.ticker, data.soldAt, data.id);
      if (data.quantity > available + 1e-9) throw new Error(`Quantidade maior que o saldo disponível nessa data (${available}).`);
      return { ...item, sales: item.sales.map((sale) => sale.id === data.id ? { ...sale, price: data.price, quantity: data.quantity, soldAt: data.soldAt } : sale) };
    }));
    return { ok: true };
  });

export const deleteSale = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutatePortfolios(context.userId, (items) => items.map((item) => ({ ...item, sales: item.sales.filter((sale) => sale.id !== data.id) })));
    return { ok: true };
  });
