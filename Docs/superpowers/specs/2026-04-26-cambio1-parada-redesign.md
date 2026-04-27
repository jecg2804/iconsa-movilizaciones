---
status: in-progress
feature: "Cambio 1 — Parada redesign (Events V2 merge)"
master_spec: Docs/reference/events-v2-redesign-in-progress-v3.md
master_section: "Sección 3 — Cambio 1: Parada rediseñada"
shipped_commits:
deprecated_reason:
---

# Cambio 1 — Parada redesign (brainstorming clarifications)

> **Este doc es complementario al master spec.** El diseño completo del modal,
> validaciones, lógica del dropdown, BD changes, y assumptions A1–A4 vive en
> `Docs/reference/events-v2-redesign-in-progress-v3.md` Sección 3 Cambio 1.
> Acá solo registro las clarificaciones que surgieron durante brainstorming
> con James (2026-04-26) y que NO están en el master.

## Por qué existe este doc

Brainstorming descubrió 4 cosas que el master spec no cubría con precisión.
James las resolvió en respuesta y autorizó arrancar writing-plans. Para no
re-editar el master (que ya está cerrado y referenciable por commits previos),
documento las correcciones acá. Cuando se shippee Cambio 1, este doc pasa a
`status: shipped` y queda como histórico del proceso.

## Clarificación 1 — Filtro `location_type` es lowercase

**Master decía:** filtrar `location_type !== 'Proyecto'` y `!== 'Taller'`.

**Realidad BD verificada por Chat (V3):** los valores son lowercase:
- `'proyecto'` (6 entries)
- `'taller'` (1 entry — Taller Chilibre)
- `'otro'` (1 entry — Oficina Central)

**Decisión final:** filtrar `location_type !== 'proyecto' && location_type !== 'taller'`.
Las entradas con `'otro'` PASAN al dropdown (no muchas, baja prioridad). Las
entradas con `location_type=null` (free-text en `from_text`/`to_text`) PASAN
al dropdown — son típicamente proveedores escritos a mano por el solicitante.

**Por qué importa:** filtrar por capitalized hubiera sido no-op silencioso —
todos los valores reales son lowercase.

## Clarificación 2 — `useTrips` query no trae `location_type`

**Master no lo mencionaba explícitamente.**

**Realidad código:** [src/hooks/useTrips.ts](src/hooks/useTrips.ts) líneas
225-241 y 309-326 traen `from_location: { id, name }` y `to_location: { id, name }`,
sin `location_type`. El filtro de la spec es imposible sin extender esto.

**Decisión final:** extender el SELECT y el mapper de `useTrips` (y `useMyTrips`
si comparte query) para incluir `location_type` en `from_location`/`to_location`.
Ajustar `TripAssignment['line']['from_location']` y `to_location` en el tipo.

**Por qué importa:** sin esto, el filtro nunca tiene la columna que necesita.
Trabajo necesario, no over-scope.

## Clarificación 3 — `oc_reference` no existe en BD

**Master decía:** "verificar si `oc_reference` existe; si existe, `DROP COLUMN`".

**Realidad BD verificada por Chat (V2):** `oc_reference` NO existe como columna
en `trip_events` ni en staging ni en prod. El campo del modal actual prefija
"OC: 29902 — " al campo `notes` antes del INSERT (ParadaModal.tsx líneas 96-99),
no se persiste en columna separada.

**Decisión final:** sin ALTER. Solo eliminar:
- input `ocReference` del modal
- prefijo `"OC: ..."` que [ParadaModal.tsx:97-99](src/components/viajes/ParadaModal.tsx#L97-L99)
  agrega a `fullNotes`
- campo `oc_reference?: string` del tipo `ParadaData`

**Por qué importa:** el master tenía un step BD condicional que resultó no
aplicar. El historial de notas con prefijo "OC: ..." queda intacto (data
informacional, no rompe nada).

## Clarificación 4 — `EventTimeline` no renderiza `oc_reference`

**Master pedía:** eliminar render de `oc_reference` en EventTimeline.

**Realidad código:** [EventTimeline.tsx:149-160](src/components/viajes/EventTimeline.tsx#L149-L160)
solo renderiza `location` y `stop_type` para Parada — `oc_reference` nunca
estuvo en el timeline. Solo aplica eliminar `stop_type`.

**Decisión final:** noop para `oc_reference`. Solo borrar las 2 referencias a
`stop_type` (línea 17 del interface + render líneas 154-157).

## Estado de BD post-clarificaciones

Chat ya aplicó en staging (2026-04-26) via MCP migration `drop_stop_type_from_trip_events`:

```sql
ALTER TABLE trip_events DROP COLUMN stop_type;
```

Resultado: `trip_events` queda con 14 columnas, sin `stop_type` ni `oc_reference`.
Aplicar a prod queda pendiente para el merge final v2 (junto con todos los
otros pendientes BD).

**Implicación inmediata para Code:** el SELECT en `loadEvents`
([mis-viajes/[id]/page.tsx:432](src/app/(app)/mis-viajes/[id]/page.tsx#L432))
que pide `stop_type` ahora falla contra staging. Eliminar es parte del trabajo
de implementación.

## Edge cases confirmados (referencia rápida)

Identificados durante brainstorming, todos confirmados por James:

- **E1** Trip sin assignments → dropdown solo muestra "Otra ubicación".
- **E2** Toggle dropdown → "Otra" → dropdown: limpiar el free-text input.
- **E3** "Otra" + free-text vacío → bloquear submit.
- **E4** `location_type=null` → pasa al dropdown.
- **E5** Misma línea afectada en 2 Paradas: permitido.
- **E6** Reversion de Parada: `handleRevert` genérico ya funciona, no hay
  cambios de mi parte. Test de regresión opcional, no obligatorio.
- **E7** Validación attachments cuenta archivos ya subidos (post-`onChange`
  del FileUploader).
- **E8** Grep regression para `stop_type` en otros tests/archivos antes de
  cerrar el plan.

## Out of scope confirmado para Cambio 1

- D8 (PM no botón Incidencia) — diferido a Cambio 2/3 o sesión separada.
- Notificaciones de Parada — Sección 4 master, post-merge.
- Pickup, cost code refactor — Cambios 2 y 3, sesiones separadas.
- D1 lógica de Retorno — ya correcta, no tocar.
- DispatchModal role-based — ya correcto, no tocar.

## Próximo step

Invocar `writing-plans` skill para producir plan ejecutable de Cambio 1 con
steps numerados, archivos exactos, verificación, orden de cambios.
