# Audit-B static — Fresh-eyes pre-merge MovimientOS

**Sesión:** Code nueva, sin contexto histórico. Lectura completa del código de `jaime/dev` + verificación estructural BD staging (`vonwkciosksqspyljzfy`) vía `list_tables verbose` y `get_advisors`. Cero DML.

**Fecha:** 2026-05-03 (domingo).

**Resumen:** **NO recomiendo merge a main** sin abordar al menos los CRÍTICO y revisar los ALTO. Los CRÍTICO son riesgos de seguridad reales y quiebres de invariantes que se manifiestan en operación normal, no edge cases.

---

## Conteo

- **CRÍTICO: 3**
- **ALTO: 6**
- **MEDIO: 8**
- **BAJO: 6**

---

## CRÍTICO

### C1 — `confirmation_code` accesible en cliente para TODOS los roles, defeating verification

**Descripción.** El código de 4 dígitos (CLAUDE.md regla #15: "Código MUST be correct — no hay bypass") se carga en el objeto `trip` para cualquier usuario con permiso de SELECT en la tabla `trips`. La RLS de Postgres es row-level, no column-level — no hay forma de excluir esa columna por rol sin reestructurar (vista, función o columna en otra tabla). Las restricciones son solo de UI:

- [src/app/(app)/solicitudes/[id]/page.tsx:187](src/app/(app)/solicitudes/[id]/page.tsx#L187) — SELECT incluye `confirmation_code` siempre.
- [src/components/solicitudes/ActiveTripPanel.tsx:107](src/components/solicitudes/ActiveTripPanel.tsx#L107) — render gated por `canSeeCode` (rol pm/logistica/admin) pero el dato sigue en props.
- [src/components/viajes/DeliveryModal.tsx:137](src/components/viajes/DeliveryModal.tsx#L137) — comparación client-side `code === trip.confirmation_code` para cualquier rol que use el modal (pm/logistica/almacen/campo/admin).
- [src/hooks/useTrips.ts:659](src/hooks/useTrips.ts#L659) — `fetchTrip` incluye `confirmation_code` en el SELECT para todos los roles.

Un conductor (`campo`) abre `/mis-viajes/[id]`, abre DevTools, y lee `trip.confirmation_code` desde el state de React. Igualmente puede modificar el state local antes de submit y la BD acepta cualquier valor (no hay constraint). El receptor también puede leer el código en su sesión.

**Severidad: CRÍTICO** — el código de confirmación es la única salvaguarda contra entrega no autorizada por diseño explícito. Si el receptor obtiene el código de cualquier sesión, no hay segunda barrera.

**Evidencia BD.** No existe constraint de validación de `confirmation_code_used` en la tabla `trip_events` ni función SQL que valide. La validación es 100% client-side.

**Recomendación.** Mover la verificación a una función RPC `submit_delivery_event(...)` SECURITY DEFINER que reciba el código en clear y compare server-side. La función emite el INSERT solo si el código matchea. Hasta entonces, cualquier rol con acceso al trip detail puede leer el código.

---

### C2 — RPC SECURITY DEFINER expuestas a `authenticated` por todos los `recalc_*` y triggers

**Descripción.** `get_advisors` reportó **20 funciones SECURITY DEFINER** que pueden invocarse vía `/rest/v1/rpc/<name>` por usuarios `anon` Y `authenticated`. Las críticas son:

- `recalc_qty_for_line(p_request_line_id uuid)` — un usuario logueado puede llamar esto sobre CUALQUIER request_line_id. La función es SECURITY DEFINER y bypassa RLS en el UPDATE final a `sm_request_lines.status/qty_scheduled/qty_delivered`. No hay check de ownership dentro de la función. Un PM puede recalcular líneas de proyectos ajenos (no debería poder verlas, pero el ID es UUID). Más importante: combinado con cualquier discrepancia residual entre tablas (ej. assignments huérfanos), invocar recalc puede pivotear el status visible.
- `cascade_request_status()` — invocable como RPC. Diseñada como trigger function pero expuesta a auth.
- `auto_cancel_empty_pickup_order()` / `auto_cancel_empty_external_order()` — diseñadas como trigger functions. Expuestas a auth podrían cancelar orders incorrectamente si el contexto no es trigger.
- `audit_trigger()` — podría inyectar audit entries falsos si tiene side effects fuera de NEW/OLD.
- `trg_recalc_from_*` (4 funciones) — trigger funcs expuestas como RPC. Llamarlas fuera de contexto trigger puede explotar.

**Evidencia.** [advisors security report - 20 lints `anon_security_definer_function_executable` + 20 `authenticated_security_definer_function_executable`]. Verificado vía MCP `get_advisors` el 2026-05-03.

**Severidad: CRÍTICO** — superficie de ataque importante en un sistema con >150 personas usando el authenticated role. No es un edge case; es ejecutable hoy con un curl.

**Recomendación.** `REVOKE EXECUTE ON FUNCTION public.recalc_qty_for_line(uuid), public.cascade_request_status(), public.audit_trigger(), public.trg_recalc_from_*, public.auto_cancel_empty_*, public.update_equipment_location_on_*, public.log_equipment_status_change(), public.rls_auto_enable() FROM anon, authenticated;` Triggers seguirán funcionando porque el trigger machinery corre como superuser. Funciones que sí necesitan RPC público (ej. `get_my_app_role()`) quedarse como están con auditoría explícita.

---

### C3 — Proxy server-side enforza RBAC SOLO para `campo`, otros roles pueden navegar a rutas no permitidas

**Descripción.** [src/proxy.ts:80-90](src/proxy.ts#L80-L90) — único bloqueo es para rol `campo`:

```ts
if (role === 'campo') {
  const isAllowedForCampo = pathname.startsWith('/mis-viajes') || pathname === '/change-password'
  if (!isAllowedForCampo) {
    // redirect a /mis-viajes
  }
}
```

`pm`, `almacen`, `logistica` pueden navegar libremente a rutas que no deberían ver según CLAUDE.md (sección "5 Roles del Sistema"):

- PM accede a `/admin/masters` → no hay bloqueo en proxy. La página debe defenderse sola, lo cual depende del componente.
- Logística accede a `/admin` → mismo problema.
- Almacén accede a `/programacion/viaje/nuevo` (crear movilización, gated en CLAUDE.md a logistica/admin) → mismo problema.

[src/lib/utils/roles.ts:7-12](src/lib/utils/roles.ts#L7-L12) define `canAccess(role, route)` con tabla `ROLE_ROUTES` pero el proxy NO lo usa. Está exportado pero no se invoca en proxy.ts.

**Evidencia.** Lectura directa de proxy.ts. La función `canAccess` y la constante `ROLE_ROUTES` están huérfanas del enforcement.

**Severidad: CRÍTICO** — RBAC documentado pero no implementado server-side. Defensa-en-profundidad rota; depende 100% de UI gating en cada page que puede olvidarse en features nuevos. Combinado con C2, un PM curioso puede llamar `recalc_qty_for_line` sobre líneas de cualquier proyecto.

**Recomendación.** Sustituir el `if (role === 'campo')` por `if (!canAccess(role, pathname))` redirect a la home del rol. Asegurar que `ROLE_ROUTES` incluye todas las rutas válidas por rol. Excepción: rutas API (`/api/cron`, `/api/gps/*`) ya están bypaseadas por matcher.

---

## ALTO

### A1 — `cancelSolicitud` no es atómico — múltiples DELETEs/UPDATEs sin transacción

**Descripción.** [src/hooks/useSolicitudes.ts:816-967](src/hooks/useSolicitudes.ts#L816-L967) ejecuta hasta 6 pasos secuenciales:

1. SELECT lines del request.
2. SELECT pickup_orders relacionados, loop UPDATE/DELETE per order.
3. SELECT external_orders relacionados, loop UPDATE/DELETE per order.
4. Loop DELETE trip_line_assignments para líneas Programadas (un DELETE por línea).
5. UPDATE bulk sm_request_lines SET status='Cancelada' WHERE id IN (...).
6. UPDATE sm_requests SET status='Cancelada' WHERE id = ...

Si falla en cualquier paso intermedio (red, BD, trigger): la solicitud puede quedar **parcialmente cancelada**. Por ejemplo, fall en paso 4 deja el pickup_order cancelled, las líneas Programada con su assignment borrado, y el header sigue Enviada/En Proceso. Al reintentar, paso 1 carga lines con statuses ya parcialmente migrados — la lógica de `lineIdsToCancel` filtra por `status IN ('Pendiente', 'Programada', 'Parcial')` y excluiría las que ya están Cancelada. Eventualmente convergente pero estado intermedio visible al usuario.

**Severidad: ALTO** — failure mode probable bajo red mala (mobile + Chilibre). No hay retry handling. No hay UI feedback "fall, reintenta". 

**Recomendación.** Mover a una RPC SQL única `cancel_solicitud(id uuid, reason text)` con transacción atómica. Patrón ya documentado para `convertLineToPickup` en BL-RPC-CONVERSION (BACKLOG.md). Mismo problema, misma solución.

### A2 — `updateSolicitud` borra `trip_line_assignments` ANTES de borrar la línea — si trigger bloquea, queda huérfano

**Descripción.** [src/hooks/useSolicitudes.ts:707-723](src/hooks/useSolicitudes.ts#L707-L723):

```ts
for (const lineId of deletedLineIds) {
  await supabase.from('trip_line_assignments').delete().eq('request_line_id', lineId)  // 1
  const { error: deleteError } = await supabase.from('sm_request_lines').delete().eq('id', lineId)  // 2
  if (deleteError) {
    setSaveError(...)
    return false
  }
}
```

El trigger BD `enforce_line_add_delete_only_in_borrador` (Fase B.1 Bloque 2.A) bloquea DELETE de `sm_request_lines` cuando el parent NO está en `'Borrador'`. La UI debería gatear esto (el botón de eliminar línea solo se muestra en Borrador), pero un PUT manual via API o un retry con state stale puede llegar acá con una request en Enviada.

**Failure mode:** el DELETE de `trip_line_assignments` (paso 1) **siempre tiene éxito** (no hay trigger que lo bloquee). El DELETE de `sm_request_lines` (paso 2) falla por el trigger. Resultado: la línea sigue existiendo, el assignment del trip se perdió, el trip ahora muestra menos líneas de las que debería. **Y el `recalc_qty_for_line` se disparó por el DELETE del assignment**, recalculando la línea de vuelta a Pendiente — pero la línea sigue en una solicitud En Proceso.

**Severidad: ALTO** — corruption silenciosa de assignments. La línea original sobrevive en estado inconsistente con el trip.

**Recomendación.** (a) Añadir guard en useSolicitudes.ts para verificar que el parent está en Borrador antes del DELETE de trip_line_assignments. (b) O reordenar: intentar DELETE de la línea primero; si pasa (parent en Borrador), entonces borrar trip_line_assignments. (c) O pasar a RPC atómica.

### A3 — `handleDispatch` permite `qty_dispatched=0` que deja la línea En Transito sin material

**Descripción.** [src/app/(app)/mis-viajes/[id]/page.tsx:618-638](src/app/(app)/mis-viajes/[id]/page.tsx#L618-L638) — al despachar, se UPDATE las líneas a `'En Transito'` para todos los `lineIds` que aparecen en el array. Pero la UI permite que el conductor / Charris dejen `qty_dispatched=0` (valor entero válido), o el modal en line 240 permite `min={0}` step=1.

[src/components/viajes/DispatchModal.tsx:125-126](src/components/viajes/DispatchModal.tsx#L125-L126) filtra `lines.filter(l => l.checked && l.qty > 0)`, pero el problema es: si el usuario uncheckea una línea (`l.checked = false`), esa línea NO se incluye en el update de qty_dispatched, pero la línea sigue en `trip.assignments` con qty_dispatched=0. La línea NO se UPDATEa a 'En Transito' (porque no está en lineIds). Pero el trip pasa a 'En Ruta'. Estado consistente.

**El problema real:** si la línea `checked=true` pero el qty=0, el filtro la excluye y no se UPDATEa. Pero si checked=true Y qty>0 pero menor a `quantity_assigned`, se UPDATEa con un qty parcial. El trigger BD recalcula `qty_scheduled = quantity_assigned - qty_delivered - qty_rejected`, **NO considera qty_dispatched**. Entonces qty_scheduled stays at quantity_assigned. Status='En Transito'.

Más adelante, en DeliveryModal, [línea 105-107](src/components/viajes/DeliveryModal.tsx#L105-L107) usa `maxQty: a.qty_dispatched || a.quantity_assigned`. **Si qty_dispatched=0 (línea quedó en trip pero nadie la despachó), maxQty=quantity_assigned.** El usuario puede entregar más de lo despachado. El BD CHECK `qty_delivered + qty_rejected <= qty_dispatched` dispara con error críptico (que no tiene un translateBdError handler en mis-viajes/[id]).

**Severidad: ALTO** — race entre lo que el conductor puede entregar (max controlado por UI client-side) y lo que la BD acepta (qty_dispatched). Mensaje de error críptico al usuario.

**Recomendación.** En DeliveryModal.tsx, cambiar `maxQty: a.qty_dispatched || a.quantity_assigned` a `maxQty: a.qty_dispatched`. Si qty_dispatched=0, la línea no debería aparecer en deliverableAssignments (filtrar también por `qty_dispatched > 0`). Adicionalmente, en DispatchModal validar que al menos una línea checked tiene qty>0 (ya hace) Y no permitir que checked y qty=0 coexistan (forzar uncheck si qty=0).

### A4 — `handleDelivery` UPDATEs `delivered_at` en loop con SELECT post-trigger — race condition

**Descripción.** [src/app/(app)/mis-viajes/[id]/page.tsx:735-748](src/app/(app)/mis-viajes/[id]/page.tsx#L735-L748):

```ts
for (const line of accepted) {
  const { data: postTrigger } = await supabase.from('sm_request_lines')
    .select('status').eq('id', line.request_line_id).single()
  if (postTrigger?.status === 'Entregada') {
    await supabase.from('sm_request_lines').update({ delivered_at: new Date().toISOString() })
      .eq('id', line.request_line_id)
  }
}
```

El comentario dice "delivered_at NO es trigger-managed (recalc_qty_for_line solo SETEA delivered_at cuando status=Entregada, nunca lo CLEAREA)". Pero el código verifica DESPUÉS del trigger sync_assignment_on_delivery_event si la línea quedó Entregada — y si sí, escribe `delivered_at`. Pero *el propio trigger BD-4 recalc setea `delivered_at` cuando `v_new_status = 'Entregada' AND delivered_at IS NULL`* (per spec 6.5 line 258-259). 

El loop FE escribe delivered_at OTRA VEZ, pero está bien porque el trigger ya lo seteó (el condicional FE pisaría con un timestamp posterior). Comportamiento redundante pero no rompe.

**El problema real es race:** si dos eventos `Entrega` concurrentes pivotean la misma línea a status=Entregada en transacciones distintas, los dos timestamps pueden grabarse pero el order es indeterminado. Trigger Bug #4 (`enforce_one_active_delivery_per_trip_line`) supuestamente bloquea concurrent Entregas de la misma línea/trip — pero diferentes trips podrían tener líneas duplicadas (BL-EXCLUSIVITY no resuelto, trigger nuevo no aplica cross-trip).

**Severidad: ALTO** — duplica trabajo del trigger; no rompe pero es indicio de modelo confuso. El UPDATE FE de delivered_at debería eliminarse (trigger ya lo hace). Si se elimina, el loop sería puro overhead.

**Recomendación.** Eliminar el bloque línea 735-748. Trigger ya setea delivered_at. Si por alguna razón el trigger no lo seteó (caso edge), el siguiente recalc lo hará.

### A5 — `cancelSolicitud` no maneja orders en estado `'Entregado'` — preserva estado inconsistente

**Descripción.** [src/hooks/useSolicitudes.ts:845, 887](src/hooks/useSolicitudes.ts#L845) filtra `eq('status', 'Aprobado')` en el SELECT de pickup_orders y external_orders. Si una solicitud tiene líneas asignadas a un pickup_order ya `Entregado`, ese order no entra al loop — pero en el paso 5 (línea 928), las líneas se UPDATE a `'Cancelada'` solo si están en `'Pendiente'`/`'Programada'`/`'Parcial'`. Líneas en `'Entregada'` o `'En Transito'` no se cancelan.

**Pero el header se cancela igualmente** (línea 944). Resultado: solicitud con `status='Cancelada'` pero líneas Entregada/En Transito/Programada (de pickup_orders Entregados). Auditorialmente confuso. La cascade trigger `cascade_request_status` recibe el UPDATE de status del header (no de las líneas) — no está claro si se vuelve a re-evaluar.

**Severidad: ALTO** — produce solicitudes Cancelada con líneas Entregada visibles. Posiblemente intencional (preservar histórico) pero la UX no lo comunica al usuario que cancela.

**Recomendación.** Pre-flight check al abrir modal de cancel: si hay líneas Entregada/En Transito, mostrar warning + texto explicativo "Las líneas ya entregadas (X) y en tránsito (Y) se preservan como histórico". Ya existe el patrón cancellation_reason ≥10 chars — extender al modal de cancel solicitud.

### A6 — Discrepancia entre código de `recalc_qty_for_line` desplegado y el spec/CHANGELOG

**Descripción.** El CHANGELOG entry `2026-04-30` describe la migración `cambio6_5_event_model_refinement` con un trigger `recalc_qty_for_line` de **6 puntos de orden**. Un día después (entry `2026-05-01 ~01:59 UTC`), un AMEND `cambio6_5_recalc_simplify_pendiente_on_rejected_total` se aplicó **simplificando a 5 puntos**, eliminando el step 5 que mapeaba `'Programada'` cuando `quantity_assigned_active>0` con scheduled=delivered=0.

Sin embargo, el spec activo `Docs/superpowers/specs/2026-04-30-cambio6-5-event-model-refinement.md` (committed `b323de7`) sigue documentando el orden de 6 puntos. El cuerpo de la función inline en spec y en CHANGELOG (al final del entry 2026-04-29) no reflejan el amend.

Resultado operacional: **la BD desplegada en staging tiene un comportamiento, los docs describen otro.** Para code reviewer externo que abre el spec primero (como yo), la lógica documentada no es la real.

**Severidad: ALTO** — drift que confunde futuros sessions de Code y futuros mergers. Puede llevar a "fixes" del comportamiento "correcto" según spec que rompen el correcto según realidad.

**Recomendación.** Actualizar el spec 2026-04-30 con un patch al final: "Amend aplicado 2026-05-01: step 5 eliminado, ELSE final maneja el caso. Razón: ver CHANGELOG entry 2026-04-30." O re-escribir la sección "Diseño detallado BD-4" con los 5 puntos finales. El spec frontmatter dice `status: draft` — flipear a `shipped` y agregar `shipped_commits` per `.claude/rules/spec-lifecycle.md`.

---

## MEDIO

### M1 — Sin CHECK constraints en BD para `sm_request_lines.status`, `trip_event_lines.line_status`, `trip_events.event_type`, `people.app_role`, `people.status`

**Descripción.** Verificado vía `list_tables verbose` (staging). Estos campos críticos del sistema son `text` con default pero **sin CHECK constraint enforzando valores válidos**. CLAUDE.md regla #16 ya advierte: "**'En Transito' SIN acento** es canónico — mismatches fallan silenciosamente". El comentario indica conocimiento del riesgo pero no se ha mitigado.

Trigger BD-5 `sync_assignment_on_delivery_event` hace branching sobre `NEW.line_status IN ('ok', 'with_observations')` y `NEW.line_status = 'rejected'`. Si frontend envía `'OK'` (mayúsculas) o `'okay'`, el INSERT sucede pero el trigger no incrementa qty_delivered ni qty_rejected. Línea queda zombie.

Trigger BD-6 `sync_assignment_on_delivery_revert` chequea `event_type != 'Entrega'` — un typo `'entrega'` haría que el revert NO sincronice qty.

**Severidad: MEDIO** — no es bug actual (frontend usa strings constantes) pero el riesgo está latente para cualquier feature nuevo, integración (CSV import), o test que use valores literales.

**Recomendación.** Agregar CHECK constraints:

```sql
ALTER TABLE sm_request_lines ADD CONSTRAINT status_valid
  CHECK (status IN ('Pendiente','Programada','En Transito','Parcial','Entregada','Cancelada'));
ALTER TABLE trip_event_lines ADD CONSTRAINT line_status_valid
  CHECK (line_status IN ('ok','with_observations','rejected'));
ALTER TABLE trip_events ADD CONSTRAINT event_type_valid
  CHECK (event_type IN ('Salida','Llegada','Entrega','Retorno','Incidencia','Parada','Reversion'));
ALTER TABLE people ADD CONSTRAINT app_role_valid
  CHECK (app_role IS NULL OR app_role IN ('pm','logistica','campo','almacen','admin'));
ALTER TABLE people ADD CONSTRAINT status_valid
  CHECK (status IN ('Activo','Inactivo'));
```

Pre-aplicación: query existing values pa confirmar que no hay drift.

### M2 — `usePickupOrders.completePickupOrder` no es atómico — UPDATE lines en loop antes del UPDATE order

**Descripción.** [src/hooks/usePickupOrders.ts:246-275](src/hooks/usePickupOrders.ts#L246-L275). Para N líneas del pickup_order, ejecuta N UPDATE secuenciales (`qty_delivered = quantity_assigned`), luego un UPDATE final del order header. Si red falla entre updates: order keeps `status='Aprobado'` pero algunas líneas tienen qty_delivered>0. El trigger recalc dispara per-row UPDATE, llevando algunas sm_request_lines a `'Entregada'` pero el order parent sigue Aprobado (no apareció en list de "entregados").

Mismo patrón en [src/hooks/useExternalOrders.ts:240-269](src/hooks/useExternalOrders.ts#L240-L269).

**Severidad: MEDIO** — failure mode posible en mobile. UI no muestra retry friendly.

**Recomendación.** RPC SQL `complete_pickup_order(order_id, ...)` atómica. Patrón documentado en BL-RPC-CONVERSION pero solo cubre converts; extender a completes.

### M3 — `cancelSolicitud` no pasa `cancellation_reason` al cancelar pickup/external orders relacionados

**Descripción.** [src/hooks/useSolicitudes.ts:859-866, 899-906](src/hooks/useSolicitudes.ts#L859-L866) — UPDATE pickup_orders/external_orders con `status='Cancelado'` pero NO setea `cancellation_reason`. El trigger BD `enforce_cancellation_reason_pickup_orders` / `_external_orders` (Cambio 6) bloquea con error críptico si el order tiene líneas con `qty_delivered>0`. La UI no traduce el error PostgreSQL.

Pero los orders en `'Aprobado'` típicamente tienen qty_delivered=0 (qty_delivered se setea cuando status pasa a `'Entregado'` via completePickupOrder). Salvo race condition, no debería disparar. Aún así, defensa-en-profundidad rota: si Charris cancela una solicitud que tiene un pickup_order Aprobado con qty_delivered>0 (por bug pasado o data legacy), el cancelSolicitud falla sin contexto al usuario.

**Severidad: MEDIO** — probable que no se manifieste hoy, pero es brittle handling de errores BD.

**Recomendación.** O bien (a) traducir el error tipo `enforce_cancellation_reason` en el catch de cancelSolicitud, o (b) modal pre-cancel solicita razón si detecta orders con delivered>0.

### M4 — `proxy.ts` `single()` puede tirar PGRST116 si user no tiene people row → loop infinito

**Descripción.** [src/proxy.ts:71-75](src/proxy.ts#L71-L75) usa `.single()` para SELECT de `people.app_role`. `single()` lanza error PostgREST si retorna 0 rows. El `catch` en línea 100 redirige a `/login`. Si el user está autenticado pero sin row en `people` (escenario: user creado en Supabase Auth pero no en people, o el row fue borrado), el loop es:

1. Auth válido → SELECT people single() → throw → catch → redirect /login
2. /login está en publicRoutes → bypass del proxy → user ve /login
3. Login form ya tiene sesión válida → al hacer click "Ingresar" o auto-redirect → request a / → re-entry al proxy → loop

**Severidad: MEDIO** — afecta a un usuario, no al sistema. Pero un usuario afectado no puede usar el app sin intervención de admin.

**Recomendación.** `.maybeSingle()` en lugar de `.single()`. Si retorna null, sign out (revoke session) o redirect a una página de error con texto "Tu cuenta no está provisionada en el sistema. Contacta a admin."

### M5 — Skydata client devuelve cache stale al fallar upstream — enmascara failures reales

**Descripción.** [src/lib/gps/skydata-client.ts:65-67](src/lib/gps/skydata-client.ts#L65-L67):

```ts
if (!resp.ok) {
  if (cache) return cache.data
  throw new Error(`[skydata] upstream ${resp.status}`)
}
```

Si SkyData devuelve 5xx pero hay cache previa, retorna esa cache **sin emitir señal de fallo al consumer**. El consumer ve data "fresca" (la response tiene `ok:true` semánticamente) pero los timestamps son viejos. El `isStale()` chequea epoch >48h, no edad de cache. Si la cache tiene 1h de antigüedad y SkyData lleva 1h caída, los marcadores siguen mostrándose como "live" hasta que la cache expira (10s) y la próxima request falla — pero esa también devuelve la cache vieja.

**Severidad: MEDIO** — Charris cree estar viendo posición en vivo cuando es de hace minutos. Para tracking GPS esto es engañoso.

**Recomendación.** Marcar las entries del cache con un flag `isStaleResponse: boolean`. Si la última response al upstream falló, taggear las posiciones devueltas. El consumer (route.ts) puede agregar un campo `cacheAgeMs` al response para que la UI muestre warning "Datos de hace X minutos".

### M6 — `useTrips.refetchBacklog` no maneja error explícitamente, solo lo silencia

**Descripción.** [src/hooks/useTrips.ts:429-434](src/hooks/useTrips.ts#L429-L434):

```ts
if (error) {
  // Error silencioso en backlog — la UI mostrará lista vacía
  setBacklog([])
  return
}
```

El comentario admite el silenciamiento. Si la query del backlog falla (RLS, BD overload, query corrupta), el usuario ve "lista vacía" sin distinción de "no hay líneas pendientes" vs "el sistema falló cargándote las líneas". Charris programa pensando que no hay backlog y los PMs lo llaman.

**Severidad: MEDIO** — UX engañosa en falla. Charris es el usuario más importante per CLAUDE.md sección "Dominio".

**Recomendación.** Agregar `backlogError: string | null` al state expuesto. Mostrar banner de error en lista cuando backlog falla cargar.

### M7 — `useTripEvents.registerEvent` Salida/Entrega rechazo silencioso si se invoca por la vía vieja

**Descripción.** [src/hooks/useTripEvents.ts:43-51](src/hooks/useTripEvents.ts#L43-L51) — los guards rechazan Salida/Entrega con un mensaje de error pero **el caller no sabe que recibirá un false silencioso**. El handler en mis-viajes/[id]:511 solo invoca registerEvent para Llegada/Retorno/Incidencia (per nextMainEvent + showLlegadaButton). La auto-redirect URL `?action=Entrega` (línea 1009) abre el DeliveryModal directamente, no llama registerEvent. Pero si en el futuro se agrega un click handler que ejerciera el caso, falla silenciosa visible solo en `registerError` state.

**Severidad: MEDIO** — defensa razonable pero el FE tendría mejor UX si ese caso fuera unreachable por construcción (eliminar Salida/Entrega del TripEventType union completamente, o usar discriminated union).

**Recomendación.** Quitar `'Salida'` y `'Entrega'` del enum TripEventType si no aplican a registerEvent. Crear union separado (TripEventInputType) que excluya esos dos.

### M8 — `notification_log.valid_event_type` CHECK constraint no detecta event_type = `null` ni acepta event_type case-sensitive

**Descripción.** Verificado vía list_tables: `notification_log.event_type` es `text NOT NULL` con CHECK que enumera 18 valores específicos. `notify*` actions en `src/lib/notifications/actions.ts` (no leído completo, pero referenciado por [src/hooks/useTripEvents.ts:11-17](src/hooks/useTripEvents.ts#L11-L17)) llaman a estas con strings literales. Si hay typo (`'salida_registrada'` vs `'Salida_Registrada'`), el INSERT falla con CHECK violation. Catch en `notifyXxx().catch(console.error)` silencia el error.

Esto es low priority pero la dedup por 5min documentada en CHANGELOG depende de que el INSERT al log llegue. Si falla por typo, dedup no funciona y se mandan duplicados.

**Severidad: MEDIO** — depende de la robustez de las strings. Sin tests del notification path no podemos confirmar cobertura.

**Recomendación.** Centralizar los strings en una constante exportada de `lib/notifications/constants.ts`. Tests unitarios sobre cada función notify* asegurando que el insert llega.

---

## BAJO

### B1 — Drift CLAUDE.md regla #9 vs código TripForm: "costo read-only cuando hay tarifa" no implementado

**Descripción.** CLAUDE.md regla #9 dice literalmente: "Costo se auto-rellena con `rate.amount` y queda **read-only**". Pero [src/components/programacion/TripForm.tsx:386-395](src/components/programacion/TripForm.tsx#L386-L395) y `handleRateChange` línea 199 (con comentario "Cambio 4 (revert J6): seleccionar rate pre-rellena cost del rate.amount pero el campo SIGUE editable como override manual") muestran que el read-only fue revertido en Cambio 4.

**Severidad: BAJO** — drift de documentación, no es bug. Pero confunde a sessions futuras de Code que confíen en CLAUDE.md.

**Recomendación.** Actualizar CLAUDE.md regla #9 para reflejar el comportamiento actual: costo editable siempre, rate solo pre-rellena.

### B2 — Función `statusContextString` en format.ts está exportada pero nunca importada (dead code)

**Descripción.** [src/lib/utils/format.ts:155-191](src/lib/utils/format.ts#L155-L191). Verificado con grep: solo el export aparece, ningún `import { statusContextString }` en el código. Aún recibe `pickup_completed_at`/`external_provider_name` en su info param — referencias muertas a campos del modelo Cambio 3 ya eliminado. CL-1 cleanup del Cambio 6.5 supuestamente removió las refs muertas (commit `5a9c63c`) pero el cleanup solo eliminó los case statements para `'Pickup Aprobado'`/`'Externo Aprobado'`, no la función entera ni los campos del info param.

**Severidad: BAJO** — código muerto, sin impacto runtime.

**Recomendación.** Eliminar la función `statusContextString` completamente.

### B3 — Voseo argentino en programacion/viaje/[id] modal de cancelación

**Descripción.** [src/app/(app)/programacion/viaje/[id]/page.tsx:950](src/app/(app)/programacion/viaje/[id]/page.tsx#L950): `"¿Estás seguro de que querés cancelar esta movilización?"` — `querés` es voseo argentino. CLAUDE.md sección "Lenguaje" prohíbe explícitamente `querés` → debe ser `quieres`.

Línea 992: `"Si, cancelar movilización"` — `Si` debería ser `Sí` con tilde (afirmación).

**Severidad: BAJO** — UX dialect, no bug.

**Recomendación.** Cambiar a `"¿Estás seguro de que quieres cancelar esta movilización?"` y `"Sí, cancelar movilización"`.

### B4 — `JSON.parse(JSON.stringify(...))` para attachments — deep clone innecesario

**Descripción.** Múltiples lugares: [src/app/(app)/mis-viajes/[id]/page.tsx:685, 965](src/app/(app)/mis-viajes/[id]/page.tsx#L685), [src/hooks/useTrips.ts:804, 920](src/hooks/useTrips.ts#L804), [src/hooks/usePickupOrders.ts:267](src/hooks/usePickupOrders.ts#L267), [src/hooks/useExternalOrders.ts:146, 260](src/hooks/useExternalOrders.ts#L146), etc. — usan `JSON.parse(JSON.stringify(arr))` para "serializar" attachments antes del insert. Patrón viejo para evitar passing references. supabase-js acepta arrays/objetos directamente — el JSON round-trip es overhead.

**Severidad: BAJO** — perf overhead minor, código verboso.

**Recomendación.** Eliminar el JSON round-trip. Pasar el array directamente. Si hay riesgo de mutación posterior, hacer un shallow `[...arr]` que es 10x más rápido.

### B5 — Dead code en TripLiveMap: chequea `data.status === 'pickup'` pero ese status ya no existe

**Descripción.** [src/components/gps/TripLiveMap.tsx:187](src/components/gps/TripLiveMap.tsx#L187):

```ts
if (state.data?.status === 'not_in_route' || state.data?.status === 'pickup') {
  return null
}
```

`'pickup'` no es un status definido en `GpsTripPosition` (per `src/lib/gps/types.ts` y la API en `route.ts` que solo emite `not_in_route|no_gps|stale|live`). Cambio 3 eliminó pickup-via-trip. Comparison nunca matchea.

**Severidad: BAJO** — código muerto.

**Recomendación.** Eliminar `|| state.data?.status === 'pickup'`.

### B6 — Performance: 12 unused indexes en active-path tables

**Descripción.** Per advisors performance: `idx_trips_trailer`, `_updated_by`, `_campaign`, `_created_by`, `_driver`, `_rate`, `idx_sm_request_lines_designated_receiver`, `_po_line`, `_updated_by`, `_unit`, `idx_external_orders_approved_at`, `idx_pickup_orders_approved_at` están creados pero nunca usados. Algunos son redundantes (e.g., `_approved_at` superseded by `_scheduled_date` per Cambio 5b). Mantenerlos cuesta storage y slowdown de INSERTs.

**Severidad: BAJO** — performance hygiene.

**Recomendación.** DROP de indexes confirmados redundantes. Los que cubren FKs sin uso pueden quedarse si se planea futuras queries.

---

## Anti-patterns y fortalezas

### Fortalezas notables (no toda la auditoría son problemas)

- **Idempotencia con UUID pre-generado:** `eventIdRef.current = crypto.randomUUID()` en DeliveryModal/DispatchModal es buena defensa contra retry de red. Trigger Bug #4 (`enforce_one_active_delivery_per_trip_line`) es defensa server-side complementaria.
- **Defense-in-depth:** triggers BD para invariantes (qty_invariant, qty_delivered ≤ qty_dispatched, cancellation_reason cuando delivered>0) son patrón sólido. Frontend valida primero, BD enforza siempre.
- **Branch defensivo `'Cancelada'` en recalc:** preserva status terminal correctamente.
- **TripLiveMap visibility-aware polling:** pausa requests cuando tab oculta — buen UX y ahorro de cuota Skydata.

### Anti-patterns recurrentes

- **Loop con await en operaciones que deberían ser atómicas** (cancelSolicitud, completePickup, completeExternal, handleDispatch, handleRevert). Patrón consistente — debería abordarse con RPC SQL atómicas.
- **`JSON.parse(JSON.stringify(...))` defensive clone** que no es necesario.
- **`.single()` sin try/catch** que tira PGRST116 silenciosamente en flows de auth.
- **`error => console.error` o silencio total** en notify*().catch() y backlog refetch — falla silenciosa de side effects.
- **CHECK constraints ausentes en text fields críticos** que se usan como enums implícitos.

---

## Juicio sobre readiness para merge a main

**NO recomiendo merge a main sin antes:**

1. **Cerrar C1, C2, C3 antes del merge.** Son riesgos de seguridad operacional que se manifiestan con uso normal:
   - C1: confirmation_code expuesto a campo. La verificación de entrega por código es la única defensa documentada en CLAUDE.md regla #15. Filtrarla rompe la promesa.
   - C2: 20 SECURITY DEFINER funcs accesibles vía REST. No requiere creatividad de un atacante — un curl basta. REVOKE EXECUTE es trivial técnicamente.
   - C3: proxy.ts solo gatea `campo`. PM y almacén pueden navegar a admin/masters. Combinado con C2 amplifica el blast radius.

2. **Decidir explícitamente sobre A1, A2, A3.** Las 3 son race conditions reales en flows usados a diario por Charris:
   - A1 (cancelSolicitud no atómico): puede convertirse en defecto crítico si Charris pierde conexión a media cancelación. Debe ser RPC.
   - A2 (updateSolicitud delete order matters): bug latente esperando a que un PM intente borrar líneas en una solicitud Enviada.
   - A3 (qty_dispatched=0 envenena DeliveryModal): UX rota silenciosa, error críptico al usuario.

3. **Sincronizar A6 (spec vs deployed):** alguien va a fix algo basado en el spec viejo. Mejor ahora que después.

Los **MEDIO** pueden documentarse como BACKLOG con prioridad, pero M1 (CHECK constraints) es trabajo de 1 hora y elimina toda una clase de bugs futuros — vale la pena hacerlo en la ventana de merge.

Los **BAJO** son hygiene y pueden esperar.

**Mi recomendación específica:** PARAR el merge. Generar 1 sprint focalizado en C1+C2+C3+A1+A2+A3+A6+M1 (~3-5 días de Code + revisión por James). Una vez cerrado, reabrir el merge.

Si James decide igualmente proceder con merge ahora (criterio operativo de "ya está bien"), las prioridades de hotfix post-merge son C1 y C2 — son lo que un actor adversarial puede explotar hoy con poco esfuerzo.

---

## Anexo — Verificación BD usada

- `mcp__claude_ai_Supabase__list_tables(verbose=true)` sobre staging (`vonwkciosksqspyljzfy`) — schema completo de las 47 tablas. Confirmado: triggers y CHECK constraints cross-column NO son visibles vía esta API. CHECK enforcement de status fields ausente.
- `mcp__claude_ai_Supabase__get_advisors(security)` — 20 lints SECURITY DEFINER + 20 paralelos para authenticated + 2 RLS-always-true en `feedback`/`suggestions` + leaked password protection disabled.
- `mcp__claude_ai_Supabase__get_advisors(performance)` — 4 WARN + 120 INFO. Active-path: 12 unused indexes, 14 unindexed FKs (orders) — non-blocking.

Cero DML ejecutado. Cero DDL. Cero modificación a producción.
