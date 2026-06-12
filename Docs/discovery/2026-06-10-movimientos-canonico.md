<!-- Generado del discovery 360 (workflow wf_7e3ade5d-588, 17 agentes, 2026-06-10). -->
<!-- STATUS: discovery — entendimiento, no decisiones. Caveats del critico adversarial en Docs/discovery/README.md -->

# MovimientOS CANONICO — el app como ES

**Fecha:** 2026-06-10 · **Fuentes de verdad:** codigo en `jaime/dev`, BD staging (`vonwkciosksqspyljzfy`, 51 tablas), BD prod (`bzeoszympkkicwlfdtcn`, 147 tablas/13 schemas), codigo deployado en prod (`main @ a591867`). Los docs del repo (CLAUDE.md, TRAIL, BACKLOG, CHANGELOG) se usaron solo como pistas; toda afirmacion aqui fue verificada contra codigo o BD por los inventarios de discovery.

---

## 1. Que es MovimientOS hoy, en una frase

Un monolito Next.js 16 **casi 100% client-side** (63 archivos `'use client'`, 218 llamadas `.from()` directas al browser client de Supabase, **cero `.rpc()`**) donde la logica de negocio vive repartida en dos lugares: **hooks gordos en el cliente** (useTrips 1064 lineas, useSolicitudes 991, usePickupOrders 427, useExternalOrders 403) que orquestan secuencias multi-statement sin transaccion, y **triggers PostgreSQL** que hacen toda la contabilidad de cantidades y estados. RLS es el unico perimetro real de datos; el unico enforcement de ruta server-side es para el rol `campo` (src/proxy.ts:80-90).

**Superficies server reales (todas las demas son browser→Supabase):** `(app)/layout.tsx` y `dashboard/page.tsx` (RSC), `api/gps/trip/[tripId]/position` (adapter GPS), `api/cron/alertas-urgentes` (Bearer CRON_SECRET), y las server actions de notificaciones (`lib/notifications/actions.ts`, 1218 lineas, service-role, **sin chequeo de auth del caller**).

---

## 2. Modelo de dominio real

```
sm_requests (Solicitud, ID {proyecto}-SM-{###})
 ├─ cost_code_id + cost_category_id  ← VIVEN EN EL HEADER (Cambio 2; ya NO en la linea)
 └─ sm_request_lines (Linea: equipo o material, qty, origen/destino, attachments JSONB)
      ├─ trip_line_assignments ──→ trips (flota propia, MOV-{YYYY}-{###})
      │                              └─ trip_events (inmutables) ─ trip_event_lines ─ delivery_observations
      ├─ pickup_order_lines ─────→ pickup_orders   (proyecto retira; sin vehiculo/tarifa/codigo)
      └─ external_order_lines ───→ external_orders (proveedor entrega; factura + monto + attachments)
```

- **Una linea puede tener 0..N fulfillments activos EN PARALELO de las 3 modalidades** — `LineWithRelations.fulfillments` es un discriminated union `trip|pickup|external` (useSolicitudes.ts:21-24) y **no existe constraint de exclusividad en BD** (BL-EXCLUSIVITY es real).
- Cost code: cascada Proyecto→[Extra]→Fase→Categoria via `useCostCodeCascade`, en el **SolicitudForm header**. Se valida solo al **Enviar** (Fase+Categoria; Extra solo implicito via cascada); un Borrador se guarda sin cost code (nueva/page.tsx:256-261).
- Masters activos: projects, people (178 staging/182 prod), equipment (377, unificada equipos+vehiculos, `gps_vehicle_id` solo staging), locations, units, mobilization_rates, cost_codes(138)/cost_code_categories(656)/cost_categories(8), project_extras, sequences. `user_app_roles` (19 filas) y `equipment_categories`/`vendors` tienen data pero **cero uso en codigo** — auth real es `people.app_role` via `auth_id` (useAuth.ts:31-66).

### Matematica de cantidades (el corazon del sistema)

