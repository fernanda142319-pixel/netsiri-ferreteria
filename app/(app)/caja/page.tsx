"use client";

import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Check, ChevronDown, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import {
  addCashMovement,
  cancelSale,
  closeCashSession,
  getOpenCashSession,
  listManualCashMovements,
  listSalesDetailForSession,
  listSalesForSession,
  openCashSession,
  SessionSale,
  SessionSaleDetail,
} from "@/lib/services/cashSessions.service";
import { listProfileNames } from "@/lib/services/profiles.service";
import { CashMovement, CashSession } from "@/types";
import { OpenCashSessionForm } from "@/components/cash/OpenCashSessionForm";
import { CashMovementForm } from "@/components/cash/CashMovementForm";
import { CloseCashModal } from "@/components/cash/CloseCashModal";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCLP } from "@/lib/utils/format";

const CAN_ACCESS_ROLES = ["owner", "admin", "cashier"];
const CAN_SEE_BY_CASHIER_ROLES = ["owner", "admin"];

export default function CajaPage() {
  const { profile } = useAuth();
  const [supabase] = useState(() => createClient());

  const [session, setSession] = useState<CashSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isOpeningSession, setIsOpeningSession] = useState(false);
  const [openSessionError, setOpenSessionError] = useState<string | null>(null);

  const [sales, setSales] = useState<SessionSale[]>([]);
  const [salesDetail, setSalesDetail] = useState<SessionSaleDetail[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [namesById, setNamesById] = useState<Map<string, string>>(new Map());
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [activeForm, setActiveForm] = useState<"income" | "withdrawal" | null>(null);
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);
  const [movementError, setMovementError] = useState<string | null>(null);

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closeResult, setCloseResult] = useState<CashSession | null>(null);

  const [editingOpeningAmount, setEditingOpeningAmount] = useState(false);
  const [openingAmountDraft, setOpeningAmountDraft] = useState(0);
  const [isSavingAmount, setIsSavingAmount] = useState(false);

  const canAccess = !!profile && CAN_ACCESS_ROLES.includes(profile.role);
  const canSeeByCashier = !!profile && CAN_SEE_BY_CASHIER_ROLES.includes(profile.role);

  useEffect(() => {
    if (!canAccess) return;
    getOpenCashSession(supabase).then(({ session }) => {
      setSession(session);
      setIsCheckingSession(false);
    });
  }, [supabase, canAccess]);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      listSalesForSession(supabase, session.id),
      listSalesDetailForSession(supabase, session.id),
      listManualCashMovements(supabase, session.id),
      listProfileNames(supabase),
    ]).then(([salesRes, salesDetailRes, movementsRes, namesRes]) => {
      setSales(salesRes.sales);
      setSalesDetail(salesDetailRes.sales);
      setMovements(movementsRes.movements);
      setNamesById(namesRes.namesById);
      setLoadedSessionId(session.id);
    });
  }, [supabase, session]);

  const isLoadingDetail = !!session && loadedSessionId !== session.id;

  if (profile && !canAccess) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <h1 className="text-xl font-bold text-gray-900">Acceso restringido</h1>
        <p className="mt-2 text-gray-500">Tu rol no tiene acceso al módulo de caja.</p>
      </div>
    );
  }

  if (isCheckingSession) {
    return <div className="text-gray-400">Cargando...</div>;
  }

  async function handleOpenSession(openingAmount: number) {
    setIsOpeningSession(true);
    setOpenSessionError(null);
    const { session, error } = await openCashSession(supabase, openingAmount);
    setIsOpeningSession(false);

    if (error || !session) {
      setOpenSessionError(error ?? "No se pudo abrir la caja.");
      return;
    }
    setCloseResult(null);
    setSession(session);
  }

  if (!session) {
    return (
      <OpenCashSessionForm
        isSubmitting={isOpeningSession}
        errorMessage={openSessionError}
        onOpen={handleOpenSession}
      />
    );
  }

  const totalCash = sales.filter((s) => s.paymentMethod === "cash").reduce((sum, s) => sum + s.total, 0);
  const totalCard = sales.filter((s) => s.paymentMethod === "card").reduce((sum, s) => sum + s.total, 0);
  const totalTransfer = sales
    .filter((s) => s.paymentMethod === "transfer")
    .reduce((sum, s) => sum + s.total, 0);
  const totalMixed = sales.filter((s) => s.paymentMethod === "mixed").reduce((sum, s) => sum + s.total, 0);

  const totalIncome = movements.filter((m) => m.type === "income").reduce((sum, m) => sum + m.amount, 0);
  const totalWithdrawal = movements
    .filter((m) => m.type === "withdrawal")
    .reduce((sum, m) => sum + m.amount, 0);

  const expectedCash = session.openingAmount + totalCash + totalIncome - totalWithdrawal;

  const salesByCashier = new Map<string, { name: string; count: number; total: number }>();
  for (const sale of sales) {
    const existing = salesByCashier.get(sale.userId);
    const name = namesById.get(sale.userId) ?? "Usuario";
    salesByCashier.set(sale.userId, {
      name,
      count: (existing?.count ?? 0) + 1,
      total: (existing?.total ?? 0) + sale.total,
    });
  }

  async function handleAddMovement(amount: number, description: string) {
    if (!activeForm || !session) return;
    setIsSubmittingMovement(true);
    setMovementError(null);
    const { movement, error } = await addCashMovement(supabase, session.id, activeForm, amount, description);
    setIsSubmittingMovement(false);

    if (error || !movement) {
      setMovementError(error ?? "No se pudo registrar el movimiento.");
      return;
    }
    setMovements((prev) => [movement, ...prev]);
    setActiveForm(null);
  }

  async function handleCancelSale(sale: SessionSaleDetail) {
    const confirmed = window.confirm(
      `¿Eliminar la venta #${salesDetail.indexOf(sale) + 1} por ${formatCLP(sale.total)}?\n\nEl stock de ${sale.items.length} producto(s) se restaurará automáticamente.`
    );
    if (!confirmed) return;

    setCancellingId(sale.id);
    const { error } = await cancelSale(supabase, sale.id, sale.items);
    setCancellingId(null);

    if (error) {
      alert("No se pudo anular la venta: " + error);
      return;
    }

    setSalesDetail((prev) => prev.filter((s) => s.id !== sale.id));
    setSales((prev) => prev.filter((s) => s.id !== sale.id));
    if (expandedSaleId === sale.id) setExpandedSaleId(null);
  }

  async function handleSaveOpeningAmount() {
    if (!session) return;
    setIsSavingAmount(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("cash_sessions")
      .update({ opening_amount: openingAmountDraft })
      .eq("id", session.id);
    setSession({ ...session, openingAmount: openingAmountDraft });
    setIsSavingAmount(false);
    setEditingOpeningAmount(false);
  }

  async function handleConfirmClose(countedCash: number) {
    if (!session) return;
    setIsClosing(true);
    setCloseError(null);
    const { session: closedSession, error } = await closeCashSession(
      supabase,
      session.id,
      countedCash,
      expectedCash
    );
    setIsClosing(false);

    if (error || !closedSession) {
      setCloseError(error ?? "No se pudo cerrar la caja.");
      return;
    }
    setIsCloseModalOpen(false);
    setCloseResult(closedSession);
    setSession(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caja</h1>
          <p className="text-gray-500">
            Abierta por {namesById.get(session.openedBy) ?? "—"} ·{" "}
            {new Date(session.openedAt).toLocaleString("es-CL")}
          </p>
        </div>
        <Button variant="danger" onClick={() => setIsCloseModalOpen(true)}>
          Cerrar caja
        </Button>
      </div>

      {closeResult && (
        <Card className="border-brand-200 bg-brand-50">
          <CardBody>
            <p className="font-semibold text-brand-800">
              Caja anterior cerrada. Diferencia: {formatCLP(closeResult.difference ?? 0)}
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Monto inicial editable */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-gray-500">Monto inicial</p>
              {!editingOpeningAmount && (
                <button
                  onClick={() => { setOpeningAmountDraft(session.openingAmount); setEditingOpeningAmount(true); }}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  title="Editar monto inicial"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
            {editingOpeningAmount ? (
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  autoFocus
                  type="number"
                  min={0}
                  value={openingAmountDraft}
                  onChange={(e) => setOpeningAmountDraft(Math.max(0, Number(e.target.value)))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveOpeningAmount(); if (e.key === "Escape") setEditingOpeningAmount(false); }}
                  className="w-full rounded-lg border border-brand-300 bg-white px-2 py-1 text-base font-bold text-gray-900 focus:outline-none focus:border-brand-500"
                />
                <button
                  onClick={handleSaveOpeningAmount}
                  disabled={isSavingAmount}
                  className="rounded-lg bg-brand-600 p-1.5 text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setEditingOpeningAmount(false)}
                  className="rounded-lg bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <p className="text-xl font-bold text-gray-900">{formatCLP(session.openingAmount)}</p>
            )}
          </CardBody>
        </Card>
        <SummaryTile label="Efectivo esperado" value={formatCLP(expectedCash)} highlight />
        <SummaryTile label="Ventas en efectivo" value={formatCLP(totalCash)} />
        <SummaryTile label="Ventas con tarjeta" value={formatCLP(totalCard)} />
        <SummaryTile label="Ventas por transferencia" value={formatCLP(totalTransfer)} />
        {totalMixed > 0 && <SummaryTile label="Ventas mixtas" value={formatCLP(totalMixed)} />}
        <SummaryTile label="Ingresos manuales" value={formatCLP(totalIncome)} />
        <SummaryTile label="Retiros manuales" value={formatCLP(totalWithdrawal)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos manuales</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="mb-4 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setActiveForm("income")}>
              <ArrowUpCircle size={16} /> Registrar ingreso
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setActiveForm("withdrawal")}>
              <ArrowDownCircle size={16} /> Registrar retiro
            </Button>
          </div>

          {activeForm && (
            <div className="mb-4">
              <CashMovementForm
                type={activeForm}
                isSubmitting={isSubmittingMovement}
                errorMessage={movementError}
                onSubmit={handleAddMovement}
                onCancel={() => setActiveForm(null)}
              />
            </div>
          )}

          {isLoadingDetail ? (
            <p className="py-4 text-sm text-gray-400">Cargando...</p>
          ) : movements.length === 0 ? (
            <p className="py-4 text-sm text-gray-400">Sin movimientos manuales todavía.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {movements.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge tone={m.type === "income" ? "success" : "warning"}>
                      {m.type === "income" ? "Ingreso" : "Retiro"}
                    </Badge>
                    <span className="text-gray-600">{m.description || "—"}</span>
                  </div>
                  <div className="text-right text-gray-500">
                    <p className="font-semibold text-gray-900">{formatCLP(m.amount)}</p>
                    <p className="text-xs">{new Date(m.createdAt).toLocaleString("es-CL")}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {canSeeByCashier && (
        <Card>
          <CardHeader>
            <CardTitle>Ventas por cajero</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            {salesByCashier.size === 0 ? (
              <p className="py-4 text-sm text-gray-400">Sin ventas registradas en este turno.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {Array.from(salesByCashier.values()).map((entry) => (
                  <li key={entry.name} className="flex items-center justify-between py-3 text-sm">
                    <span className="font-medium text-gray-800">{entry.name}</span>
                    <span className="text-gray-500">{entry.count} venta(s)</span>
                    <span className="font-semibold text-gray-900">{formatCLP(entry.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalle de ventas del turno ({salesDetail.length})</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          {isLoadingDetail ? (
            <p className="py-4 text-sm text-gray-400">Cargando...</p>
          ) : salesDetail.length === 0 ? (
            <p className="py-4 text-sm text-gray-400">Sin ventas registradas en este turno.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {salesDetail.map((sale, i) => {
                const isExpanded = expandedSaleId === sale.id;
                const methodLabel: Record<string, string> = {
                  cash: "Efectivo",
                  card: "Tarjeta",
                  transfer: "Transferencia",
                  mixed: "Mixto",
                };
                return (
                  <li key={sale.id}>
                    <div className="flex items-center gap-2 py-1">
                      <button
                        onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                        className="flex flex-1 items-center justify-between py-2 text-sm hover:bg-gray-50 px-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                          <span className="font-medium text-gray-700">Venta #{salesDetail.length - i}</span>
                          <Badge tone="neutral">{methodLabel[sale.paymentMethod] ?? sale.paymentMethod}</Badge>
                          <span className="text-gray-400 text-xs">{new Date(sale.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="text-xs text-gray-400">{namesById.get(sale.userId) ?? "—"}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{formatCLP(sale.total)}</span>
                      </button>
                      <button
                        onClick={() => handleCancelSale(sale)}
                        disabled={cancellingId === sale.id}
                        className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40 transition-colors"
                        title="Anular venta y restaurar stock"
                      >
                        <Trash2 size={15} />
                        {cancellingId === sale.id ? "Anulando..." : "Anular"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mb-3 ml-8 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-gray-200 text-gray-500">
                            <tr>
                              <th className="px-4 py-2 font-medium">Producto</th>
                              <th className="px-4 py-2 font-medium text-right">Cant.</th>
                              <th className="px-4 py-2 font-medium text-right">Precio unit.</th>
                              <th className="px-4 py-2 font-medium text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {sale.items.map((item) => (
                              <tr key={item.productId}>
                                <td className="px-4 py-2 text-gray-800">{item.productName}</td>
                                <td className="px-4 py-2 text-right text-gray-600">{item.quantity}</td>
                                <td className="px-4 py-2 text-right text-gray-600">{formatCLP(item.unitPrice)}</td>
                                <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCLP(item.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                          {sale.discount > 0 && (
                            <tfoot className="border-t border-gray-200">
                              <tr>
                                <td colSpan={3} className="px-4 py-2 text-right text-gray-500">Descuento</td>
                                <td className="px-4 py-2 text-right text-red-600 font-medium">-{formatCLP(sale.discount)}</td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <CloseCashModal
        isOpen={isCloseModalOpen}
        expectedCash={expectedCash}
        isSubmitting={isClosing}
        errorMessage={closeError}
        onClose={() => setIsCloseModalOpen(false)}
        onConfirm={handleConfirmClose}
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-brand-300 bg-brand-50" : undefined}>
      <CardBody>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-xl font-bold ${highlight ? "text-brand-800" : "text-gray-900"}`}>{value}</p>
      </CardBody>
    </Card>
  );
}
