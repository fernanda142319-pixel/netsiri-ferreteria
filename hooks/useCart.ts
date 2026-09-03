import { useMemo, useState } from "react";
import { CartItem, Product } from "@/types";

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  function addItem(product: Product, allowOverstock: boolean) {
    setBlockedMessage(null);
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      const nextQty = (existing?.quantity ?? 0) + 1;

      if (!allowOverstock && nextQty > product.stock) {
        setBlockedMessage(`"${product.name}" no tiene suficiente stock disponible.`);
        return prev;
      }

      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: nextQty } : i));
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number, allowOverstock: boolean) {
    setBlockedMessage(null);
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.product.id !== productId) return i;
          if (quantity <= 0) return null;
          if (!allowOverstock && quantity > i.product.stock) {
            setBlockedMessage(`"${i.product.name}" no tiene suficiente stock disponible.`);
            return i;
          }
          return { ...i, quantity };
        })
        .filter((i): i is CartItem => i !== null)
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function updatePrice(productId: string, price: number) {
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, customPrice: price } : i))
    );
  }

  function addFreeItem(name: string, price: number) {
    const cartKey = `free-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const fakeProduct: Product = {
      id: cartKey,
      name,
      description: "",
      barcode: "",
      categoryId: "",
      imageUrl: "",
      costPrice: 0,
      salePrice: price,
      stock: 99999,
      minStock: 0,
      supplierId: null,
      expirationDate: null,
      unitType: "unit",
      marca: "",
      talla: "",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setItems((prev) => [
      ...prev,
      { product: fakeProduct, quantity: 1, customPrice: price, customName: name, isCustomItem: true },
    ]);
  }

  function clear() {
    setItems([]);
    setDiscount(0);
    setBlockedMessage(null);
  }

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + (i.customPrice ?? i.product.salePrice) * i.quantity, 0),
    [items]
  );
  const total = Math.max(subtotal - discount, 0);

  return {
    items,
    addItem,
    addFreeItem,
    updateQuantity,
    updatePrice,
    removeItem,
    clear,
    discount,
    setDiscount,
    subtotal,
    total,
    blockedMessage,
  };
}
