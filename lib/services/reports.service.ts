import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { Product } from "@/types";
import { listProducts } from "@/lib/services/products.service";

export type ReportPeriod = "today" | "7d" | "30d" | "month" | "custom";

export interface DateRange {
  fromIso: string;
  toIso: string;
}

export function getPeriodRange(
  period: ReportPeriod,
  customFrom?: string,
  customTo?: string,
  selectedMonth?: number,
  selectedYear?: number,
): DateRange {
  if (period === "custom" && customFrom && customTo) {
    const from = new Date(customFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(customTo);
    to.setHours(23, 59, 59, 999);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  }
  if (period === "month" && selectedMonth !== undefined && selectedYear !== undefined) {
    const from = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
    const to = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  }
  const to = new Date();
  const from = new Date();
  if (period === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (period === "7d") {
    from.setDate(from.getDate() - 7);
  } else {
    from.setDate(from.getDate() - 30);
  }
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

interface SaleRow {
  id: string;
  total: number;
  payment_method: string;
  user_id: string;
  created_at: string;
}

interface SaleItemJoined {
  quantity: number;
  unit_price: number;
  subtotal: number;
  products: {
    id: string;
    name: string;
    cost_price: number;
    category_id: string | null;
    categories: { name: string } | null;
  } | null;
  sales: { created_at: string; status: string } | null;
}

export interface ProductAggregate {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
}

export interface CategoryAggregate {
  categoryId: string;
  name: string;
  total: number;
  quantity: number;
}

export interface UserSalesAggregate {
  userId: string;
  name: string;
  count: number;
  total: number;
}

export interface RawSaleItemRow {
  date: string;
  product: string;
  category: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ReportData {
  totalSales: number;
  salesCount: number;
  estimatedProfit: number;
  byUser: UserSalesAggregate[];
  topByQuantity: ProductAggregate[];
  topByProfit: ProductAggregate[];
  byCategory: CategoryAggregate[];
  noMovementProducts: Product[];
  rawSaleItems: RawSaleItemRow[];
}

export async function fetchReportData(
  supabase: SupabaseClient<Database>,
  range: DateRange,
  namesById: Map<string, string>
): Promise<ReportData> {
  const { data: salesData } = await supabase
    .from("sales")
    .select("*")
    .gte("created_at", range.fromIso)
    .lte("created_at", range.toIso)
    .eq("status", "completed");

  const sales = (salesData ?? []) as SaleRow[];
  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);

  const byUserMap = new Map<string, UserSalesAggregate>();
  for (const sale of sales) {
    const existing = byUserMap.get(sale.user_id);
    byUserMap.set(sale.user_id, {
      userId: sale.user_id,
      name: namesById.get(sale.user_id) ?? "Usuario",
      count: (existing?.count ?? 0) + 1,
      total: (existing?.total ?? 0) + sale.total,
    });
  }

  const { data: itemsData } = await supabase
    .from("sale_items")
    .select(
      "quantity, unit_price, subtotal, products(id, name, cost_price, category_id, categories(name)), sales!inner(created_at, status)"
    )
    .gte("sales.created_at", range.fromIso)
    .lte("sales.created_at", range.toIso)
    .eq("sales.status", "completed");

  const items = (itemsData ?? []) as unknown as SaleItemJoined[];

  const productMap = new Map<string, ProductAggregate>();
  const categoryMap = new Map<string, CategoryAggregate>();
  const soldProductIds = new Set<string>();
  const rawSaleItems: RawSaleItemRow[] = [];
  let estimatedProfit = 0;

  for (const item of items) {
    const product = item.products;
    if (!product) continue;
    soldProductIds.add(product.id);

    const profit = item.quantity * (item.unit_price - product.cost_price);
    estimatedProfit += profit;

    const existingProduct = productMap.get(product.id);
    productMap.set(product.id, {
      productId: product.id,
      name: product.name,
      quantity: (existingProduct?.quantity ?? 0) + item.quantity,
      revenue: (existingProduct?.revenue ?? 0) + item.subtotal,
      profit: (existingProduct?.profit ?? 0) + profit,
    });

    const categoryName = product.categories?.name ?? "Sin categoría";
    const categoryKey = product.category_id ?? "none";
    const existingCategory = categoryMap.get(categoryKey);
    categoryMap.set(categoryKey, {
      categoryId: categoryKey,
      name: categoryName,
      total: (existingCategory?.total ?? 0) + item.subtotal,
      quantity: (existingCategory?.quantity ?? 0) + item.quantity,
    });

    rawSaleItems.push({
      date: item.sales?.created_at ?? "",
      product: product.name,
      category: categoryName,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      subtotal: item.subtotal,
    });
  }

  const { products: activeProducts } = await listProducts(supabase);
  const noMovementProducts = activeProducts.filter((p) => !soldProductIds.has(p.id));

  return {
    totalSales,
    salesCount: sales.length,
    estimatedProfit,
    byUser: Array.from(byUserMap.values()).sort((a, b) => b.total - a.total),
    topByQuantity: Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
    topByProfit: Array.from(productMap.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10),
    byCategory: Array.from(categoryMap.values()).sort((a, b) => b.total - a.total),
    noMovementProducts,
    rawSaleItems,
  };
}
