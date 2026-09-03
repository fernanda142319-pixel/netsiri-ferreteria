import { SupabaseClient } from "@supabase/supabase-js";
import { Database, SaleItemInput } from "@/types/database.types";
import { CartItem, PaymentMethod } from "@/types";

export interface CreateSaleParams {
  cashSessionId: string;
  items: CartItem[];
  discount: number;
  paymentMethod: PaymentMethod;
  allowNegativeStock: boolean;
}

const FREE_ITEM_PRODUCT_ID = "46e903eb-55a4-4408-90c8-88dd8f9ec541";

export async function createSale(supabase: SupabaseClient<Database>, params: CreateSaleParams) {
  const items: SaleItemInput[] = params.items.map((i) => ({
    productId: i.isCustomItem ? FREE_ITEM_PRODUCT_ID : i.product.id,
    quantity: i.quantity,
    unitPrice: i.customPrice ?? i.product.salePrice,
  }));

  const { data, error } = await supabase.rpc("create_sale", {
    p_cash_session_id: params.cashSessionId,
    p_items: items,
    p_discount: params.discount,
    p_payment_method: params.paymentMethod,
    p_allow_negative_stock: params.allowNegativeStock,
  });

  if (error || !data) return { sale: null, error: error?.message ?? "No se pudo registrar la venta." };
  return { sale: data, error: null };
}

export interface DashboardSalesSummary {
  salesToday: number;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  salesCount: number;
  topProductName: string;
  estimatedProfitToday: number;
}

interface SaleItemWithJoins {
  quantity: number;
  unit_price: number;
  products: { name: string; cost_price: number } | null;
}

export async function fetchDashboardSalesSummary(
  supabase: SupabaseClient<Database>
): Promise<DashboardSalesSummary> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startIso = startOfDay.toISOString();

  const { data: salesData } = await supabase
    .from("sales")
    .select("total, payment_method")
    .gte("created_at", startIso)
    .eq("status", "completed");

  const sales = salesData ?? [];
  const salesToday = sales.reduce((sum, s) => sum + s.total, 0);
  const sumByMethod = (method: string) =>
    sales.filter((s) => s.payment_method === method).reduce((sum, s) => sum + s.total, 0);

  const { data: itemsData } = await supabase
    .from("sale_items")
    .select("quantity, unit_price, products(name, cost_price), sales!inner(created_at, status)")
    .gte("sales.created_at", startIso)
    .eq("sales.status", "completed");

  const items = (itemsData ?? []) as unknown as SaleItemWithJoins[];
  const qtyByProduct = new Map<string, number>();
  let estimatedProfitToday = 0;

  for (const item of items) {
    if (!item.products) continue;
    estimatedProfitToday += item.quantity * (item.unit_price - item.products.cost_price);
    qtyByProduct.set(item.products.name, (qtyByProduct.get(item.products.name) ?? 0) + item.quantity);
  }

  let topProductName = "—";
  let topQty = 0;
  for (const [name, qty] of qtyByProduct.entries()) {
    if (qty > topQty) {
      topQty = qty;
      topProductName = name;
    }
  }

  return {
    salesToday,
    totalCash: sumByMethod("cash"),
    totalCard: sumByMethod("card"),
    totalTransfer: sumByMethod("transfer"),
    salesCount: sales.length,
    topProductName,
    estimatedProfitToday,
  };
}
