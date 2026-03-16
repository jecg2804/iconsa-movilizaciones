# Skill: Seed Data Pattern

Patrón para insertar datos de prueba que respeten la lógica de triggers.

## Problema

Insertar datos con statuses finales (ej. 'Entregada') no dispara la cascada porque `cascade_request_status()` es AFTER UPDATE, no INSERT. Los triggers BEFORE INSERT (priority, request_id) sí disparan.

## Patrón correcto

### 1. Insertar con status inicial
```sql
-- Solicitud: siempre empieza en Borrador
INSERT INTO sm_requests (..., status) VALUES (..., 'Borrador');

-- Línea: siempre empieza en Pendiente
INSERT INTO sm_request_lines (..., status) VALUES (..., 'Pendiente');
```

### 2. Avanzar status via UPDATE (dispara triggers)
```sql
-- Enviar solicitud
UPDATE sm_requests SET status = 'Enviada' WHERE id = '{uuid}';

-- Programar línea (después de crear trip + assignment)
UPDATE sm_request_lines SET status = 'Programada' WHERE id = '{uuid}';

-- En tránsito (después de evento Salida)
UPDATE sm_request_lines SET status = 'En Transito' WHERE id = '{uuid}';

-- Entregar (cascade actualiza solicitud padre)
UPDATE sm_request_lines SET status = 'Entregada', qty_delivered = quantity WHERE id = '{uuid}';
```

### 3. O: INSERT directo + backfill manual
```sql
-- Si necesitas speed, INSERT con status final...
INSERT INTO sm_request_lines (..., status) VALUES (..., 'Entregada');

-- ...pero luego fuerza la cascada con un UPDATE dummy
UPDATE sm_request_lines SET updated_at = now() WHERE request_id = '{uuid}';
-- ⚠️ Esto NO funciona porque cascade solo mira status changes
-- Mejor: UPDATE status = 'Entregada' WHERE status = 'Entregada' (no-op que sí dispara)
```

## FK deletion order (para cleanup)

```sql
DELETE FROM trip_events WHERE trip_id IN (SELECT id FROM trips);
DELETE FROM trip_line_assignments WHERE trip_id IN (SELECT id FROM trips);
DELETE FROM trips;
DELETE FROM sm_request_lines;
DELETE FROM sm_requests;
DELETE FROM audit_log;

-- Reset sequences
UPDATE sequences SET next_number = 1;

-- Reset equipment locations
UPDATE equipment SET current_location = NULL, current_project_id = NULL;
```

## Gotcha: initial_priority

`trg_initial_priority` (BEFORE INSERT) ejecuta ANTES que `trg_priority` por orden alfabético de nombre → `initial_priority` captura NULL porque priority aún no se calculó.

Workaround después de INSERT:
```sql
UPDATE sm_requests SET initial_priority = priority WHERE initial_priority IS NULL;
```
