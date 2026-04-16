# Plan — Quick wins G1+G6+G7+G10 + Doc cleanup G17-G19

## Contexto

Sprint prod cherry-pick (v2026.04.15-1 y v2) cerrado y verificado.
La opción D (verificar G-items contra CHANGELOG) reveló que de los 20
G-items originales, **10 siguen abiertos**. De esos, 4 son quick wins
(1-2 commits cada uno) y 3 son doc cleanup (1 commit batch).

Este plan cubre solo los quick wins + doc cleanup. Los items medium
(G3, G4, G5, G11) y las design discussions (AD-1, J2, J9) quedan para
después.

**Todos estos cambios van SOLO a jaime/dev** (no cherry-pick a main).
Son polish del staging app, no hotfixes de prod.

## Quick wins (4 commits)

### G1 — Reversion guard: validar registered_by

**Bug:** `handleRevert` solo gatea por rol (`canRevert = role ===
'logistica' || role === 'admin'`). Un logistica puede revertir eventos
registrados por OTRO logistica. Debería requerir que vos registraste
el evento o que seas admin.

**Fix:**
- `src/app/(app)/mis-viajes/[id]/page.tsx` — en `handleRevert` (o en
  el guard que precede al modal de revert), agregar check:
  ```
  if (role !== 'admin' && revertEvent.registered_by?.id !== person?.id) {
    // bloquear — solo admin puede revertir eventos de otros
    setEventError('Solo podés revertir eventos que registraste vos.')
    return
  }
  ```
- El `canRevert` visual sigue como está (logistica/admin ven el botón).
  El check de `registered_by` opera DENTRO del handler, como defense-
  in-depth. Si sos admin, podés revertir cualquiera. Si sos logistica,
  solo los tuyos.
- Alternativa: mover el check al botón mismo (ocultar el botón si no
  sos el registrador y no sos admin). Más limpio UX.

**Archivos:** `src/app/(app)/mis-viajes/[id]/page.tsx`
**Riesgo:** bajo. Aditivo, no rompe nada existente.
**Verificación:** intentar revertir un evento registrado por otro user
→ debe rechazar (a menos que seas admin).

### G6 — Dashboard "En Tránsito" links clickeables

**Bug:** widget "En Tránsito Ahora" en dashboard muestra trips como
`<div>` texto estático. Debería ser clickeable para navegar al trip.

**Fix:**
- `src/app/(app)/dashboard/page.tsx` líneas ~268 — cambiar el `<div>`
  wrapper de cada trip a un `<Link href={/mis-viajes/${trip.id}}>` o
  `<div onClick={() => router.push(...)} className="cursor-pointer
  hover:bg-blue-100 ...">`.
- Mantener el layout actual, solo agregar interactividad.

**Archivos:** `src/app/(app)/dashboard/page.tsx`
**Riesgo:** muy bajo. CSS + link wrapper.
**Verificación:** click en un trip En Tránsito en dashboard → navega a
`/mis-viajes/{id}`.

### G7 — DeliveryModal requires_code badge per-line

**Bug:** DeliveryModal lista las líneas a entregar pero no indica
visualmente cuáles requieren código de confirmación. El usuario solo
descubre que se necesita código cuando aparece el input al final.

**Fix:**
- `src/components/viajes/DeliveryModal.tsx` — en el render de cada
  línea del modal (dentro del `.map()`), agregar badge condicional:
  ```tsx
  {line.requiresCode && (
    <span title="Requiere código de confirmación" className="...">
      🔑
    </span>
  )}
  ```
- Posicionar al lado del nombre de la línea o del status selector.

**Archivos:** `src/components/viajes/DeliveryModal.tsx`
**Riesgo:** muy bajo. Visual-only, no afecta lógica.
**Verificación:** abrir DeliveryModal con mezcla de líneas con/sin
`requires_code` → las que tienen muestran 🔑.

### G10 — Incidencia min length validation

**Bug:** campo `notes` en EventModal para Incidencia no tiene
validación de longitud mínima. Un usuario puede poner "." y confirmar.

**Fix:**
- En `src/app/(app)/mis-viajes/[id]/page.tsx` (EventModal component
  dentro del mismo archivo) — agregar guard antes del confirm:
  ```
  if (eventType === 'Incidencia' && notes.trim().length < 10) {
    setLocationError('La descripción de la incidencia debe tener al
    menos 10 caracteres.')
    return
  }
  ```
  O usar un state de error dedicado si existe.
- 10 caracteres como mínimo es razonable — una frase corta como
  "Llanta ponchada" tiene 16 chars.

**Archivos:** `src/app/(app)/mis-viajes/[id]/page.tsx`
**Riesgo:** bajo. Validación aditiva.
**Verificación:** intentar registrar Incidencia con nota de <10 chars
→ rechaza. Con ≥10 chars → pasa.

## Doc cleanup (1 commit batch)

### G17 + G18 + G19 — EVENTS_V2.md mismatches

**Archivo:** `Docs/reference/EVENTS_V2.md`

**G17:** buscar todas las ocurrencias de `stop_location` y reemplazar
por `location` (el nombre real de la columna en `trip_events`).

**G18:** buscar la sección que describe el orden de operaciones de
`handleDelivery` y ajustarla al orden real del código:
1. INSERT trip_events (checkpoint)
2. INSERT trip_event_lines
3. INSERT delivery_observations
4. UPDATE sm_request_lines (qty_delivered, status)
5. UPDATE trip_line_assignments (qty_delivered)

**G19:** buscar la sección que menciona el conteo de notificaciones y
actualizar al número real (contar funciones `notify*` en actions.ts).

**Riesgo:** cero. Doc-only.
**Verificación:** leer el doc y confirmar que matchea el código.

## Orden de ejecución

1. G1 reversion guard → commit
2. G6 dashboard links → commit
3. G7 DeliveryModal badge → commit
4. G10 incidencia min length → commit
5. G17+G18+G19 doc cleanup → commit batch
6. CHANGELOG entries por cada commit
7. BACKLOG.md update: marcar G1/G6/G7/G10/G17-G19 como resueltos

## Verificación global

- `npm run build` pasa después de cada commit (Husky post-commit)
- Cada fix es independiente — si uno rompe build, los otros no se
  afectan
- Total: ~5 commits, ~30-45 min de ejecución

## Qué NO hace este plan

- No toca G3, G4, G5, G11 (medium items — requieren más diseño)
- No toca design discussions (AD-1, J2, J9)
- No cherry-pick a main — todo es staging-track (jaime/dev)
- No toca J-items del staging-track (J1, J2, J5, J9)
