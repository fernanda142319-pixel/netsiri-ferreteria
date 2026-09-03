"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  ShoppingBag,
  TrendingDown,
  PackageX,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { fetchStockAlerts } from "@/lib/services/products.service";
import { fetchDashboardSalesSummary, DashboardSalesSummary } from "@/lib/services/sales.service";
import { formatCLP } from "@/lib/utils/format";
import { Product } from "@/types";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { StockAlertList } from "@/components/dashboard/StockAlertList";

const emptySummary: DashboardSalesSummary = {
  salesToday: 0,
  totalCash: 0,
  totalCard: 0,
  totalTransfer: 0,
  salesCount: 0,
  topProductName: "—",
  estimatedProfitToday: 0,
};

export default function DashboardPage() {
  const { profile } = useAuth();

  const [summary, setSummary] = useState<DashboardSalesSummary>(emptySummary);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    fetchStockAlerts(supabase).then(({ lowStock, outOfStock }) => {
      setLowStockProducts(lowStock);
      setOutOfStockProducts(outOfStock);
      setIsLoadingStock(false);
    });
    fetchDashboardSalesSummary(supabase).then((data) => {
      setSummary(data);
      setIsLoadingSummary(false);
    });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {profile?.fullName?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500">
          Este es el resumen de tu negocio hoy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <SummaryCard
          label="Ventas del día"
          value={isLoadingSummary ? "..." : formatCLP(summary.salesToday)}
          icon={DollarSign}
          tone="brand"
        />
        <SummaryCard
          label="Efectivo"
          value={isLoadingSummary ? "..." : formatCLP(summary.totalCash)}
          icon={Banknote}
          tone="sky"
        />
        <SummaryCard
          label="Tarjeta"
          value={isLoadingSummary ? "..." : formatCLP(summary.totalCard)}
          icon={CreditCard}
          tone="violet"
        />
        <SummaryCard
          label="Transferencia"
          value={isLoadingSummary ? "..." : formatCLP(summary.totalTransfer)}
          icon={ArrowLeftRight}
          tone="amber"
        />
        <SummaryCard
          label="Ventas realizadas"
          value={isLoadingSummary ? "..." : summary.salesCount.toString()}
          icon={ShoppingBag}
          tone="gray"
        />
        <SummaryCard
          label="Bajo stock"
          value={isLoadingStock ? "..." : lowStockProducts.length.toString()}
          icon={TrendingDown}
          tone="amber"
          hint="Productos cerca de agotarse"
        />
        <SummaryCard
          label="Sin stock"
          value={isLoadingStock ? "..." : outOfStockProducts.length.toString()}
          icon={PackageX}
          tone="red"
          hint="Productos agotados"
        />
        <SummaryCard
          label="Producto más vendido"
          value={isLoadingSummary ? "..." : summary.topProductName}
          icon={Trophy}
          tone="brand"
        />
        <SummaryCard
          label="Ganancia estimada"
          value={isLoadingSummary ? "..." : formatCLP(summary.estimatedProfitToday)}
          icon={TrendingUp}
          tone="sky"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StockAlertList
          title="Productos con bajo stock"
          products={lowStockProducts}
          emptyLabel="No hay productos con bajo stock."
          isLoading={isLoadingStock}
        />
        <StockAlertList
          title="Productos sin stock"
          products={outOfStockProducts}
          emptyLabel="Todos los productos tienen stock."
          isLoading={isLoadingStock}
        />
      </div>
    </div>
  );
}
