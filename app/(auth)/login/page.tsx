"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { demoAccounts } from "@/lib/mock/users";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const DEMO_PASSWORD = "demo1234";

export default function LoginPage() {
  const router = useRouter();
  const { profile, isLoading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && profile) {
      router.replace("/dashboard");
    }
  }, [isLoading, profile, router]);

  async function attemptSignIn(loginEmail: string, loginPassword: string) {
    setError(null);
    setIsSubmitting(true);
    const { error: signInError } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (signInError) {
      setError(
        "No pudimos iniciar sesión. Revisa el correo y la contraseña, o que la cuenta exista en Supabase (ver supabase/SETUP.md)."
      );
      return;
    }
    router.replace("/dashboard");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }
    attemptSignIn(email, password);
  }

  function quickLogin(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    attemptSignIn(demoEmail, DEMO_PASSWORD);
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-50 px-4 py-10">
      <div className="grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
        <div className="hidden flex-col gap-4 md:flex">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">
            Netsiri Inventario
          </span>
          <h1 className="text-4xl font-bold leading-tight text-gray-900">
            Controla tu inventario, registra ventas y gestiona tu stock sin complicarte.
          </h1>
          <p className="text-lg text-gray-600">
            Para cualquier tipo de negocio. Simple, visual y rápido de usar.
          </p>
        </div>

        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-gray-500">
            Ingresa con tu cuenta del negocio.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <Input
              id="email"
              type="email"
              label="Correo"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              id="password"
              type="password"
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="mb-2 text-sm font-medium text-gray-500">
              Cuentas demo (1 clic, contraseña: {DEMO_PASSWORD})
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => quickLogin(acc.email)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-left text-sm hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50"
                >
                  <span className="block font-semibold text-gray-800">
                    {acc.roleLabel}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {acc.email}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
