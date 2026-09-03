"use client";

import { useState } from "react";
import { Search, ScanBarcode, Trash2 } from "lucide-react";
import { Category } from "@/types";
import { StockFilter } from "@/lib/services/products.service";
import { cn } from "@/lib/utils/cn";

interface ProductFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  barcodeSearch: string;
  onBarcodeSearchChange: (value: string) => void;
  allBarcodes?: string[];
  categories: Category[];
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  stockFilter: StockFilter;
  onStockFilterChange: (filter: StockFilter) => void;
  canManage?: boolean;
  onDeleteCategory?: (categoryId: string, categoryName: string) => void;
}

const stockFilterOptions: { value: StockFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "low", label: "Bajo stock" },
  { value: "out", label: "Sin stock" },
];

export function ProductFilters({
  search,
  onSearchChange,
  barcodeSearch,
  onBarcodeSearchChange,
  allBarcodes = [],
  categories,
  categoryId,
  onCategoryChange,
  stockFilter,
  onStockFilterChange,
  canManage = false,
  onDeleteCategory,
}: ProductFiltersProps) {
  const [showBarcodeSuggestions, setShowBarcodeSuggestions] = useState(false);

  const barcodeSuggestions = showBarcodeSuggestions
    ? (barcodeSearch.trim().length === 0
        ? allBarcodes.slice(0, 12)
        : allBarcodes.filter((c) => c.includes(barcodeSearch.trim())).slice(0, 12))
    : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre..."
            className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-base text-gray-900 focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
          />
        </div>
        <div className="relative w-72">
          <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
          <input
            value={barcodeSearch}
            onChange={(e) => {
              onBarcodeSearchChange(e.target.value);
              setShowBarcodeSuggestions(true);
            }}
            onFocus={() => setShowBarcodeSuggestions(true)}
            onBlur={() => setTimeout(() => setShowBarcodeSuggestions(false), 150)}
            placeholder="Buscar por código de barras..."
            className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-base text-gray-900 focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
          />
          {barcodeSuggestions.length > 0 && (
            <ul className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              {barcodeSuggestions.map((code) => (
                <li key={code}>
                  <button
                    type="button"
                    onMouseDown={() => {
                      onBarcodeSearchChange(code);
                      setShowBarcodeSuggestions(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-blue-50"
                  >
                    <ScanBarcode size={13} className="shrink-0 text-gray-400" />
                    <span className="font-mono text-sm text-gray-800">{code}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryChange("all")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            categoryId === "all"
              ? "bg-brand-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          Todas las categorías
        </button>
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-1">
            <button
              onClick={() => onCategoryChange(c.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                categoryId === c.id
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {c.icon} {c.name}
            </button>
            {canManage && onDeleteCategory && (
              <button
                onClick={() => onDeleteCategory(c.id, c.name)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title={`Eliminar categoría ${c.name}`}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {stockFilterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStockFilterChange(opt.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              stockFilter === opt.value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
