"use client";

import { useEffect, useState } from "react";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import {
  assignProductToSupplier,
  createSupplier,
  listSuppliers,
  setSupplierActive,
  SupplierInput,
  updateSupplier,
} from "@/lib/services/suppliers.service";
import { createProduct, listProducts } from "@/lib/services/products.service";
import { Product, Supplier } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { SupplierFormModal } from "@/components/suppliers/SupplierFormModal";
import { SupplierProductsPanel } from "@/components/suppliers/SupplierProductsPanel";
import { formatCLP } from "@/lib/utils/format";

const CAN_MANAGE_ROLES = ["owner", "admin"];
const CAN_VIEW_ROLES = ["owner", "admin", "warehouse"];

export default function ProveedoresPage() {
  const { profile } = useAuth();
  const [supabase] = useState(() => createClient());

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = !!profile && CAN_MANAGE_ROLES.includes(profile.role);
  const canView = !!profile && CAN_VIEW_ROLES.includes(profile.role);

  useEffect(() => {
    if (!canView) return;
    Promise.all([
      listSuppliers(supabase),
      listProducts(supabase, { includeInactive: true }),
    ]).then(([supplierRes, productRes]) => {
      setSuppliers(supplierRes.suppliers);
      setProducts(productRes.products);
      setIsLoading(false);
    });
  }, [supabase, canView]);

  function productsFor(supplierId: string) {
    return products.filter((p) => p.supplierId === supplierId);
  }

  function openCreate() {
    setEditingSupplier(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(input: SupplierInput, productIds: string[], newProductNames: string[]) {
    setIsSubmitting(true);
    setError(null);

    const result = editingSupplier
      ? await updateSupplier(supabase, editingSupplier.id, input)
      : await createSupplier(supabase, input);

    setIsSubmitting(false);

    if (result.error || !result.supplier) {
      setError(result.error ?? "No se pudo guardar el proveedor.");
      return;
    }

    const supplierId = result.supplier.id;

    // Quitar los productos que estaban y ya no están seleccionados
    const previousIds = products
      .filter((p) => p.supplierId === (editingSupplier?.id ?? null))
      .map((p) => p.id);

    const toRemove = previousIds.filter((id) => !productIds.includes(id));
    const toAdd = productIds.filter((id) => !previousIds.includes(id));

    await Promise.all([
      ...toRemove.map((id) => assignProductToSupplier(supabase, id, null)),
      ...toAdd.map((id) => assignProductToSupplier(supabase, id, supplierId)),
    ]);

    // Crear productos nuevos con nombre libre y asociarlos al proveedor
    const createdProducts = await Promise.all(
      newProductNames.map((name) =>
        createProduct(supabase, {
          name,
          description: "",
          barcode: "",
          categoryId: "",
          imageUrl: "",
          costPrice: 0,
          salePrice: 0,
          minStock: 0,
          supplierId,
          expirationDate: null,
          unitType: "unit",
          marca: "",
          talla: "",
        }, 0)
      )
    );

    setProducts((prev) => {
      const updated = prev.map((p) => {
        if (toAdd.includes(p.id)) return { ...p, supplierId };
        if (toRemove.includes(p.id)) return { ...p, supplierId: null };
        return p;
      });
      const newOnes = createdProducts.flatMap((r) => r.product ? [r.product] : []);
      return [...updated, ...newOnes];
    });

    setSuppliers((prev) => {
      if (editingSupplier) {
        return prev.map((s) => (s.id === supplierId ? result.supplier! : s));
      }
      return [...prev, result.supplier!].sort((a, b) => a.name.localeCompare(b.name));
    });
    setModalOpen(false);
  }

  async function handleToggleActive(supplier: Supplier) {
    await setSupplierActive(supabase, supplier.id, !supplier.isActive);
    setSuppliers((prev) =>
      prev.map((s) => (s.id === supplier.id ? { ...s, isActive: !s.isActive } : s))
    );
  }

  async function handleAssignProduct(supplierId: string, productId: string) {
    await assignProductToSupplier(supabase, productId, supplierId);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, supplierId } : p))
    );
  }

  async function handleRemoveProduct(productId: string) {
    await assignProductToSupplier(supabase, productId, null);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, supplierId: null } : p))
    );
  }

  if (profile && !canView) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <h1 className="text-xl font-bold text-gray-900">Acceso restringido</h1>
        <p className="mt-2 text-gray-500">Tu rol no tiene acceso al módulo de proveedores.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-gray-500">Administra los proveedores de tu negocio.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus size={18} /> Nuevo proveedor
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-400">
          Cargando proveedores...
        </div>
      ) : suppliers.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-400">
          No hay proveedores registrados todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {suppliers.map((supplier) => {
            const supplierProducts = productsFor(supplier.id);
            const isExpanded = expandedId === supplier.id;
            return (
              <Card key={supplier.id}>
                <CardBody>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                        <Badge tone={supplier.isActive ? "success" : "neutral"}>
                          {supplier.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{supplier.rut}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        {supplier.contactName} · {supplier.phone} · {supplier.email}
                      </p>
                      <p className="text-sm text-gray-500">{supplier.address}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : supplier.id)}
                        className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                      >
                        {supplierProducts.length} producto{supplierProducts.length === 1 ? "" : "s"}{" "}
                        asociado{supplierProducts.length === 1 ? "" : "s"}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {canManage && (
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(supplier)}>
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(supplier)}>
                            {supplier.isActive ? "Desactivar" : "Activar"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <SupplierProductsPanel
                      supplierId={supplier.id}
                      supplierProducts={supplierProducts}
                      allProducts={products}
                      canManage={canManage}
                      onAssign={(productId) => handleAssignProduct(supplier.id, productId)}
                      onRemove={handleRemoveProduct}
                    />
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <SupplierFormModal
        key={`${modalOpen}-${editingSupplier?.id ?? "new"}`}
        isOpen={modalOpen}
        supplier={editingSupplier}
        allProducts={products}
        initialProductIds={
          editingSupplier
            ? products.filter((p) => p.supplierId === editingSupplier.id).map((p) => p.id)
            : []
        }
        isSubmitting={isSubmitting}
        errorMessage={error}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
