import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Wallet,
  BarChart3,
  Truck,
  Users,
  Settings,
  LucideIcon,
} from "lucide-react";
import { Role } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/pos", label: "Vender", icon: ShoppingCart, roles: ["owner", "admin", "cashier"] },
  { href: "/inventario", label: "Inventario", icon: Boxes, roles: ["owner", "admin", "warehouse"] },
  { href: "/caja", label: "Caja", icon: Wallet, roles: ["owner", "admin", "cashier"] },
  { href: "/reportes", label: "Reportes", icon: BarChart3, roles: ["owner", "admin"] },
  { href: "/proveedores", label: "Proveedores", icon: Truck, roles: ["owner", "admin", "warehouse"] },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ["owner", "admin"] },
  { href: "/configuracion", label: "Configuración", icon: Settings, roles: ["owner"] },
];
