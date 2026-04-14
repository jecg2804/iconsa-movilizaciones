# Backlog — MovimientOS

Última actualización: 2026-04-14 (Fase C completa)

---

## En curso: Audit consolidado (plan en `~/.claude/plans/linked-sleeping-lighthouse.md`)

Post-refactor de event system, 3+ rondas de auditoría produjeron ~65 hallazgos accionables. Plan de ejecución por fases:

- **Fase A — Hardening cantidades** (código). ✅ COMPLETADA (6 commits):
  - A.1 ✅ `handlePickup` idempotencia + N8 (throw trip_event_lines) + M6 (notify loop). `e232777`
  - A.2 ✅ `handleDelivery` race fix (fresh SELECT de `assignment.qty_delivered`) + M6. `a384f99`
  - A.3 ✅ `handleRevert` branch Retiro (N1 fix — rollback qty + trip status). `328810e`
  - A.3 fix-up ✅ `handleRevert` Retiro también limpia `actual_arrival` (confirmado en B.0 body de `complete_pickup_trip`). `cc69856`
  - A.4 ✅ `handleParada` throw (N7) + `handlePreparation` idempotency (N9). `5c3bdd0`
  - A.5 ✅ Tests E2E pickup-flow.spec.ts (happy path + revert Retiro). `760d785`
- **Fase B.0 — Exploración BD** (via Supabase SQL Editor). ✅ COMPLETADA. Todos los function bodies, triggers, RLS policies, indexes, storage policies verificados. 5 hallazgos nuevos (BD-X1, BD-F9, BD-S1, BD-F1, BD-F6) documentados en plan.
- **Fase B.1 — Fixes BD** (via Supabase SQL Editor en staging). ✅ COMPLETADA en 4 bloques:
  - Bloque 1 (seguridad mayor): RLS en 22 tablas, search_path en 7 funcs, audit_log restringido, equipment_assemblies fix-up.
  - Bloque 2 (business rules): 2 triggers nuevos + 4 CHECK constraints duros en cantidades.
  - Bloque 3 (performance): 10 indexes FK en tablas core.
  - Bloque 4 (storage mínimo): MIME + size validation en upload/update policies. Fix stretch (path-ownership + delete via API) queda para Fase C.
  - Verificación final: security advisors muestran solo los 2 lints intencionales (`feedback` + `suggestions` con `WITH CHECK (true)` — working as intended).
- **Fase C — Defense-in-depth código + UX polish**. ✅ COMPLETADA en 7 commits:
  - C.4 ✅ Timezone unificado — nuevo datetime.ts helper Panamá-safe (N_R2_3, N_R2_4, N_R3_1, N_R3_3, N_R3_14, N4). `28cdb4d`
  - C.1 ✅ Seguridad — SEC1 sentryBeforeSend redact, SEC2 eliminar Math.random() confirmation_code, XSS1 escapeHtml en 16 templates. `ea0603c`
  - C.2 ✅ Notificaciones — A4 status filter en 12 notify* functions, N_R3_7 dedup por email en TEST mode, N_R3_8 fail-closed dedup. `89c5f87`
  - C.3 ✅ Forms UX — canDeleteLines (N6/M2), scheduled_date min + server guard (N_R2_2), rate auto-fill confirm (M1), pickup toggle confirm (N_R2_7). `81ec148`
  - C.5 ✅ Admin masters — useSubmitGuard en 3 handlers (N_R3_4), required-field validation (N_R3_5). `3a8bea5`
  - C.6 ✅ Event edges — revert Llegada guard (N5), eventIdRef reset en catch (B2), generateRequestIdFallback eliminado (A3). `6a7ce94`
  - C.7 ✅ Smells — storage.log gate dev (B1), useAuth catch (B5), tsconfig ES2022 (N_R3_11). `e247ce6`
