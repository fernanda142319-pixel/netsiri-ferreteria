import { Role } from "@/types";

export interface DemoAccount {
  email: string;
  fullName: string;
  role: Role;
  roleLabel: string;
}

export const demoAccounts: DemoAccount[] = [
  { email: "duenio@minipos.cl", fullName: "Carolina Pérez", role: "owner", roleLabel: "Dueño" },
  { email: "admin@minipos.cl", fullName: "Felipe Rojas", role: "admin", roleLabel: "Administrador" },
  { email: "cajero@minipos.cl", fullName: "Daniela Soto", role: "cashier", roleLabel: "Cajero" },
  { email: "bodega@minipos.cl", fullName: "Matías Vidal", role: "warehouse", roleLabel: "Bodeguero" },
];
