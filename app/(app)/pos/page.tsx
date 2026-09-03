"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Barcode, Camera, X, ShoppingCart } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { listProducts } from "@/lib/services/products.service";
import { listCategories } from "@/lib/services/categories.service";
import { getOpenCashSession, openCashSession } from "@/lib/services/cashSessions.service";
import { createSale } from "@/lib/services/sales.service";
import { useCart } from "@/hooks/useCart";
import { CashSession, Category, PaymentMethod, Product } from "@/types";
import { CategoryBar } from "@/components/pos/CategoryBar";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { Cart } from "@/components/pos/Cart";
import { OpenCashSessionForm } from "@/components/cash/OpenCashSessionForm";
import { BarcodeScanner } from "@/components/inventory/BarcodeScanner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCLP } from "@/lib/utils/format";

const OVERSTOCK_ROLES = ["owner", "admin"];
const CAN_SELL_ROLES = ["owner", "admin", "cashier"];

interface SaleConfirmation {
  total: number;
  paymentMethod: PaymentMethod;
  mixedAmounts?: { cash: number; debit: number };
  lowStockAlerts: Product[];
}

export default function PosPage() {
  const { profile } = useAuth();
  const [supabase] = useState(() => createClient());

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isOpeningSession, setIsOpeningSession] = useState(false);
  const [openSessionError, setOpenSessionError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<SaleConfirmation | null>(null);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [unknownBarcodes, setUnknownBarcodes] = useState<string[]>([]);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkSelectedProduct, setLinkSelectedProduct] = useState<Product | null>(null);
  const [isSavingBarcode, setIsSavingBarcode] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const allowOverstock = !!profile && OVERSTOCK_ROLES.includes(profile.role);
  const canSell = !!profile && CAN_SELL_ROLES.includes(profile.role);
  const cart = useCart();

  // Global barcode gun listener — captures rapid keystrokes from scanner regardless of focus
  const scanBuffer = useRef("");
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const productsRef = useRef<Product[]>([]);
  useEffect(() => { productsRef.current = products; }, [products]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      // If user is typing in an input/textarea, let the field handle it normally
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Enter") {
        const code = scanBuffer.current.trim();
        scanBuffer.current = "";
        if (scanTimer.current) clearTimeout(scanTimer.current);
        if (!code) return;
        const product = productsRef.current.find((p) =>
          p.barcode.split(",").map((b) => b.trim()).includes(code)
        );
        if (product) {
          cart.addItem(product, allowOverstock);
          setBarcodeError(null);
        } else {
          setBarcodeError(`Código "${code}" no encontrado. Escanea de nuevo o búscalo manualmente.`);
        }
        return;
      }

      if (e.key.length === 1) {
        scanBuffer.current += e.key;
        if (scanTimer.current) clearTimeout(scanTimer.current);
        // Reset buffer if no more input arrives within 100ms (human typing would be slower)
        scanTimer.current = setTimeout(() => { scanBuffer.current = ""; }, 100);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [allowOverstock, cart]);

  useEffect(() => {
    listCategories(supabase).then(({ categories }) => setCategories(categories));
    listProducts(supabase).then(({ products }) => {
      setProducts(products);
      setIsLoading(false);
    });
    getOpenCashSession(supabase).then(({ session }) => {
      setCashSession(session);
      setIsCheckingSession(false);
    });
  }, [supabase]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = activeCategoryId === "all" || p.categoryId === activeCategoryId;
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategoryId, search]);

  async function handleOpenCashSession(openingAmount: number) {
    setIsOpeningSession(true);
    setOpenSessionError(null);
    const { session, error } = await openCashSession(supabase, openingAmount);
    setIsOpeningSession(false);

    if (error || !session) {
      setOpenSessionError(error ?? "No se pudo abrir la caja.");
      return;
    }
    setCashSession(session);
  }

  function handleAdd(product: Product) {
    cart.addItem(product, allowOverstock);
  }

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode.trim()) return;
    const code = barcode.trim();
    const product = products.find((p) =>
      p.barcode.split(",").map((b) => b.trim()).includes(code)
    );
    if (!product) {
      setBarcodeError("No se encontró ningún producto con ese código de barra.");
      return;
    }
    setBarcodeError(null);
    cart.addItem(product, allowOverstock);
    setBarcode("");
  }

  function handleCameraScan(codes: string[]) {
    setShowCameraScanner(false);
    setBarcodeError(null);
    const notFound: string[] = [];
    for (const code of codes) {
      const product = products.find((p) =>
        p.barcode.split(",").map((b) => b.trim()).includes(code.trim())
      );
      if (product) {
        cart.addItem(product, allowOverstock);
      } else {
        notFound.push(code);
      }
    }
    if (notFound.length > 0) {
      setUnknownBarcodes(notFound);
      setLinkSearch("");
      setLinkSelectedProduct(null);
    }
  }

  async function handleSaveBarcode() {
    if (!linkSelectedProduct || unknownBarcodes.length === 0) return;
    setIsSavingBarcode(true);
    const existing = linkSelectedProduct.barcode
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);
    const newBarcodes = [...new Set([...existing, ...unknownBarcodes])].join(",");
    await supabase
      .from("products")
      .update({ barcode: newBarcodes })
      .eq("id", linkSelectedProduct.id);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === linkSelectedProduct.id ? { ...p, barcode: newBarcodes } : p
      )
    );
    cart.addItem({ ...linkSelectedProduct, barcode: newBarcodes }, allowOverstock);
    setIsSavingBarcode(false);
    setUnknownBarcodes([]);
    setLinkSelectedProduct(null);
  }

  const linkSuggestions = useMemo(() => {
    if (!linkSearch.trim()) return products.slice(0, 8);
    const q = linkSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [products, linkSearch]);

  async function handleCheckout(paymentMethod: PaymentMethod, mixedAmounts?: { cash: number; debit: number }) {
    if (!cashSession) return;
    setIsCheckingOut(true);
    setCheckoutError(null);

    const { sale, error } = await createSale(supabase, {
      cashSessionId: cashSession.id,
      items: cart.items,
      discount: cart.discount,
      paymentMethod,
      allowNegativeStock: allowOverstock,
    });

    setIsCheckingOut(false);

    if (error || !sale) {
      setCheckoutError(error ?? "No se pudo registrar la venta.");
      return;
    }

    const soldQuantities = new Map(cart.items.map((i) => [i.product.id, i.quantity]));
    const updatedProducts = products.map((p) =>
      soldQuantities.has(p.id) ? { ...p, stock: p.stock - (soldQuantities.get(p.id) ?? 0) } : p
    );
    setProducts(updatedProducts);

    const lowStockAlerts = updatedProducts.filter(
      (p) => soldQuantities.has(p.id) && p.stock <= p.minStock
    );

    setConfirmation({ total: sale.total, paymentMethod, mixedAmounts, lowStockAlerts });
  }

  function closeConfirmation() {
    cart.clear();
    setConfirmation(null);
    setIsCartOpen(false);
    listProducts(supabase).then(({ products }) => setProducts(products));
  }

  if (profile && !canSell) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <h1 className="text-xl font-bold text-gray-900">Acceso restringido</h1>
        <p className="mt-2 text-gray-500">Tu rol (Operario) no tiene acceso al punto de venta.</p>
      </div>
    );
  }

  if (isCheckingSession) {
    return <div className="text-gray-400">Cargando...</div>;
  }

  if (!cashSession) {
    return (
      <OpenCashSessionForm
        isSubmitting={isOpeningSession}
        errorMessage={openSessionError}
        onOpen={handleOpenCashSession}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 md:h-[calc(100vh-5.5rem)] md:flex-row">
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto por nombre..."
              className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-base text-gray-900 focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
            />
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <form onSubmit={handleBarcodeSubmit} className="relative flex-1 sm:w-56">
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Código de barra + Enter"
                className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-base text-gray-900 focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
              />
            </form>
            <button
              onClick={() => setShowCameraScanner(true)}
              title="Escanear con cámara"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-500 hover:bg-brand-50 hover:border-brand-400 hover:text-brand-600 transition-colors"
            >
              <Camera size={20} />
            </button>
          </div>
        </div>

        {barcodeError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{barcodeError}</p>
        )}

        <CategoryBar
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelect={setActiveCategoryId}
        />

        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {isLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-400">
              Cargando productos...
            </div>
          ) : (
            <ProductGrid
              products={filteredProducts}
              categories={categories}
              allowOverstock={allowOverstock}
              onAdd={handleAdd}
            />
          )}
        </div>
      </div>

      {/* Carrito de escritorio */}
      <div className="hidden w-96 flex-shrink-0 rounded-2xl border border-gray-200 bg-white md:block">
        <Cart
          items={cart.items}
          subtotal={cart.subtotal}
          discount={cart.discount}
          total={cart.total}
          blockedMessage={cart.blockedMessage ?? checkoutError}
          allowOverstock={allowOverstock}
          isProcessing={isCheckingOut}
          onUpdateQuantity={cart.updateQuantity}
          onUpdatePrice={cart.updatePrice}
          onRemove={cart.removeItem}
          onDiscountChange={cart.setDiscount}
          onAddFreeItem={cart.addFreeItem}
          onCheckout={handleCheckout}
        />
      </div>

      {/* Botón flotante + carrito en móvil */}
      {cart.items.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between rounded-2xl bg-gray-900 px-5 py-4 text-white shadow-lg md:hidden"
        >
          <span className="flex items-center gap-2 font-semibold">
            <ShoppingCart size={20} /> Ver carrito ({cart.items.length})
          </span>
          <span className="font-bold">{formatCLP(cart.total)}</span>
        </button>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-white md:hidden">
          <button
            onClick={() => setIsCartOpen(false)}
            className="absolute right-4 top-4 rounded-lg p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Cerrar carrito"
          >
            <X size={22} />
          </button>
          <div className="flex-1 overflow-hidden pt-10">
            <Cart
              items={cart.items}
              subtotal={cart.subtotal}
              discount={cart.discount}
              total={cart.total}
              blockedMessage={cart.blockedMessage ?? checkoutError}
              allowOverstock={allowOverstock}
              onUpdateQuantity={cart.updateQuantity}
              onUpdatePrice={cart.updatePrice}
              onRemove={cart.removeItem}
              onDiscountChange={cart.setDiscount}
              onAddFreeItem={cart.addFreeItem}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      )}

      <Modal title="Venta registrada" isOpen={!!confirmation} onClose={closeConfirmation}>
        {confirmation && (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-3xl">✅</p>
            <p className="text-lg font-semibold text-gray-900">
              Total cobrado: {formatCLP(confirmation.total)}
            </p>
            <p className="text-sm text-gray-500">
              Medio de pago: {paymentMethodLabel(confirmation.paymentMethod)}
            </p>
            {confirmation.mixedAmounts && (
              <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm text-blue-800 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>Efectivo</span>
                  <span className="font-semibold">{formatCLP(confirmation.mixedAmounts.cash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Débito</span>
                  <span className="font-semibold">{formatCLP(confirmation.mixedAmounts.debit)}</span>
                </div>
              </div>
            )}

            {confirmation.lowStockAlerts.length > 0 && (
              <div className="rounded-xl bg-amber-50 px-3 py-2 text-left text-sm text-amber-800">
                <p className="mb-1 font-semibold">⚠️ Quedaron con stock bajo:</p>
                <ul className="flex flex-col gap-1">
                  {confirmation.lowStockAlerts.map((p) => (
                    <li key={p.id} className="flex items-center justify-between">
                      <span>{p.name}</span>
                      <Badge tone={p.stock === 0 ? "danger" : "warning"}>
                        {p.stock === 0 ? "Sin stock" : `${p.stock} u.`}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={closeConfirmation}>Nueva venta</Button>
          </div>
        )}
      </Modal>

      {showCameraScanner && (
        <BarcodeScanner
          existingBarcodes={[]}
          onConfirm={handleCameraScan}
          onClose={() => setShowCameraScanner(false)}
        />
      )}

      {unknownBarcodes.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="font-semibold text-gray-900">Código no registrado</p>
              <button onClick={() => setUnknownBarcodes([])} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="font-medium mb-1">Código escaneado:</p>
                {unknownBarcodes.map((c) => (
                  <p key={c} className="font-mono text-xs">{c}</p>
                ))}
              </div>
              <p className="text-sm text-gray-600">¿A qué producto pertenece este código? Búscalo y guárdalo para la próxima vez.</p>
              <div className="flex flex-col gap-2">
                <input
                  autoFocus
                  value={linkSearch}
                  onChange={(e) => { setLinkSearch(e.target.value); setLinkSelectedProduct(null); }}
                  placeholder="Buscar producto..."
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                />
                {linkSuggestions.length > 0 && !linkSelectedProduct && (
                  <ul className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                    {linkSuggestions.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => { setLinkSelectedProduct(p); setLinkSearch(p.name); }}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-brand-50 transition-colors"
                        >
                          <span className="text-sm font-medium text-gray-900">{p.name}</span>
                          <span className="text-xs text-gray-400">{formatCLP(p.salePrice)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {linkSelectedProduct && (
                  <div className="flex items-center gap-2 rounded-xl bg-brand-50 border border-brand-200 px-3 py-2">
                    <span className="text-sm font-semibold text-brand-800 flex-1">{linkSelectedProduct.name}</span>
                    <button onClick={() => { setLinkSelectedProduct(null); setLinkSearch(""); }} className="text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setUnknownBarcodes([])}
                  className="flex-1 rounded-xl border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveBarcode}
                  disabled={!linkSelectedProduct || isSavingBarcode}
                  className="flex-1 rounded-xl bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
                >
                  {isSavingBarcode ? "Guardando..." : "Guardar y agregar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function paymentMethodLabel(method: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    mixed: "Mixto",
  };
  return labels[method];
}