- **Fase D** — Performance BD: incorporada al Bloque 3 de B.1 (10 indexes FK). ~~D~~ ✅
- **Fase E — Tests expansion + docs**. ✅ COMPLETADA:
  - `tests/audit-gates.spec.ts` nuevo — 5 tests BD-first que validan gates de Fase B.1 sin UI (SEC2, BD-F7, BD-X1, N_R2_1, audit_log RLS). Todos verdes en staging. Cobertura total ahora: 14 archivos / 131 tests.
  - `CLAUDE.md` actualizado: 44 → 47 tablas, tsconfig ES2022, staging branch documentada.
  - Tests deferred (requieren credenciales pm/campo no disponibles en staging): role-permissions expansion DispatchModal campo-role, cost-code cascade, rate-autofill UI, notification dedup, RLS enforcement por rol. Levantar cuando se creen usuarios de prueba por rol.
- **Fase F** — MIGRATIONS_FAILED investigation (pre-merge, no bloquea Fases A–E). ⏳ Pendiente

### Hallazgos post-refactor (pre-audit)

1. **Retorno puro** — ✅ Completado (2026-04-13). No toca cantidades; guard dialog cuando hay líneas En Transito.
2. **Dashboard widget "Entregas pendientes en viajes cerrados"** — ✅ Completado. Listado accionable (Registrar Entrega tardía / Cancelar línea).
3. **Idempotencia handleDispatch + handleDelivery** — ✅ Completado. INSERT trip_events como checkpoint, retry bajo red mala es seguro.
4. **Idempotencia handlePickup** — ✅ Completado (2026-04-14, Fase A.1). Mismo pattern.
5. **Reversiones** — Falta verificar que revert de Entrega parcial recalcula correctamente. Pendiente hasta Fase C.6.
6. **Reconciliación per-line al Retorno** — ⏳ Diferido hasta tener métricas reales de uso. El dashboard widget cubre el caso sin UX especulativa.
7. **GPS Integration** — Plan en desarrollo (otro chat). API de Skydata disponible.

### Parked (post-audit)

- **Git/GitHub practices** — enforcement via rules + deny patterns + Husky + GitHub branch protection + skill `/release`. 3 preguntas pendientes. Retomar tras Fase F.

---

## Estado actual vs herramientas profesionales

| Capacidad | MovimientOS | Tenna | HCSS | Procore | Visual Dispatch |
|---|---|---|---|---|---|
| Solicitudes de movilización | ✅ Completo | ❌ | ❌ | Parcial (RFIs) | ❌ |
| Programación de viajes | ✅ Completo | ❌ | ✅ Dispatch | ❌ | ✅ Core |
| Despacho con qty editable | ✅ DispatchModal | ❌ | ✅ | ❌ | ✅ |
| Entrega per-line con observaciones | ✅ DeliveryModal | ❌ | Parcial | ❌ | ❌ |
| Paradas intermedias | ✅ Level 1 | ❌ | ✅ Multi-stop | ❌ | ✅ |
| Código de confirmación | ✅ 4 dígitos | ❌ | ❌ | ❌ | ❌ |
| Entregas parciales | ✅ qty_delivered acumula | ❌ | ✅ | ❌ | ❌ |
| Reversión de eventos | ✅ Con audit trail | ❌ | ❌ | ❌ | ❌ |
| GPS tracking en vivo | ❌ Pendiente | ✅ Core | ✅ | ❌ | ✅ |
| Inspecciones de equipo | ❌ Tablas listas | ✅ | ✅ | ❌ | ❌ |
| Reportes PDF auto-generados | ❌ Pendiente | ✅ | ✅ | ✅ | Parcial |
| Dashboards por rol | ❌ Dashboard genérico | ✅ | ✅ | ✅ | ✅ |
| OC/Procurement | ❌ Tablas listas | ❌ | ❌ | ✅ Core | ❌ |
| Work orders mantenimiento | ❌ Tablas listas | ✅ | ✅ | ❌ | ❌ |
| Fuel tracking | ❌ Tablas listas | ✅ | ✅ | ❌ | ❌ |
| Notificaciones email | ✅ 16 templates | Parcial | ✅ | ✅ | ✅ |
| Mobile-first | ✅ Responsive | ✅ App nativa | ✅ App | ✅ App | ✅ App |

