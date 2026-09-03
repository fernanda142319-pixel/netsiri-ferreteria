"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";
import { StockMovement } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { adjustStock, deleteProduct, listStockMovements } from "@/lib/services/products.service";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface StockMovementPanelProps {
  productId: string;
  productName: string;
  currentStock: number;
  onStockUpdated: (newStock: number) => void;
}

const movementLabels: Record<string, string> = {
  in: "Entrada",
  out: "Salida",
  sale: "Venta",
  adjustment: "Ajuste",
};

export function StockMovementPanel({ productId, productName, currentStock, onStockUpdated }: StockMovementPanelProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeForm, setActiveForm] = useState<"in" | "out" | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listStockMovements(supabase, productId).then(({ movements }) => setMovements(movements));
  }, [supabase, productId]);

  function openForm(type: "in" | "out") {
    setActiveForm(type);
    setQuantity(1);
    setReason("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeForm) return;
    if (quantity <= 0) {
      setError("La cantidad debe ser mayor a 0.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const { product, error: adjustError } = await adjustStock(
      supabase,
      productId,
      activeForm,
      quantity,
      reason || (activeForm === "in" ? "Entrada de stock" : "Salida manual de stock")
    );
    setIsSubmitting(false);

    if (adjustError || !product) {
      setError(adjustError ?? "No se pudo registrar el movimiento.");
      return;
    }

    onStockUpdated(product.stock);
    setActiveForm(null);
    const { movements: refreshed } = await listStockMovements(supabase, productId);
    setMovements(refreshed);
  }

  async function handleDeleteProduct() {
    if (!window.confirm(`¿Eliminar el producto "${productName}"?\n\nEsta acción no se puede deshacer.`)) return;

    setIsDeleting(true);
    setError(null);
    const { error: deleteError } = await deleteProduct(supabase, productId);
    setIsDeleting(false);

    if (deleteError) {
      setError(deleteError);
      return;
    }
    router.push("/inventario");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimientos de stock</CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">Stock actual:</span>
          <Badge tone={currentStock === 0 ? "danger" : "brand"}>{currentStock} unidades</Badge>
          <Button size="sm" variant="secondary" onClick={() => openForm("in")}>
            <ArrowUpCircle size={16} /> Registrar entrada
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openForm("out")}>
            <ArrowDownCircle size={16} /> Registrar salida
          </Button>
          <Button size="sm" variant="danger" onClick={handleDeleteProduct} disabled={isDeleting}>
            <Trash2 size={16} /> {isDeleting ? "Eliminando..." : "Eliminar producto"}
          </Button>
        </div>

        {activeForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-end"
          >
            <div className="w-32">
              <Input
                label="Cantidad"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Motivo (opcional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={activeForm === "in" ? "Ej: compra a proveedor" : "Ej: producto dañado"}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : `Confirmar ${activeForm === "in" ? "entrada" : "salida"}`}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setActiveForm(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {movements.length === 0 ? (
          <p className="py-4 text-sm text-gray-400">Sin movimientos registrados todavía.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <Badge tone={m.type === "in" ? "success" : m.type === "out" ? "warning" : "neutral"}>
                    {movementLabels[m.type] ?? m.type}
                  </Badge>
                  <span className="text-gray-600">{m.reason || "—"}</span>
                </div>
                <div className="text-right text-gray-500">
                  <p>
                    {m.previousStock} → {m.newStock}
                  </p>
                  <p className="text-xs">{new Date(m.createdAt).toLocaleString("es-CL")}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
