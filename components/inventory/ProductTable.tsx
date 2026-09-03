"use client";

import Link from "next/link";
import { Barcode, ImagePlus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { SupabaseClient } from "@supabase/supabase-js";
import { useRef, useState } from "react";
import { Category, Product } from "@/types";
import { Database } from "@/types/database.types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCLP } from "@/lib/utils/format";
import { deleteProduct, updateProduct } from "@/lib/services/products.service";
import { createClient } from "@/lib/supabase/client";

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  canEdit: boolean;
  onToggleActive: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
}

export function ProductTable({ products, categories, canEdit, onToggleActive, onDeleteProduct }: ProductTableProps) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const [supabase] = useState(() => createClient());
  const [imageUrls, setImageUrls] = useState<Record<string, string>>(
    () => Object.fromEntries(products.map((p) => [p.id, p.imageUrl]))
  );
  const [expandedBarcodeId, setExpandedBarcodeId] = useState<string | null>(null);

  async function handleImageChange(product: Product, url: string) {
    setImageUrls((prev) => ({ ...prev, [product.id]: url }));
    await updateProduct(supabase, product.id, {
      name: product.name,
      description: product.description,
      barcode: product.barcode,
      categoryId: product.categoryId,
      imageUrl: url,
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      minStock: product.minStock,
      supplierId: product.supplierId,
      expirationDate: product.expirationDate,
      unitType: product.unitType,
      marca: product.marca,
      talla: product.talla,
    });
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-400">
        No se encontraron productos con estos filtros.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-gray-100 text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Producto</th>
            <th className="px-4 py-3 font-medium">Código de barras</th>
            <th className="px-4 py-3 font-medium">Categoría</th>
            <th className="px-4 py-3 font-medium">Precio</th>
            <th className="px-4 py-3 font-medium">Stock</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {products.map((product) => {
            const category = categoryById.get(product.categoryId);
            return (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ProductThumb
                      product={product}
                      icon={category?.icon ?? "📦"}
                      imageUrl={imageUrls[product.id] ?? ""}
                      canEdit={canEdit}
                      supabase={supabase}
                      onImageChange={(url) => handleImageChange(product, url)}
                    />
                    <p className="font-medium text-gray-900">{product.name}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <BarcodeCell
                    product={product}
                    expanded={expandedBarcodeId === product.id}
                    onToggle={() =>
                      setExpandedBarcodeId((prev) =>
                        prev === product.id ? null : product.id
                      )
                    }
                  />
                </td>
                <td className="px-4 py-3 text-gray-600">{category?.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-900">{formatCLP(product.salePrice)}</td>
                <td className="px-4 py-3">
                  <Badge tone={product.stock === 0 ? "danger" : product.stock <= product.minStock ? "warning" : "success"}>
                    {product.stock} {product.unitType === "weight" ? "kg" : "u."}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={product.isActive ? "success" : "neutral"}>
                    {product.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {canEdit ? (
                    <div className="flex items-center gap-2">
                      <Link href={`/inventario/${product.id}`}>
                        <Button variant="secondary" size="sm">
                          Editar
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleActive(product)}
                      >
                        {product.isActive ? "Desactivar" : "Activar"}
                      </Button>
                      <button
                        onClick={() => onDeleteProduct(product)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Eliminar producto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Solo lectura</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BarcodeCell({
  product,
  expanded,
  onToggle,
}: {
  product: Product;
  expanded: boolean;
  onToggle: () => void;
}) {
  const codes = product.barcode ? product.barcode.split(",").filter(Boolean) : [];

  if (codes.length === 0) {
    return <span className="text-xs text-gray-400">Sin código</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors w-fit"
      >
        <Barcode size={14} className="shrink-0" />
        Código de barra
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          {codes.map((code) => (
            <span key={code} className="font-mono text-xs text-gray-700">
              {code}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductThumb({
  product,
  icon,
  imageUrl,
  canEdit,
  supabase,
  onImageChange,
}: {
  product: Product;
  icon: string;
  imageUrl: string;
  canEdit: boolean;
  supabase: SupabaseClient<Database>;
  onImageChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `productos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    onImageChange(data.publicUrl);
  }

  if (!canEdit) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg overflow-hidden">
        {imageUrl
          ? <img src={imageUrl} alt={product.name} className="h-10 w-10 object-cover rounded-xl" />
          : icon}
      </span>
    );
  }

  return (
    <div
      className="group relative h-10 w-10 shrink-0 cursor-pointer"
      onClick={() => inputRef.current?.click()}
      title={imageUrl ? "Cambiar foto" : "Agregar foto"}
    >
      {imageUrl ? (
        <>
          <img src={imageUrl} alt={product.name} className="h-10 w-10 rounded-xl object-cover" />
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <ImagePlus size={15} className="text-white" />
          </div>
        </>
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-lg transition-colors group-hover:bg-blue-100">
          <span className="group-hover:hidden">{icon}</span>
          <ImagePlus size={16} className="hidden text-blue-500 group-hover:block" />
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
