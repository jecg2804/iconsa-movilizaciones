# Event Compliance KPI — Design Document

**Estado:** Planificación
**Contexto:** Chat del 2026-04-22 con James
**Scope:** Dashboard de incumplimiento de registro de eventos de movilización, con drill-down y auditoría

---

## Propósito

Medir, categorizar y auditar los fallos en el registro de eventos de movilización (`Salida`, `Llegada`, `Entrega`, `Retorno`, `Incidencia`, `Preparacion`, `Retiro`).

El app está diseñado para registrar eventos en tiempo real — `event_timestamp = created_at = now()` al hacer clic. Esto elimina la posibilidad de falsificar la hora del evento, pero genera nuevos patrones de incumplimiento que no se detectan con lógica simple de "gap entre timestamps".

Este doc define **9 casos** de incumplimiento, sus señales de detección, y la estructura de dashboard para exponerlos.

---

## Insight clave sobre el data model

Dado que el app fuerza `event_timestamp = now()` al momento del clic, tenemos dos timestamps en `trip_events`:

- **`event_timestamp`** — hora asignada al evento (normalmente = momento del clic en el app)
- **`created_at`** — hora exacta de inserción en la BD (inmutable, auto-generada)

**En registros vía app:** `event_timestamp ≈ created_at` (diferencia de milisegundos).

**En backfills vía SQL por admin:** `event_timestamp` es la hora real del evento (pasado), `created_at` es el momento del backfill (presente). Gap visible.

**En registros batch desde el app:** el usuario registra Salida, Llegada y Retorno seguidos al final del día. `event_timestamp` de cada evento queda todo en los últimos minutos (todos mienten), pero `created_at` de los 3 está en los mismos minutos también. La señal está en el **spread temporal entre `created_at` de eventos del mismo viaje**, no en el gap individual.

Esta doble señal (`gap` individual + `spread` del trip) es la base de todos los casos detectables.

---

## Los 9 casos de incumplimiento

### Caso 1 — MISSING_EVENT

**Qué es:** Un evento esperado según el flujo nunca fue registrado. Ej: viaje Completado sin evento Entrega.

**Por qué importa:** Pérdida total de trazabilidad en ese punto del flujo.

**Detección:**
```sql
-- Trips sin alguno de los eventos esperados
WITH trip_events_summary AS (
  SELECT t.id, t.trip_id, t.status, t.is_self_pickup,
         array_agg(DISTINCT te.event_type) FILTER (WHERE te.event_type IS NOT NULL) as events
  FROM trips t
  LEFT JOIN trip_events te ON te.trip_id = t.id
  GROUP BY t.id, t.trip_id, t.status, t.is_self_pickup
)
SELECT trip_id, status, events,
  CASE
    WHEN NOT is_self_pickup AND status = 'Completado' AND NOT 'Salida' = ANY(events) THEN 'missing_salida'
    WHEN NOT is_self_pickup AND status = 'Completado' AND NOT 'Entrega' = ANY(events) THEN 'missing_entrega'
    WHEN NOT is_self_pickup AND status = 'Completado' AND NOT 'Retorno' = ANY(events) THEN 'missing_retorno'
  END as case
FROM trip_events_summary
WHERE status = 'Completado';
```

**Señal:** Comparar eventos esperados vs. eventos presentes según el flujo (fleet vs. pickup, según `is_self_pickup`).

---

### Caso 2 — BATCH_REGISTRATION

**Qué es:** Todos los eventos del viaje fueron registrados casi simultáneamente, típicamente al final del día. El usuario espera a que termine todo y registra en batch, en vez de en tiempo real.

**Por qué importa:** Rompe el valor del registro en tiempo real. El PM destino nunca recibe notificación de "material en camino" porque la Llegada se registra después del Retorno. Los KPIs operativos quedan sin base.

