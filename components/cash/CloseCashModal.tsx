"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCLP } from "@/lib/utils/format";

interface CloseCashModalProps {
  isOpen: boolean;
  expectedCash: number;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: (countedCash: number) => void;
}

export function CloseCashModal({
  isOpen,
  expectedCash,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: CloseCashModalProps) {
  const [countedCash, setCountedCash] = useState(expectedCash);
  const difference = countedCash - expectedCash;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onConfirm(countedCash);
  }

  return (
    <Modal title="Cerrar caja" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <span className="text-sm text-gray-500">Efectivo esperado</span>
          <span className="text-lg font-bold text-gray-900">{formatCLP(expectedCash)}</span>
        </div>

        <Input
          label="Efectivo contado (CLP)"
          type="number"
          min={0}
          value={countedCash}
          onChange={(e) => setCountedCash(Number(e.target.value))}
        />

        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <span className="text-sm text-gray-500">Diferencia</span>
          <Badge tone={difference === 0 ? "success" : difference > 0 ? "brand" : "danger"}>
            {difference > 0 ? "+" : ""}
            {formatCLP(difference)}
          </Badge>
        </div>

        {errorMessage && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" variant="danger" disabled={isSubmitting}>
            {isSubmitting ? "Cerrando..." : "Confirmar cierre"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
