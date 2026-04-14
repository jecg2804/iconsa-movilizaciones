# Backlog — MovimientOS

Última actualización: 2026-04-14 (sin task activa, audit cerrado)

---

## Completado recientemente (abril 2026)

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
