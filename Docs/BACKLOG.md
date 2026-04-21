# Backlog — MovimientOS

Última actualización: 2026-04-15 (sprint prod cherry-pick cerrado, staging-track siguiente)

---

## Siguiente sprint — Staging-track Events V2 polish

Items confirmados para el próximo sprint en `jaime/dev`. Se arranca en
próxima sesión cuando James elija por dónde empezar. **Plan file:**
ninguno activo — se abre fresh.

**Design discussions pre-requisito (no bloquean todo pero cada una
gatea su item correspondiente):**

- **AD-1 Pickup architecture** — ¿PickupOrder entity separada (como
  recomienda `Docs/reference/Self-pickup.md`) vs fix rápido en Trip
  entity? Prerequisito para J1. La semántica actual de forzar pickup
  dentro de Trip genera edge cases (vehicle_id null, driver_id null,
  custody transfer coupling).
- ~~**J2 requires_code default**~~ — **CERRADO 2026-04-16.** Decisión
  de James + jefe: códigos de confirmación son **siempre obligatorios**.
  El feature `requires_code` per-line se elimina. Implementación pendiente.
- **J9 cost code architectural** — ¿mover `cost_code_id` /
  `cost_category_id` / extra de `sm_request_lines` a `sm_requests`?
  Requiere data analysis primero: contar cuántas solicitudes tienen
  líneas con cost_codes distintos. Si <5% de las solicitudes tienen
  split, migración forzada viable. Si >20%, hay que mantener ambos
  niveles o decidir merge strategy.

**Items de implementación (tras design discussion correspondiente):**

- **J1 Pickup flow bloqueado** — TripForm valida `driver_id` y
  `vehicle_id` como required incluso cuando `is_self_pickup=true`
  (el toggle los limpia en UI pero `validate()` en
  `nuevo/page.tsx:200-213` no los hace opcionales). Fix corto o
  profundo depende de AD-1.
- **J2 Eliminar `requires_code` del código** — códigos son siempre
  obligatorios (decisión 2026-04-16). Eliminar: checkbox en LineEditor
  "Opciones avanzadas", bulk checkbox en solicitudes/nueva, lógica
  condicional `needsCode` en DeliveryModal, badge 🔑 per-line (G7),
  campo `requiresCode` de interfaces en hooks. Tests que validan
  requires_code=true/false. BD: columna `requires_code` puede quedar
  pero ignorarse (o DROP posterior).
- **J5 Overarching event design** — seguir refinando el rediseño de
  EVENTS V2 con features que no existen en prod.
- **J9 Cost code refactor** — solo después del data analysis.
- **G1 Reversion guard** — `handleRevert` en `mis-viajes/[id]/page.tsx`
  NO valida que `registered_by === current_user.id`. Gate actual solo
  por rol. Un logistica puede revertir eventos de OTRO logistica.
- **G4 `notifyLineaRechazada`** — líneas rechazadas en DeliveryModal
  (`status='rejected'`) no disparan notificación específica al PM.
- **G5 Timeline per-line detail** — EventTimeline muestra solo summary
  a nivel trip. Per-line detail de Entrega (qty por línea, observación)
  no se ve.
- **G10 Incidencia min length** — IncidenciaModal sin validación de
  longitud mínima de descripción.
- **G11 DeliveryModal partial-previous warning** — DeliveryModal no
  advierte cuando una línea ya tiene entrega parcial previa. La BD
  atrapa por qty_invariant pero UX pobre.
- **G17–G20 EVENTS_V2.md doc cleanup** — mismatches entre el doc y
  el código (ej. doc menciona columna `stop_location`, real es
  `trip_events.location`; orden de operaciones en handleDelivery
  distinto al descrito; conteo de notificaciones; botón multi-entrega
  verificar).

**Notas del contexto previo:**

Algunos G-items pueden haber sido resueltos tangencialmente en el
sprint v1/v2 — re-verificar contra `CHANGELOG.md` 2026-04-15 antes de
asignar a implementación. En particular G3 (notifyEntregaConObservaciones)
y G8 (pickup badges) fueron marcados como resueltos en el triaje
original, cross-checkear G6 (dashboard links) y otros.

---

## Merge v2 (staging → main) — cuando llegue el momento

- **Merge v2 (staging → main)**:
  - Bootstrap GPS en prod (13 UPDATEs por `spectrum_code` + 3 por `plate` — SQL completo en `CHANGELOG.md` entry del 2026-04-20). Staging ya tiene 13/13.
  - Constraint `valid_event_type` superset (18 event_types — ya aplicado en staging + prod el 2026-04-20, solo verificar que sigue en sync post-merge).
  - Suite de notificaciones: `RESEND_API_KEY` en env prod, data de staging, recipients de event_types nuevos.
  - Multi-PM email smoke post-merge — verificar que `salidaRegistrada` manda correctamente a múltiples PMs cuando un trip afecta solicitudes de proyectos distintos.

