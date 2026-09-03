import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { mapProductRow, mapSupplierRow } from "@/lib/supabase/mappers";

export interface SupplierInput {
  name: string;
  rut: string;
  phone: string;
  email: string;
  address: string;
  contactName: string;
}

export async function listSuppliers(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");

  if (error || !data) return { suppliers: [], error: error?.message ?? null };
  return { suppliers: data.map(mapSupplierRow), error: null };
}

export async function createSupplier(supabase: SupabaseClient<Database>, input: SupplierInput) {
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name: input.name,
      rut: input.rut,
      phone: input.phone,
      email: input.email,
      address: input.address,
      contact_name: input.contactName,
    })
    .select("*")
    .single();

  if (error || !data) return { supplier: null, error: error?.message ?? "No se pudo crear el proveedor" };
  return { supplier: mapSupplierRow(data), error: null };
}

export async function updateSupplier(
  supabase: SupabaseClient<Database>,
  id: string,
  input: SupplierInput
) {
  const { data, error } = await supabase
    .from("suppliers")
    .update({
      name: input.name,
      rut: input.rut,
      phone: input.phone,
      email: input.email,
      address: input.address,
      contact_name: input.contactName,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return { supplier: null, error: error?.message ?? "No se pudo actualizar el proveedor" };
  return { supplier: mapSupplierRow(data), error: null };
}

export async function setSupplierActive(
  supabase: SupabaseClient<Database>,
  id: string,
  isActive: boolean
) {
  const { error } = await supabase.from("suppliers").update({ is_active: isActive }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function assignProductToSupplier(
  supabase: SupabaseClient<Database>,
  productId: string,
  supplierId: string | null
) {
  const { error } = await supabase
    .from("products")
    .update({ supplier_id: supplierId })
    .eq("id", productId);
  return { error: error?.message ?? null };
}

export async function listProductsBySupplier(supabase: SupabaseClient<Database>, supplierId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("name");

  if (error || !data) return { products: [], error: error?.message ?? null };
  return { products: data.map(mapProductRow), error: null };
}