**Detección:**
```sql
-- Spread de created_at entre eventos del mismo viaje
WITH trip_spans AS (
  SELECT t.trip_id,
         count(*) as num_events,
         EXTRACT(EPOCH FROM (max(te.created_at) - min(te.created_at)))/60 as spread_minutes
  FROM trips t
  JOIN trip_events te ON te.trip_id = t.id
  WHERE te.backfilled_by_admin = false  -- excluir backfills para no contaminar
  GROUP BY t.trip_id
  HAVING count(*) >= 3
)
SELECT trip_id, num_events, spread_minutes,
  CASE
    WHEN spread_minutes < 5 THEN 'batch'
    WHEN spread_minutes < 30 THEN 'cuasi-batch'
    WHEN spread_minutes < 120 THEN 'parcial'
    ELSE 'distribuido'
  END as pattern
FROM trip_spans
WHERE spread_minutes < 30;  -- casos problemáticos
```

**Caveat:** Viajes genuinamente cortos (<30 min de duración total) se ven como batch falsamente. Mitigación: cruzar contra duración esperada del viaje usando la tarifa o GPS data (cuando esté integrado).

---

### Caso 3 — OUT_OF_SEQUENCE

**Qué es:** Orden lógico violado. Ej: `event_timestamp` de Entrega es anterior a Llegada, o Retorno antes de Entrega.

**Por qué importa:** Señal de que el usuario registró los eventos sin cuidado o en batch con timestamps calculados hacia atrás incorrectamente. Puede ocurrir cuando admin hace backfill sin orden.

**Detección:**
```sql
-- Eventos fuera de secuencia lógica dentro de un mismo trip
WITH ordered_events AS (
  SELECT t.trip_id, te.event_type, te.event_timestamp,
         LAG(te.event_timestamp) OVER (PARTITION BY t.id ORDER BY 
           CASE te.event_type
             WHEN 'Salida' THEN 1 WHEN 'Llegada' THEN 2
             WHEN 'Entrega' THEN 3 WHEN 'Retorno' THEN 4
             WHEN 'Preparacion' THEN 1 WHEN 'Retiro' THEN 2
             ELSE 99
           END
         ) as prev_timestamp
  FROM trips t
  JOIN trip_events te ON te.trip_id = t.id
  WHERE te.event_type NOT IN ('Incidencia', 'Reversion')
)
SELECT trip_id, event_type, event_timestamp, prev_timestamp
FROM ordered_events
WHERE prev_timestamp IS NOT NULL AND event_timestamp < prev_timestamp;
```

---

### Caso 4 — EVENT_TIMESTAMP_DRIFT_FROM_SCHEDULE

**Qué es:** El `event_timestamp` del Salida está muy lejos de la hora programada del viaje. Puede ser que el viaje ocurrió mucho antes/después de lo planificado, o que el usuario registró tarde (batch registration al día siguiente).

**Por qué importa:** Dos interpretaciones distintas, ambas accionables: replanificación crónica, o registro tardío. Requiere investigación.

**Detección:**
```sql
-- Salida cuya hora queda muy lejos de la hora programada del trip
SELECT t.trip_id, t.scheduled_date, te.event_timestamp,
       EXTRACT(EPOCH FROM (te.event_timestamp::timestamp - (t.scheduled_date::timestamp + INTERVAL '8 hours')))/3600 as hours_drift
FROM trips t
JOIN trip_events te ON te.trip_id = t.id AND te.event_type = 'Salida'
WHERE ABS(EXTRACT(EPOCH FROM (te.event_timestamp::timestamp - (t.scheduled_date::timestamp + INTERVAL '8 hours')))/3600) > 12;
```

**Caveat:** `scheduled_date` no incluye hora. Asume default 8 AM; refinar si existe campo de hora programada.

---

### Caso 5 — OFF_HOURS_REGISTRATION

**Qué es:** `created_at` fuera de horario laboral (ej: 11 PM - 6 AM). Típicamente catch-up desde casa o registro batch nocturno.

**Por qué importa:** Indica registro fuera del flujo natural de trabajo. No siempre es incumplimiento (viajes nocturnos son legítimos en construcción), pero es un signal útil.

