import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { Product } from "@/types";
import { mapProductRow, mapStockMovementRow } from "@/lib/supabase/mappers";
import { encodeProductMeta } from "@/lib/utils/productMeta";

export async function fetchStockAlerts(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error || !data) {
    return { lowStock: [] as Product[], outOfStock: [] as Product[], error: error?.message ?? null };
  }

  const products = data.map(mapProductRow);
  return {
    lowStock: products.filter((p) => p.stock > 0 && p.stock <= p.minStock),
    outOfStock: products.filter((p) => p.stock === 0),
    error: null,
  };
}

export type StockFilter = "all" | "low" | "out";

export interface ProductListFilters {
  search?: string;
  barcodeSearch?: string;
  categoryId?: string | "all";
  stockFilter?: StockFilter;
  includeInactive?: boolean;
}

export async function listProducts(supabase: SupabaseClient<Database>, filters: ProductListFilters = {}) {
  let query = supabase.from("products").select("*").order("name");

  if (!filters.includeInactive) {
    query = query.eq("is_active", true);
  }
  if (filters.categoryId && filters.categoryId !== "all") {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters.barcodeSearch) {
    query = query.ilike("barcode", `%${filters.barcodeSearch}%`);
  } else if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error || !data) return { products: [] as Product[], error: error?.message ?? null };

  let products = data.map(mapProductRow);
  if (filters.stockFilter === "low") {
    products = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);
  } else if (filters.stockFilter === "out") {
    products = products.filter((p) => p.stock === 0);
  }

  return { products, error: null };
}

export async function getProduct(supabase: SupabaseClient<Database>, id: string) {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error || !data) return { product: null, error: error?.message ?? "Producto no encontrado" };
  return { product: mapProductRow(data), error: null };
}

export interface ProductInput {
  name: string;
  description: string;
  barcode: string;
  categoryId: string;
  imageUrl: string;
  costPrice: number;
  salePrice: number;
  minStock: number;
  supplierId: string | null;
  expirationDate: string | null;
  unitType: "unit" | "weight";
  marca: string;
  talla: string;
}

export async function createProduct(
  supabase: SupabaseClient<Database>,
  input: ProductInput,
  initialStock: number
) {
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      description: encodeProductMeta({ description: input.description, marca: input.marca, talla: input.talla }),
      barcode: input.barcode || undefined,
      category_id: input.categoryId || undefined,
      image_url: input.imageUrl,
      cost_price: input.costPrice,
      sale_price: input.salePrice,
      stock: initialStock,
      min_stock: input.minStock,
      supplier_id: input.supplierId || undefined,
      expiration_date: input.expirationDate,
      unit_type: input.unitType,
    })
    .select("*")
    .single();

  if (error || !data) return { product: null, error: error?.message ?? "No se pudo crear el producto" };

  if (initialStock > 0) {
    await supabase.from("stock_movements").insert({
      product_id: data.id,
      type: "in",
      quantity: initialStock,
      previous_stock: 0,
      new_stock: initialStock,
      reason: "Stock inicial al crear el producto",
      created_by: (await supabase.auth.getUser()).data.user?.id ?? "",
    });
  }

  return { product: mapProductRow(data), error: null };
}

export async function updateProduct(
  supabase: SupabaseClient<Database>,
  id: string,
  input: ProductInput
) {
  const { data, error } = await supabase
    .from("products")
    .update({
      name: input.name,
      description: encodeProductMeta({ description: input.description, marca: input.marca, talla: input.talla }),
      barcode: input.barcode || undefined,
      category_id: input.categoryId || undefined,
      image_url: input.imageUrl,
      cost_price: input.costPrice,
      sale_price: input.salePrice,
      min_stock: input.minStock,
      supplier_id: input.supplierId,
      expiration_date: input.expirationDate,
      unit_type: input.unitType,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return { product: null, error: error?.message ?? "No se pudo actualizar el producto" };
  return { product: mapProductRow(data), error: null };
}

export async function setProductActive(supabase: SupabaseClient<Database>, id: string, isActive: boolean) {
  const { error } = await supabase.from("products").update({ is_active: isActive }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteProduct(supabase: SupabaseClient<Database>, id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function adjustStock(
  supabase: SupabaseClient<Database>,
  productId: string,
  type: "in" | "out",
  quantity: number,
  reason: string
) {
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_product_id: productId,
    p_type: type,
    p_quantity: quantity,
    p_reason: reason,
  });

  if (error || !data) return { product: null, error: error?.message ?? "No se pudo registrar el movimiento" };
  return { product: mapProductRow(data), error: null };
}

export async function listStockMovements(supabase: SupabaseClient<Database>, productId: string) {
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return { movements: [], error: error?.message ?? null };
  return { movements: data.map(mapStockMovementRow), error: null };
}
