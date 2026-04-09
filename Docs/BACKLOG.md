# Backlog — MovimientOS

Última actualización: 2026-04-08

---

## Próximo: Evento Parada (intermedia)

Conductor registra paradas intermedias en proveedores/almacenes. Tipo: retiro/entrega/intercambio. Adjuntar factura/nota. Informacional — no cambia status de líneas.
**Design spec:** `Docs/reference/EVENTS V2 issues.md` sección D12.
**Feature spec modular:** `Docs/feature-specs/parada.md` (por crear).

---

## Architectural Debt

| # | Item | Impacto | Status |
|---|------|---------|--------|
| AD-1 | Self-pickup forzado en Trip entity — debería ser PickupOrder separado | Semántica rota (Trip sin driver/vehicle) | ⏳ Deferred — hide pickup first |
| AD-2 | No existe tabla custody_transfers — el primitivo fundamental falta | Trigger acoplado a trip_events, no extensible | ⏳ Hacer ANTES de más fulfillment methods |
| AD-3 | Fulfillment a nivel Trip, no línea — bloquea hybrid fulfillment | PM que necesita 1 item por camión + 1 por pickup = 2 solicitudes | ⏳ Depende de AD-1 |
| AD-4 | PM ve código de confirmación en pickup — debería no verlo | Rompe verificación (PM es receptor en pickup) | ✅ Fixed (6b92458) |

---

## Features por Tier

### Tier 1: Perfeccionar movilizaciones

| # | Feature | Detalle |
|---|---------|---------|
| F1 | ~~Sistema de eventos rediseñado~~ | ✅ Completado (Batches 5-11, Mar 23-24) |
| F2 | Inspección de equipo (IC-EQ-F-01-02) | 6 tablas existen. Falta: UI walkthrough, foto en fail, firma digital |
| F3 | Reporte facturación mensual | Auto-generado PDF. Tarifa × equipo, no × viaje. Human-in-the-loop |
| F4 | Informe Valderrama semanal | Equipos por proyecto, pendientes. Auto-gen lunes 7AM |
| F5 | Dashboards por rol | PM: costo/proyecto. Charris: dispatch board. Gerencia: KPIs |

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

## Pendientes menores

| Item | Detalle |
|------|---------|
| Verificar dominio iconsanet.com en Resend | Para emails de producción |

---

## Preguntas abiertas

| Tema | Contexto |
|------|----------|
| Definición "equipo menor" | ¿<$10K? ¿<$5K? ¿tipo EQA? Requiere reunión |
| Facturación: agrupamiento por equipo | Tarifa basada en equipo movilizado vs vehículo. Lógica exacta TBD |
| Prorrateo costo multi-proyecto | Viaje sirve a 2 proyectos → ¿cómo dividir? |
| Movilizaciones externas | Checkbox existe pero sin formulario completo |
