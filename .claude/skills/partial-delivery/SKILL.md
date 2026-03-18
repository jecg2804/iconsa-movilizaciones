# Skill: Partial Delivery Pattern

Patrón para entregas parciales de líneas de solicitud.

## Concepto

Una línea puede ser entregada en múltiples viajes. Cada entrega acumula `qty_delivered` hasta alcanzar `quantity`.

## Tablas involucradas

- `trip_line_assignments.qty_delivered` — Cantidad entregada en ESTE viaje específico
- `sm_request_lines.qty_delivered` — Total acumulado de TODAS las entregas
- `sm_request_lines.status` — Cambia según el total:
  - `qty_delivered >= quantity` → `'Entregada'`
  - `qty_delivered > 0 AND qty_delivered < quantity` → `'Parcial'`

## Flujo en frontend (Entrega event)

1. Usuario registra evento de Entrega en `/mis-viajes/[id]`
2. Para cada línea asignada al viaje, el frontend:
   a. Lee `quantity_assigned` de `trip_line_assignments`
   b. Permite ingresar cantidad entregada (default = quantity_assigned)
   c. Actualiza `trip_line_assignments.qty_delivered` para ESA asignación
   d. Recalcula `sm_request_lines.qty_delivered` = SUM de todos los `trip_line_assignments.qty_delivered` para esa línea
   e. Si qty_delivered >= quantity → status = 'Entregada' + delivered_at = now()
   f. Si qty_delivered > 0 && < quantity → status = 'Parcial'
   g. Si qty_delivered = 0 → status = 'En Transito'
3. Cascade trigger actualiza solicitud padre

## Backlog visibility

Líneas con status `'Parcial'` aparecen en el backlog con la cantidad pendiente:
- `available = quantity - qty_delivered`
- Mostrar: "{description} ({qty_delivered}/{quantity} entregado)"

## Gotchas

- `'En Transito'` sin acento — el status string debe coincidir exactamente
- El trigger cascade se dispara AFTER UPDATE, no INSERT
- `qty_delivered` acumula (+=), no sobrescribe (=)
