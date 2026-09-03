import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export default function ConfiguracionPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Configuración"
      description="Acá podrás configurar el nombre del negocio, logo, moneda, categorías y métodos de pago. Se agrega en etapas finales."
      stage="Etapa 8"
    />
  );
}