| Nivel | Columnas | Quien escribe |
|---|---|---|
| Linea | `quantity` | Usuario; inmutable con assignments activos (trigger H1, 3 condiciones) |
| Linea | `qty_scheduled`, `qty_delivered` | **SOLO trigger `recalc_qty_for_line`** — el cliente nunca las toca |
| Assignment | `quantity_assigned` | Cliente al crear/editar trip |
| Assignment | `qty_dispatched` | **Cliente** en handleDispatch (page.tsx:632-638, sin error-check) |
| Assignment | `qty_delivered`, `qty_rejected` | **SOLO triggers BD-5/BD-6** al INSERT de trip_event_lines / Reversion |

- Disponible en backlog = `quantity − qty_scheduled − qty_delivered`, misma formula con SELECT fresh pre-INSERT en los 3 hooks (useTrips.ts:497, usePickupOrders.ts:129, useExternalOrders.ts:128).
- CHECKs vivos (staging): `qty_dispatched ≤ quantity_assigned`, `qty_delivered + qty_rejected ≤ qty_dispatched`, `qty_invariant` en linea. **Nada de esto existe en prod** (prod ni siquiera tiene las columnas `qty_dispatched`/`qty_rejected`).

---

## 3. Maquina de estados real (quien setea que)

```
Solicitud: Borrador → Enviada → En Proceso → Completada / Cancelada       [trigger cascade_request_status]
Linea:     Pendiente → Programada → En Transito → Entregada/Parcial/Cancelada  (6 estados, SIN 'Pickup Aprobado')
Trip:      Programado → En Ruta → Completado / Cancelado
Orders:    Aprobado → Entregado / Cancelado     (string literals, sin constante tipada ni CHECK verificado)
```

Reparto real de responsabilidades sobre el status de linea:

- `'Programada'` la setea **el cliente** en saveTrip (no trigger).
- `'En Transito'` la setea **el cliente** en handleDispatch (comentario explicito page.tsx:615-617).
- Todo lo demas lo recalcula `recalc_qty_for_line` (BD, SECURITY DEFINER), version post-amend 6.5 con **5 puntos**: (1) assigned_active=0 ∧ delivered=0 → Pendiente; (2) delivered ≥ quantity → Entregada; (3) scheduled_active>0 → En Transito; (4) delivered>0 → Parcial; (5) else → Pendiente. `Cancelada` es terminal (branch defensivo). **Rejected total libera al backlog como Pendiente** (el step 'Programada' fue eliminado en el amend).
- Cascada: `cascade_request_status` re-evalua el parent en cada cambio de linea; `trg_recalc_from_{assignment,trip,pickup,external}_status_change` disparan el recalc.
- Familias de triggers vivas en staging (confirmadas por advisors + ledger): `generate_*` (request_id, trip_id, pickup_id, external_id, confirmation_code, full_code, asset_tag), recalc + 4 trg_recalc_from_*, sync BD-5/BD-6, `enforce_*` (line add/delete solo en Borrador, trip immutable post-Salida, quantity immutable H1, one-active-delivery, revert-solo-trip-activo BD-8, notas with_observations BD-10, cancellation_reason ×3), `auto_cancel_empty_{pickup,external}_order`, audit_trigger, capture_lifecycle/priority. **Casi todo esto es staging-only** — prod quedo congelado pre-Events-V2.

### Sistema de eventos (trips)

