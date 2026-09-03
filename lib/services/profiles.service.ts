import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

export async function listProfileNames(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from("profiles").select("id, full_name");
  if (error || !data) return { namesById: new Map<string, string>(), error: error?.message ?? null };

  const namesById = new Map(data.map((p) => [p.id, p.full_name]));
  return { namesById, error: null };
}
