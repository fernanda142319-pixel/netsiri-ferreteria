import { Product } from "@/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface StockAlertListProps {
  title: string;
  products: Product[];
  emptyLabel: string;
  isLoading?: boolean;
}

export function StockAlertList({ title, products, emptyLabel, isLoading }: StockAlertListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        {isLoading ? (
          <p className="py-4 text-sm text-gray-400">Cargando...</p>
        ) : products.length === 0 ? (
          <p className="py-4 text-sm text-gray-400">{emptyLabel}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between py-3"
              >
                <span className="text-sm font-medium text-gray-800">
                  {product.name}
                </span>
                <Badge tone={product.stock === 0 ? "danger" : "warning"}>
                  {product.stock === 0
                    ? "Sin stock"
                    : `${product.stock} / mín. ${product.minStock}`}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