- Secuencia derivada **client-side** en mis-viajes/[id]/page.tsx:494-499: Salida → [Llegada opcional] → Entrega(×N, per-line) → Retorno; Parada repetible post-Salida; Incidencia siempre (≥10 chars).
- **Eventos inmutables**: nunca UPDATE/DELETE. Revertir = INSERT evento `'Reversion'` con `reverts_event_id` + compensaciones por tipo; las qty las revierte el trigger BD-6; `delivery_observations` sobreviven como evidencia.
- **Idempotencia checkpoint**: Dispatch y Delivery insertan el evento PRIMERO con UUID pre-generado en el modal; retry con 23505 = exito temprano sin duplicar writes. **handleParada NO usa checkpoint** (unico handler no idempotente). Cada handler hace 4-7 writes secuenciales sin transaccion server-side (riesgo conocido, mitigado por checkpoint+triggers).
- **Codigo de confirmacion (realidad de seguridad):** lo genera trigger BD al crear el trip, pero la validacion es **100% client-side** (DeliveryModal.tsx:137 compara contra `trip.confirmation_code` ya descargado al browser). El codigo esperado viaja en el SELECT de trips para TODOS los roles, incluido `campo` — la "ocultacion" es solo de render (page.tsx:1043). Ni el INSERT de trip_events ni ningun trigger verifican `confirmation_code_used === trips.confirmation_code`. El "sin bypass" de CLAUDE.md regla 15 es UX, no seguridad.
- **Timestamps:** `new Date().toISOString()` del dispositivo cliente en todos los handlers — no `now()` de BD, no editable en UI pero spoofeable.

---

## 4. Las 3 modalidades de fulfillment y su madurez real

| Dimension | Fleet (trips) | Pickup (pickup_orders) | External (external_orders) |
|---|---|---|---|
| Creacion | TripForm completo (conductor `campo`, vehiculo, remolque-si-cabezal, tarifa obligatoria*, ATTT, fecha) | Bulk desde backlog, modal minimo + scheduled_date | Igual + provider, monto factura >0, ≥1 attachment factura |
| Ejecucion | Eventos completos per-line, codigo 4 digitos, GPS vivo | Completion **todo-o-nada** (`qty_delivered := quantity_assigned`), receptor **opcional** | Identico a pickup (espejo) |
| Parciales | Si (qty_delivered acumula, status Parcial) | **No** (v1) | **No** (v1) |
| Atomicidad | Rollback manual (DELETE trip si assignments fallan) | INSERT header→lines, rollback manual | Igual |
| Cancelacion | Razon ≥10 chars si delivered>0 (trigger) | Igual; auto_cancel si queda vacio | Igual; preserva invoice_attachments |
| Datos reales staging | 36 trips, 127 eventos | 2 orders (smoke) | 1 order (smoke) |
| En PROD | **Si** (51 trips, version v2026.04.15-2 sin Events V2) | **No existe** (ni tablas ni codigo) | **No existe** |
| Madurez | **Solida** (el producto real) | **v1 recien nacida**, sin uso real | **v1 recien nacida**, sin uso real |

\* tarifa obligatoria: validada en cliente (useTrips.ts:774-785) y `trips.rate_id NOT NULL` — **solo en staging**; en prod `rate_id` es nullable.

**Historia critica del pickup:** el modelo "bandera-en-linea" del Cambio 3 (`pickup_by_project`, status `'Pickup Aprobado'`, `convertLineToPickup`) que CHANGELOG/TRAIL/CLAUDE.md describen como shippeado **fue eliminado por completo por Cambio 5** — 0 referencias en src, columnas dropeadas de la BD, y **ningun entry del CHANGELOG documenta el DROP**. Leer el CHANGELOG linealmente produce un modelo mental falso. Residuos muertos: `format.ts:155-161` (firma con campos pickup_*), GPS status `'pickup'` en types.ts:28 y TripLiveMap.tsx:187.

---

## 5. Subsistemas: GPS y Notificaciones

**GPS** — el subsistema mejor aislado del codebase. Adapter SkyData en **1 archivo** (`lib/gps/skydata-client.ts`: Basic auth, 1 endpoint `/api/fleet/status` de toda la flota, cache modulo 10s + dedup inflight, normalize y→lat/x→lon, stale a 48h). Contrato neutro `GpsTripPosition` (live/stale/not_in_route/no_gps) entre el API route y `TripLiveMap` (polling 30s, pausa con tab oculta, auto-follow, MapLibre + tiles openfreemap sin key). Unico acoplamiento a BD: `equipment.gps_vehicle_id` con IDs internos SkyData (13 vehiculos, **solo staging**). Migrar al proveedor nuevo = reescribir 1 archivo + repoblar 1 columna. Nota: hay un valor real de `SKYDATA_API_KEY` commiteado en `.env.local.example:4`.