**Ventaja MovimientOS:** Código de confirmación + entrega per-line + reversiones + paradas = workflow más completo que cualquiera individualmente. Personalizado a ICONSA.

**Gaps principales:** GPS, Inspecciones, Reportes, Dashboards por rol.

---

## Architectural Debt

| # | Item | Impacto | Status |
|---|------|---------|--------|
| AD-1 | Self-pickup forzado en Trip entity — debería ser PickupOrder separado | Semántica rota (Trip sin driver/vehicle) | ⏳ Deferred |
| AD-2 | custody_transfers table — tabla creada en staging, trigger no activo | Trigger acoplado a trip_events | ⏳ Tabla lista, falta conectar |
| AD-3 | Fulfillment a nivel Trip, no línea — bloquea hybrid fulfillment | 2 solicitudes para fleet+pickup | ⏳ Depende de AD-1 |
| AD-4 | PM ve código en pickup | Rompe verificación | ✅ Fixed |
| BUG | qty_scheduled vs qty_dispatched en backlog | Pending qty incorrecto post-dispatch | ✅ Fixed (2026-04-13) |

---

## Features por Tier

### Tier 1: Perfeccionar movilizaciones

| # | Feature | Status |
|---|---------|--------|
| F1 | ~~Sistema de eventos rediseñado~~ | ✅ Completado (Batches 5-11) |
| F1.1 | Parada Level 1 | ✅ Completado (446b0c7) |
| F1.2 | Fix qty_dispatched bug en backlog | ✅ Completado |
| F1.3 | Retorno no-op + guard + dashboard "Entregas pendientes en viajes cerrados" + idempotencia handlers | ✅ Completado (2026-04-13) |
| F1.4 | Retorno reconciliación per-line (diferido — esperar métricas reales de uso antes de implementar) | ⏳ Deferred |
| F1.5 | GPS Integration (Skydata API) | 🟡 Plan en desarrollo |
| F2 | Inspección de equipo (IC-EQ-F-01-02) | ⏳ 6 tablas listas |
| F3 | Reporte facturación mensual | ⏳ Pendiente |
| F4 | Informe Valderrama semanal | ⏳ Pendiente |
| F5 | Dashboards por rol | ⏳ Pendiente |

### Tier 2: Gestión de equipos

| # | Feature |
|---|---------|
| F6 | Assemblies/accesorios (tablas existen) |
| F7 | Onboarding equipos menores + QR |
| F8 | Catálogo visual de equipos |
| F9 | Órdenes de compra digitalizadas (tablas existen) |
| F10 | Admin mejorada (PMs manejan su personal) |

### Tier 3: Taller y workshop

| # | Feature |
|---|---------|
| F11 | Work orders de mantenimiento (tabla existe) |
| F12 | Fuel tracking (tabla existe) |
| F13 | Operator qualifications (tabla existe) |
| F14 | Warehouse/inventario básico (tablas existen) |
| F15 | Bitácora de movilizaciones (IC-LOG-F-06-04) |

### Tier 4: Integraciones

| # | Feature |
|---|---------|
| F16 | Spectrum API (read-only sync) |
| F17 | GPS/Skydata tracking |
| F18 | WhatsApp notifications |
| F19 | PWA offline |

---

## Infraestructura reciente

- [x] Sentry error monitoring integrado
- [x] E2E test framework con Playwright (100+ tests, 12 archivos)
- [x] Calendar fix cherry-picked a producción
- [x] custody_transfers tabla creada en staging
- [x] Workflow simplificado (CHANGELOG + BACKLOG)

---

## Preguntas abiertas

| Tema | Contexto |
|------|----------|
| Definición "equipo menor" | ¿<$10K? ¿<$5K? ¿tipo EQA? Requiere reunión |
| Facturación: agrupamiento por equipo | Tarifa basada en equipo movilizado vs vehículo. Lógica exacta TBD |
| Prorrateo costo multi-proyecto | Viaje sirve a 2 proyectos → ¿cómo dividir? |
| Movilizaciones externas | Checkbox existe pero sin formulario completo |
