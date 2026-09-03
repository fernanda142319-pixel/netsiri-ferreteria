"use client";

import { useState } from "react";
import { Plus, X, Search } from "lucide-react";
import { Product } from "@/types";
import { formatCLP } from "@/lib/utils/format";
import { Badge } from "@/components/ui/Badge";

interface SupplierProductsPanelProps {
  supplierId: string;
  supplierProducts: Product[];
  allProducts: Product[];
  canManage: boolean;
  onAssign: (productId: string) => Promise<void>;
  onRemove: (productId: string) => Promise<void>;
}

export function SupplierProductsPanel({
  supplierId,
  supplierProducts,
  allProducts,
  canManage,
  onAssign,
  onRemove,
}: SupplierProductsPanelProps) {
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const assignedIds = new Set(supplierProducts.map((p) => p.id));

  const suggestions = search.trim().length >= 1
    ? allProducts
        .filter(
          (p) =>
            !assignedIds.has(p.id) &&
            p.name.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 8)
    : [];

  async function handleAssign(product: Product) {
    setLoadingId(product.id);
    await onAssign(product.id);
    setSearch("");
    setShowSearch(false);
    setLoadingId(null);
  }

  async function handleRemove(productId: string) {
    setLoadingId(productId);
    await onRemove(productId);
    setLoadingId(null);
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Productos asociados ({supplierProducts.length})
        </span>
        {canManage && (
          <button
            onClick={() => setShowSearch((v) => !v)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Plus size={14} />
            Agregar producto
          </button>
        )}
      </div>

      {showSearch && canManage && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto para asociar..."
            className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 text-sm text-gray-900 focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
          />
          {suggestions.length > 0 && (
            <ul className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    disabled={loadingId === p.id}
                    onClick={() => handleAssign(p)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-blue-50 disabled:opacity-50"
                  >
                    <span className="text-gray-800">{p.name}</span>
                    <span className="text-gray-400">{formatCLP(p.salePrice)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {search.trim().length >= 1 && suggestions.length === 0 && (
            <div className="absolute top-full left-0 z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-400 shadow-lg">
              No hay productos sin asignar que coincidan.
            </div>
          )}
        </div>
      )}

      {supplierProducts.length === 0 ? (
        <p className="py-2 text-sm text-gray-400">Sin productos asociados.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {supplierProducts.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-800">{p.name}</span>
                {!p.isActive && <Badge tone="neutral">Inactivo</Badge>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{formatCLP(p.salePrice)}</span>
                {canManage && (
                  <button
                    disabled={loadingId === p.id}
                    onClick={() => handleRemove(p.id)}
                    title="Quitar de este proveedor"
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