**Notificaciones** — 18 server actions notify* / 18 templates (match exacto con el constraint `valid_event_type` de notification_log). Resend con service-role, fire-and-forget `.catch(console.error)`, dedup 5min fail-closed, prefs JSONB per-persona, guard de status pre-envio (patron A4), escapeHtml en templates. 15 cableadas / **3 huerfanas** (viaje_reprogramado, material_preparado, sugerencia_fallback). FROM default = sandbox `onboarding@resend.dev` si `RESEND_FROM_EMAIL` no esta seteado. Admin UI de preferencias muestra **13** event keys de los 18 del constraint. Vector teorico: las server actions usan service-role **sin verificar auth del caller** y se importan desde 5 archivos client.

---

## 6. Solido / a medias / scaffolding

**SOLIDO (verificado funcionando, en uso o staging-completo):**
- Ciclo fleet completo: solicitud→backlog→trip→dispatch→entrega per-line con observaciones tipificadas→retorno→reversion con audit trail inmutable.
- Reconciliacion de cantidades delegada a triggers BD (recalc + sync + cascade + CHECKs) — staging.
- Idempotencia checkpoint en Dispatch/Delivery; guards de revert (G1, Salida-con-entregas, Llegada-con-posteriores, BD-8).
- UX mobile-first real (bottom-sheets, sticky action bars, dual-layouts, deep-links `?action=`), filtros unificados calendario+tabla server-side (J4), entregas tardias como caso de primera clase.
- Higiene TS (0 `any`), cascada cost-code, fallbacks→suggestions, GPS adapter aislado.

**A MEDIAS (existe pero con huecos conocidos):**
- Pickup/External orders v1: todo-o-nada, no atomico, receptor opcional, RLS rol-only (ownership PM en JS), 2-3 filas de smoke data, comments de tabla vacios en BD.
- Seguridad: codigo de confirmacion client-side; gateo de ruta server-side solo para `campo` (pm/logistica/almacen gateados solo por UI); server actions de notify sin auth; policies `SELECT USING(true)`; 19 funciones SECURITY DEFINER ejecutables por anon via PostgREST RPC (staging) / 29 por authenticated (prod); hardening del audit 2026-04-14 **nunca aplicado a prod**.
- handleDispatch paso 4 (UPDATE qty_dispatched) sin chequeo de error; handleParada sin checkpoint; EventModal con branch 'Entrega' muerto (~170 lineas); duplicacion verbatim ~250 lineas de modales entre programacion y solicitudes/[id]; prioridad inconsistente (useSolicitudes la calcula client-side por "BD stale", useTrips ordena el backlog por la priority de BD).
- Tests E2E: helpers rotos (AD-5) + login Playwright bloqueado (BL-E2E-AUTH-BLOCKED) — la suite no puede crear data fresca.
- Dashboard: filtrado por rol deshabilitado a proposito (TODO dashboard/page.tsx:32).

**SCAFFOLDING (schema completo, 0 filas, 0 referencias en codigo):**
16 tablas en staging / 22 en prod: inspecciones (6), work_orders (2), warehouse (2), purchase_orders (2), rentals/vendors (2), fuel_logs, meter_readings, operator_qualifications, custody_transfers (AD-2 — su trigger `update_equipment_location_on_custody_transfer` ya existe vivo y expuesto como RPC), assemblies (2), mobilization_campaigns (trips.campaign_id FK existe, sin UI), equipment_status_log, feedback (comment dice "feature in-app" pero no hay UI). Estos son los Tier 2/3 del roadmap, pre-construidos en BD.

