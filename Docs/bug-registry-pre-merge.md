---
title: MovimientOS — Bug Registry consolidado pre-merge
project: ICONSA Solutions / MovimientOS
fecha_corte: 2026-05-11
fuentes:
  - Docs/audit-A-pre-merge.md (audit dynamic + static — sesión con contexto histórico)
  - Docs/audit-B-static.md (audit static fresh-eyes — sesión sin contexto)
  - Discoveries adicionales en sesión Chat 2026-05-04 a 2026-05-11
audiencia: cualquier sesión Chat o Code que necesite contexto completo de bugs sin leer ambos audits originales + transcripts
proyecto_supabase:
  staging: vonwkciosksqspyljzfy
  produccion: bzeoszympkkicwlfdtcn
schema_drift: producción corre Events V1; staging corre Events V2 (post Cambio 6.5). Tablas trip_event_lines, pickup_orders, external_orders solo existen en staging.
---

# Bug Registry consolidado — MovimientOS pre-merge

> Documento standalone. Lista TODOS los bugs activos detectados pre-merge a producción, con severidad, ubicación, estado actual, y disparador de retomar (para los deferidos).

---

## Resumen ejecutivo

| Métrica | Conteo |
|---|---|
| Total findings auditados | 48 entre los 2 audits |
| Bugs reales activos (excluye 4 INFO + 4 ya resueltos por Cambio 6.5) | 40 |
| Bugs adicionales descubiertos por uso manual post-audits | 2 |
| **Total bugs activos pre-merge** | **42** |
| Cubiertos por Cambio 6.6 (scope acordado) | 30 directos + 4 subsumidos |
| Deferidos a backlog con disparador | 12 |

---

## Convención de IDs

- `F#N` — finding del audit-A (Code sesión actual con contexto histórico)
- `C#`, `A#`, `M#`, `B#` — findings del audit-B (Code sesión fresh-eyes), con prefijo de severidad: C=CRÍTICO, A=ALTO, M=MEDIO, B=BAJO
- `N#N` — bug nuevo descubierto post-audits durante uso manual de staging

---

## Bugs CRÍTICOs (6) — todos en scope Cambio 6.6

### F#13 — Cancel solicitud con trip En Ruta deja drift permanente TLA/línea

Cancelar una solicitud no propaga el cancel al TLA si el trip está En Ruta. La línea queda 'Cancelada' pero el TLA sigue activo, generando drift permanente entre tabla padre e hija.

- **Archivos**: `src/hooks/useSolicitudes.ts` `cancelSolicitud`
- **Resolución acordada**: nueva RPC `cancel_solicitud_close_short` SECURITY DEFINER con modelo close-short (preserva qty_delivered y TLA con quantity_assigned ajustado, no regresa al backlog si hubo entrega).

### F#28 — Línea pasa a 'En Transito' inmediato al asignar a trip pre-Salida

Trigger `recalc_qty_for_line` actual usa `qty_scheduled_active > 0 → 'En Transito'` cuando debería distinguir entre TLA con trip 'Programado' (pre-Salida) → 'Programada' y TLA con trip 'En Ruta' (post-Salida) → 'En Transito'. Además, POL en 'Aprobado' y EOL en 'Aprobado' suman a scheduled_active incorrectamente.

- **Archivos**: función BD `recalc_qty_for_line`
- **Resolución acordada**: reemplazar recalc con orden de 7 ramas que distingue trip Programado vs En Ruta, y separa caso "Salida sin Entrega + trip cerrado" para preservar visibilidad de mala adopción.

### F#18 — PendingDeliveriesAlert "Cancelar línea" setea qty_scheduled=0 manual sin sync con TLA

Widget en dashboard que pretende detectar "entregas pendientes" usa lógica que confunde 'Pendiente' (de programación) con 'Pendiente de entrega'. Permite acción de cancelar línea sin sincronizar con TLA.

- **Archivos**: `src/components/dashboard/PendingDeliveriesAlert.tsx`, `src/app/(app)/dashboard/page.tsx`
- **Resolución acordada**: DELETE del widget completo. KPI gerencial de adopción mala se manejará en Nivel 2/3 (fuera scope 6.6).

