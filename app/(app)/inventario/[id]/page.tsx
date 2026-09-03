"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getProduct, ProductInput, updateProduct } from "@/lib/services/products.service";
import { listCategories } from "@/lib/services/categories.service";
import { listSuppliers } from "@/lib/services/suppliers.service";
import { Category, Product, Supplier } from "@/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProductForm } from "@/components/inventory/ProductForm";
import { StockMovementPanel } from "@/components/inventory/StockMovementPanel";
import { ProductImageUpload } from "@/components/inventory/ProductImageUpload";
import { Toast } from "@/components/ui/Toast";

const CAN_MANAGE_ROLES = ["owner", "admin", "warehouse"];

export default function EditarProductoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [supabase] = useState(() => createClient());

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  const canManage = !!profile && CAN_MANAGE_ROLES.includes(profile.role);

  useEffect(() => {
    listCategories(supabase).then(({ categories }) => setCategories(categories));
    listSuppliers(supabase).then(({ suppliers }) => setSuppliers(suppliers));
    getProduct(supabase, params.id).then(({ product, error }) => {
      if (error || !product) {
        setNotFound(true);
      } else {
        setProduct(product);
      }
      setIsLoading(false);
    });
  }, [supabase, params.id]);

  async function handleSubmit(input: ProductInput) {
    setIsSubmitting(true);
    setError(null);
    const { product: updated, error: updateError } = await updateProduct(supabase, params.id, input);
    setIsSubmitting(false);

    if (updateError || !updated) {
      setError(updateError ?? "No se pudo actualizar el producto.");
      return;
    }
    setProduct(updated);
    setShowSavedToast(true);
  }

  if (profile && !canManage) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <h1 className="text-xl font-bold text-gray-900">Acceso restringido</h1>
        <p className="mt-2 text-gray-500">Tu rol no puede editar productos.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-gray-400">Cargando producto...</div>;
  }

  if (notFound || !product) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <h1 className="text-xl font-bold text-gray-900">Producto no encontrado</h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <ProductImageUpload
          imageUrl={product.imageUrl}
          size="sm"
          onChange={async (url) => {
            const { product: updated } = await updateProduct(supabase, params.id, {
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
            if (updated) setProduct(updated);
          }}
        />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-gray-500">Edita los datos del producto o registra movimientos de stock.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del producto</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          <ProductForm
            mode="edit"
            categories={categories}
            suppliers={suppliers}
            initialValues={{
              name: product.name,
              description: product.description,
              barcode: product.barcode,
              categoryId: product.categoryId,
              imageUrl: product.imageUrl,
              costPrice: product.costPrice,
              salePrice: product.salePrice,
              minStock: product.minStock,
              supplierId: product.supplierId,
              expirationDate: product.expirationDate,
              unitType: product.unitType,
              marca: product.marca,
              talla: product.talla,
            }}
            initialStock={product.stock}
            isSubmitting={isSubmitting}
            errorMessage={error}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/inventario")}
          />
        </CardBody>
      </Card>

      <StockMovementPanel
        productId={product.id}
        productName={product.name}
        currentStock={product.stock}
        onStockUpdated={(newStock) => setProduct((prev) => (prev ? { ...prev, stock: newStock } : prev))}
      />

      {showSavedToast && (
        <Toast message="Cambios guardados correctamente" onClose={() => setShowSavedToast(false)} />
      )}
    </div>
  );
}
