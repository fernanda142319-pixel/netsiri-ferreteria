import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { CashMovement, CashMovementType, CashSession, PaymentMethod } from "@/types";
import { mapCashMovementRow, mapCashSessionRow } from "@/lib/supabase/mappers";
import { adjustStock } from "@/lib/services/products.service";

export async function getOpenCashSession(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { session: null, error: error.message };
  return { session: data ? mapCashSessionRow(data) : null, error: null };
}

export async function openCashSession(supabase: SupabaseClient<Database>, openingAmount: number) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { session: null, error: "No hay sesión activa." };

  const { data, error } = await supabase
    .from("cash_sessions")
    .insert({ opened_by: userId, opening_amount: openingAmount, status: "open" })
    .select("*")
    .single();

  if (error || !data) return { session: null, error: error?.message ?? "No se pudo abrir la caja." };
  return { session: mapCashSessionRow(data), error: null };
}

export interface SessionSale {
  id: string;
  total: number;
  paymentMethod: PaymentMethod;
  userId: string;
  createdAt: string;
}

export interface SessionSaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface SessionSaleDetail extends SessionSale {
  discount: number;
  items: SessionSaleItem[];
}

export async function listSalesForSession(supabase: SupabaseClient<Database>, sessionId: string) {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("cash_session_id", sessionId)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (error || !data) return { sales: [] as SessionSale[], error: error?.message ?? null };

  const sales: SessionSale[] = data.map((s) => ({
    id: s.id,
    total: s.total,
    paymentMethod: s.payment_method,
    userId: s.user_id,
    createdAt: s.created_at,
  }));
  return { sales, error: null };
}

export async function listSalesDetailForSession(
  supabase: SupabaseClient<Database>,
  sessionId: string
) {
  const { data, error } = await supabase
    .from("sales")
    .select("*, sale_items(id, quantity, unit_price, subtotal, product_id, products(name))")
    .eq("cash_session_id", sessionId)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (error || !data) return { sales: [] as SessionSaleDetail[], error: error?.message ?? null };

  const sales: SessionSaleDetail[] = (data as any[]).map((s) => ({
    id: s.id,
    total: s.total,
    discount: s.discount ?? 0,
    paymentMethod: s.payment_method,
    userId: s.user_id,
    createdAt: s.created_at,
    items: (s.sale_items ?? []).map((item: any) => ({
      productId: item.product_id,
      productName: item.products?.name ?? "Producto eliminado",
      quantity: item.quantity,
      unitPrice: item.unit_price,
      subtotal: item.subtotal,
    })),
  }));

  return { sales, error: null };
}

export async function listManualCashMovements(supabase: SupabaseClient<Database>, sessionId: string) {
  const { data, error } = await supabase
    .from("cash_movements")
    .select("*")
    .eq("cash_session_id", sessionId)
    .in("type", ["income", "withdrawal"])
    .order("created_at", { ascending: false });

  if (error || !data) return { movements: [] as CashMovement[], error: error?.message ?? null };
  return { movements: data.map(mapCashMovementRow), error: null };
}

export async function addCashMovement(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  type: CashMovementType,
  amount: number,
  description: string
) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { movement: null, error: "No hay sesión activa." };

  const { data, error } = await supabase
    .from("cash_movements")
    .insert({ cash_session_id: sessionId, type, amount, description, created_by: userId })
    .select("*")
    .single();

  if (error || !data) {
    return { movement: null, error: error?.message ?? "No se pudo registrar el movimiento." };
  }
  return { movement: mapCashMovementRow(data), error: null };
}

export async function closeCashSession(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  countedCash: number,
  expectedCash: number
) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { session: null, error: "No hay sesión activa." };

  const { data, error } = await supabase
    .from("cash_sessions")
    .update({
      status: "closed",
      closed_by: userId,
      closed_at: new Date().toISOString(),
      closing_amount: countedCash,
      counted_cash: countedCash,
      expected_cash: expectedCash,
      difference: countedCash - expectedCash,
    })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error || !data) return { session: null, error: error?.message ?? "No se pudo cerrar la caja." };
  return { session: mapCashSessionRow(data), error: null };
}

export async function listCashSessionsInRange(
  supabase: SupabaseClient<Database>,
  fromIso: string,
  toIso: string
) {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select("*")
    .gte("opened_at", fromIso)
    .lte("opened_at", toIso)
    .order("opened_at", { ascending: false });

  if (error || !data) return { sessions: [] as CashSession[], error: error?.message ?? null };
  return { sessions: data.map(mapCashSessionRow), error: null };
}

export async function cancelSale(
  supabase: SupabaseClient<Database>,
  saleId: string,
  items: SessionSaleItem[]
) {
  const { error } = await supabase
    .from("sales")
    .update({ status: "cancelled" })
    .eq("id", saleId);

  if (error) return { error: error.message };

  for (const item of items) {
    await adjustStock(
      supabase,
      item.productId,
      "in",
      item.quantity,
      `Devolución automática por anulación de venta`
    );
  }

  return { error: null };
}
