import { Role } from "@/types";

export const roleLabels: Record<Role, string> = {
  owner: "Dueño",
  admin: "Administrador",
  cashier: "Cajero",
  warehouse: "Operario",
};

export const fullAccessRoles: Role[] = ["owner", "admin"];
