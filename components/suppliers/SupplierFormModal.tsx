"use client";

import { FormEvent, useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { Product, Supplier } from "@/types";
import { SupplierInput } from "@/lib/services/suppliers.service";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface SupplierFormModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  allProducts: Product[];
  initialProductIds: string[];
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (input: SupplierInput, productIds: string[], newProductNames: string[]) => void;
}

const emptyValues: SupplierInput = {
  name: "",
  rut: "",
  phone: "",
  email: "",
  address: "",
  contactName: "",
};

export function SupplierFormModal({
  isOpen,
  supplier,
  allProducts,
  initialProductIds,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: SupplierFormModalProps) {
  const [values, setValues] = useState<SupplierInput>(() =>
    supplier
      ? {
          name: supplier.name,
          rut: supplier.rut,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          contactName: supplier.contactName,
        }
      : emptyValues
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialProductIds)
  );
  const [customNames, setCustomNames] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function update<K extends keyof SupplierInput>(key: K, value: SupplierInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleProduct(product: Product) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(product.id)) next.delete(product.id);
      else next.add(product.id);
      return next;
    });
  }

  function removeProduct(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function addCustomName(name: string) {
    const trimmed = name.trim();
    if (!trimmed || customNames.includes(trimmed)) return;
    setCustomNames((prev) => [...prev, trimmed]);
    setProductSearch("");
  }

  function removeCustomName(name: string) {
    setCustomNames((prev) => prev.filter((n) => n !== name));
  }

  const selectedProducts = allProducts.filter((p) => selectedIds.has(p.id));

  const trimmedSearch = productSearch.trim();
  const searchSuggestions = trimmedSearch.length >= 1
    ? allProducts
        .filter(
          (p) =>
            !selectedIds.has(p.id) &&
            p.name.toLowerCase().includes(trimmedSearch.toLowerCase())
        )
        .slice(0, 7)
    : [];

  const exactMatch = allProducts.some(
    (p) => p.name.toLowerCase() === trimmedSearch.toLowerCase()
  );
  const showCreateOption =
    trimmedSearch.length >= 1 &&
    !exactMatch &&
    !customNames.includes(trimmedSearch);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      setValidationError("El nombre del proveedor es obligatorio.");
      return;
    }
    setValidationError(null);
    onSubmit(values, Array.from(selectedIds), customNames);
  }

  return (
    <Modal title={supplier ? "Editar proveedor" : "Nuevo proveedor"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Nombre" value={values.name} onChange={(e) => update("name", e.target.value)} />
        <Input label="RUT" value={values.rut} onChange={(e) => update("rut", e.target.value)} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Teléfono" value={values.phone} onChange={(e) => update("phone", e.target.value)} />
          <Input label="Correo" type="email" value={values.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <Input label="Dirección" value={values.address} onChange={(e) => update("address", e.target.value)} />
        <Input
          label="Nombre de contacto"
          value={values.contactName}
          onChange={(e) => update("contactName", e.target.value)}
        />

        {/* Productos asociados */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Productos asociados
          </label>

          {/* Chips: productos del inventario (azul) + nombres libres (gris) */}
          {(selectedProducts.length > 0 || customNames.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {selectedProducts.map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                >
                  {p.name}
                  <button type="button" onClick={() => removeProduct(p.id)} className="ml-0.5 hover:text-blue-600">
                    <X size={12} />
                  </button>
                </span>
              ))}
              {customNames.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                  title="Producto nuevo (se creará al guardar)"
                >
                  {name}
                  <button type="button" onClick={() => removeCustomName(name)} className="ml-0.5 hover:text-gray-500">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (searchSuggestions.length === 1) {
                    toggleProduct(searchSuggestions[0]);
                    setProductSearch("");
                  } else if (showCreateOption) {
                    addCustomName(trimmedSearch);
                  }
                }
              }}
              placeholder="Buscar producto o escribir nombre nuevo..."
              className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 text-sm text-gray-900 focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
            />

            {(searchSuggestions.length > 0 || showCreateOption) && (
              <ul className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {searchSuggestions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => { toggleProduct(p); setProductSearch(""); }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-blue-50"
                    >
                      <span className="text-gray-800">{p.name}</span>
                      <span className="text-gray-400 text-xs">{p.barcode || "Sin código"}</span>
                    </button>
                  </li>
                ))}
                {showCreateOption && (
                  <li className="border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => addCustomName(trimmedSearch)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50"
                    >
                      <Plus size={15} />
                      Agregar <span className="font-semibold">"{trimmedSearch}"</span> como producto nuevo
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>

          {selectedIds.size === 0 && customNames.length === 0 && (
            <p className="text-xs text-gray-400">Sin productos. Busca uno existente o escribe un nombre nuevo.</p>
          )}
        </div>

        {(validationError || errorMessage) && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {validationError || errorMessage}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : supplier ? "Guardar cambios" : "Crear proveedor"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
