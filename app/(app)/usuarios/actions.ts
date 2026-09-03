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

  if (authError) {
    const msg = authError.message.toLowerCase();
    if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
      return { error: "Este correo ya está registrado." };
    }
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "Error al crear el usuario." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    full_name: data.fullName,
    role: data.role,
    is_active: true,
  });

  if (profileError) {
    if (profileError.message.includes("duplicate key")) {
      return { error: "Este correo ya tiene un perfil registrado." };
    }
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  return { error: null };
}

export async function deleteUser(userId: string): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const { error: profileError } = await admin.from("profiles").delete().eq("id", userId);
  if (profileError) return { error: profileError.message };

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) return { error: authError.message };

  return { error: null };
}
