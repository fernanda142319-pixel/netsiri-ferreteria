"use client";

import { FormEvent, useRef, useState } from "react";
import { Camera, X, Plus } from "lucide-react";
import { Category, Supplier, UnitType } from "@/types";
import { ProductInput } from "@/lib/services/products.service";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { BarcodeScanner } from "@/components/inventory/BarcodeScanner";
import { ProductImageUpload } from "@/components/inventory/ProductImageUpload";

interface ProductFormProps {
  categories: Category[];
  suppliers: Supplier[];
  existingNames?: string[];
  initialValues?: Partial<ProductInput>;
  initialStock?: number;
  mode: "create" | "edit";
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (input: ProductInput, initialStock: number) => void;
  onCancel: () => void;
}

const emptyValues: ProductInput = {
  name: "",
  description: "",
  barcode: "",
  categoryId: "",
  imageUrl: "",
  costPrice: 0,
  salePrice: 0,
  minStock: 5,
  supplierId: null,
  expirationDate: null,
  unitType: "unit",
  marca: "",
  talla: "",
};

export function ProductForm({
  categories,
  suppliers,
  existingNames = [],
  initialValues,
  initialStock = 0,
  mode,
  isSubmitting,
  errorMessage,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const [values, setValues] = useState<ProductInput>({ ...emptyValues, ...initialValues });
  const [stock, setStock] = useState(initialStock);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Barcodes stored as comma-separated string in values.barcode
  const barcodes = values.barcode ? values.barcode.split(",").filter(Boolean) : [];

  function addBarcode(code: string) {
    const trimmed = code.trim();
    if (!trimmed || barcodes.includes(trimmed)) return;
    update("barcode", [...barcodes, trimmed].join(","));
    setBarcodeInput("");
  }

  function removeBarcode(code: string) {
    update("barcode", barcodes.filter((c) => c !== code).join(","));
  }

  function update<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const uniqueExistingNames = Array.from(new Set(existingNames));

  const nameSuggestions = showSuggestions
    ? (values.name.trim().length === 0
        ? uniqueExistingNames.slice(0, 10)
        : uniqueExistingNames.filter((n) =>
            n.toLowerCase().includes(values.name.toLowerCase())
          ).slice(0, 10))
    : [];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      setValidationError("El nombre del producto es obligatorio.");
      return;
    }
    setValidationError(null);
    onSubmit(values, stock);
  }

  const margin =
    values.costPrice > 0
      ? Math.round(((values.salePrice - values.costPrice) / values.costPrice) * 100)
      : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="relative flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Nombre del producto</label>
          <input
            ref={nameInputRef}
            value={values.name}
            onChange={(e) => {
              update("name", e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Ej: Coca-Cola 1.5L"
            autoComplete="off"
            className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-base text-gray-900 focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
          />
          {showSuggestions && nameSuggestions.length > 0 && (
            <ul className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              {nameSuggestions.map((name) => (
                <li
                  key={name}
                  onMouseDown={() => {
                    update("name", name);
                    setShowSuggestions(false);
                  }}
                  className="cursor-pointer px-4 py-2.5 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700"
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Códigos de barras</label>

          {/* Chips de códigos existentes */}
          {barcodes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {barcodes.map((code) => (
                <span
                  key={code}
                  className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 font-mono text-xs font-medium text-blue-800"
                >
                  {code}
                  <button type="button" onClick={() => removeBarcode(code)} className="ml-0.5 hover:text-blue-600">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input para agregar nuevo código */}
          <div className="flex gap-2">
            <input
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addBarcode(barcodeInput);
                }
              }}
              placeholder={barcodes.length === 0 ? "Ej: 7800000000011" : "Agregar otro código..."}
              className="h-12 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-base text-gray-900 focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
            />
            <button
              type="button"
              onClick={() => addBarcode(barcodeInput)}
              disabled={!barcodeInput.trim()}
              title="Agregar código"
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <Plus size={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              title="Escanear con cámara"
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-300 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors"
            >
              <Camera size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Descripción</label>
        <textarea
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          rows={2}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-base text-gray-900 focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
          placeholder="Descripción breve (opcional)"
        />
      </div>

      {/* Clasificación */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-4">
        <p className="text-sm font-semibold text-gray-700 -mb-1">Clasificación</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Categoría"
            value={values.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
          <Input
            label="Marca"
            value={values.marca}
            onChange={(e) => update("marca", e.target.value)}
            placeholder="Ej: Nike, Coca-Cola..."
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Talla / Tamaño"
            value={values.talla}
            onChange={(e) => update("talla", e.target.value)}
            placeholder="Ej: M, 42, 1.5L..."
          />
          <Select
            label="Unidad de venta"
            value={values.unitType}
            onChange={(e) => update("unitType", e.target.value as UnitType)}
          >
            <option value="unit">Por unidad</option>
            <option value="weight">Por peso (kg)</option>
          </Select>
          <Select
            label="Proveedor"
            value={values.supplierId ?? ""}
            onChange={(e) => update("supplierId", e.target.value || null)}
          >
            <option value="">Sin proveedor</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Input
          label="Precio costo (opcional)"
          type="number"
          min={0}
          placeholder="0"
          value={values.costPrice === 0 ? "" : values.costPrice}
          onChange={(e) => update("costPrice", Number(e.target.value))}
        />
        <Input
          label="Precio venta (opcional)"
          type="number"
          min={0}
          placeholder="0"
          value={values.salePrice === 0 ? "" : values.salePrice}
          onChange={(e) => update("salePrice", Number(e.target.value))}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700">Margen</span>
          <div className="flex h-12 items-center rounded-xl bg-gray-50 px-4 text-base font-semibold text-gray-700">
            {margin === null ? "—" : `${margin}%`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {mode === "create" ? (
          <Input
            label="Stock inicial"
            type="number"
            min={0}
            placeholder="0"
            value={stock === 0 ? "" : stock}
            onChange={(e) => setStock(Number(e.target.value))}
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Stock actual</span>
            <div className="flex h-12 items-center rounded-xl bg-gray-50 px-4 text-base font-semibold text-gray-700">
              {initialStock} (usa &quot;Registrar entrada/salida&quot; para cambiarlo)
            </div>
          </div>
        )}
        <Input
          label="Stock mínimo"
          type="number"
          min={0}
          placeholder="0"
          value={values.minStock === 0 ? "" : values.minStock}
          onChange={(e) => update("minStock", Number(e.target.value))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ProductImageUpload
          imageUrl={values.imageUrl}
          onChange={(url) => update("imageUrl", url)}
        />
        <Input
          label="Fecha de vencimiento (opcional)"
          type="date"
          value={values.expirationDate ?? ""}
          onChange={(e) => update("expirationDate", e.target.value || null)}
        />
      </div>

      {(validationError || errorMessage) && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {validationError || errorMessage}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : mode === "create" ? "Crear producto" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>

      {showScanner && (
        <BarcodeScanner
          existingBarcodes={barcodes}
          onConfirm={(newCodes) => {
            const merged = [...barcodes, ...newCodes.filter((c) => !barcodes.includes(c))];
            update("barcode", merged.join(","));
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </form>
  );
}
