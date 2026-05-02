---
name: fe-bd-integration-tests
description: Antes de escribir tests E2E que verifiquen integración FE↔BD (con triggers, CHECK constraints, RLS), leer el componente FE y mapear el payload exacto que envía a BD para cada combinación de inputs. El spec describe la INTENCIÓN, el componente tiene la REALIDAD.
---

# FE↔BD Integration Tests Prerequisite

## El problema

Los tests E2E que verifican integración FE↔BD asumen comportamiento del componente FE. Si el componente envía un payload distinto al esperado por el spec, el test pasa "verde" por casualidad (CHECK violation silenciosa, no-op, etc.) o reporta el bug equivocado.

Caso histórico: Cambio 6.5 Bug B (descubierto durante T3 testing post-amend BD). DeliveryModal forzaba `qty=0` cuando `line_status='rejected'` (input disabled). El handler enviaba ese 0 al INSERT de `trip_event_lines`. El trigger BD-5 hacía `qty_rejected += 0 = 0` — la columna quedaba inerte. **Toda la mecánica del Cambio 6.5 para casos rejected NO funcionaba con el frontend actual.** El spec describía la intención correcta; el componente tenía un payload distinto. Los tests asumieron la intención y fallaron por el motivo equivocado.

## La regla

Antes de escribir un test E2E que assert sobre el resultado de:
- INSERT a una tabla con triggers BD que modifican otras columnas
- INSERT/UPDATE que dispara CHECK constraints
- Cualquier operación FE↔BD donde la BD tiene lógica activa (triggers, RLS dinámica, computed columns)

Code DEBE leer el componente FE relevante y mapear:

1. **¿Qué payload envía el componente para cada combinación de inputs del usuario?** Específicamente: ¿qué valor toma cada campo cuando el usuario selecciona X vs Y? ¿Hay valores forzados a 0/null por la UI antes del submit?

2. **¿El payload coincide con la INTENCIÓN del spec?** Spec dice "rejected libera al backlog" — ¿el payload del FE permite que el trigger BD haga el incremento de qty_rejected real?

3. **Si hay desalineación: documentar como bug bloqueante PRE-test**, no como bug descubierto post-test. Si el desalineación es decisión de diseño aceptable, ajustar el test al payload real.

## Quién aplica esto

- **Code (Three-Actor Model)**: durante el flujo `writing-plans` o `executing-plans`, antes de generar la lista de tests E2E para una feature/cambio.
- **Chat**: durante el flujo `brainstorming`, debe pedir explícitamente que se lea el componente FE relevante antes de cerrar el spec si el cambio toca lógica BD activa.

## Cómo aplicar

Pasos al planificar un cambio que toca FE↔BD:

1. Identificar componentes FE involucrados (modales, forms, hooks que mutan).
2. Para cada uno, leer el handler `onConfirm` / `onSubmit` / equivalente.
3. Mapear payload por combinación de inputs. Tabla simple en el plan:
   ```
   Input usuario          | Payload enviado a BD
   line_status='ok'       | quantity = l.qty (editable por el usuario)
   line_status='rejected' | quantity = 0 (input disabled, fuerza 0)
   ```
4. Cross-check con spec. Marcar discrepancias como bugs bloqueantes pre-test.
5. Solo entonces escribir tests.

## Excepciones

- Tests UNIT sobre componentes FE puros (sin BD): no aplica.
- Tests BD-direct (INSERT manual desde test, sin pasar por FE): no aplica — ahí el test escribe el payload directamente.
- Bugs FE puros (validación, render): leer el componente sigue siendo buena práctica pero no es bloqueante.

## Referencias

- Bug B Cambio 6.5 — descubierto durante T3 testing post-amend BD el 2026-04-30. Lección que originó esta regla. Ver `Docs/superpowers/specs/2026-04-30-cambio6-5-event-model-refinement.md` Decisión #12 + commits `c4164eb` (B1 fix DeliveryModal) y `500b72a` (T4 cleanup handleDelivery).
