# Changelog

Actualizado con cada commit. Entries > 90 días se archivan.

---

## 2026-04-13
- [refactor] Event system — Retorno no-op (no toca cantidades), guard dialog cuando hay líneas En Transito, ConfirmDialog component reusable.
- [feat] Dashboard widget "Entregas pendientes en viajes cerrados" (logistica/admin) — listado accionable con Registrar Entrega tardía o Cancelar línea + razón.
- [feat] Entrega tardía — mis-viajes/[id] soporta action=Entrega en URL y botón "Registrar Entrega Tardía" visible en trips Completados con líneas En Transito.
- [fix] handleDispatch + handleDelivery idempotentes — INSERT trip_events con UUID pre-generado como checkpoint; retry bajo red mala retorna early sin duplicar cantidades.
- [fix] (main/prod) Entrega parcial resta qtyThisTrip, no quantity_assigned — evita qty_scheduled inflada (b7ebf1a)
- [feat] DispatchModal role-based editing — campo solo confirma, logistica/admin editan vehículo/conductor/líneas/cantidades. Defensive override en handleDispatch para rol campo.

## 2026-04-09
- [fix] Calendar shows ALL items independent of table pagination + default collapsed (20f98d6) — cherry-picked to main/production
- [fix] Quitar columna Remolque + Tarifa solo precio con tooltip en tabla programación (b97a83d)
- [feat] Sentry error monitoring con source maps y session replay (15d3a3e)
- [feat] E2E test suite — 12 files, 100+ tests con Playwright (af9be5e → 638cf72)

## 2026-04-08
- [feat] Parada Level 1 — intermediate stop event for supplier pickups (446b0c7)
- [fix] AD-4 — PM cannot see confirmation code on pickup trips (6b92458)
- [fix] Remove pickup radio from solicitud form — decided at programming level (2faf6e2)
- [fix] 2 bugs found in code audit — Parada error handling + saveTrip busyRef (e936e5b)
- [chore] Finalize workflow — clean reference docs, simplify CLAUDE.md (0e759cb)
- [chore] Simplify docs workflow — CHANGELOG + BACKLOG replace 4 stale files (e664838)
- [bd-pending] Crear tabla custody_transfers (vacía, con función sin trigger activo). Ver prompt abajo.

## 2026-04-06
- [docs] Audit cleanup — fix refs, reduce context bloat, sync 17 days of docs (f7e5683)
- [fix] Include En Transito lines in backlog for partial scheduling (697af3e)

## 2026-04-01
- [fix] Audit #2 — busyRef finally, notifyRetorno PMs, deliveredQuantities dead code, Retorno filter, suggestions error log, qty_scheduled clamp (7302a7c)
- [fix] Audit #1 — qty_dispatched reset on Retorno, terminal status guard, orphan trip cleanup, cron Bearer-only, Math.min clamp, eventError rename, PII dev-only logs (84b305c)

## 2026-03-25
- [fix] 8 pre-production issues — event revert qty, Retorno undelivered lines, notification placeholders, registerEvent guards, fulfillment_type preserved, viaje_editado eventType, entrega receiver name, Llegada revertible (296f2cf)
- [fix] Filter reverted events from has* checks, show qty_dispatched, timeline detail (54a44db)

## 2026-03-24
- [feat] Batch 11 — dashboard En Tránsito, pickup badges, 2 new notifications (c3216e0)
- [feat] Batch 10 — self-pickup flow with Preparation and Pickup modals (ed58c67)
- [feat] Batch 9 — event reversion + bulkRequiresCode fix (ebc6dce)
- [feat] Batch 8 — DeliveryModal with per-line status, trip_event_lines, conditional code (a6e5b48)
- [feat] Batch 7 — editable DispatchModal replaces simple Salida confirmation (1f9c1e9)
- [fix] React error #310 — useEffect before early returns, Suspense wrapper (e001512, b14ba4c, dfc605b)
- [fix] Missing fields in LineWithRelations, SolicitudWithRelations (a267467)

## 2026-03-23
- [feat] Batch 6 — fulfillment_type, requires_code, receiver per line (aeb14ea)
- [feat] Batch 5 — sub-status operativo, banner entrega, shortcuts, URL params (f821946)

## 2026-03-21
- [fix] Retorno button available after Salida without requiring Entrega (8de9637)
- [fix] Timezone America/Panama in salida and retorno notifications (8511124)
- [fix] PM role only sees Entrega and Incidencia buttons (3cba071)
- [fix] Allow PM role to register trip events (fe305f9)
- [fix] Skip alerta diaria urgentes on Sundays (658eebc)
- [fix] Cron auth — exclude /api/cron from middleware (e3241ef, 1dfa9f5)

## 2026-03-20
- [feat] 2 notificaciones urgentes — alerta inmediata + cron diario (5594728)
- [feat] Notification preferences — filtrado por prefs + admin UI tab (f90abe5)

## 2026-03-19
- [feat] Password reset flow — forgot-password, auth/confirm, change-password, proxy.ts, login link (f981c70→43ee9fc)

## 2026-03-18
- [docs] Reestructuración docs — CLAUDE.md fijo, skills con frontmatter, refs actualizadas (554f61b)
- [fix] Charris notificaciones — agregar a 1-3,9-12 (2153593, 68cd569)

## 2026-03-17
- [feat] Paginación server-side solicitudes + client-side viajes/admin (81b9deb)
- [feat] Filtro de fechas con rango Desde/Hasta (641b90a)
- [fix] DataTable expand/collapse controlled state (1b7e080)
- [fix] Bugs UX batch — loop infinito, layout line card, time picker (d3933fe, 49cb4c2)
- [feat] Renombrar Viaje → Movilización en toda la UI (0eae231)

## 2026-03-15
- [feat] File attachments — storage helper, FileUploader, FileDisplay (83b6977→f0a84d6)
- [feat] Columna Fecha Enviada en lista solicitudes (4f7dd68)

## 2026-03-12
- [feat] Entregas parciales — qty_delivered acumulado, backlog Parcial, guard Salida (38854f6→3bde6e9)
- [fix] Bugs #18-27 — timezone, días completadas, KPI, En Transito acento, receptores (6249867→7de6658)
- [feat] Prioridad eliminada de UI — columna Días es suficiente (d17771f)
- [feat] Admin mode sin restricciones — editar cualquier estado (86a222c)
- [feat] Extras en cascada + Admin Masters 6 tabs CRUD (5d7a6fb, 67875dd)

## BD changes (via Claude Chat — no en código)
- [bd] 2026-03-20: notification_preferences JSONB + prefs para 14 usuarios
- [bd] 2026-03-18: auth.users fields NULL→'' para 16 usuarios
- [bd] 2026-03-17: DB expansion 22→44 tablas, equipment 12 cols + auto-tag
- [bd] 2026-03-15: Storage bucket attachments + 4 RLS policies
- [bd] 2026-03-15: Email notifications — generate_request_id/trip_id SECURITY DEFINER
- [bd] 2026-03-12: RLS sm_request_lines operational_update, cascade_request_status fix
- [bd] 2026-03-12: trip_line_assignments.qty_delivered, cascade Parcial fix
- [bd] 2026-03-09: received_by_id, generate_confirmation_code trigger, generate_full_code dashes
