import { redirect } from "next/navigation";

// Punto de entrada visual de la app (equivalente al index.html tradicional).
export default function RootPage() {
  redirect("/login");
}
