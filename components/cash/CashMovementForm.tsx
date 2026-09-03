"use client";

import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface CashMovementFormProps {
  type: "income" | "withdrawal";
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (amount: number, description: string) => void;
  onCancel: () => void;
}

export function CashMovementForm({
  type,
  isSubmitting,
  errorMessage,
  onSubmit,
  onCancel,
}: CashMovementFormProps) {
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      setValidationError("El monto debe ser mayor a 0.");
      return;
    }
    setValidationError(null);
    onSubmit(amount, description);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-end"
    >
      <div className="w-40">
        <Input
          label="Monto (CLP)"
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </div>
      <div className="flex-1">
        <Input
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={type === "income" ? "Ej: vuelto de cambio" : "Ej: pago a proveedor"}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : type === "income" ? "Registrar ingreso" : "Registrar retiro"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      {(validationError || errorMessage) && (
        <p className="w-full rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {validationError || errorMessage}
        </p>
      )}
    </form>
  );
}