**Detección:**
```sql
SELECT t.trip_id, te.event_type, te.created_at,
       EXTRACT(HOUR FROM te.created_at AT TIME ZONE 'America/Panama') as hour_local
FROM trips t
JOIN trip_events te ON te.trip_id = t.id
WHERE EXTRACT(HOUR FROM te.created_at AT TIME ZONE 'America/Panama') NOT BETWEEN 6 AND 22;
```

---

### Caso 6 — ADMIN_BACKFILL ⭐

**Qué es:** Admin tuvo que insertar o corregir eventos vía SQL porque el usuario responsable no lo registró (o lo registró mal) vía app.

**Por qué importa:** Es el caso más grave desde perspectiva operativa. Cada backfill es evidencia de un breakdown total del proceso en tiempo real.

**Señales disponibles:**

**Señal A:** `registered_by = UUID de admin conocido` (James: `f463253e-d10f-4860-a022-44df8a6d0af8`)
- Precisa desde 2026-04-22 en adelante
- No detecta backfills históricos donde admin insertó con el UUID del usuario "real"

**Señal B:** `created_at - event_timestamp > 1 hora`
- Captura backfills históricos también
- Falsos positivos si algún día el app permite editar hora manualmente

**Señal robusta (requiere schema change):**

```sql
ALTER TABLE trip_events 
  ADD COLUMN backfilled_by_admin boolean DEFAULT false,
  ADD COLUMN backfill_reason text;
```

Cuando admin inserta/corrige vía SQL, marca `backfilled_by_admin = true` con razón tipo:
- `user_never_registered` — usuario nunca registró el evento
- `incorrect_timestamp` — usuario registró pero con hora incorrecta
- `duplicate_cleanup` — evento duplicado borrado/corregido

App siempre inserta con default `false`. Ambiguidad cero.

**KPI derivado:**
```sql
-- % de eventos backfilled por admin
SELECT
  count(*) FILTER (WHERE backfilled_by_admin) * 100.0 / count(*) as pct_backfilled
FROM trip_events;

-- % de trips con al menos 1 evento backfilled
SELECT
  count(DISTINCT trip_id) FILTER (WHERE backfilled_by_admin) * 100.0 / 
  count(DISTINCT trip_id) as pct_trips_with_backfill
FROM trip_events;
```

**Drill-down útil:** lista de eventos backfilled + quién era el responsable esperado según el flujo (Salida → Charris, Entrega → PM, etc.) para identificar patrones.

---

### Caso 7 — RETORNO_WITHOUT_ENTREGA ⭐

**Qué es:** El viaje llega a Completado (tiene Retorno registrado) pero una o más líneas asignadas nunca pasaron por Entrega.

**Por qué importa:**
- Causa raíz histórica de data integrity issue DI-1 (líneas atrapadas en "En Transito" sin cerrarse)
- Indica conductor volvió al taller sin confirmación de entrega
- Rompe trazabilidad: no se sabe si el material llegó o no

**Contexto:** Bug 8 fix atiende la remediación automática (líneas vuelven a Pendiente/Parcial). Pero el KPI debe seguir detectando cuándo el breakdown del proceso ocurre, incluso si la data queda consistente después.

**Variantes:**

**7a — RETORNO_NO_ENTREGA:** no hubo Entrega en absoluto.
**7b — ENTREGA_REVERTIDA_NO_REREGISTRADA:** hubo Entrega pero fue revertida y nunca re-registrada antes del Retorno.
**7c — ENTREGA_PARCIAL_SIN_CIERRE:** hubo Entrega pero qty_delivered < quantity_assigned. Válido (entrega parcial) pero vale rastrearlo.

**Detección:**
```sql
-- 7a: Trips completados sin evento Entrega
WITH trip_summary AS (
  SELECT t.id, t.trip_id, t.status, t.is_self_pickup,
         bool_or(te.event_type = 'Entrega' AND (te.reverts_event_id IS NULL)) as has_entrega,
         bool_or(te.event_type = 'Retorno') as has_retorno
  FROM trips t
  LEFT JOIN trip_events te ON te.trip_id = t.id
  WHERE NOT t.is_self_pickup
  GROUP BY t.id
)
SELECT trip_id, status
FROM trip_summary
WHERE has_retorno AND NOT has_entrega;
```

