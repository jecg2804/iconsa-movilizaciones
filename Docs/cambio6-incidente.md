# Cambio 6 — Incidente: bugs descubiertos por smoke manual

**Fecha:** 2026-04-29
**Branch:** `jaime/dev` (HEAD `7722453`)
**Status:** T-final docs unificado **DIFERIDO** hasta post-Cambio 6.5.

## Contexto

Cambio 6 (Cancel preservation + integridad de cálculos) terminó implementación con commits T1-T10 + smoke fix de helpers (commit `7722453`). Suite E2E `tests/cambio6-integrity.spec.ts` pasa **18/18 contra staging** post-wipe. Build verde end-to-end.

Sin embargo, el **smoke test manual** ejecutado por James en `localhost:3000` reveló 4 bugs/regresiones que **NO** son detectados por la suite E2E actual. Son issues de diseño del modelo de eventos (Events V2) que la suite no cubre porque verifica invariantes de cancelación/CHECK constraints, no el flow operativo Salida → Entrega → Retorno.

Los fixes BD del Cambio 6 que **SÍ funcionan correctamente** (verificados por smoke + suite):

- ✅ Cancel trip preserva `trip_line_assignments` (Bug #1 original)
- ✅ Trigger `enforce_one_active_delivery_trg` bloquea multi-entrega misma línea-trip (Bug #4 original)
- ✅ `cancellation_reason` condicional cuando hay `qty_delivered>0` (Bug #5 original)
- ✅ Tarifa obligatoria (`trips.rate_id NOT NULL`)
- ✅ CHECK constraints H7+H8 (`qty_dispatched ≤ quantity_assigned`, `qty_delivered ≤ qty_dispatched`)

## 4 bugs descubiertos por smoke manual

### Bug A — Trigger `recalc_qty_for_line` orden de evaluación incorrecto

**Síntoma:** Tras evento Entrega con `qty>0`, la línea queda zombie en `'En Transito'` hasta que se registra Retorno. NO transiciona a `'Parcial'` ni `'Entregada'` automáticamente.

**Causa raíz:** El branch `'En Transito'` que yo modifiqué en T1 (Bug #2 fix) bloquea la transición a `'Parcial'`/`'Entregada'`. La lógica del branch:

```sql
ELSIF v_current_status = 'En Transito' AND v_trip_qty_scheduled_active > 0 THEN
  v_new_status := 'En Transito'  -- preservar
```

El problema es que `v_trip_qty_scheduled_active` sigue siendo `>0` post-Entrega (el assignment activo no se resetea), entonces el branch preserva `'En Transito'` cuando debería caer al status según `qty_delivered`. El orden de evaluación de los branches del trigger no detecta correctamente que la línea ya tiene entregas registradas.

**Implicación:** la suite E2E `cancel_trip_with_partial_delivery_preserves_qty` y `cancel_trip_with_full_delivery_preserves_qty` SÍ pasan porque después del cancel, `trip.status='Cancelado'` saca al trip del filtro `NOT IN ('Cancelado','Completado')` y `v_trip_qty_scheduled_active=0`, lo que sí dispara el fall-through. Pero en el flow operativo normal (sin cancel), el branch no cae correctamente.

**Verificación pendiente:** revisar orden de branches en `recalc_qty_for_line()`. Probable fix: el chequeo `'En Transito'` debe condicionar también a que `qty_delivered = 0` (línea sin entregas registradas).

### Bug B — `line_status` (ok/rejected/with_observations) sin semántica BD

**Síntoma:** El campo `trip_event_lines.line_status` es metadata visual sin afectar cálculos. Una línea marcada como `'rejected'` en la entrega NO libera la cantidad rechazada de vuelta al backlog. Una línea con `'with_observations'` NO setea ningún flag operacional.

**Causa raíz:** El trigger `recalc_qty_for_line` solo mira `qty_delivered` agregado, no diferencia entre líneas accepted vs rejected en el evento. Si Charris registra una entrega con 10 líneas — 8 ok, 2 rejected — las 10 cuentan como "entregadas" en `qty_delivered`. Las 2 rejected no vuelven al backlog automático.

**Comportamiento esperado:**
- `line_status='rejected'`: la `quantity` de esa línea NO suma a `qty_delivered`. La línea queda con `qty_scheduled` reducido (la parte no rechazada se entregó), y la parte rechazada vuelve al backlog operativo.
- `line_status='with_observations'`: setea flag `has_observations` o similar para que un dashboard pueda flaggear líneas que necesitan resolución.

**Implicación:** las observaciones de entrega registradas en `delivery_observations` quedan como evidencia histórica pero NO disparan ningún flow operacional.

### Bug C — H1 (`enforce_quantity_immutable_with_active_assignments`) mal calibrado

**Síntoma:** El trigger H1 que yo agregué en T1 bloquea TODO cambio de `quantity` cuando hay cualquier assignment activo, incluso cambios que NO violan invariantes.

**Causa raíz:** La regla actual es muy estricta:

```sql
IF EXISTS (
  SELECT 1 FROM trip_line_assignments tla
  ...
  WHERE tla.quantity_assigned > 0
    AND t.status NOT IN ('Cancelado', 'Completado')
) THEN
  RAISE EXCEPTION 'No se puede editar la cantidad...'
```

Esto rechaza también casos donde `NEW.quantity > OLD.quantity` (aumento) que NO rompe ningún invariante físico. Patrón de Coupa/Ariba: bloquear edición SOLO si `NEW.quantity < qty_dispatched OR NEW.quantity < qty_delivered`.

**Comportamiento esperado:** permitir aumentos de quantity siempre. Bloquear solo decremento por debajo de la realidad física (lo que ya se despachó/entregó).

**Implicación:** PMs no pueden corregir/aumentar cantidades de líneas legítimamente programadas hasta que se cancelen las asignaciones, lo cual es fricción operacional sin beneficio de invariante.

### Bug D — Retorno carga responsabilidades de Entrega

**Síntoma:** Los cálculos de status de línea (`'Entregada'`/`'Parcial'`) solo se actualizan correctamente al momento del evento Retorno, no al momento de Entrega. Charris registra Entrega y la línea queda zombie hasta el Retorno.

**Causa raíz:** Acoplada con Bug A. La transición de estado se ejecuta cuando el trip pasa a `'Completado'` (lo cual ocurre por Retorno), no cuando se registra el evento Entrega. El trigger `recalc_qty_for_line` debería disparar correctamente al INSERT de `trip_event_lines` con `event_type='Entrega'`, pero el orden de branches del trigger lo bloquea (Bug A).

**Comportamiento esperado:** al registrar Entrega, la línea inmediatamente transiciona a `'Parcial'` o `'Entregada'` según `qty_delivered` vs `quantity`. El Retorno solo cierra el ciclo del trip (status='Completado'), no debería ser el responsable de los cálculos de líneas.

## Decisión: Cambio 6.5

James y Chat ya hicieron brainstorming completo de **Cambio 6.5** que refinará el modelo de eventos (Events V2). Diseño completo + prompt goal-oriented listo para sesión nueva.

**Cambio 6.5 va a abordar:**
- Bug A — refactor del orden de branches en `recalc_qty_for_line` para que la transición `'En Transito' → 'Parcial'/'Entregada'` ocurra al registrar Entrega.
- Bug B — semántica BD para `line_status` ('rejected' libera al backlog, 'with_observations' setea flag).
- Bug C — recalibrar H1 (`NEW.quantity < qty_dispatched OR NEW.quantity < qty_delivered`).
- Bug D — desacoplar cálculos de status de línea del evento Retorno.

## Plan T-final unificado

T-final docs unificado **NO se ejecuta ahora**. Se difiere hasta post-Cambio 6.5. Mergeamos **Cambio 5 + 6 + 6.5 juntos** a `main` cuando los 3 estén implementados, smoke OK, y verificados.

Hasta entonces:

- Branch `jaime/dev` queda como está (commits T1-T10 + smoke fix `7722453`).
- **NO push** a `main`.
- **NO leftover cleanup** del working tree (cambio4 tasks.json, cambio5 tasks.json, cambio6 tasks.json, supabase/.temp/cli-latest, repomix-MovimientOS.xml). Esos archivos pueden ser útiles como referencia para Cambio 6.5.
- Specs Cambio 5 + Cambio 6 quedan en `status: draft` hasta cierre conjunto post-6.5.
- Plans Cambio 5 + Cambio 6 quedan sin borrar.

## Lecciones aprendidas (para feedback memory)

1. **Tests E2E deben cubrir flow operativo, no solo invariantes de cancelación.** La suite Cambio 6 verifica que cancel preserva qty, que constraints rechazan violaciones, que tarifa es obligatoria. NO verifica que el flow Salida → Entrega → Retorno transiciona correctamente entre estados de línea. Eso es el gap que el smoke manual descubrió. Tests E2E para Cambio 6.5 deben verificar transiciones de status post-Entrega explícitamente.
2. **Trigger BD modifications son riesgosas — verificar todos los branches afectados.** Bug A es síntoma de que modifiqué un branch sin entender el efecto en otros branches/orden de evaluación. Próximas modificaciones de triggers BD: revisar el comportamiento end-to-end con todos los flows, no solo el caso target del fix.
3. **Smoke manual es irreemplazable.** Suite E2E pasa 18/18 pero James detectó 4 bugs en 5 minutos de uso real. La suite NO cubre todos los flows operativos. Política a fortalecer: smoke manual es parte del closure, no opcional.

## Referencias

- Plan Cambio 6: `Docs/superpowers/plans/2026-04-29-cambio6-cancel-integrity.md`
- Spec Cambio 6: `Docs/superpowers/specs/2026-04-29-cambio6-cancel-integrity.md`
- Suite E2E que pasa 18/18 (insuficiente): `tests/cambio6-integrity.spec.ts`
- Migración BD aplicada en staging: `cambio6_cancellation_integrity` versión `20260429204609`
- Commits Cambio 6: `929cbaa..7722453` (jaime/dev)
