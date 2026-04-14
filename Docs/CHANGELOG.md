# Changelog

Actualizado con cada commit. Entries > 90 días se archivan.

---

## 2026-04-14
- [test] Fase E — `tests/audit-gates.spec.ts` nuevo: 5 tests BD-first para validar los gates de Fase B.1 sin depender de UI. SEC2 (trigger genera confirmation_code), BD-F7 (enforce_line_add_delete_only_in_borrador), BD-X1 (qty_invariant), N_R2_1 (enforce_trip_immutable_post_departure), audit_log RLS. Todos verdes en staging.
- [docs] CLAUDE.md — 44 → 47 tablas, target tsconfig ES2022, staging branch `vonwkciosksqspyljzfy` añadida al header Stack.
- [fix] `alerta_diaria_urgentes` referencia a variable local `today` eliminada en C.4 — causa del build rojo en Vercel en todos los commits de Fase C. Reemplazada por `daysBetweenInPanama(todayStr, req.date_required)`. `099fe17`
- [feat] Fase C.7 — smells cleanup: storage.ts console.log gated a dev (B1), useAuth getUser().catch() previene loading colgado (B5), tsconfig target ES2017 → ES2022 (N_R3_11). `e247ce6`
- [feat] Fase C.6 — event edges: revert Llegada bloqueado si hay Entrega/Retiro/Parada posteriores (N5); Pickup/Dispatch/Delivery/Preparation modals regeneran eventIdRef en catch (B2); generateRequestIdFallback eliminado — confiar en trigger BD (A3). `6a7ce94`
- [feat] Fase C.5 — admin masters: toggleStatus, addPersonProject, removePersonProject wrapped en useSubmitGuard (N_R3_4); handleSave valida required fields por tabla antes de insert (N_R3_5). `3a8bea5`
- [feat] Fase C.3 — forms UX: canDeleteLines gate explícito en solicitudes/[id] (N6/M2); scheduled_date Input min=hoy Panamá + guard server-side en saveTrip (N_R2_2); rate auto-fill pide confirmación si hay costo manual distinto (M1); pickup toggle pide confirmación si borra driver/vehicle/trailer (N_R2_7). `81ec148`
- [feat] Fase C.2 — notificaciones: A4 status filter en 12 notify* functions (early-return si trip/request/line ya no aplica); N_R3_7 dedup por recipient_email en TEST_EMAIL mode; N_R3_8 fail-closed si dedup query falla. `89c5f87`
- [feat] Fase C.1 — seguridad: SEC1 sentryBeforeSend redact hook (PII/tokens/headers/cookies) en server/edge/client; SEC2 eliminada generación client-side de confirmation_code — trigger BD única fuente; XSS1 escapeHtml() helper + wrap de 16 templates de notificación email. `ea0603c`
- [feat] Fase C.4 — timezone unificado: nuevo `src/lib/utils/datetime.ts` con helpers Panamá-safe; refactor de format.ts, calendario/page.tsx, notifications/actions.ts. Cubre N_R2_3, N_R2_4, N_R3_1, N_R3_3, N_R3_14, N4. `28cdb4d`
- [bd] Fase B.1 completa (staging) — audit BD aplicado en 4 bloques vía Supabase SQL Editor:
  - Bloque 1.A: RLS habilitada en 22 tablas (21 del subsystem equipment/workshop/procurement + `equipment_assemblies`) con policy `admin_all` baseline. BD-C1 cerrado.
  - Bloque 1.B: `ALTER FUNCTION ... SET search_path` en 7 funciones flagged (`enforce_qty_integrity`, `cascade_request_status`, `complete_pickup_trip`, `update_equipment_location_on_delivery`, `update_equipment_location_on_custody_transfer`, `generate_internal_asset_tag`, `log_equipment_status_change`). BD-C3 cerrado.
  - Bloque 1.C: `audit_log.read_all` reemplazada por `admin_read` — cierra leak de PII histórica. BD-F9 cerrado.
  - Bloque 2.A: Trigger `enforce_line_add_delete_only_in_borrador` en `sm_request_lines` — enforza la regla "no add/delete líneas después de Enviada" a nivel BD. BD-F7 cerrado.
  - Bloque 2.B: Trigger `enforce_trip_immutable_post_departure` en `trips` — bloquea cambios de vehicle/driver/trailer en trips En Ruta/Completado/Cancelado. N_R2_1 cerrado.
  - Bloque 2.C: 4 CHECK constraints duros en `sm_request_lines` (`qty_positive`, `qty_delivered_nonneg`, `qty_scheduled_nonneg`, `qty_invariant`) — el invariante combinado qty_scheduled+qty_delivered<=quantity es nuevo a nivel BD (trigger enforce_qty_integrity lo validaba por columna pero no combinado). BD-X1 cerrado. Data repair pre-aplicado sin violaciones en staging.
  - Bloque 3: 10 indexes FK en tablas core (`sm_request_lines`, `trips`, `trip_events`, `trip_event_lines`, `delivery_observations`). BD-H1 cerrado.
  - Bloque 4: Storage `attachments` policies `authenticated_upload` y `authenticated_update` ahora validan MIME type + tamaño ≤ 10MB contra `metadata`. BD-S1 parcial cerrado (fix stretch path-ownership + delete via API queda para Fase C).