### C1 — `confirmation_code` accesible en cliente para TODOS los roles

El payload del trip envía `confirmation_code` al frontend para todos los roles. Cualquier user con DevTools puede leerlo y bypassear la verificación de entrega.

- **Archivos**: `src/hooks/useTrips.ts` `fetchTrip`, `src/components/viajes/DeliveryModal.tsx`
- **Resolución acordada**: 
  - RPC server-side `submit_delivery_event` que valida confirmation_code antes de insertar trip_events
  - `fetchTrip` filtra confirmation_code del SELECT si role='campo'

### C2 — RPC SECURITY DEFINER expuestas a `authenticated`

17 funciones SECURITY DEFINER (entre ellas `recalc_qty_for_line` y triggers) son ejecutables vía REST API. Un PM curioso puede llamar `recalc_qty_for_line(<id_de_otro_proyecto>)`.

- **Archivos**: BD migration
- **Resolución acordada**: REVOKE EXECUTE en 17 funciones. Mantener solo `get_my_app_role()` y los generadores `generate_*_id()` ejecutables.

### C3 — Proxy server-side enforza RBAC SOLO para 'campo', otros roles libres

`src/proxy.ts` solo gatea rutas para role='campo'. PMs, almacenistas pueden navegar a rutas no permitidas si conocen las URLs.

- **Archivos**: `src/proxy.ts`
- **Resolución acordada**: usar helper `canAccess(role, pathname)` de `src/lib/utils/roles.ts` para verificar acceso en cada request.

---

## Bugs ALTOs (14) — incluye 2 nuevos N#1, N#2

### En scope Cambio 6.6 (11)

| ID | Descripción | Archivo principal | Subsumido por |
|---|---|---|---|
| F#2 | `removeLineFrom{Pickup,External}Order` sin guard `qty_delivered > 0` — pérdida de historial | `usePickupOrders.ts`, `useExternalOrders.ts` | — |
| F#3 | `cancel{Pickup,External}Order` silent failure si status != 'Aprobado' | mismos hooks | — |
| F#7 | `useTrips.updateTrip` loop UPDATE sin error check — inconsistencia parcial silenciosa | `useTrips.ts` | — |
| F#9 | `cancelTrip` permite re-cancelar trip ya 'Completado' — falta guard | `useTrips.ts` | — |
| F#12 | `cancelSolicitud` cascade no atómico ni con error handling | `useSolicitudes.ts` | F#13 |
| F#19 | `PendingDeliveriesAlert.handleCancel` sin error checks | dashboard | F#18 |
| A1 | `cancelSolicitud` no atómico — múltiples DELETEs/UPDATEs sin transacción | `useSolicitudes.ts` | F#13 |
| A2 | `updateSolicitud` orden DELETE: borra TLA antes que línea → orphan si trigger bloquea | `useSolicitudes.ts` | — |
| A3 | `handleDispatch` permite `qty_dispatched=0` que envenena DeliveryModal | `mis-viajes/[id]/page.tsx` | — |
| A5 | `cancelSolicitud` no maneja orders 'Entregado' — preserva estado inconsistente | `useSolicitudes.ts` | F#13 |
| A6 | Drift recalc desplegado vs spec/CHANGELOG del Cambio 6.5 | `Docs/superpowers/specs/...` | — |

### Nuevos descubiertos manualmente (2)

#### N#1 — Feature "entrega tardía" usa `line.status` global, no TLA local

**Síntoma reportado**: una línea ya entregada en el trip MOV aparecía como pendiente en "entrega tardía" porque tenía un POL aprobado pendiente. Al entregar el POL, desapareció el mensaje.

**Causa raíz**: el código filtra `assignments.filter(a => a.line?.status === 'En Transito')` usando el status GLOBAL de la línea (afectado por POL/EOL paralelos). Debería evaluar a nivel TLA local: `qty_dispatched > qty_delivered + qty_rejected`.

**Archivos**: 
- `src/app/(app)/mis-viajes/[id]/page.tsx:1051-1057` (panel entrega tardía)
- Mismo archivo:1051-1054 (warning de líneas pendientes al cerrar Retorno)

