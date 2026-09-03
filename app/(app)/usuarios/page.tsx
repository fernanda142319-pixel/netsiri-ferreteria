"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Profile, Role } from "@/types";
import { roleLabels } from "@/lib/auth/roles";
import { createUser, deleteUser } from "./actions";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const ROLES: Role[] = ["owner", "admin", "cashier", "warehouse"];

export default function UsuariosPage() {
  const { profile } = useAuth();
  const [supabase] = useState(() => createClient());
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("cashier");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const canManage = profile?.role === "owner" || profile?.role === "admin";

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, is_active, created_at")
      .order("created_at", { ascending: true });

    setUsers(
      (data ?? []).map((p) => ({
        id: p.id,
        fullName: p.full_name,
        role: p.role as Role,
        isActive: p.is_active,
        createdAt: p.created_at,
      }))
    );
  }

  useEffect(() => {
    async function init() {
      await loadUsers();
      setIsLoading(false);
    }
    init();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Completa todos los campos.");
      return;
    }
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);
    const { error: createError } = await createUser({ fullName, email, password, role });
    setIsSubmitting(false);

    if (createError) {
      setError(createError);
      return;
    }

    await loadUsers();
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("cashier");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  async function handleDelete(userId: string) {
    setDeletingId(userId);
    setConfirmDeleteId(null);
    const { error } = await deleteUser(userId);
    setDeletingId(null);
    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  }

  if (profile && !canManage) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <h1 className="text-xl font-bold text-gray-900">Acceso restringido</h1>
        <p className="mt-2 text-gray-500">Tu rol no puede gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

      {/* Formulario siempre visible */}
      <div className="w-full lg:w-80 shrink-0">
        <Card className="p-6">
          <h2 className="mb-1 text-lg font-bold text-gray-900">Agregar usuario</h2>
          <p className="mb-4 text-sm text-gray-500">Crea un acceso nuevo para tu equipo.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="fullName"
              label="Nombre completo"
              placeholder="Ej: María González"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              id="email"
              type="email"
              label="Correo"
              placeholder="usuario@negocio.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              id="password"
              type="password"
              label="Contraseña"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="role" className="text-sm font-medium text-gray-700">
                Rol
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r]}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            {success && (
              <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
                Usuario creado correctamente.
              </p>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear usuario"}
            </Button>
          </form>
        </Card>
      </div>

      {/* Lista de usuarios */}
      <div className="flex-1">
        <div className="mb-3">
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500">Equipo con acceso al sistema.</p>
        </div>
        <Card className="p-0 overflow-hidden">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-500">Cargando usuarios...</p>
          ) : users.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No hay usuarios registrados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Rol</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{u.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{roleLabels[u.role]}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.isActive
                            ? "bg-brand-50 text-brand-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {u.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {/* No permitir eliminar al propio usuario */}
                      {u.id !== profile?.id && (
                        confirmDeleteId === u.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">¿Eliminar?</span>
                            <button
                              onClick={() => handleDelete(u.id)}
                              disabled={deletingId === u.id}
                              className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {deletingId === u.id ? "Eliminando..." : "Sí, eliminar"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(u.id)}
                            className="flex items-center gap-1 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Eliminar usuario"
                          >
                            <Trash2 size={15} />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
