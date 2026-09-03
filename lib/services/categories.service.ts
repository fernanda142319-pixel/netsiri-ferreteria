import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { mapCategoryRow } from "@/lib/supabase/mappers";

export async function listCategories(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error || !data) return { categories: [], error: error?.message ?? null };
  return { categories: data.map(mapCategoryRow), error: null };
}

export async function deleteCategory(supabase: SupabaseClient<Database>, id: string) {
  const { error } = await supabase
    .from("categories")
    .update({ is_active: false })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function createCategory(
  supabase: SupabaseClient<Database>,
  name: string,
  icon: string
) {
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, icon, color: "#6366f1", is_active: true })
    .select()
    .single();
  if (error || !data) return { category: null, error: error?.message ?? null };
  return { category: mapCategoryRow(data), error: null };
}

export async function updateCategory(
  supabase: SupabaseClient<Database>,
  id: string,
  name: string,
  icon: string
) {
  const { error } = await supabase
    .from("categories")
    .update({ name, icon })
    .eq("id", id);
  return { error: error?.message ?? null };
}
