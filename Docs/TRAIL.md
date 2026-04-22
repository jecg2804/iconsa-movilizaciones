# Trail activo — MovimientOS

> **Qué es este doc:** single-page view de dónde estamos en la jerarquía
> de tareas. Se actualiza cada vez que cambiamos de dirección. Lo
> autocargo al inicio de cada sesión para recuperar el hilo sin leer
> todo el plan file.

**Última actualización:** 2026-04-20 (GPS MVP + constraint fix + ActiveTripPanel shippeados)

## Root task

Perfeccionar movilizaciones (Tier 1 — sistema core).

## Position actual

```
Perfeccionar movilizaciones
 └─ Sistema de eventos y sus registros
     ├─ [✅] Audit consolidado (código + BD)
     ├─ [✅] Parking git/github practices
     ├─ [✅] Higiene de docs + manejo de contexto
     ├─ [✅] Consolidar EVENTS V2 master + issues → reference/EVENTS_V2.md
     ├─ [✅] Sprint prod cherry-pick (Abril 15, 2 releases en prod)
     │   ├─ v2026.04.15-1 (870a8f6): J3 + J4 + J6 + J7 + J8a + J8b
     │   └─ v2026.04.15-2 (1425cae): hotfix J4-A + J4-B + J7-ext
     ├─ [✅] Quick wins G1+G6+G7+G10 + doc cleanup G17-G19
     ├─ [✅] GPS Live Tracking MVP (13 commits jaime/dev, bootstrap staging
     │   13/13, prod pendiente merge v2)
     ├─ [✅] Fix constraint valid_event_type (staging + prod sync,
     │   18 event_types superset)
     ├─ [✅] ActiveTripPanel (5 commits jaime/dev, consolidación operativa
     │   en /solicitudes/[id] — mapa único arriba, card histórica sin mapa)
     └─ [⏳] Siguiente: staging-track Events V2 polish
         ├─ [✅] J2 Códigos entrega — DECIDIDO: siempre obligatorios
         │   (eliminar requires_code del código, implementación pendiente)
         ├─ J1 Pickup bloqueado + design discussion AD-1
         ├─ J5 Overarching event design (en discusión activa)
         ├─ J9 Cost code a nivel solicitud (refactor estructural)
         ├─ G-items sobrevivientes (G4 notifyLineaRechazada,
         │   G5 timeline per-line, G11 DeliveryModal partial warning)
         ├─ GPS Skydata integration (en discusión activa)
         └─ Fulfillment methods: fleet/pickup/third_party (en discusión)
```

## Contexto mínimo

Sprint prod cherry-pick **cerrado exitosamente** el 2026-04-15 con 2
releases tagged en producción y verificados funcionalmente por James:

**v2026.04.15-1** (`870a8f6`, tag pusheado) — 6 fixes base:
- J3 RBAC conductores (security, test manual OK)
- J4 Calendarios y filtros unificados (rediseño)
- J6 Tarifa no editable cuando hay rate seleccionada
- J7 Código de costo requerido
- J8a Scroll/zoom modales en mobile
- J8b Duplicar líneas en solicitud

**v2026.04.15-2** (`1425cae`, tag pusheado) — 3 hotfixes:
- J4-A Regresión click-día (singleDay separado de dateFrom/dateTo, el
  calendario sigue mostrando otros días al clickear uno)
- J4-B Sort server-side (DataTable externalSort contrato, sort re-fetchea
  toda la data en BD en vez de solo la página actual)
- J7-ext Código costo 3 campos (extra/sección + fase + categoría, los 3
  requeridos cuando el proyecto los tiene)

Ambos worktrees cerrados. Vercel prod verde en `1425cae` (requirió
empty-commit trick para destrabar webhook). Detalle completo de todos
los fixes en `Docs/CHANGELOG.md` entries 2026-04-15.

## Siguiente dirección: staging-track Events V2 polish

Plan file se abrirá fresh en la próxima sesión cuando James decida
qué arrancar primero. Hay **3 design discussions pre-requisito** que
no bloquean el resto pero deben happen antes de los items relacionados:

1. **AD-1 Pickup architecture** — ¿PickupOrder entity separada (como
   dice `Docs/reference/Self-pickup.md`) vs fix rápido en Trip entity?
   Prerequisito para J1. En discusión: `transport_method` enum
   (fleet/self_pickup/third_party).
2. ~~**J2 requires_code default**~~ — **CERRADO.** Códigos siempre
   obligatorios. Implementación pendiente (eliminar feature del código).
3. **J9 cost code refactor** — ¿mover cost_code de `sm_request_lines`
   a `sm_requests`? Requiere data analysis primero.
4. **GPS Skydata** — Skydata API investigada (webhooks, geofencing,
   posición en tiempo real). Fase 1: mapa vivo en Dashboard + trip
   detail. En discusión.

Parked deliberadamente por James:

- F5 Dashboards por rol, F2 Inspecciones — features grandes, no ahora
- F1.4 Retorno reconciliación per-line — esperando métricas de uso
- F1.6 Observaciones de entrega visibles — nice-to-have, baja prioridad
- Primer `/release` completo de jaime/dev → main — sigue parked, se
  harán hotfixes puntuales hasta que Events V2 esté completo

## Reglas de este doc

- Actualizarlo **cada vez que cambio de dirección** (ej. pasar de un
  track a otro, cerrar una fase, arrancar una nueva).
- Nunca más de 1 página — si crece, comprimir.
- Apunta al plan file activo vigente, no lo duplica.
- Si este doc y el plan file discrepan, este doc gana (es el resumen
  canónico).

## Links

- **Plan file activo:** ninguno activo
- **BACKLOG completo:** `Docs/BACKLOG.md`
- **CHANGELOG:** `Docs/CHANGELOG.md`
- **EVENTS V2 reference:** `Docs/reference/EVENTS_V2.md`
- **Self-pickup reference:** `Docs/reference/Self-pickup.md`
- **GPS future opportunities:** `Docs/reference/GPS_Future_Opportunities.md`
- **Spec ActiveTripPanel (v1.1 shipped):** `Docs/superpowers/specs/2026-04-20-active-trip-panel-design.md`
- **Spec GPS live tracking (v1.3 shipped):** `Docs/superpowers/specs/2026-04-20-gps-live-tracking-design.md`
- **Regla de ciclo de vida de plans:** `.claude/rules/plan-lifecycle.md`
