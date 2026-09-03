"use client";

import { ReactNode } from "react";
import { Role } from "@/types";
import { useAuth } from "@/lib/auth/AuthProvider";

interface RoleGateProps {
  allow: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  const { profile } = useAuth();
  if (!profile || !allow.includes(profile.role)) return <>{fallback}</>;
  return <>{children}</>;
}
