import { CashMovement, CashSession, Category, Product, StockMovement, Supplier } from "@/types";
import { Database } from "@/types/database.types";
import { decodeProductMeta } from "@/lib/utils/productMeta";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];
type StockMovementRow = Database["public"]["Tables"]["stock_movements"]["Row"];
type CashSessionRow = Database["public"]["Tables"]["cash_sessions"]["Row"];
type CashMovementRow = Database["public"]["Tables"]["cash_movements"]["Row"];

export function mapProductRow(row: ProductRow): Product {
  const meta = decodeProductMeta(row.description ?? "");
  return {
    id: row.id,
    name: row.name,
    description: meta.description,
    barcode: row.barcode ?? "",
    categoryId: row.category_id ?? "",
    imageUrl: row.image_url,
    costPrice: row.cost_price,
    salePrice: row.sale_price,
    stock: row.stock,
    minStock: row.min_stock,
    supplierId: row.supplier_id,
    expirationDate: row.expiration_date,
    unitType: row.unit_type,
    marca: meta.marca,
    talla: meta.talla,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function mapSupplierRow(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    rut: row.rut ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    contactName: row.contact_name ?? "",
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function mapStockMovementRow(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    productId: row.product_id,
    type: row.type,
    quantity: row.quantity,
    previousStock: row.previous_stock,
    newStock: row.new_stock,
    reason: row.reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function mapCashSessionRow(row: CashSessionRow): CashSession {
  return {
    id: row.id,
    openedBy: row.opened_by,
    closedBy: row.closed_by,
    openingAmount: row.opening_amount,
    closingAmount: row.closing_amount,
    expectedCash: row.expected_cash,
    countedCash: row.counted_cash,
    difference: row.difference,
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
  };
}

export function mapCashMovementRow(row: CashMovementRow): CashMovement {
  return {
    id: row.id,
    cashSessionId: row.cash_session_id,
    type: row.type,
    amount: row.amount,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
