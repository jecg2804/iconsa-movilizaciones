# Audit-A pre-merge — MovimientOS app entera

> **Ejecutado por** Code (sesión que construyó Cambios 1-6.5 y GPS Live Tracking).
> **Fecha** 2026-05-01 (madrugada Panamá).
> **Scope** Toda la app excepto auth/RLS, dashboards/admin no implementados, futuras features Tier 2-4.
> **BD staging** `vonwkciosksqspyljzfy` (clean post-cleanup de Chat).
> **Restricciones cumplidas** Sin DDL, sin tocar prod, sin fixes implementados, sin commits sobre `jaime/dev` salvo el commit final del reporte, T-final del Cambio 6.5 sigue PARADA.

## Veredicto profesional

**No recomiendo merge a `main` sin atender al menos los 3 hallazgos CRÍTICOS.** Los 3 son drift entre intent (lo que el código pretende) y comportamiento real (lo que la BD termina con) que se manifiestan en flows operacionales normales de Charris. Los 2 confirmados empíricamente en BD staging dejan rastros visibles a Charris en producción la primera semana de uso real con las 3 modalidades activas (fleet + pickup + external).

Los hallazgos ALTOs son silent failures que no rompen al instante pero dañan confiabilidad operacional acumulativa. Los MEDIOs y BAJOs son polish que no bloquean merge pero merece ticket.

**Estimación de esfuerzo para mitigaciones mínimas** (2-3 días en vez de los días normales del equipo):

- 3 CRÍTICOs requieren: 1 nueva migración BD (trigger pre-cancel guard) + 2 fixes FE (guards en hooks). ~1.5 días.
- 4 ALTOs requieren: chequeos de error explícitos en hooks + un CHECK BD adicional. ~1 día.
- MEDIOs y BAJOs pueden ir post-merge.

## Resumen ejecutivo

| Severidad | Count | Detalle |
|---|---|---|
| CRÍTICO | 3 | F#13, F#28, F#18 |
| ALTO | 6 | F#2, F#3, F#7, F#9, F#12, F#19 |
| MEDIO | 5 | F#1, F#6, F#8, F#16, F#20 |
| BAJO | 7 | F#5, F#11, F#15, F#17, F#22, F#23, F#24 |
| INFORMATIVO | 4 | F#4, F#10, F#25, F#26 |

Findings en notación: **F#N — TÍTULO (severidad)**

---

## Metodología

**Phase 0 — scan inicial.** Mapeo de 84 archivos `.ts/.tsx` en src/, schema BD vía Supabase MCP (49 tablas, 30+ funciones SECURITY DEFINER detectadas en advisors), patterns de tests existentes.

**Phase 1 — audit estático.** Lectura de 18 componentes/hooks/handlers prioritarios. Foco en escritores a `trip_line_assignments`, `pickup_order_lines`, `external_order_lines`, y handlers que disparan triggers de recalc. 27 findings preliminares identificados en lectura.

**Phase 2 — audit dinámico.** 5 escenarios sintéticos ejecutados en BD staging vía scripts standalone Node (`audit-scripts/`). Cleanup obligatorio post-escenario (BD vuelve a estado limpio). 5 findings prioritarios verificados empíricamente.

**Phase 3 — consolidación.** Este reporte. Los scripts standalone quedan en `audit-scripts/` para reproducibilidad — son artefactos del audit, no código de producción.

---

## CRÍTICOs (3)

### F#13 — Cancel solicitud con trip En Ruta deja drift permanente entre TLA y línea