**Resolución acordada**: evaluar por TLA específico del trip, no por status global de línea.

#### N#2 — Botón "Revertir" oculto cuando trip Completado pero mensaje pide hacerlo

**Síntoma**: si trip está Completado y user quiere corregir Entrega, sistema dice "primero revierte el Retorno" pero el botón Revertir desaparece cuando `tripDone=true`.

**Causa raíz**: 
- Backend en `handleRevert` SÍ soporta revertir Retorno (línea 926-932: trip vuelve 'En Ruta')
- UI bloquea con `lastRevertible = canRevert && !tripDone ? ... : null` (línea 1071)
- Mensaje de error en línea 806-808 contradice esa UI

**Archivos**: `src/app/(app)/mis-viajes/[id]/page.tsx:1071` (gating) + `:806-808` (mensaje)

**Resolución acordada**: permitir botón Revertir cuando trip Completado, exclusivamente para evento Retorno (no para Entrega cuando trip cerrado, ese caso sigue requiriendo cadena Reversion correcta).

---

## Bugs MEDIOs (13) — 5 en scope, 8 deferidos

### En scope Cambio 6.6 (5)

| ID | Descripción | Archivo principal | Notas |
|---|---|---|---|
| F#1 | `complete{Pickup,External}Order` loop UPDATE inconsistencia parcial | mismos hooks | mismo patrón F#7 |
| F#16 | `handleDispatch` UPDATE manual `status='En Transito'` es no-op tras fix F#28 | `mis-viajes/[id]/page.tsx` | cleanup post F#28 |
| F#20 | `PendingDeliveriesAlert` UPDATE silent failure notes | dashboard widget | subsumido F#18 (delete) |
| M1 | Sin CHECK constraints en text fields (status, line_status, event_type, app_role) | BD migration | valores canónicos verificados en BD |
| M2 | `completePickupOrder` no atómico — UPDATE lines en loop antes de UPDATE order | `usePickupOrders.ts` | mismo patrón F#1 |
| M3 | `cancelSolicitud` no pasa `cancellation_reason` a orders | `useSolicitudes.ts` | subsumido F#13 |
| M4 | `proxy.ts` `single()` puede tirar PGRST116 si user sin row → loop infinito | `src/proxy.ts` | fix con `.maybeSingle()` |
| F#8 | `useTrips.updateTrip` orden operaciones puede dejar estado parcial | `useTrips.ts` | mismo patrón F#7 |

### Deferidos a backlog (5)

| ID | Descripción | Disparador para retomar |
|---|---|---|
| F#6 | Operaciones multi-statement no atómicas (anti-pattern global) | 2+ PMs activos simultáneos OR primer reporte de "estado raro" por conexión flaky |
| M5 | Skydata client devuelve cache stale al fallar upstream | Reporte de usuario de "GPS muestra ubicación vieja sin avisar" |
| M6 | `useTrips.refetchBacklog` no maneja error explícitamente | UX audit dedicado |
| M7 | `useTripEvents.registerEvent` Salida/Entrega rechazo silencioso vía vía vieja | Próximo refactor de TripEventType |
| M8 | `notification_log.valid_event_type` no detecta null ni case-sensitive | Próximo Cambio que agregue notification type nuevo |

---

## Bugs BAJOs (13) — 5 en scope, 8 deferidos

### En scope Cambio 6.6 (5)