---

## 7. Realidad de produccion (el cisma, cuantificado)

1. **Prod app y prod BD son consistentes entre si** — `main @ a591867` (release v2026.04.15-2) no referencia nada de lo que falta en prod. El cisma es enteramente `jaime/dev`→prod.
2. **Drift exacto public staging↔prod:** 7 tablas solo-staging (trip_event_lines, delivery_observations, custody_transfers, pickup/external orders+lines), 11 columnas solo-staging (gps_vehicle_id; attachments/designated_receiver_* en lineas; cost_code/category en header; reverts_event_id/source en eventos; qty_dispatched/qty_rejected; cancellation_reason), 2 columnas solo-prod que staging dropeo (trips.is_external; cost_code/category_id en lineas), 1 nullability (rate_id). Punto de divergencia de ledgers: post-2026-04-20.
3. **Prod ya no es "la BD de MovimientOS":** 147 tablas en 13 schemas. HumanOS construyo 10+ schemas directamente sobre prod (2026-04-28→06-05, ledger humanos_v2 001→095) con ETL Spectrum activo (edge functions sdx-sync v4 + sdx-people-sync). Staging NO tiene nada de HumanOS. Un merge de branch Supabase es inviable; el "script BD consolidado" del BACKLOG debe ademas convivir con HumanOS.
4. **Masters duplicados en la misma BD sin crosswalk materializado:** public.people(182) vs hr.people(370); public.equipment(377) vs core.equipment(421); public.projects(6) vs payroll.projects(23) vs core.jobs(52); public.cost_codes(138) vs core.phases(296); public.locations(8) vs hr.locations(15). Todos los `*_external_ids` en 0.
5. **Uso real de movilizaciones (~3 meses):** 53 solicitudes, 63 lineas, 51 trips, 166 eventos, 1742 emails logueados, 822 filas de audit. Modesto pero operacion real.
6. **Seguridad prod:** schema `backup` con 11 tablas **RLS-disabled** incluyendo `backup.auth_users_20260605` (48 filas de auth.users) y PII de 370 personas; 4 funciones con search_path mutable; 31 tablas RLS-enabled sin policy. Las 3 branches Supabase reportan MIGRATIONS_FAILED.

---

## 8. TABLA DE CONTRADICCIONES — docs vs codigo vs BD (lo que hace alucinar a los agentes)

