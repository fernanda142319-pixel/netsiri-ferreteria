"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { Role } from "@/types";

export async function createUser(data: {
  fullName: string;
  email: string;
  password: string;
  role: Role;
}): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Error al crear el usuario." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    full_name: data.fullName,
    role: data.role,
    is_active: true,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  return { error: null };
}