**Dimensiones útiles para este caso:**
- Por conductor (¿ciertos conductores regresan más sin confirmación?)
- Por PM destino (¿ciertos PMs no registran entregas?)
- Por tipo de material (¿peor con equipos que materiales?)
- Por si fue resuelto después (línea volvió a Pendiente + reprogramada, o quedó huérfana)

---

### Caso 8 — REVERSION_CHURN

**Qué es:** Evento registrado, revertido, re-registrado varias veces en el mismo trip. Puede indicar error de usuario, confusión en flujo, o UX problemática.

**Por qué importa:** Muchas reversiones por trip = usuario no entiende el flujo, o hay bugs que provocan re-trabajo.

**Detección:**
```sql
-- Trips con más de 2 reversiones
SELECT t.trip_id, count(*) as num_reversions
FROM trips t
JOIN trip_events te ON te.trip_id = t.id
WHERE te.reverts_event_id IS NOT NULL
GROUP BY t.trip_id
HAVING count(*) > 2;
```

---

### Caso 9 — PM_SELF_CLOSE_SUSPECT

**Qué es:** PM registra Entrega justo antes de vencer el plazo de la solicitud, sospechosamente cerca del cierre. No es estrictamente incumplimiento, pero es señal de compliance cosmético.

**Por qué importa:** Pregunta abierta si se considera incumplimiento. Útil como signal para investigación, no necesariamente para penalizar.

**Detección:**
```sql
-- Entregas registradas en los últimos minutos antes de que la solicitud se vuelva "tarde"
SELECT t.trip_id, te.event_timestamp, r.date_required
FROM trip_events te
JOIN trips t ON t.id = te.trip_id
JOIN trip_line_assignments tla ON tla.trip_id = t.id
JOIN sm_request_lines rl ON rl.id = tla.request_line_id
JOIN sm_requests r ON r.id = rl.request_id
WHERE te.event_type = 'Entrega'
  AND te.created_at::date = r.date_required
  AND EXTRACT(HOUR FROM te.created_at AT TIME ZONE 'America/Panama') >= 20;
```

---

## Propuesta de schema changes

```sql
ALTER TABLE trip_events
  ADD COLUMN backfilled_by_admin boolean DEFAULT false,
  ADD COLUMN backfill_reason text;

CREATE INDEX idx_trip_events_backfilled 
  ON trip_events(backfilled_by_admin) 
  WHERE backfilled_by_admin = true;
```

**Reason codes sugeridos:**
- `user_never_registered` — usuario nunca registró
- `incorrect_timestamp` — hora incorrecta del registro original
- `duplicate_cleanup` — limpieza de duplicados
- `retorno_without_entrega_fix` — completar flujo de Caso 7
- `testing_correction` — correcciones de data de prueba

Claude Chat (admin) debe incluir estos campos en TODOS los INSERT/UPDATE vía SQL de aquí en adelante.

---

## Diseño del dashboard

### Vista agregada (Landing)

KPIs principales en cards:
- **% de eventos backfilled por admin** (Caso 6)
- **% de trips con registro batch** (Caso 2)
- **% de trips con evento missing** (Caso 1)
- **% de trips con Retorno sin Entrega** (Caso 7)

Todos con:
- Tendencia 30d vs 30d anterior
- Filtrable por proyecto, periodo, rol

### Vista desglosada

Tabla por tipo de caso, cada fila:
- Nombre del caso
- Conteo absoluto de incidencias
- % sobre universo total
- Tendencia
- Link a drill-down

### Drill-down por caso

Lista de incidencias específicas, con:
- Trip ID (link al detalle del viaje)
- Solicitud ID (link al detalle)
- Fecha
- Proyecto
- Persona esperada responsable (según flujo)
- Persona que terminó registrando (si hubo)
- Link para ver todos los eventos del trip