| # | Doc dice | Realidad verificada | Evidencia | Riesgo p/ agentes |
|---|---|---|---|---|
| C1 | CLAUDE.md: "47 tablas" | Staging 51, prod 44. Ningun ambiente tiene 47 | list_tables MCP ambos | Medio |
| C2 | Regla 9: costo read-only con tarifa, "deseleccionar NO posible" | **Revertido** (Cambio 4): costo siempre editable, rate solo pre-rellena. Tarifa si obligatoria en cliente, pero `rate_id NOT NULL` solo staging (prod nullable) | TripForm.tsx:385; diff columnas prod | Alto |
| C3 | Regla 14: cost code 3 campos requeridos **per-linea**, validado en LineEditor | Cost code vive en `sm_requests` (header, Cambio 2); LineEditor sin campos de costo; validacion solo al Enviar (Fase+Categoria); Extra no validado directo | LineEditor.tsx:101; useSolicitudes.ts:85-115; nueva/page.tsx:256-261 | Alto |
| C4 | Regla 4 + tabla roles: conductor tiene Dashboard; "dashboard unico para todos" | `campo` = solo `/mis-viajes` con hard-redirect (J3). Y el "dashboard unico" es un TODO deshabilitado, no decision final | constants.ts:103-105; proxy.ts:80-90; dashboard/page.tsx:32 | Alto |
| C5 | Regla 3: "sin restriccion por driver_id; cualquier logistica/campo/almacen registra" | PM tambien registra (Entrega/Incidencia); campo filtrado por driver_id, dispatch con override defensivo, revert solo eventos propios salvo admin | roles.ts:50-58; useMyTrips.ts:107-110; page.tsx:559-572,790 | Medio |
| C6 | Regla 15: codigo confirmacion "MUST be correct — no hay bypass" | Validacion **100% client-side**; el codigo esperado viaja al browser de todos los roles (incl. campo); cero verificacion server/BD | DeliveryModal.tsx:137; useMyTrips.ts:76 | **Critico** |
| C7 | Regla 16: timestamps "now() automatico" | `new Date().toISOString()` del **cliente** — reloj del dispositivo, spoofeable | page.tsx:584,680,841,961 | Medio |
| C8 | CLAUDE.md Key Directories: `src/middleware.ts`, `lib/utils/priorities` | No existen. Guard real = `src/proxy.ts` (Next 16); prioridad en `format.ts`. Omite `service.ts`, forgot/change-password, api/gps, api/cron, components/gps | Glob/ls verificados | Medio |
| C9 | CHANGELOG Cambio 3 + TRAIL + CLAUDE.md: pickup = bandera per-linea, status 'Pickup Aprobado', convertLineToPickup | **Eliminado entero por Cambio 5**: 0 refs en src, columnas dropeadas en BD; reemplazo = tablas pickup/external_orders. El DROP nunca fue documentado en CHANGELOG | grep = 0 matches; columnas vivas staging | **Critico** |
| C10 | TRAIL.md ("primer doc a leer", 2026-04-27) | ~6 semanas atras: no refleja Cambios 4/5/6/6.5 ni auditorias de mayo/junio | TRAIL vs ledger staging | **Critico** |
| C11 | BACKLOG: G1, G10 pendientes; BL-RPC-CONVERSION sobre convertLineTo* | G1 y G10 implementados (page.tsx:790, :171-174); convertLineTo* ya no existe — la deuda descrita es sobre codigo borrado | grep + codigo | Alto |
| C12 | Cambio 3 Q6: receptor XOR obligatorio en pickup | `completePickupOrder`: "OPCIONALES (no XOR). Ambos pueden ser NULL" — revertido sin entry | usePickupOrders.ts:195 | Medio |
| C13 | CLAUDE.md: regenerar tipos con `--project-id` **prod** | database.ts (3509 lineas, 51 tablas) fue generado contra **staging**; seguir el comando del doc rompe el build | database.ts vs prod schema | Alto |
| C14 | CLAUDE.md describe la BD prod como solo MovimientOS | Prod = multi-app: 13 schemas, HumanOS + MDM + ETL Spectrum corriendo | list_tables/migrations prod | Alto |
| C15 | CHANGELOG 2026-05-13 `[bd]` audit_trigger a 19 tablas | Sin migracion en ningun ledger; ambiente no especificado; no verificable read-only | list_migrations ambos | Medio |
| C16 | "RLS habilitada en todas las tablas" (como garantia) | RLS on en public, pero policies rol-only con `SELECT USING(true)`; ownership PM solo en JS; prod: schema backup RLS-off con dump de auth.users; hardening de abril solo en staging | CHANGELOG RLS entries; advisors prod | **Critico** |
| C17 | roles.ts:25: "Logistica NO edita solicitudes (RLS lo bloquea)" | Afirmacion del codigo sobre BD no verificada; dado el patron rol-only de policies, plausiblemente falsa | pg_policies no legible via MCP | Medio |
| C18 | CHANGELOG: GPS route "sin branch pickup" | Cierto para el route, pero status `'pickup'` sigue en el union de types.ts:28 y TripLiveMap.tsx:187 — residuo muerto | codigo | Bajo |
| C19 | templates/index.ts:1: "12 templates" | Exporta 18; 3 senders sin call site | grep exports | Bajo |
| C20 | CLAUDE.md Estados/Dominio | Omiten por completo pickup/external orders, qty_dispatched/qty_rejected — el modelo de 3 modalidades (central al codigo) no esta documentado | constants.ts + hooks | Alto |

