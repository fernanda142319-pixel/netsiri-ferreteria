"use client";

import { FormEvent, useState } from "react";
import { Wallet } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface OpenCashSessionFormProps {
  isSubmitting: boolean;
  errorMessage: string | null;
  onOpen: (openingAmount: number) => void;
}

export function OpenCashSessionForm({ isSubmitting, errorMessage, onOpen }: OpenCashSessionFormProps) {
  const [amount, setAmount] = useState(0);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onOpen(amount);
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md">
        <CardBody className="flex flex-col items-center gap-4 text-center">
          <span className="rounded-2xl bg-brand-50 p-4 text-brand-700">
            <Wallet size={32} />
          </span>
          <h1 className="text-xl font-bold text-gray-900">Abre la caja para empezar a vender</h1>
          <p className="text-sm text-gray-500">
            Ingresa el monto en efectivo con el que comienza el turno. Esto queda registrado para
            calcular la diferencia de caja al cerrar.
          </p>

          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
            <Input
              label="Monto inicial (CLP)"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            {errorMessage && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
            )}
            <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting ? "Abriendo..." : "Abrir caja"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