**Descripción.** `useSolicitudes.cancelSolicitud` paso 4 ([src/hooks/useSolicitudes.ts:918-924](src/hooks/useSolicitudes.ts#L918-L924)) elimina `trip_line_assignments` SOLO de líneas en status `'Programada'`. Líneas en `'En Transito'` (trip ya despachado) pasan a `'Cancelada'` en paso 5 ([useSolicitudes.ts:927-941](src/hooks/useSolicitudes.ts#L927-L941)) **sin tocar el TLA**, dejándolo activo en un trip `'En Ruta'`. El conductor puede entregar físicamente: el trigger BD-5 `sync_assignment_on_delivery_event` incrementa `qty_delivered` en TLA, el recalc preserva `'Cancelada'` por branch defensivo (`IF v_current_status = 'Cancelada' THEN RETURN`). **Resultado: TLA dice "10 entregados", línea dice "Cancelada qty_delivered=0".**

**Evidencia empírica.** `audit-scripts/01-cancel-request-with-active-trip.ts` (script reproducible). Output literal del run en staging:

```
=== SNAPSHOT: post-cancelSolicitud ===
  sm_requests.status = Cancelada
    line[1] status=Cancelada qty=10 sched=10 deliv=0
  trips.status = En Ruta reason=""
    TLA req_line=902a5db8 assigned=10 disp=10 deliv=0 rej=0

--- Simulando conductor entrega físicamente ---
  TEL INSERT OK — trigger BD-5 disparó

=== SNAPSHOT: post-Entrega físicamente ===
  sm_requests.status = Cancelada
    line[1] status=Cancelada qty=10 sched=10 deliv=0
  trips.status = En Ruta reason=""
    TLA req_line=902a5db8 assigned=10 disp=10 deliv=10 rej=0   ← drift
```

**No hay UI guard.** [src/app/(app)/solicitudes/[id]/page.tsx:725-728](src/app/(app)/solicitudes/[id]/page.tsx#L725-L728): `canCancelSolicitud = mode==='edit' && solicitud && ['Borrador','Enviada','En Proceso'].includes(solicitud.status)`. NO chequea trips activos. PM puede cancelar solicitud con material físicamente en camión.

**Impacto operacional.** PM cancela solicitud el lunes, conductor sigue ruta y entrega el martes (no sabe que se canceló — la app de conductor `/mis-viajes/[id]` no refleja el cancel del padre porque el TLA sigue activo). El material queda entregado en obra. PM nunca lo ve en la app. `audit_log` tiene la traza pero la UI no la muestra.

**Severidad CRÍTICO.** Material físico moviéndose sin tracking en la app es exactamente el problema que MovimientOS busca resolver. Reproducir el escenario es trivial (cualquier cancel post-Salida).

**Recomendación.**
1. Migración BD: agregar trigger `enforce_cannot_cancel_request_with_active_dispatch` BEFORE UPDATE en `sm_requests` cuando `NEW.status='Cancelada'` que rechaza si existe `sm_request_lines.status IN ('En Transito','Parcial')` con TLA en trip `'En Ruta'`. Mensaje: "No se puede cancelar la solicitud — hay líneas en trips activos. Cancelá los trips primero o esperá a Retorno."
2. Frontend: ajustar `canCancelSolicitud` para chequear el mismo predicado y deshabilitar botón con tooltip explicativo.
3. Decisión de diseño pendiente: ¿agregar opción "cancelar y forzar Retorno"? Probablemente no — flujo mejor es cancelar trip primero y después solicitud.

---

### F#28 — Línea pasa a 'En Transito' inmediato al asignar a trip pre-Salida

**Descripción.** `useTrips.saveTrip` ([src/hooks/useTrips.ts:818-839](src/hooks/useTrips.ts#L818-L839)) inserta `trip_line_assignments` sin actualizar `sm_request_lines.status` manualmente. El trigger `trg_recalc_from_assignment_change` dispara `recalc_qty_for_line`, que evalúa con `quantity_assigned_active=10, qty_delivered=0, qty_rejected=0`. El step 3 del recalc (`qty_scheduled_active>0 → 'En Transito'`) captura este caso y deja la línea en `'En Transito'` aunque el conductor no haya salido. El trigger no distingue "asignada a trip pero pre-Salida" vs "post-Salida".

**Evidencia empírica.** `audit-scripts/05-multi-fulfillment.ts` snapshot post-INSERT TLA sin Salida:

```
=== SNAPSHOT: post-TLA ===
  sm_requests.status = En Proceso
    line[1] status=En Transito qty=10 sched=4 deliv=0   ← debería ser 'Programada'
  trips.status = Programado reason=""                    ← trip todavía no ha salido
    TLA req_line=be833b91 assigned=4 disp=0 deliv=0 rej=0
```

**Workaround histórico.** [src/app/(app)/mis-viajes/[id]/page.tsx:615-626](src/app/(app)/mis-viajes/[id]/page.tsx#L615-L626) (handleDispatch / Salida) hace UPDATE manual `status='En Transito'`. Comentario inline: *"Status no es trigger-managed durante dispatch — solo el trigger recalcula qty_scheduled. La transición a 'En Transito' se hace aquí."*. **Esta afirmación del comentario es falsa.** El trigger SÍ pone 'En Transito' inmediato al INSERT TLA. El UPDATE manual del handleDispatch es un no-op.

**Drift entre intent y comportamiento.** El modelo conceptual del proyecto (CLAUDE.md sección "Estados y Cascada") declara cinco estados de línea: `Pendiente → Programada → En Transito → Entregada / Parcial / Cancelada`. El estado `'Programada'` operacionalmente significa "asignada a un trip pero conductor no ha salido". **En la BD post-Cambio 6.5 amend, ese estado nunca se asigna automáticamente.** Solo aparece si código FE lo setea manualmente (que ningún handler hace post-Cambio 6.5).

**Tests bypassan el drift sin notarlo.** [tests/cambio6-5-event-refinement.spec.ts:75-89](tests/cambio6-5-event-refinement.spec.ts#L75-L89) hace UPDATE manual `status='Programada'` post-INSERT TLA con comentario *"El trigger recalc_qty_for_line debería actualizar status automáticamente, pero forzamos por safety"*. Esa nota acepta el comportamiento drift como dado y compensa con manual UPDATE en setup. Los tests pasan, pero ninguno valida el caso real `createTrip → snapshot status` sin manual override.

**Impacto operacional.** Charris ve `/programacion` con líneas en status `'En Transito'` aunque el conductor no haya salido. Pierde la distinción "ya programé" vs "ya salió". Reportes downstream que filtren por `status='En Transito'` cuentan trips que no están en ruta. Notificaciones que disparen "lineas programadas" pero el sistema dice "en tránsito" causan ruido.

**Severidad CRÍTICO.** Drift semántico de un estado fundamental del modelo. Pre-existente pero el amend del Cambio 6.5 (eliminar step 5 'Programada') reduce la sensibilidad del recalc — antes el step 5 al menos cubría el caso edge "todo rejected con assignment vivo" → 'Programada'. Hoy ese caso va a 'Pendiente'. Quiere decir que **el estado 'Programada' es código muerto en el sistema actual**.

**Recomendación.** Tres opciones:
1. Aceptar el drift como diseño: documentar que el estado 'Programada' está deprecated. Renombrar a 'Asignada' si se quiere conservar la semántica. Actualizar CLAUDE.md, eliminar branch en código que asuma 'Programada' aparece. Bajo esfuerzo, alto impacto en consistencia.
2. Restaurar 'Programada' en el recalc: agregar step previo a step 3 que distinga "qty_dispatched=0 en TODOS los TLAs activos" (no salió ningún trip) → 'Programada'. Requiere migración BD.
3. Fix puramente FE: `saveTrip` y `updateTrip` agregan UPDATE manual `status='Programada'` post-INSERT TLA, sobrescribiendo el 'En Transito' que puso el trigger. Riesgo: race entre trigger y UPDATE, potencial doble UPDATE.

Mi voto: opción 1, asumiendo que James/Chat acepten que 'Programada' fue overload semántico desde el inicio.

---

### F#18 — PendingDeliveriesAlert "Cancelar línea" setea qty_scheduled=0 manual sin sync con TLA

**Descripción.** [src/components/dashboard/PendingDeliveriesAlert.tsx:152-160](src/components/dashboard/PendingDeliveriesAlert.tsx#L152-L160). El handler de cancel línea (dashboard widget para "entregas pendientes en viajes cerrados") hace UPDATE directo a `sm_request_lines`:

```typescript
.update({
  status: 'Cancelada',
  qty_scheduled: 0,    // ← manual, bypassa trigger
  notes: nextNotes,
  ...
})
```

Este UPDATE bypassa el modelo trigger-driven post-Cambio 6.5. Setea `qty_scheduled=0` manual en la línea, pero el TLA del trip (que está `'Completado'`) sigue con `quantity_assigned > 0`. Trigger `trg_recalc_from_assignment_change` no dispara (no hay cambio en TLA). Trigger `recalc_qty_for_line` tampoco (UPDATE en sm_request_lines no invoca recalc). La línea queda con `status='Cancelada'`, `qty_scheduled=0`, `qty_delivered=N` preservado del TLA pero NO refrescado.

**Sin error checks.** Los 3 statements (INSERT trip_event Incidencia, SELECT notes, UPDATE línea) no chequean errores. Si el UPDATE final falla silenciosamente, el evento Incidencia ya quedó registrado pero la línea sigue `'En Transito'`. Usuario ve "cancelada" en UI por el optimistic re-fetch pero al refrescar ve el estado real.

**Impacto operacional.** El widget existe específicamente para resolver casos donde Retorno cerró el trip pero líneas siguen `'En Transito'` (escenario esperado del Cambio 6 / 6.5). El "Cancelar línea" debería ser un hatch operacional, pero la implementación actual deja inconsistencia entre la línea cancelada y el TLA del trip cerrado. Si después se quiere revertir el Retorno, los datos están en estado raro.

**Severidad CRÍTICO.** No hay verificación post-UPDATE, no hay rollback, no hay sync con el TLA del trip cerrado. Es uno de los pocos puntos del sistema que escribe directamente a sm_request_lines.qty_scheduled bypassando triggers. Antinatural y peligroso.

**Recomendación.** Refactorizar a usar el patrón normal del sistema:
1. NO actualizar manual `qty_scheduled=0`. El trigger recalc lo recalcula desde TLAs activos.
2. UPDATE solo `status='Cancelada'` + notes. El branch defensivo del recalc preservará 'Cancelada'.
3. Si se quiere "limpiar" el TLA del trip cerrado para que aparezca en lookups: UPDATE TLA `quantity_assigned=qty_delivered` (zero out la cantidad pendiente). El recalc se dispara y reconcilia.
4. Agregar error checks a los 3 statements + manejo de error consistente.

---

## ALTOs (6)

### F#2 — `removeLineFromPickupOrder` y `removeLineFromExternalOrder` sin guard `qty_delivered>0`

**Descripción.** [src/hooks/usePickupOrders.ts:370-417](src/hooks/usePickupOrders.ts#L370-L417) y paralelo en [src/hooks/useExternalOrders.ts:349-393](src/hooks/useExternalOrders.ts#L349-L393). El DELETE no chequea si la línea tiene `qty_delivered>0`. Si la UI permite remover una línea ya parcialmente entregada (caso edge), el DELETE elimina la línea sin warning, recalc dispara, y `sm_request_lines.qty_delivered` baja.

**Evidencia empírica.** `audit-scripts/02-remove-line-with-delivered.ts`:

```
=== SNAPSHOT: post-UPDATE qty_delivered=5 ===
    line[1] status=En Transito qty=10 sched=5 deliv=5
    POL req_line=0f6cd926 assigned=10 deliv=5

--- DELETE POL (replicar removeLineFromPickupOrder hook) ---
  DELETE OK

=== SNAPSHOT: post-DELETE POL ===
    line[1] status=Pendiente qty=10 sched=0 deliv=0   ← qty_delivered=5 desapareció
    pickup_orders.status = Cancelado    ← auto_cancel_empty trigger se disparó
```

5 unidades entregadas se perdieron del récord en sm_request_lines. La línea pasó de `'En Transito qty_delivered=5'` a `'Pendiente qty_delivered=0'`.

**Severidad ALTO.** UI actualmente puede no exponer este caso (`completePickupOrder` setea `qty_delivered=quantity_assigned` y después no permite editar líneas), pero NO hay guard server-side. Cualquier path que termine ejecutando el hook con la línea ya entregada borra el récord.

**Recomendación.** Agregar guard pre-DELETE en el hook:

```typescript
const { data: line } = await supabase.from('pickup_order_lines')
  .select('qty_delivered').eq('id', pickupOrderLineId).single()
if (Number(line?.qty_delivered ?? 0) > 0) {
  return { ok: false, error: 'No se puede remover línea con entregas registradas. Cancela el pickup completo si necesitas revertir.' }
}
```

Equivalente para external. Considerar también CHECK constraint BD: `BEFORE DELETE` trigger que rechaza si `qty_delivered>0`.

---

### F#3 — `cancelPickupOrder` y `cancelExternalOrder` silent failure cuando status != 'Aprobado'

**Descripción.** [src/hooks/usePickupOrders.ts:329-346](src/hooks/usePickupOrders.ts#L329-L346) y paralelo en useExternalOrders. El UPDATE tiene `.eq('status', 'Aprobado')` defensive WHERE pero **no chequea `result.length`** post-UPDATE. Si el order ya está `'Entregado'` o `'Cancelado'`, el UPDATE no toca filas y retorna sin error. El hook devuelve `{ ok: true, deliveredCount, deliveredQty }` falsamente.

**Evidencia empírica.** `audit-scripts/03-cancel-order-silent-failure.ts`:

```
--- Replicar cancelPickupOrder con status=Entregado ---
  UPDATE result: data=[], error=none
  data.length = 0

=== SNAPSHOT: post-cancelPickupOrder (debería seguir Entregado) ===
  pickup_orders.status = Entregado PKP-2026-001  ← NO cambió
```

Severidad ALTO porque la UI muestra "cancelado" mientras la BD sigue "Entregado". Usuario refresca, ve order Entregado en lista, no entiende.

**Recomendación.** Chequear `result.length === 0` post-UPDATE y devolver error específico:

```typescript
const { data, error } = await supabase.from('pickup_orders').update(...).eq('status', 'Aprobado').select('id')
if (error) return { ok: false, error: error.message }
if (!data || data.length === 0) {
  return { ok: false, error: 'No se pudo cancelar — el order ya está en otro estado. Refrescá la página.' }
}
```

Mismo patrón en `useExternalOrders.cancelExternalOrder`.

---

### F#7 — `useTrips.updateTrip` loop UPDATE sin chequeo de error

**Descripción.** [src/hooks/useTrips.ts:946-953](src/hooks/useTrips.ts#L946-L953):

```typescript
if (modifiedAssignments && modifiedAssignments.length > 0) {
  for (const mod of modifiedAssignments) {
    await supabase
      .from('trip_line_assignments')
      .update({ quantity_assigned: mod.quantity_assigned })
      .eq('id', mod.id)
  }
}
```

NO chequea error en cada iteración. Si UPDATE falla mid-loop (CHECK violation, RLS, network), continúa al siguiente sin alertar. La función retorna `true` al final si todo se ejecuta sin throw.

**Severidad ALTO.** Charris edita un trip con 5 líneas, modifica cantidades. Una falla por CHECK qty_invariant porque alguna línea ya tiene entrega parcial que excede la nueva cantidad. La modificación silenciosamente NO se aplica a esa línea, las otras 4 sí. Usuario ve "guardado" pero la línea afectada sigue con la cantidad anterior. Drift entre lo que ve y lo que está en BD.

**Recomendación.** Recopilar errores en el loop y abortar si alguno falla:

```typescript
for (const mod of modifiedAssignments) {
  const { error } = await supabase.from('trip_line_assignments')
    .update({ quantity_assigned: mod.quantity_assigned }).eq('id', mod.id)
  if (error) {
    setSaveError(`Error al modificar línea: ${error.message}`)
    return false
  }
}
```

---

### F#9 — `cancelTrip` permite re-cancelar trip ya 'Completado'

**Descripción.** [src/hooks/useTrips.ts:1001-1007](src/hooks/useTrips.ts#L1001-L1007). UPDATE sin guard de status original:

```typescript
.update({
  status: 'Cancelado',
  cancellation_reason: cancellationReason?.trim() || null,
})
.eq('id', id)
```

No incluye `.eq('status', 'En Ruta')` o similar. Trip en `'Completado'` puede pasar a `'Cancelado'` perdiendo la distinción operacional.

**Evidencia empírica.** `audit-scripts/04-cancel-completed-trip.ts`:

```
=== SNAPSHOT: post-Retorno (trip Completado) ===
  trips.status = Completado
    line[1] status=Entregada qty=5 sched=0 deliv=5

--- Replicar cancelTrip (UPDATE sin guard) ---
  UPDATE OK — trip cambió status

=== SNAPSHOT: post-cancelTrip ===
  trips.status = Cancelado reason="Test cancel post-Completado"   ← historial corrompido
    line[1] status=Entregada qty=5 sched=0 deliv=5   ← línea sigue Entregada (branch defensivo)
```

Trip pasa Completado → Cancelado. Línea preserva 'Entregada' por branch defensivo del recalc. Resultado: trip 'Cancelado' con líneas 'Entregadas'. Inconsistente.

**Severidad ALTO.** Reportes downstream que diferencian "trips cancelados pre-Salida" vs "trips cancelados post-cierre" no pueden hacerlo. Métricas de cancelación contaminadas. UI puede mostrar trip como cancelado en filter `status='Cancelado'` aunque el material se entregó.

**Recomendación.** Agregar guard:

```typescript
.update(...)
.eq('id', id)
.in('status', ['Programado', 'En Ruta'])
.select('id')
```

Y chequear `result.length === 0` para devolver mensaje user-friendly: "No se puede cancelar un trip ya cerrado (Completado/Cancelado). Si necesitás revertir, usa la sección de eventos del trip."

Migración BD opcional como defense-in-depth: trigger BEFORE UPDATE en trips que rechaza la transición Completado/Cancelado → Cancelado.

---

### F#12 — `cancelSolicitud` cascade no atómico ni con error handling

**Descripción.** [src/hooks/useSolicitudes.ts:816-967](src/hooks/useSolicitudes.ts#L816-L967). 6 pasos secuenciales sin transacción:

1. SELECT lines
2. UPDATE pickup_orders (loop)
3. UPDATE/DELETE pickup_order_lines (selectivo)
4. UPDATE external_orders (loop) — paralelo
5. DELETE trip_line_assignments (loop sobre líneas Programadas)
6. UPDATE sm_request_lines status='Cancelada'
7. UPDATE sm_requests status='Cancelada'

Pasos 2-5 NO chequean errores. Si cualquiera falla mid-loop:
- Pasos previos ya aplicados (data parcialmente cancelada)
- Pasos siguientes igual se ejecutan
- Error final del paso 6 o 7 puede o no atrapar

**Severidad ALTO.** Cancel cascade es operación crítica que toca múltiples tablas. Falla parcial = data inconsistente que el sistema no detecta. Charris cancela solicitud, hook devuelve `success`, pero algunos pickups/externals no se cancelaron por algún error transitorio.

**Recomendación.** Convertir a RPC SQL con transacción (alineado con BL-RPC-CONVERSION del BACKLOG). Mientras tanto:
1. Agregar error checks a CADA UPDATE/DELETE en los loops.
2. Si cualquiera falla, abortar y devolver error específico.
3. Retry-friendly: idempotencia de cada UPDATE (UPDATE pickup_order SET status='Cancelado' WHERE status='Aprobado' es idempotente).

---

### F#19 — `PendingDeliveriesAlert.handleCancel` no chequea errores

**Descripción.** [src/components/dashboard/PendingDeliveriesAlert.tsx:126-166](src/components/dashboard/PendingDeliveriesAlert.tsx#L126-L166). 3 operaciones secuenciales sin error checks:

1. INSERT trip_event Incidencia
2. SELECT notes existentes
3. UPDATE sm_request_lines

Si paso 3 falla (CHECK violation porque qty_scheduled=0 viola algún invariante, o trigger recalc rechaza por algo), el evento Incidencia queda registrado pero la línea no se cancela. Usuario ve éxito por el `fetchPending()` re-fetch que también puede fallar silentemente.

**Severidad ALTO.** Combinado con F#18 (manual qty_scheduled=0), el flow tiene varios puntos de falla silenciosos. Usuario cree que canceló pero no.

**Recomendación.** Error checks explícitos + rollback del INSERT Incidencia si el UPDATE falla:

```typescript
const { error: eventErr } = await supabase.from('trip_events').insert(...)
if (eventErr) { setError(...); return }

const { error: updateErr } = await supabase.from('sm_request_lines').update(...).eq('id', ...)
if (updateErr) {
  // Best-effort cleanup
  await supabase.from('trip_events').delete().eq('id', insertedEventId)
  setError(...); return
}
```

---

## MEDIOs (5)

### F#1 — `completePickupOrder`/`completeExternalOrder` loop UPDATE inconsistencia parcial

**Descripción.** [usePickupOrders.ts:246-255](src/hooks/usePickupOrders.ts#L246-L255). Loop secuencial UPDATE qty_delivered en cada line, después UPDATE order status='Entregado'. Si UN update falla mid-loop, líneas anteriores ya tienen qty_delivered=quantity_assigned, líneas siguientes sin tocar, order sigue 'Aprobado'. Función aborta con error.

**Severidad MEDIO.** Probabilidad baja (no hay constraint que falle el UPDATE en operación normal), pero si pasa, queda en estado raro hasta intervención manual.

**Recomendación.** Mismo patrón de F#7: error check + rollback de líneas previas. O convertir a RPC server-side con transacción.

---

### F#6 — Operaciones multi-statement no atómicas (createPickup/External, completePickup/External, etc.)

**Descripción.** Patrón general en hooks: SELECT → UPDATE/INSERT → más UPDATEs/INSERTs sin transacción. Documentado en BL-RPC-CONVERSION del BACKLOG.

**Severidad MEDIO.** Riesgo bajo single-user (Charris solo). Crece con concurrencia futura.

**Recomendación.** Sigue como BL-RPC-CONVERSION. Sprint futuro.

---

### F#8 — `useTrips.updateTrip` orden de operaciones puede dejar estado parcial

**Descripción.** Si UPDATE trip + DELETE assignments + UPDATE assignments + INSERT new assignments tienen falla en paso 4 (INSERT), pasos 1-3 ya aplicados quedan persistidos. Retry parcial posible.

**Severidad MEDIO.** Usuario debe retry manualmente, posibilidad de inconsistencia entre lo visto y lo guardado.

**Recomendación.** Mismo patrón general F#7/F#1. Orden alternativo más seguro: hacer todo en una sola transacción server-side.

---

### F#16 — `handleDispatch` UPDATE manual `status='En Transito'` es no-op (relacionado a F#28)

**Descripción.** El UPDATE manual de status post-INSERT trip_event de Salida ([src/app/(app)/mis-viajes/[id]/page.tsx:618-625](src/app/(app)/mis-viajes/[id]/page.tsx#L618-L625)) es no-op porque el trigger recalc YA puso 'En Transito' al INSERT del TLA (F#28). El comentario inline está desactualizado.

**Severidad MEDIO.** Código muerto + comentario engañoso. Bug de F#28 hace que el modelo conceptual sea inconsistente.

**Recomendación.** Atender F#28 primero. Después limpiar este UPDATE no-op + actualizar comentario.

---

### F#20 — `PendingDeliveriesAlert` UPDATE silent failure de notes

**Descripción.** El UPDATE final no chequea error. Si falla, la línea queda inconsistente. Combinado con F#18 y F#19, hace que el flow de cancel línea desde dashboard sea frágil.

**Severidad MEDIO.** Cubierto operacionalmente por F#18.

**Recomendación.** Resolver junto con F#18.

---

## BAJOs (7)

### F#5 — `existing.attachments` cast pierde data en JSONB corrupted

[usePickupOrders.ts:225](src/hooks/usePickupOrders.ts#L225). `Array.isArray(existing.attachments) ? ... : []` pierde data si attachments es objeto. Bajo riesgo (requiere bug previo).

### F#11 — `saveTrip` cleanup huérfano sin error check

[useTrips.ts:830-833](src/hooks/useTrips.ts#L830-L833). Si DELETE de trip post-failed-INSERT-assignments falla, queda trip huérfano sin assignments. Probabilidad muy baja.

### F#15 — `handleDispatch` loop UPDATE qty_dispatched sin error check

[mis-viajes/[id]/page.tsx:632-638](src/app/(app)/mis-viajes/[id]/page.tsx#L632-L638). Patrón similar a F#7 pero para qty_dispatched. Improbable falla pero merece error check.

### F#17 — Pickup/External delivery todo-o-nada sin per-line status

ConfirmPickupOrderDeliveryModal y ConfirmExternalOrderDeliveryModal NO soportan rejected/with_observations per-line. Limitación de diseño Q4 Cambio 5. Asimétrico vs DeliveryModal de fleet (post-Cambio 6.5 con per-line status). Si Charris recibe pickup parcial dañado, no hay forma de marcarlo. Operacionalmente: cancel order completo + notas explican.

### F#22 — TripLiveMap referencia status='pickup' (código muerto)

[TripLiveMap.tsx:187](src/components/gps/TripLiveMap.tsx#L187). Check `=== 'pickup'` que el endpoint nunca devuelve. Legacy del modelo pre-Cambio 3. CL-1 cleanup (T8) no lo incluyó.

### F#23 — TripLiveMap polling continúa post-trip-Completado

`shouldPoll = isVisible && !isStaleStatus`. NO incluye check para `not_in_route`. Si trip cierra mientras componente montado, polling sigue cada 30s al endpoint que correctamente retorna `'not_in_route'`. Desperdicio de network. Eventualmente desmount cuando user navega.

### F#24 — skydata-client cache module-level se pierde en cold start

Fluid Compute reuses instances → cache aprovecha. Cold starts pierden cache. N functions cold-starting simultáneamente generan N requests a SkyData. Riesgo bajo dado tráfico actual.

---

## INFORMATIVOs (4)

### F#4 — Race condition validación pre-INSERT en createPickupOrder/createExternalOrder

Validación client-side `available = quantity - qty_scheduled - qty_delivered` puede ser stale en concurrencia. Atrapado por trigger BD `qty_invariant` (verificado en escenario BL-EXCLUSIVITY: BD rechaza con error específico `qty_scheduled (12.00) exceeds quantity (10.00)`). Mensaje friendly via `translateBdError`. **No es bug** — es defense-in-depth correcto.

### F#10 — `refetchBacklog` filter de status

Includes `'Pendiente', 'Parcial', 'Programada', 'En Transito'` y excluye `'Cancelada', 'Completada', 'Borrador'` en request. Filter `available > 0` post-fetch oculta líneas full-asignadas. **OK funcionalmente** dada F#28 (estado 'Programada' efectivamente dead, todas las asignadas son 'En Transito').

### F#25 — `skydata-client` `inflight` race entre llamadas concurrentes

Variable module-level. Si dos requests llegan simultáneamente, ambas chequean `inflight` ANTES de que la primera lo setee. JS event loop single-threaded → no ocurre en realidad. **OK, patrón correcto.**

### F#26 — `format.ts statusContextString` solo cubre 'Entregada' y 'Parcial'

Otros status (Pendiente, Programada, En Transito, Cancelada) → fallthrough al default → return status. Por diseño post-T8 (CL-1 cleanup eliminó casos 'Pickup Aprobado'/'Externo Aprobado'). **OK intencional.**

---

## Hallazgos negativos (NO bugs, verificados como OK)

### BL-EXCLUSIVITY del BACKLOG NO es bug crítico hoy

Documentado en BACKLOG como bug latente: línea sin constraint de exclusividad entre 3 modalidades. Verificado empíricamente en `audit-scripts/05-multi-fulfillment.ts`:

- TLA + POL juntos en misma línea: BD acepta ✓ (suma qty_scheduled correctamente, status='En Transito' modulo F#28).
- TLA + POL + EOL los tres: BD rechaza con `qty_scheduled (12.00) exceeds quantity (10.00) for line ...` cuando la suma excede quantity.

**El recalc/CHECK existente sí detecta y rechaza el caso "exceso".** El BACKLOG entry asumía que el recalc cuenta 3 veces sin rechazo — verificación empírica muestra que sí hay protección. **BL-EXCLUSIVITY se puede degradar de bug crítico latente a polish opcional.**

Caso edge no cubierto: línea con 2 modalidades (TLA + POL) cuya suma NO excede quantity. BD acepta. Operacionalmente raro pero posible. Si Charris asigna línea qty=10 a TLA qty=4 + POL qty=4, el recalc deja la línea como 'En Transito' con qty_scheduled=8. Cuando ambos lleguen, qty_delivered final=8 < quantity=10 → 'Parcial'. Funcionalmente OK pero puede confundir reportes.

### Triggers BD sí cubren el grueso de invariantes (verificado por advisors + scenarios)

- `qty_invariant` (CHECK / trigger): rechaza qty_scheduled+qty_delivered > quantity ✓
- `qty_delivered_plus_rejected_le_dispatched` (CHECK Cambio 6.5 BD-2): rechaza qty_delivered+qty_rejected > qty_dispatched ✓
- `enforce_one_active_delivery_trg` (Cambio 6 Bug #4): bloquea segundo Entrega activo en mismo trip ✓
- `enforce_revert_only_on_active_trip_trg` (Cambio 6.5 BD-8): bloquea revert Entrega en trip cerrado ✓
- `enforce_notes_on_with_observations_trg` (Cambio 6.5 BD-10): rechaza Entrega con with_observations sin notas ✓
- `auto_cancel_empty_pickup_order` y `auto_cancel_empty_external_order`: cancelan order si todas las líneas se DELETEan ✓ (verificado en F#2 — orden quedó 'Cancelado' al DELETE única línea)
- `enforce_quantity_immutable_with_active_assignments` (Cambio 6.5 BD-7): rechaza reducción de quantity con qty asignado/entregado/dispatched activo ✓ (verificado en suite Cambio 6.5 tests #6-8)
- `recalc_qty_for_line` con branch defensivo `'Cancelada'`: preserva status terminal ✓ (verificado en F#13 escenario)

**La capa BD del proyecto es robusta.** Los hallazgos críticos están todos en código FE que bypassa, ignora resultado, o asume comportamiento del trigger que no ocurre. Esto sugiere que el sistema necesita más documentación viva del modelo BD para que el FE no haga asunciones incorrectas (skill `fe-bd-integration-tests` que escribí en T5 va en esa dirección).

---

## Cobertura de tests existentes

Suite Cambio 6.5: 14/14 verde, cubre rejected → backlog, observations notes required, revert en trip cerrado, doble revert bloqueado.

Suite Cambio 6: 24 fallos por bugs pre-existentes (BL-E2E-AUTH-BLOCKED + AD-5 helpers rotos). Sin regresión por Cambio 6.5. Documentado en T9.

**Tests NO cubren:**
- F#13 escenario (cancel solicitud con trip activo).
- F#28 (línea 'En Transito' inmediato post-INSERT TLA — los tests fuerzan manualmente 'Programada').
- F#18+19 (cancel línea desde dashboard widget).
- Cancel cascade en multi-fulfillment (cancelar solicitud con TLA + POL + EOL simultáneos).
- F#9 (re-cancel trip Completado).

Los 14 tests E2E del Cambio 6.5 fueron diseñados específicamente para la mecánica de Entrega/Reversion del refinement. La cobertura es buena para ese scope. **Para los hallazgos críticos del audit, recomiendo agregar 3-5 tests E2E adicionales** post-fix en la próxima sesión.

---

## Cleanup de artefactos del audit

`audit-scripts/` contiene 5 scripts standalone Node usados para Phase 2. Quedan en el repo como artefacto del audit (reproducibilidad). Si James/Chat prefieren eliminarlos post-merge, son scripts puros sin dependencias del runtime de la app — borrarlos es seguro.

`Docs/audit-A-pre-merge.md` (este archivo) es el output canónico del audit.

BD staging post-audit: limpia (cleanup ejecutado por cada script). Verificable con queries simples a `sm_requests`, `trips`, `pickup_orders`, `external_orders` — todas vacías.

Suite tests existente: NO modificada. Sigue verde donde estaba (Cambio 6.5 14/14).

T-final del Cambio 6.5: NO ejecutado, sigue PARADA per restricciones del audit.

---

## Notas operativas finales

**Proceso del audit.** Mi contexto histórico me orientó eficientemente — sabía dónde mirar más profundo (Cambio 3 pickup refactor, Cambio 5 bulk orders, Cambio 6.5 amend BD recalc). Pero el contexto también me costó: en F#28 verifiqué empíricamente algo que mi memoria del Cambio 6.5 daba por sentado ("línea 'Programada' al asignar"), descubriendo que el modelo conceptual no se cumple. Lección operativa para audits futuros: el contexto histórico debe ser punto de partida, no garantía.

**Lo que NO audité por tiempo limitado:**
- `useTripEvents.ts` registerEvent path generic
- `notifications/actions.ts` paths individuales (send.ts, templates)
- `proxy.ts` auth flow (out of scope per James)
- Componentes admin/masters
- TripCard/EventTimeline lectura-only (riesgo bajo)
- Sentry redact / global-error
- E2E flow real con Playwright (out of scope, audit dinámico fue suficiente con scripts standalone)

**Recomendación final para James/Chat:**

1. **Pre-merge obligatorio**: atender F#13, F#28, F#18 (CRÍTICOs). Los 3 son drift entre intent y comportamiento que se manifiestan en uso normal.
2. **Pre-merge altamente recomendado**: F#2, F#3, F#7, F#9 (ALTOs). Silent failures que erosionan confiabilidad acumulativamente.
3. **Post-merge backlog**: F#12, F#19, MEDIOs, BAJOs. Pueden manejarse en sprints futuros sin bloquear merge si los CRÍTICOs están atendidos.
4. **Decisión arquitectural pendiente para F#28**: aceptar 'Programada' deprecated vs restaurar en recalc. Mi voto: aceptar deprecated y limpiar referencias, pero James/Chat deciden.

T-final del Cambio 6.5 puede arrancar después de que James/Chat revisen este reporte y se decida si los CRÍTICOs se fixean antes del shipping del Cambio 6.5 o se documentan como deuda inmediata post-merge. Mi recomendación: fixear F#13 (defense-in-depth con migration BD trigger) ANTES de T-final, para que el sistema completo del Cambio 6.5 + audit-A queden coherentes en el shipping.

---

**Reporte generado por** Code en autonomía nocturna, 2026-05-01.
**Phase 0**: ~30 min. **Phase 1**: ~2.5 h. **Phase 2**: ~1.5 h. **Phase 3**: ~45 min. **Total**: ~5 h.