**Patron transversal:** los docs vivos quedaron congelados en distintas generaciones del modelo (CLAUDE.md ≈ pre-Cambio-2/J6-revert; TRAIL ≈ Cambio 3; BACKLOG ≈ Cambio 5 parcial), mientras codigo+BD avanzaron hasta Cambio 6.5 + auditorias. Cualquier agente que confie en docs reconstruye un sistema que ya no existe.

---

## 9. Gaps que el discovery no pudo cerrar (verificables, pendientes)

- Cuerpos SQL vivos de triggers/policies en ambos ambientes (`execute_sql`/pg_policies denegados): cobertura real de audit_trigger, version vigente de cascade en prod, matriz exacta rol→operacion.
- Si el schema `backup` esta expuesto via PostgREST (db-schemas) — determina si el dump de auth.users es explotable con anon key o riesgo latente interno.
- Explotabilidad practica de las server actions notify* (action IDs en bundle + service-role + sin auth).
- Causa raiz del MIGRATIONS_FAILED en las 3 branches Supabase.
- Contenido de las edge functions sdx-sync/sdx-people-sync (que endpoints SDX, cadencia) — relevantes para la BD centralizada.
- Comportamiento intencional vs gap: cancelSolicitud deja lineas 'En Transito' con assignment activo bajo solicitud Cancelada (useSolicitudes.ts:928).


---

## Key points

- MovimientOS real = monolito client-side (63 'use client', 218 .from(), 0 .rpc()) con la logica de negocio repartida entre hooks gordos en el browser y triggers PostgreSQL; RLS es el unico perimetro de datos y solo el rol 'campo' tiene enforcement de ruta server-side (src/proxy.ts).
- El modelo vigente es de 3 modalidades de fulfillment por linea: fleet trips (maduro, en prod), pickup_orders y external_orders (v1 recien nacidas, todo-o-nada, solo en staging, 2-3 filas de smoke data); una linea puede tener N fulfillments paralelos sin constraint de exclusividad.
- Cost code vive en el HEADER de la solicitud (Cambio 2), no en la linea; se valida solo al Enviar — CLAUDE.md regla 14 describe un modelo que ya no existe.
- La maquina de estados real es hibrida: el cliente setea 'Programada' y 'En Transito'; todo lo demas lo recalcula recalc_qty_for_line (5 puntos post-6.5, rejected total libera a 'Pendiente') + cascade_request_status; eventos inmutables con reversion compensatoria y checkpoint de idempotencia (salvo handleParada).
- El codigo de confirmacion de 4 digitos NO es un control de seguridad: validacion 100% client-side y el codigo esperado viaja al browser de todos los roles, incluido el conductor — regla 15 de CLAUDE.md ('sin bypass') es solo UX.
- Cisma prod/staging cuantificado: 7 tablas + 11 columnas solo-staging, 2 columnas solo-prod, rate_id NOT NULL solo staging; el codigo deployado en prod (v2026.04.15-2) es consistente con su BD — todo Events V2/pickup/external/GPS es jaime/dev-only.
- Prod ya no es la BD de MovimientOS: 147 tablas en 13 schemas, HumanOS construido directo sobre prod con ETL Spectrum activo, masters duplicados (people, equipment, projects, cost codes) sin crosswalks materializados.
- 16-22 tablas son scaffolding puro (inspecciones, work orders, warehouse, procurement, custody, fuel, campaigns...) — los Tier 2/3 del roadmap pre-construidos en BD con 0 filas y 0 referencias en codigo.
- Seguridad real por debajo de la narrativa: policies rol-only con USING(true) y ownership en JS, server actions de notificaciones con service-role sin auth del caller, schema backup en prod con dump de auth.users RLS-off, hardening del audit de abril nunca aplicado a prod, API key de SkyData commiteada en .env.local.example.
- La tabla de 20 contradicciones docs-vs-codigo-vs-BD es la causa raiz de las alucinaciones de agentes: CLAUDE.md/TRAIL/BACKLOG estan congelados en 3 generaciones distintas del modelo (las mas graves: pickup Cambio 3 fantasma, J6 revertido, campo-sin-dashboard, 47 tablas inexistentes, comando de regen de tipos que rompe el build).
- Uso real en prod: modesto pero vivo — 53 solicitudes, 51 trips, 166 eventos, 1742 emails en ~3 meses; staging no sirve para inferir patrones de uso (data de smoke tests).

