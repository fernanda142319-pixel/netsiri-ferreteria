"use client";

import { Category, Product } from "@/types";
import { formatCLP } from "@/lib/utils/format";
import { getCategoryColor } from "@/lib/utils/categoryColors";
import { Badge } from "@/components/ui/Badge";

interface ProductCardProps {
  product: Product;
  category?: Category;
  allowOverstock: boolean;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, category, allowOverstock, onAdd }: ProductCardProps) {
  const colors = getCategoryColor(category?.color ?? "gray");
  const outOfStock = product.stock <= 0;
  const disabled = outOfStock && !allowOverstock;

  return (
    <button
      onClick={() => onAdd(product)}
      disabled={disabled}
      className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:-translate-y-0"
    >
      <div className={`flex h-24 items-center justify-center overflow-hidden text-4xl ${colors.bg}`}>
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          : category?.icon ?? "📦"}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-2 text-sm font-semibold text-gray-900">{product.name}</p>
        <p className="text-lg font-bold text-brand-700">{formatCLP(product.salePrice)}</p>
        <Badge tone={outOfStock ? "danger" : product.stock <= product.minStock ? "warning" : "neutral"}>
          {outOfStock ? "Sin stock" : `Stock: ${product.stock}`}
        </Badge>
      </div>
    </button>
  );
}
