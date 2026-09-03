"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { navItems } from "@/lib/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/auth/AuthProvider";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const visibleItems = navItems.filter(
    (item) => !item.roles || (profile && item.roles.includes(profile.role))
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col transition-transform md:static md:translate-x-0",
          "bg-gradient-to-b from-blue-900 to-blue-700",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <span className="flex items-center gap-2 text-xl font-bold text-white">
            Netsiri Inventario
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-blue-200 hover:bg-blue-800 md:hidden"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors",
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon size={22} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-5 text-xs text-blue-300">
          Netsiri Inventario · v0.1
        </div>
      </aside>
    </>
  );
}
