# Backlog — MovimientOS

Última actualización: 2026-04-13

---

## Próximo: Perfeccionar sistema de eventos

Refactor de 2026-04-13 ataca las tres debilidades principales: Retorno acoplado a cantidades, variance invisible al cierre, y handlers no idempotentes. Próximas prioridades:

1. **Retorno puro** — ✅ Completado. No toca cantidades; guard dialog cuando hay líneas En Transito.
2. **Dashboard widget "Entregas pendientes en viajes cerrados"** — ✅ Completado. Listado accionable (Registrar Entrega tardía / Cancelar línea).
3. **Idempotencia handleDispatch + handleDelivery** — ✅ Completado. INSERT trip_events como checkpoint, retry bajo red mala es seguro.
4. **Reversiones** — Falta verificar que revert de Entrega parcial recalcula correctamente. Pendiente.
5. **Reconciliación per-line al Retorno** — ⏳ Diferido hasta tener métricas reales de uso. El dashboard widget cubre el caso sin UX especulativa.
6. **GPS Integration** — Plan en desarrollo (otro chat). API de Skydata disponible.

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