- [audit] Audit extensivo consolidado (código + BD) — 3+ rondas de hallazgos, ~65 items accionables, fases A–F documentadas en plan. Nuevos hallazgos BD: 22 tablas con RLS disabled, 7 funciones con search_path mutable, 12 FKs sin índice en core tables. Plan guardado para ejecución por fases.
- [chore] X0 (middleware huérfano) descartado — `proxy.ts` es la convención correcta en Next.js 16, `middleware.ts` deprecado. Verificado con build real.
- [fix] Fase A.1 — handlePickup idempotencia + N8 + M6. INSERT trip_events como checkpoint con event_id pre-generado en PickupModal. Retry bajo red mala retorna early sin duplicar qty_delivered. Throw en trip_event_lines failure. notifyEntregaConfirmada loop por cada línea. (e232777)
- [fix] Fase A.2 — handleDelivery race + M6. Fresh SELECT de `trip_line_assignments.qty_delivered` antes del UPDATE para reducir race window bajo entregas concurrentes. notifyEntregaConfirmada loop por cada línea (mismo fix M6). Race completo requiere RPC atómica en Fase B. (a384f99)
- [feat] Fase A.3 — handleRevert branch Retiro (N1 fix). Espejo de Entrega para revertir qty_delivered/qty_scheduled/status, más rollback del trip de Completado a En Ruta. Antes el revert solo insertaba el Reversion event sin tocar la BD — ahora deshace todo. TODO: verificar body de complete_pickup_trip en Fase B.0 por si setea otros campos. (328810e)
- [fix] Fase A.4 — handleParada throw + handlePreparation idempotency (N7 + N9). Parada ahora throw en trip_event_lines failure (antes silencioso). PreparationModal expone event_id pre-generado; handlePreparation usa checkpoint pattern con 23505 early return. (5c3bdd0)
- [test] Fase A.5 — pickup-flow.spec.ts. Tests E2E para validar A.1, A.3, A.4: happy path Preparación → Retiro completa el trip + qty actualizadas; revert Retiro recalcula qty_delivered + trip vuelve a En Ruta + Reversion event. Helpers nuevos: registerPreparation, registerRetiro. (760d785)

## 2026-04-13
- [fix] handleRevert Entrega: status dinámico (Parcial si aún hay qty_delivered > 0, no hardcode 'En Transito'); delivered_at condicional.
- [fix] handleRevert Retorno: NO limpia actual_arrival (era bug — ese campo pertenece a Llegada).
- [feat] Dashboard widget "Entregas pendientes" visible para todos los roles (antes solo logistica/admin). Cancelar línea sigue gated a logistica/admin.
- [refactor] Event system — Retorno no-op (no toca cantidades), guard dialog cuando hay líneas En Transito, ConfirmDialog component reusable.
- [feat] Dashboard widget "Entregas pendientes en viajes cerrados" — listado accionable con Registrar Entrega tardía o Cancelar línea + razón.
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
