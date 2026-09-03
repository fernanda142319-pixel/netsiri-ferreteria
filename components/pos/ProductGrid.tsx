import { Category, Product } from "@/types";
import { ProductCard } from "@/components/pos/ProductCard";

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  allowOverstock: boolean;
  onAdd: (product: Product) => void;
}

export function ProductGrid({ products, categories, allowOverstock, onAdd }: ProductGridProps) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-400">
        No se encontraron productos.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          category={categoryById.get(product.categoryId)}
          allowOverstock={allowOverstock}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}
