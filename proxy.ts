import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-client";

// Next.js 16 renombró "middleware" a "proxy" (mismo propósito y convención
// de un solo archivo en la raíz del proyecto).
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
