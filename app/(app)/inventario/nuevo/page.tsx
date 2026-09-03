"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { createProduct, listProducts, ProductInput } from "@/lib/services/products.service";
import { listCategories } from "@/lib/services/categories.service";
import { listSuppliers } from "@/lib/services/suppliers.service";
import { Category, Supplier } from "@/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProductForm } from "@/components/inventory/ProductForm";

const CAN_MANAGE_ROLES = ["owner", "admin", "warehouse"];

export default function NuevoProductoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCategoryId = searchParams.get("categoryId") ?? "";
  const { profile } = useAuth();
  const [supabase] = useState(() => createClient());

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = !!profile && CAN_MANAGE_ROLES.includes(profile.role);

  useEffect(() => {
    listCategories(supabase).then(({ categories }) => setCategories(categories));
    listSuppliers(supabase).then(({ suppliers }) => setSuppliers(suppliers));
  }, [supabase]);

  useEffect(() => {
    if (!canManage) return;
    listProducts(supabase, { includeInactive: true }).then(({ products }) => {
      setExistingNames(products.map((p) => p.name));
    });
  }, [supabase, canManage]);

  async function handleSubmit(input: ProductInput, initialStock: number) {
    setIsSubmitting(true);
    setError(null);
    const { product, error: createError } = await createProduct(supabase, input, initialStock);
    setIsSubmitting(false);

    if (createError || !product) {
      setError(createError ?? "No se pudo crear el producto.");
      return;
    }
    router.push("/inventario");
  }

  if (profile && !canManage) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <h1 className="text-xl font-bold text-gray-900">Acceso restringido</h1>
        <p className="mt-2 text-gray-500">Tu rol no puede crear productos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo producto</h1>
        <p className="text-gray-500">Completa los datos del producto que quieres agregar.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del producto</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          <ProductForm
            mode="create"
            categories={categories}
            suppliers={suppliers}
            existingNames={existingNames}
            initialValues={preselectedCategoryId ? { categoryId: preselectedCategoryId } : undefined}
            isSubmitting={isSubmitting}
            errorMessage={error}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/inventario")}
          />
        </CardBody>
      </Card>
    </div>
  );
}
