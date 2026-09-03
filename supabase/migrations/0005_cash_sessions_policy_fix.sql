-- MiniPOS Pro — Etapa 6: permitir que cualquier Cajero cierre la caja
-- abierta (no solo quien la abrió), igual que Dueño/Administrador.
-- Bodeguero queda fuera a propósito (no maneja caja).

drop policy if exists "cash_sessions_update_owner_or_management" on public.cash_sessions;

create policy "cash_sessions_update_staff" on public.cash_sessions for update to authenticated
  using (public.current_role() in ('owner', 'admin', 'cashier'));