| ID | Descripción | Archivo principal |
|---|---|---|
| F#15 | `handleDispatch` loop UPDATE qty_dispatched sin error check | `mis-viajes/[id]/page.tsx` |
| F#22 | TripLiveMap referencia `status='pickup'` (código muerto) | `src/components/gps/TripLiveMap.tsx` |
| F#23 | TripLiveMap polling continúa post-trip-Completado | mismo archivo |
| B1 | Drift CLAUDE.md regla #9 vs código TripForm | `CLAUDE.md` + `TripForm.tsx` |
| B2 | Función `statusContextString` dead code | `src/lib/utils/format.ts` |
| B3 | Voseo argentino en modal cancelación: "querés" en lugar de "quieres" | `programacion/viaje/[id]/page.tsx` |
| B5 | Dead code TripLiveMap chequea `status='pickup'` (= F#22) | mismo archivo F#22 |

### Deferidos a backlog (6)

| ID | Descripción | Disparador para retomar |
|---|---|---|
| F#5 | `existing.attachments` cast pierde data en JSONB corrupted | Refactor attachments handling OR incident report data loss |
| F#11 | `saveTrip` cleanup huérfano sin error check | Junto con F#6 (RPC conversion) |
| F#17 | Pickup/External delivery todo-o-nada sin per-line status | 3+ casos reportados de pickups parcialmente dañados |
| F#24 | skydata-client cache module-level se pierde en cold start | Skydata empieza a rate-limitar (errors 429) |
| B4 | `JSON.parse(JSON.stringify(...))` deep clone innecesario | Sprint hygiene/cleanup dedicado |
| B6 | 12 unused indexes en active-path tables | Performance audit dedicado OR storage cost spike |

---

## Bugs INFORMATIVOs (4) — verificados NO son bugs

| ID | Status |
|---|---|
| F#4 | NOT bug — defense-in-depth correcto (qty_invariant atrapa race) |
| F#10 | OK funcionalmente |
| F#25 | OK, patrón correcto (JS event loop single-threaded) |
| F#26 | OK intencional |

---

## Bugs ya RESUELTOS por Cambio 6.5

Estos están listados al final de audit-B pero ya están resueltos. NO requieren acción. Se documentan para evitar confusión.

| Bug | Descripción | Resolución |
|---|---|---|
| Bug A | Trigger `recalc_qty_for_line` orden de evaluación incorrecto post-Entrega | Resuelto: recalc refactorizado en Cambio 6.5 (post amend 2026-05-01) |
| Bug B | `line_status` (ok/rejected/with_observations) sin semántica BD | Resuelto: BD-6 y BD-7 sincronizan qty con line_status correctamente |
| Bug C | H1 `enforce_quantity_immutable_with_active_assignments` mal calibrado | Resuelto: ahora permite aumentos, solo bloquea decrementos bajo realidad física |
| Bug D | Retorno carga responsabilidades de cálculos de Entrega | Resuelto: triggers disparan en Entrega event, no en Retorno |

---

## Modelo de negocio relevante para los fixes (referencia rápida)

### Status válidos de `sm_request_lines.status` (6 valores)
```
Pendiente, Programada, En Transito, Parcial, Entregada, Cancelada
```

### Definición operacional
- **Pendiente**: línea sin assignments activos en ningún fulfillment
- **Programada**: assignment activo pero no "en marcha"
  - TLA con trip status='Programado'
  - POL con pickup_order status='Aprobado'
  - EOL con external_order status='Aprobado'
- **En Transito**: SOLO para movilizaciones (pickup/external no aplican)
  - TLA con trip status='En Ruta' (post-Salida)
  - TLA con qty_dispatched > 0 sin Entrega registrada efectiva, y trip ya cerrado (caso adopción mala — la línea NO regresa al backlog, queda visible para resolver)
- **Parcial**: qty_delivered > 0 AND < quantity, sin assignment activo en marcha
- **Entregada**: qty_delivered >= quantity
- **Cancelada**: terminal (close-short, no regresa al backlog)

### Diferencias entre fulfillment types
| Tabla | Campos | Eventos |
|---|---|---|
| `trip_line_assignments` (TLA) | quantity_assigned, qty_dispatched, qty_delivered, qty_rejected | Salida, Llegada, Entrega, Retorno, Parada, Reversion, Incidencia |
| `pickup_order_lines` (POL) | quantity_assigned, qty_delivered | Solo "Entregado" (no Salida ni Retorno; sin GPS) |
| `external_order_lines` (EOL) | quantity_assigned, qty_delivered | Solo "Entregado" (no Salida ni Retorno; sin GPS) |

### Cancel SOLICITUD vs Cancel MOVILIZACIÓN (trip)

**Cancel SOLICITUD** (alcance: solicitud completa, ya el material no se moviliza):
- Líneas sin entrega → 'Cancelada'
- Líneas con qty_delivered > 0 → 'Cancelada' (close-short: preserva qty_delivered)
- TLA con qty_delivered = 0 → DELETE
- TLA con qty_delivered > 0 → quantity_assigned ajustado a qty_delivered (preserva)
- NO regresa al backlog (a diferencia de cancel MOV)

**Cancel MOVILIZACIÓN** (alcance: trip específico):
- Cantidades restantes regresan al backlog (línea vuelve a 'Pendiente' o 'Parcial' según corresponda)
- TLAs preservados para auditoría (no DELETE; ya implementado en Cambio 6 Bug #1 fix)
- Este flow está implementado correctamente. NO es scope de Cambio 6.6.

### Roles (canonical en BD `people.app_role`)
```
admin, pm, logistica, almacen, campo
```
NULL también permitido (134 rows en producción).

NO existe 'gerencia' (planeado futuro, no implementado).

---

## Tabla maestra de mapping (todos los findings con estado)

| ID | Severidad | Descripción corta | Source | En scope 6.6 | Subsumido por | Disparador deferido |
|---|---|---|---|---|---|---|
| F#13 | CRÍT | Cancel solicitud drift TLA/línea | audit-A | ✅ | — | — |
| F#28 | CRÍT | Línea 'En Transito' inmediato pre-Salida | audit-A | ✅ | — | — |
| F#18 | CRÍT | PendingDeliveriesAlert lógica errónea | audit-A | ✅ | — | — |
| C1 | CRÍT | confirmation_code expuesto | audit-B | ✅ | — | — |
| C2 | CRÍT | 17 SECURITY DEFINER expuestas | audit-B | ✅ | — | — |
| C3 | CRÍT | proxy.ts solo gatea campo | audit-B | ✅ | — | — |
| F#2 | ALTO | removeLine sin guard qty_delivered | audit-A | ✅ | — | — |
| F#3 | ALTO | cancelOrder silent failure | audit-A | ✅ | — | — |
| F#7 | ALTO | updateTrip loop sin error check | audit-A | ✅ | — | — |
| F#9 | ALTO | cancelTrip permite re-cancelar | audit-A | ✅ | — | — |
| F#12 | ALTO | cancelSolicitud cascade no atómico | audit-A | ✅ | F#13 | — |
| F#19 | ALTO | PendingDeliveriesAlert handleCancel | audit-A | ✅ | F#18 | — |
| A1 | ALTO | cancelSolicitud no atómico | audit-B | ✅ | F#13 | — |
| A2 | ALTO | updateSolicitud orden DELETE | audit-B | ✅ | — | — |
| A3 | ALTO | handleDispatch permite qty=0 | audit-B | ✅ | — | — |
| A4 | ALTO | handleDelivery UPDATEs delivered_at redundantes | audit-B | ✅ | — | — |
| A5 | ALTO | cancelSolicitud no maneja Entregado | audit-B | ✅ | F#13 | — |
| A6 | ALTO | Drift recalc vs spec | audit-B | ✅ | — | — |
| N#1 | ALTO | entrega tardía usa line.status global | discovery | ✅ | — | — |
| N#2 | ALTO | Botón Revertir oculto cuando tripDone | discovery | ✅ | — | — |
| F#1 | MED | completeOrder loop sin error check | audit-A | ✅ | — | — |
| F#16 | MED | handleDispatch UPDATE status no-op | audit-A | ✅ | — | — |
| F#20 | MED | PendingDeliveriesAlert UPDATE silent | audit-A | ✅ | F#18 | — |
| M1 | MED | Sin CHECK constraints | audit-B | ✅ | — | — |
| M2 | MED | completePickupOrder no atómico | audit-B | ✅ | F#1 | — |
| M3 | MED | cancelSolicitud sin cancellation_reason | audit-B | ✅ | F#13 | — |
| M4 | MED | proxy.ts single() loop infinito | audit-B | ✅ | — | — |
| F#8 | MED | updateTrip orden operaciones | audit-A | ✅ | F#7 | — |
| F#6 | MED | Loops await anti-pattern global | audit-A | ❌ | — | 2+ PMs simultáneos OR reporte estado raro |
| M5 | MED | Skydata cache stale | audit-B | ❌ | — | Reporte usuario GPS vieja sin avisar |
| M6 | MED | refetchBacklog error silencioso | audit-B | ❌ | — | UX audit dedicado |
| M7 | MED | registerEvent rechazo silencioso | audit-B | ❌ | — | Próximo refactor TripEventType |
| M8 | MED | notification_log CHECK gaps | audit-B | ❌ | — | Próximo Cambio que agregue notification type |
| F#15 | BAJO | handleDispatch loop sin error check | audit-A | ✅ | — | — |
| F#22 | BAJO | TripLiveMap status='pickup' dead code | audit-A | ✅ | — | — |
| F#23 | BAJO | TripLiveMap polling post-Completado | audit-A | ✅ | — | — |
| B1 | BAJO | Drift CLAUDE.md regla #9 | audit-B | ✅ | — | — |
| B2 | BAJO | statusContextString dead code | audit-B | ✅ | — | — |
| B3 | BAJO | Voseo en cancel modal | audit-B | ✅ | — | — |
| B5 | BAJO | TripLiveMap status='pickup' (= F#22) | audit-B | ✅ | F#22 | — |
| F#5 | BAJO | attachments cast pierde data | audit-A | ❌ | — | Refactor attachments OR incident |
| F#11 | BAJO | saveTrip cleanup sin error check | audit-A | ❌ | — | Junto con F#6 |
| F#17 | BAJO | Pickup/External sin per-line status | audit-A | ❌ | — | 3+ casos pickups dañados |
| F#24 | BAJO | skydata cache cold start | audit-A | ❌ | — | Skydata empieza rate-limitar |
| B4 | BAJO | JSON.parse deep clone | audit-B | ❌ | — | Sprint hygiene dedicado |
| B6 | BAJO | 12 unused indexes | audit-B | ❌ | — | Performance audit dedicado |

### Conteo final
- ✅ Scope Cambio 6.6: **30 directos + 8 subsumidos = 38 findings cubiertos**
- ❌ Deferidos: **12 findings con disparador**
- **Total activos: 42 bugs reales**
- INFORMATIVOs (NO bugs): F#4, F#10, F#25, F#26 (4)
- Ya resueltos por Cambio 6.5: Bug A, B, C, D del audit-B (4)

---

## Próximos pasos (referencia para nueva sesión)

### Si vas a trabajar el Cambio 6.6
1. Lee los 2 audits originales para contexto detallado: `Docs/audit-A-pre-merge.md`, `Docs/audit-B-static.md`
2. Lee el spec del Cambio 6.5 para entender el estado actual del recalc: `Docs/superpowers/specs/2026-04-30-cambio6-5-event-model-refinement.md`
3. Schema drift de prod vs staging es real — A5 en prod corre DESPUÉS de migrations del Cambio 6.5 que crean trip_event_lines/pickup_orders/external_orders
4. Sesión Code actual del Cambio 6.5 tiene contexto previo del audit-A — preferir esa sesión sobre una nueva

### Si vas a trabajar items deferidos
1. Cada item tiene disparador específico — verificar que el disparador se cumplió antes de retomar
2. Algunos están relacionados (F#11 con F#6, B6 con performance audit) — agruparlos en sprints temáticos

### Reglas operativas (no negociables)
1. NO escribir a Supabase sin aprobación explícita de James
2. Lenguaje neutro Panamá — cero voseo en código, comentarios, UI, errores, notificaciones, commits
3. Three-Actor Model: Chat (architecture/BD writes), Code (implementation, Supabase read-only), James (decisions)
4. Production NUNCA tocada directamente — todo pasa por staging primero
5. BD changes vía `[bd-pending]` → `[bd]` en `Docs/CHANGELOG.md`, NO migration files
6. NO estimaciones de tiempo — calidad > velocidad

---

*Bug Registry consolidado al 2026-05-11. Living document — actualizar cuando se cierren bugs (mover a sección "Resueltos") o se descubran nuevos (agregar con prefijo `N#`).*