### Dimensiones de filtro

Aplicables a todos los niveles:
- Proyecto
- Tipo de evento (Salida/Llegada/Entrega/Retorno)
- Rol (campo/pm/logistica/admin)
- Persona específica
- Periodo (preset: última semana, mes, trimestre + custom)
- Tipo de caso (los 9)
- Status del trip asociado
- Resuelto vs no resuelto (para Casos 1 y 7)

---

## Relaciones entre casos

Los casos no son mutuamente exclusivos. Un trip puede exhibir varios:

- **Caso 7 (Retorno sin Entrega) → Caso 6 (Admin Backfill)**: admin insertó Entrega vía SQL después. Ambos se cuentan, pero el dashboard debe permitir ver si el caso fue resuelto.
- **Caso 2 (Batch) + Caso 3 (Out of sequence)**: registro batch mal ordenado. Frecuentemente van juntos.
- **Caso 1 (Missing) + Caso 6 (Backfill)**: evento faltante que admin eventualmente rellenó.

**Propuesta de jerarquía:**
- Caso 7 = **síntoma** (data inconsistente temporalmente)
- Caso 6 = **intervención** (admin arregló)

Un trip puede tener solo síntoma (automáticamente resuelto por Bug 8 fix → línea vuelve a Pendiente), solo intervención (admin hizo cambio proactivo), o ambos.

El dashboard debe mostrar los 9 casos individualmente + una vista de "issues no resueltos" que filtre a donde el trip sigue en estado inconsistente.

---

## Fases de implementación

### Fase 1 — Foundation (sin cambios de schema)
- Query library: SQL para cada uno de los 9 casos
- Guardadas en `src/lib/analytics/compliance/`
- Testeadas contra data actual
- Sin UI todavía

### Fase 2 — Schema evolution
- Migración para `backfilled_by_admin` + `backfill_reason`
- Backfill retroactivo: marcar eventos existentes donde `registered_by = UUID admin` como `backfilled_by_admin = true`
- Documentar en CHANGELOG

### Fase 3 — Dashboard básico
- Página `/admin/compliance`
- Cards con KPIs principales (Casos 1, 2, 6, 7)
- Filtros básicos (proyecto, periodo)
- Visible solo a rol `admin`

### Fase 4 — Drill-down
- Click en card → lista de incidencias
- Click en incidencia → detalle del trip con eventos highlighted
- Filtros adicionales (rol, persona, tipo de caso)

### Fase 5 — Casos avanzados
- Casos 3, 4, 5, 8, 9 en el dashboard
- Gráficos de tendencia
- Export a Excel

### Fase 6 — GPS crosscheck (post-GPS integration)
- Usar GPS data para validar `event_timestamp` de Salida/Llegada
- Nuevo caso: `EVENT_TIMESTAMP_INCONSISTENT_WITH_GPS`
- Refinar Caso 2 excluyendo viajes genuinamente cortos usando duración GPS real

---

## Preguntas abiertas

1. **Caso 9 (PM self-close)**: ¿cuenta como incumplimiento o solo como signal de investigación? Requiere conversación con Samantha/Rodrigo.

2. **Threshold de "batch"**: ¿5 min es el corte correcto, o debe ajustarse por duración esperada del viaje?

3. **Viajes de prueba**: ¿cómo excluir data de testing del dashboard? ¿Flag en trips, o convención de naming?

4. **Tier de gravedad**: ¿los 9 casos son todos iguales o hay prioridad (ej: Caso 6 = crítico, Caso 9 = informativo)?

5. **Intervención proactiva**: cuando un trip crea un caso, ¿el dashboard debe alertar a Charris/PM para remediación, o solo reportar?

---

## Referencias

- `repomix-output.xml` — estado del código
- `Docs/reference/EVENTS_V2.md` — flujo de eventos
- Bug 8 fix — auto-remediación de Caso 7
- Chat del 2026-04-22 — discusión original