Consolida items sueltos de Task 10 del plan GPS MVP (`Docs/superpowers/plans/2026-04-20-gps-live-tracking.md`) — los otros items de esa lista (render paths `no_gps` / `pickup`, flip CHANGELOG, fix constraint) ya están resueltos o son edge cases de bajo valor. El merge es la verdadera unidad de trabajo.

---

## Completado recientemente (abril 2026)

- **Sprint prod cherry-pick 2026-04-15 — 2 releases tagged y verificados en prod.**
  - **v2026.04.15-1** (`870a8f6`): **J3** RBAC conductores (security, redirect hard para `campo`, filter driver_id server-side en useMyTrips, ownership guard en mis-viajes/[id], test manual con user real ✅), **J4** calendarios y filtros unificados (rediseño — consolidar `dateFilter` local en `useSolicitudes`/`useTrips`, añadir `projectId` server-side a TripsFilter con 2-step query via trip_line_assignments, calendario y tabla comparten mismo set de filtros), **J6** tarifa no editable (cost disabled cuando rateId seleccionado), **J7** código costo requerido (validación Fase en LineEditor), **J8a** scroll/zoom modales en mobile (max-h + overflow-y-auto + p-4 sm:p-6 en 6 modales jaime/dev + EventModal main), **J8b** duplicar líneas (botón Copy en LineRow, handler en SolicitudForm + [id] gated por canAddLines). Detalle completo en `Docs/CHANGELOG.md` 2026-04-15.
  - **v2026.04.15-2 hotfix** (`1425cae`): **J4-A** regresión click-día (fix original de J4 unificó demasiado `dateFrom=dateTo=día` → colapsaba calendario. Fix: nuevo campo `singleDay` ortogonal en `SolicitudesFilter`/`TripsFilter`, filtra solo la tabla, calendario sigue mostrando otros días), **J4-B** sort server-side (bug preexistente — sort de columnas operaba client-side sobre página actual. Fix: contrato `externalSort` en DataTable + `serverSortKey` en Column, hooks aplican `.order(col, { ascending })` server-side. Columnas marcadas: request_id/date_required/date_submitted/status en solicitudes; trip_id/scheduled_date/status en programación), **J7-ext** código costo 3 campos (el fix previo solo validaba Fase; James aclaró que "código de costo" son 3 campos: extra + fase + categoría. Los 3 requeridos).
- **Audit consolidado código + BD** — ~65 hallazgos de 3+ rondas, organizados en 6 fases (A: hardening cantidades, B.0/B.1: BD security + business rules + indexes, C: defense-in-depth código + UX polish, D: incorporado a B.1, E: tests + docs). Todos commiteados en `jaime/dev`. Detalle completo en `Docs/CHANGELOG.md` 2026-04-14. Fase F (MIGRATIONS_FAILED) descartada tras investigación — no-bloqueante.
- **Git/GitHub practices** — 3 capas client-side activas: deny patterns, Husky hooks (pre-commit/pre-push/post-commit con build en background), skill `/release`. Capa server-side pendiente upgrade a GitHub Team.
- **Higiene de docs + manejo de contexto** — rule `plan-lifecycle.md`, nuevo `Docs/TRAIL.md` auto-cargado, CLAUDE.md reference section con tabla de consulta, reference/archive reorganizados, `no-modify-specs` eliminada.
- **Hallazgos pre-audit cerrados:** Retorno puro, dashboard widget entregas pendientes, idempotencia handleDispatch/handleDelivery/handlePickup, revert Entrega parcial verificado por análisis estático (4 escenarios, hallazgo #5).

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
| AD-5 | `createSolicitud`/`createTrip` helpers en `tests/helpers.ts` — createSolicitud falla silencioso al agregar líneas, deja solicitud vacía Enviada. `createTrip` derivado falla por `assignments.length===0`. **Rompe TODOS los tests E2E que crean data**. Detectado 2026-04-14 en Bloque 3 tras Fase C. No es una regresión reciente clara (selector drift sospechoso), requiere investigación con `--headed`. | E2E infra rota, no podemos escribir tests nuevos de flow completo | ⏳ Pendiente |
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
| F1.6 | Observaciones de entrega visibles — cerrar loop de `delivery_observations`. Conductor reporta damaged/wrong_qty/wrong_item/rejected + notas pero nadie lo ve después. Scope: mostrar en EventTimeline, sección en solicitud detail, dashboard widget, resolver con notas. Requiere 3 columnas BD nullables (`resolved_at`, `resolved_by`, `resolution_notes`). | ⏳ Nice-to-have, baja prioridad |
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
