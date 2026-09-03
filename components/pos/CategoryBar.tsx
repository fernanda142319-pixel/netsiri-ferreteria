"use client";

import { Category } from "@/types";
import { cn } from "@/lib/utils/cn";
import { getCategoryColor } from "@/lib/utils/categoryColors";

interface CategoryBarProps {
  categories: Category[];
  activeCategoryId: string;
  onSelect: (categoryId: string) => void;
}

export function CategoryBar({ categories, activeCategoryId, onSelect }: CategoryBarProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      <button
        onClick={() => onSelect("all")}
        className={cn(
          "flex min-w-[88px] flex-col items-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
          activeCategoryId === "all"
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        )}
      >
        <span className="text-2xl">🏷️</span>
        Todas
      </button>
      {categories.map((category) => {
        const isActive = activeCategoryId === category.id;
        const colors = getCategoryColor(category.color);
        return (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={cn(
              "flex min-w-[88px] flex-col items-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
              isActive ? cn(colors.activeBg, "text-white") : cn(colors.bg, colors.text, "hover:opacity-80")
            )}
          >
            <span className="text-2xl">{category.icon}</span>
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
