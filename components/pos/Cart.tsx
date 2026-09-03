"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2, PencilLine } from "lucide-react";
import { CartItem, PaymentMethod } from "@/types";
import { formatCLP } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";

export interface MixedAmounts {
  cash: number;
  debit: number;
}

interface CartProps {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  blockedMessage: string | null;
  allowOverstock: boolean;
  isProcessing?: boolean;
  onUpdateQuantity: (productId: string, quantity: number, allowOverstock: boolean) => void;
  onUpdatePrice: (productId: string, price: number) => void;
  onRemove: (productId: string) => void;
  onDiscountChange: (discount: number) => void;
  onCheckout: (paymentMethod: PaymentMethod, mixedAmounts?: MixedAmounts) => void;
  onAddFreeItem: (name: string, price: number) => void;
}

const paymentOptions: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "mixed", label: "Mixto" },
];

export function Cart({
  items,
  subtotal,
  discount,
  total,
  blockedMessage,
  allowOverstock,
  isProcessing,
  onUpdateQuantity,
  onUpdatePrice,
  onRemove,
  onDiscountChange,
  onCheckout,
  onAddFreeItem,
}: CartProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashAmount, setCashAmount] = useState(0);
  const [debitAmount, setDebitAmount] = useState(0);
  const [showFreeForm, setShowFreeForm] = useState(false);
  const [freeName, setFreeName] = useState("");
  const [freePrice, setFreePrice] = useState("");

  const isMixed = paymentMethod === "mixed";
  const mixedSum = cashAmount + debitAmount;
  const mixedOk = isMixed ? Math.abs(mixedSum - total) < 1 : true;

  function handleAddFreeItem() {
    const price = parseFloat(freePrice);
    if (!freeName.trim() || isNaN(price) || price <= 0) return;
    onAddFreeItem(freeName.trim(), price);
    setFreeName("");
    setFreePrice("");
    setShowFreeForm(false);
  }

  function handleCheckoutClick() {
    if (isMixed) {
      onCheckout("mixed", { cash: cashAmount, debit: debitAmount });
    } else {
      onCheckout(paymentMethod);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <ShoppingCart size={20} className="text-brand-700" />
        <h2 className="text-lg font-bold text-gray-900">Carrito</h2>
        <span className="ml-auto text-sm text-gray-400">{items.length} producto(s)</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Agrega productos tocando una tarjeta.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((item) => {
              const unitPrice = item.customPrice ?? item.product.salePrice;
              const displayName = item.customName ?? item.product.name;
              return (
                <li key={item.product.id} className="flex flex-col gap-1.5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                        {item.isCustomItem && (
                          <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                            Libre
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1, allowOverstock)}
                        className="rounded-lg bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, allowOverstock)}
                        className="rounded-lg bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <p className="w-20 text-right text-sm font-semibold text-gray-900">
                      {formatCLP(unitPrice * item.quantity)}
                    </p>
                    <button
                      onClick={() => onRemove(item.product.id)}
                      className="text-gray-400 hover:text-red-600"
                      aria-label="Quitar producto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pl-0.5">
                    <span className="text-xs text-gray-400">Precio:</span>
                    <input
                      type="number"
                      min={0}
                      value={unitPrice}
                      onChange={(e) => onUpdatePrice(item.product.id, Math.max(0, Number(e.target.value)))}
                      className="w-28 rounded-lg border border-gray-200 bg-gray-50 px-2 py-0.5 text-right text-xs font-medium text-gray-700 focus:border-brand-400 focus:outline-none"
                    />
                    {!item.isCustomItem && item.customPrice !== undefined && item.customPrice !== item.product.salePrice && (
                      <button
                        onClick={() => onUpdatePrice(item.product.id, item.product.salePrice)}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Restablecer
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Ítem libre */}
        <div className="mt-2 mb-1">
          {!showFreeForm ? (
            <button
              onClick={() => setShowFreeForm(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-green-300 py-2 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
            >
              <PencilLine size={15} />
              Ítem libre (fruta / verdura)
            </button>
          ) : (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-green-800">Agregar ítem libre</p>
              <input
                autoFocus
                type="text"
                placeholder="Nombre del producto (ej: Tomate)"
                value={freeName}
                onChange={(e) => setFreeName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddFreeItem()}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-green-400 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Precio (CLP)"
                min={0}
                value={freePrice}
                onChange={(e) => setFreePrice(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddFreeItem()}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-green-400 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddFreeItem}
                  disabled={!freeName.trim() || !freePrice || parseFloat(freePrice) <= 0}
                  className="flex-1 rounded-lg bg-green-600 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"
                >
                  Agregar al carrito
                </button>
                <button
                  onClick={() => { setShowFreeForm(false); setFreeName(""); setFreePrice(""); }}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {blockedMessage && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {blockedMessage}
          </p>
        )}
      </div>

      <div className="border-t border-gray-100 px-4 py-4">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium text-gray-900">{formatCLP(subtotal)}</span>
        </div>
        <div className="mb-3 flex items-center justify-between text-sm">
          <label htmlFor="discount" className="text-gray-500">
            Descuento (CLP)
          </label>
          <input
            id="discount"
            type="number"
            min={0}
            value={discount}
            onChange={(e) => onDiscountChange(Math.max(0, Number(e.target.value)))}
            className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
          />
        </div>
        <div className="mb-4 flex items-center justify-between text-lg font-bold text-gray-900">
          <span>Total</span>
          <span>{formatCLP(total)}</span>
        </div>

        <p className="mb-2 text-sm font-medium text-gray-700">Medio de pago</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {paymentOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setPaymentMethod(opt.value);
                if (opt.value === "mixed") {
                  setCashAmount(total);
                  setDebitAmount(0);
                }
              }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                paymentMethod === opt.value
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {isMixed && (
          <div className="mb-4 flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-semibold text-blue-700">Desglose del pago mixto</p>
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm text-gray-600 w-20 shrink-0">Efectivo</label>
              <input
                type="number"
                min={0}
                value={cashAmount}
                onChange={(e) => setCashAmount(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-right text-sm"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm text-gray-600 w-20 shrink-0">Débito</label>
              <input
                type="number"
                min={0}
                value={debitAmount}
                onChange={(e) => setDebitAmount(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-right text-sm"
              />
            </div>
            <div className={`flex items-center justify-between text-xs font-medium ${mixedOk ? "text-green-700" : "text-red-600"}`}>
              <span>Total ingresado</span>
              <span>{formatCLP(mixedSum)} {mixedOk ? "✓" : `(faltan ${formatCLP(total - mixedSum)})`}</span>
            </div>
          </div>
        )}

        <Button
          size="lg"
          fullWidth
          disabled={items.length === 0 || isProcessing || (isMixed && !mixedOk)}
          onClick={handleCheckoutClick}
        >
          {isProcessing ? "Procesando..." : `Cobrar ${formatCLP(total)}`}
        </Button>
      </div>
    </div>
  );
}