## Preguntas abiertas para James

1. cancelSolicitud deja lineas 'En Transito' con assignment activo bajo una solicitud 'Cancelada' — ¿es diseno intencional (las entregas en vuelo deben completarse) o un gap que nadie ha pisado en prod?
2. El codigo de confirmacion se valida solo en el cliente y viaja al browser de todos los roles: ¿esto fue una decision consciente de 'suficiente para MVP' o se asumia que habia verificacion server-side? ¿Cual es el nivel de garantia que el negocio espera de ese mecanismo?
3. Q6 del Cambio 3 (receptor XOR obligatorio en pickup) aparece revertido a 'opcional, ambos NULL' en usePickupOrders sin entry que lo documente — ¿fue decision deliberada con Charris o regresion del Cambio 5?
4. ¿Cual es la fuente de verdad deseada para la prioridad de solicitudes: el calculo client-side vivo (useSolicitudes) o la columna priority de BD (que useTrips usa para ordenar el backlog de Charris y puede estar vencida)?
5. El entry CHANGELOG 2026-05-13 (audit_trigger a 19 tablas) no tiene migracion en ningun ledger — ¿se aplico a prod, a staging, o a ambos, y via que mecanismo?
6. ¿El schema 'backup' de prod (11 tablas RLS-off, incluyendo dump de auth.users del 2026-06-05) esta expuesto en la config de PostgREST? ¿Cual es su proposito y retencion prevista?
7. Dado que HumanOS vive ahora en la misma BD prod: ¿sigue vigente el plan de 'script BD consolidado' para el merge v2 de MovimientOS, y quien arbitra colisiones (extensiones, funciones compartidas, advisors) entre los dos apps?
8. Masters duplicados en prod (public.people vs hr.people, public.equipment vs core.equipment, public.projects vs payroll.projects vs core.jobs): ¿cual es el dueno canonico previsto de cada master en la vision de BD centralizada, y cuando se materializan los crosswalks *_external_ids (hoy todos en 0)?
9. Migracion GPS: ¿quien es el proveedor nuevo, que identificadores expone, y existe plan para repoblar equipment.gps_vehicle_id (hoy con IDs internos de SkyData, y solo en staging)?
10. Env vars de prod no verificables desde el repo: ¿RESEND_FROM_EMAIL esta seteado (o prod manda desde onboarding@resend.dev)? ¿NOTIFICATION_TEST_EMAIL sigue activo en algun ambiente? ¿SKYDATA_* configurados en prod? Y la API key de SkyData commiteada en .env.local.example — ¿se va a rotar?
11. Pendientes operacionales de pickup v1 (A5/A6 del BACKLOG): ¿Charris o el almacenista registra la entrega de pickups, y se necesita pickup parcial en la practica?
12. ¿Que politica quieres para resincronizar los docs vivos (CLAUDE.md, TRAIL, BACKLOG)? La tabla de contradicciones muestra que hoy son la fuente principal de alucinaciones de agentes — ¿se reescriben contra este canonico, se archivan, o se reemplazan por generacion automatica desde codigo/BD?
13. La tabla feedback tiene comment de 'feature in-app' pero no hay UI: ¿feature abandonado, nunca implementado, o vive en otro branch?
14. ¿Cual es la causa conocida (si la hay) del status MIGRATIONS_FAILED en las 3 branches Supabase? El BACKLOG dice que se descarto como no-bloqueante pero no consta la causa raiz.
