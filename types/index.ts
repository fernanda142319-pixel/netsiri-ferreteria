export type Role = "owner" | "admin" | "cashier" | "warehouse";

export type PaymentMethod = "cash" | "card" | "transfer" | "mixed";
export type PaymentStatus = "paid" | "pending";
export type SaleStatus = "completed" | "cancelled";
export type CashSessionStatus = "open" | "closed";
export type CashMovementType = "income" | "withdrawal" | "sale";
export type StockMovementType = "in" | "out" | "sale" | "adjustment";
export type UnitType = "unit" | "weight";

export interface Profile {
  id: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  rut: string;
  phone: string;
  email: string;
  address: string;
  contactName: string;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  barcode: string;
  categoryId: string;
  imageUrl: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  supplierId: string | null;
  expirationDate: string | null;
  unitType: UnitType;
  marca: string;
  talla: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCombo {
  id: string;
  name: string;
  salePrice: number;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
}

export interface ComboItem {
  id: string;
  comboId: string;
  productId: string;
  quantity: number;
}

export interface Sale {
  id: string;
  userId: string;
  cashSessionId: string;
  total: number;
  discount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: SaleStatus;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CashSession {
  id: string;
  openedBy: string;
  closedBy: string | null;
  openingAmount: number;
  closingAmount: number | null;
  expectedCash: number | null;
  countedCash: number | null;
  difference: number | null;
  status: CashSessionStatus;
  openedAt: string;
  closedAt: string | null;
}

export interface CashMovement {
  id: string;
  cashSessionId: string;
  type: CashMovementType;
  amount: number;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface BusinessSettings {
  id: string;
  businessName: string;
  logoUrl: string | null;
  currency: "CLP";
  defaultMinStock: number;
  address: string;
  phone: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number;
  customName?: string;
  isCustomItem?: boolean;
}

export interface DashboardSummary {
  salesToday: number;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  salesCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  topProductName: string;
  estimatedProfitToday: number;
}
