"use client";

import { useRouter } from "next/navigation";
import { Menu, LogOut, ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { roleLabels } from "@/lib/auth/roles";
import { Badge } from "@/components/ui/Badge";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-blue-200 bg-white px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 md:hidden"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 rounded-lg p-2 text-blue-600 hover:bg-blue-50"
          aria-label="Volver"
        >
          <ChevronLeft size={22} />
        </button>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        {profile && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">
              {profile.fullName}
            </span>
            <Badge tone="brand">{roleLabels[profile.role]}</Badge>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
