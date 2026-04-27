---
title: Events V2 — Redesign in Progress (v3)
status: design-closed
created: 2026-04-23
updated: 2026-04-26 (v3.1: lowercase fix + bd applied)
supersedes: Docs/reference/EVENTS_V2.md (while this doc is active)
next_step: Brief para Code (Superpowers, secuencial)
location_in_repo: Docs/reference/events-v2-redesign-in-progress.md
---

# Events V2 — Redesign in Progress (v3)

> **ATENCIÓN:** Este doc representa el rediseño activo de Events V2. Mientras está vivo (`status: design-closed → in-implementation`), reemplaza a `Docs/reference/EVENTS_V2.md` como source of truth. Cuando Code implemente las 3 features definidas y se haga merge a main, este doc se mueve a `Docs/archive/` y `EVENTS_V2.md` se actualiza con el estado final.

---

## Por qué existe este doc

Events V2 se construyó en batches durante marzo-abril 2026 sin Chat en el loop y sin disciplina de Superpowers. Resultado:
- Features implementadas a medias (custody_transfers huérfana, Preparacion/Retiro sin uso real)
- Decisiones obsoletas en `EVENTS_V2.md`
- Items en BACKLOG ya cerrados o no aplicables
- James sin claridad de qué estaba vigente vs código muerto

Este doc es el **diseño cerrado** para llegar a Events V2 final + scope concreto para merge v2 (la primera versión de prod con Events V2 completo).

---

## Sección 1 — Estado consolidado del código actual

Verificado contra código + BD (staging) + CHANGELOG + commits + tests al 2026-04-26.

### 1.1 Event types existentes

9 event types como strings en código; 4 con uso real verificado en datos staging.

| Event type | Handler | Modal | En datos | Uso operativo real |
|-----------|---------|-------|:-:|:-:|
| Salida | `handleDispatch` (role-based: campo confirma, logistica/admin edita) | DispatchModal | ✅ 7 | ✅ |
| Llegada | `registerEvent` genérico via hook | EventModal inline en `mis-viajes/[id]/page.tsx` | 0 | ✅ (operativo en staging) |
| Entrega | `handleDelivery` | DeliveryModal | ✅ 3 | ✅ |
| Retorno | `registerEvent` genérico | EventModal inline | ✅ 2 | ✅ |
| Incidencia | `registerEvent` genérico | EventModal inline | 0 | ✅ (operativo en staging) |
| Reversion | `handleRevert` | RevertModal | ✅ 6 | ✅ |
| Parada | `handleParada` | ParadaModal | 0 | ✅ (operativo en staging — rediseño en este merge) |
| **Preparacion** (sin acento) | `handlePreparation` | PreparationModal | 0 | 🔴 **BORRAR** |
| **Retiro** | `handlePickup` | PickupModal | 0 | 🔴 **BORRAR** |

**Hallazgo crítico:** `trip_events.event_type` NO tiene CHECK constraint en BD. Cualquier string entra. Convención de código solamente.

**Aclaración importante (corrección de v2):** Solo hay UN modal de Salida (DispatchModal). El "EventModal inline genérico" maneja Llegada/Retorno/Incidencia, NO Salida. Salida tiene su propio modal porque permite role-based editing.

### 1.2 Modals existentes en `src/components/viajes/`

| Modal | Status post-merge |
|-------|-------------------|
| DispatchModal.tsx | ✅ Mantener (role-based ya implementado en commit del 2026-04-10) |
| DeliveryModal.tsx | ✅ Mantener |
| ParadaModal.tsx | 🔄 Rediseñar (Cambio 1) |
| RevertModal.tsx | ✅ Mantener |
| EventModal inline en `mis-viajes/[id]/page.tsx` | ✅ Mantener (para Llegada, Retorno, Incidencia) |
| **PreparationModal.tsx** | 🔴 **BORRAR** |
| **PickupModal.tsx** | 🔴 **BORRAR** |

### 1.3 Tablas de BD

| Tabla | Inserts frontend | Status post-merge |
|-------|:-:|-------------------|
| `trip_events` | ✅ | Modificar (DROP COLUMN stop_type, posible DROP oc_reference) |
| `trip_event_lines` | ✅ | Mantener |
| `delivery_observations` | ✅ | Mantener |
| `custody_transfers` | 🔴 CERO | Mantener huérfana (decisión post-merge) |
| `trip_line_assignments` | ✅ | Mantener |
| `sm_request_lines` | ✅ | Modificar (status nuevo + 6 columnas pickup, drop cost_code_id/cost_category_id) |
| `sm_requests` | ✅ | Modificar (cost_code_id + cost_category_id) |

### 1.4 Columnas de BD que viven en staging pero NO en prod (bloqueadoras del merge)

**Críticas — código rompe sin ellas:**
- `trip_line_assignments.qty_dispatched` (19 usos sin fallback)
- `trip_events.reverts_event_id`, `source`, `location`
- `trips.is_self_pickup` (se DROP en este merge)
- `sm_requests.fulfillment_type`
- `sm_request_lines.designated_receiver_id` + `designated_receiver_name`
- `equipment.gps_vehicle_id`

**Tablas nuevas en staging:** `custody_transfers`, `delivery_observations`, `trip_event_lines`.

**Implicación:** todas estas columnas/tablas tienen que aplicarse a prod en el merge o el código rompe.

**Aplicados en este merge (Chat via MCP):**
- 2026-04-26: `trip_events DROP COLUMN stop_type` aplicado en staging (migration `drop_stop_type_from_trip_events`). Pendiente prod en merge final.

---

## Sección 2 — Decisiones cerradas

Registro cronológico de decisiones tomadas durante el proceso de diseño 2026-04-23 a 2026-04-26. **No se reabren sin razón fuerte.**

| # | Fecha | Decisión | Razón |
|---|-------|----------|-------|
| 1 | 2026-04-23 | Movimientos internos (definidos como trips dentro del mismo proyecto con recursos de taller) — diferidos para post-merge | No urgente; gerencia todavía dando input |
| 2 | 2026-04-23 | `custody_transfers` se POSPONE — no se cablea ni borra | Esqueleto queda documentado como deuda conocida; cablear sin diseño crea data desactualizada. Nació de discusión con Chat sobre patterns Procore/Tenna |
| 3 | 2026-04-23 | Pickup se re-modela: NO es un trip especial, es una bandera a nivel de **línea de solicitud** sin trip asociado | Alineado con cómo se decide realmente en ICONSA: Charris aprueba pickup, no programa movilización, no se cobra |
| 4 | 2026-04-23 | Eventos `Preparacion` y `Retiro` se BORRAN del código | Consecuencia de decisión 3; el código actual es sobre-ingenierizado y nunca se usó |
| 5 | 2026-04-23 | Tarifa: NO tocar. Campo `cost` queda editable. Tarifa es base, Charris/Valderrama ajustan manual | Decisión de Valderrama según James |
| 6 | 2026-04-23 | Notificaciones (Parada, pickup, G3, G4): documentadas para post-merge, NO implementar en este merge | Trabajo aparte, requiere features cerrados primero |
| 7 | 2026-04-23 | PM con botón Incidencia: REMOVER. Proyectos solo registran Entrega | Problemas post-entrega van por otro canal |
| 8 | 2026-04-26 | **D1 (Retorno sin Entrega → líneas Pendiente): YA RESUELTO** en commits 2026-04-13. Retorno ahora es no-op (no toca cantidades), líneas siguen `En Transito` con trip Completado, dashboard "Entregas pendientes en viajes cerrados" muestra esos casos. **NO hay trabajo pendiente.** | Verificado en `tests/retorno-complete.spec.ts` y CHANGELOG 2026-04-13. Doc v2 marcaba como "no tocar" por error — la realidad es que ya fue resuelto a favor del modelo correcto |
| 9 | 2026-04-23 | Llegada dentro de Parada: NO se integra. Mantener separados | Solo lo dejamos como está, sin movimiento |
| 10 | 2026-04-23 | Izaje como event type nuevo: PARKEADO | Requiere discusión con gerencia |
| 11 | 2026-04-23 | AD-1 viejo "PickupOrder vs Trip": **OBSOLETO** — nuevo modelo de pickup lo reemplaza | Decisión 3 lo resuelve diferente |
| 12 | 2026-04-23 | Status backend (event sourcing vs status directo): **mantener Opción B** (status directo). Event sourcing es visión post-v2-merge | Refactor masivo, no scope hoy |
| 13 | 2026-04-26 | **DispatchModal role-based YA está implementado** (commit 2026-04-10). Conductor (`campo`) confirma sin editar; logistica/admin editan campos. Defensive override en backend. NO es trabajo pendiente. Smoke test pendiente con cuenta real de campo. | Verificado en código `mis-viajes/[id]/page.tsx` líneas 568-583 + CHANGELOG 2026-04-10 |
| 14 | 2026-04-23 | G20 (botón multi-entrega) y G11 (partial-previous warning): **out of scope merge**, post-merge si vale | UX nice-to-have |
| 15 | 2026-04-23 | Orden de líneas como ruta implícita: **NO implementar persistencia en este merge** | No crítico; Panamá es chico, Charris gestiona por fuera |
| 16 | 2026-04-26 | Cost code se mueve de `sm_request_lines` (per-línea) a `sm_requests` (per-solicitud) | Solicitantes confirman: cada solicitud es para UN cost code; per-línea era over-engineering |
| 17 | 2026-04-26 | Parada se rediseña: dropdown híbrido de ubicaciones + líneas afectadas requeridas + foto requerida + sin stop_type + sin oc_reference | Ver Sección 3 (Cambio 1) |
| 18 | 2026-04-26 | Pickup parcial: NO soportado en v1 — assumption a confirmar con Charris post-merge | Simplifica modelo |
| 19 | 2026-04-26 | Charris (no almacenista) registra entrega de pickup | Charris aprueba Y registra; control end-to-end |
| 20 | 2026-04-26 | Trip queda vacío después de mover líneas a pickup → auto-cancelar con confirmación previa | UX: confirmación modal "Esto cancelará el viaje X" |
| 21 | 2026-04-26 | Solicitante NO puede iniciar pickup desde la solicitud (solo Charris) | Coordinación informal por WhatsApp/llamada funciona; no duplicar canal |
| 22 | 2026-04-26 | Orden de ejecución por Code: Parada → Cost code → Pickup, con Superpowers cada uno | Parada es más chico (calibra workflow), cost code es schema migration (antes de pickup), pickup es el más grande |
| 23 | 2026-04-26 | **Code NO toca BD.** Todos los cambios de schema los aplica Chat (yo) via MCP, con James aprobando antes. Code consume schema vía types regenerados. Convención `[bd-pending]` → `[bd]` en CHANGELOG documenta cada change. | Regla del proyecto, ya en `.claude/rules/supabase-readonly.md` |
| 24 | 2026-04-26 | Valores reales de `locations.location_type` verificados en BD: `'proyecto'`, `'taller'`, `'otro'` (todos lowercase). Filtros del dropdown deben usar lowercase. Doc v3 inicial decía capitalized — bug que hubiera causado que el filtro no funcione | Verificado via MCP en staging y prod |

---

## Sección 3 — Cambios para el merge (3 features)

Estos son los 3 cambios que van al merge v2. Cada uno se ejecuta como feature separado por Code con Superpowers.

### Cambio 1 — Parada rediseñada

#### Modal final

```
┌─── PARADA INTERMEDIA ─────────────────────────┐
│                                                │
│ Ubicación (requerido):                         │
│ [▼ Seleccionar...                  ]           │
│  📍 GAS PRO Vía España                         │
│  📍 TUBOTEC milla 8                            │
│  📍 FEINSA SA                                  │
│  ─────────────                                 │
│  ✏️  Otra ubicación (escribir libre)           │
│                                                │
│ ── Líneas afectadas (requerido ≥1) ──         │
│ ☑ OC 29902 Tubos PVC      [Completo  ▼]       │
│ ☑ OC 29903 Tubos cuadrados [Parcial   ▼]      │
│   Notas: [restan 65 tubos para el jueves]     │
│                                                │
│ ── Foto de factura (requerido ≥1) ──          │
│ 📎 [Subir foto / PDF]                          │
│                                                │
│ Notas generales (opcional):                    │
│ [_____________________________________]        │
│                                                │
│            [Cancelar]  [✅ Registrar Parada]   │
└────────────────────────────────────────────────┘
```

#### Lógica del dropdown de ubicación

Sistema **híbrido** dropdown + free-text fallback:

```typescript
// Pseudocódigo de la lógica
opciones_dropdown = unique(
  trip.assignments.flatMap(a => [
    {
      label: a.line.from_location?.name ?? a.line.from_text,
      location_type: a.line.from_location?.location_type ?? null
    },
    {
      label: a.line.to_location?.name ?? a.line.to_text,
      location_type: a.line.to_location?.location_type ?? null
    }
  ])
)
.filter(opt => 
  opt.location_type !== 'proyecto' &&  // excluir proyectos (lowercase per BD)
  opt.location_type !== 'taller'        // excluir taller (lowercase per BD)
)

// Al final del dropdown, agregar opción especial:
+ { label: "Otra ubicación (escribir libre)", action: "free-text" }
```

**Nota:** Valores reales en BD verificados 2026-04-26: `'proyecto'` (6 entries), `'taller'` (1, Taller Chilibre), `'otro'` (1, Oficina Central). Entradas con `location_type='otro'` o `null` pasan al dropdown (proveedores típicamente entran via `from_text`/`to_text` con `location_type=null`).

**Comportamiento:**
- Entradas con `location_type='proyecto'` o `'taller'` se filtran (están en BD, son confiables — solicitante las eligió por dropdown estructurado)
- Entradas con `location_type=null` (free-text del solicitante en `from_text`/`to_text`) PASAN al dropdown porque típicamente son proveedores escritos a mano
- Entradas con `location_type='otro'` o futuras (`'proveedor'` cuando se enriquezca la tabla) PASAN al dropdown
- Si conductor elige "Otra ubicación" → input free-text aparece debajo
- Validación: si elige "Otra", el free-text es requerido

#### Validaciones

- Ubicación: requerido (dropdown selección O free-text si "Otra")
- Líneas afectadas: ≥1 línea marcada con status (completo / parcial / no_disponible)
- Attachments: ≥1 attachment subido
- Notas generales: opcional

#### Cambios técnicos

**BD (aplicado por Chat el 2026-04-26):**
- `ALTER TABLE trip_events DROP COLUMN stop_type` — APLICADO en staging via migration `drop_stop_type_from_trip_events`. Verificación pre-aplicación: 0 filas con `stop_type` asignado.
- `oc_reference`: NO existe como columna en `trip_events`. Era prefijo a `notes` en el modal. NO hay ALTER que hacer. Solo borrar campo del modal y prefijo en `handleParada`.
- Pendiente aplicar a prod: `stop_type` DROP en el merge final junto con resto de pendientes BD.

**Código (Code implementa con Superpowers):**
- `ParadaModal.tsx`: rediseño completo per arriba
- `handleParada` en `mis-viajes/[id]/page.tsx`: eliminar inserción de `stop_type` y `oc_reference`
- `EventTimeline.tsx`: eliminar render de `stop_type` y `oc_reference`
- `tests/parada-complete.spec.ts`: actualizar — eliminar assertions de stop_type, agregar validaciones de líneas requeridas + attachment requerido
- `src/lib/types/database.ts`: regenerar types via Supabase CLI/MCP (Code lo hace después de que Chat aplique BD)

#### Assumptions documentadas (a confirmar con Charris post-merge)

- **A1**: Toda Parada es retiro de orden de compra en proveedor (no almuerzo, gasolinera, etc.)
- **A2**: El proveedor de la Parada SIEMPRE está mencionado en `from`/`to` de alguna línea del trip (con fallback "Otra ubicación" para casos imprevistos)
- **A3**: Toda Parada afecta al menos 1 línea del trip
- **A4**: Toda Parada tiene factura física que el conductor puede fotografiar

### Cambio 2 — Cost code a nivel solicitud

#### Cambio de modelo

Hoy: `cost_code_id` y `cost_category_id` viven en `sm_request_lines` (per línea).
Después: `cost_code_id` y `cost_category_id` viven en `sm_requests` (per solicitud).

Razón (de los solicitantes): cada solicitud se hace sabiendo que TODO lo que está dentro va para UN cost code. Per-línea era over-engineering.

#### BD — Migración (aplica Chat via MCP, NO Code)

```sql
-- 1. Agregar columnas a sm_requests (nullable inicialmente para permitir migración)
ALTER TABLE sm_requests 
  ADD COLUMN cost_code_id UUID REFERENCES cost_codes(id),
  ADD COLUMN cost_category_id UUID REFERENCES cost_categories(id);

-- 2. Migración de data: cada solicitud toma cost_code de su primera línea
UPDATE sm_requests sr
SET 
  cost_code_id = (
    SELECT cost_code_id FROM sm_request_lines 
    WHERE request_id = sr.id 
    ORDER BY line_number LIMIT 1
  ),
  cost_category_id = (
    SELECT cost_category_id FROM sm_request_lines 
    WHERE request_id = sr.id 
    ORDER BY line_number LIMIT 1
  );

-- 3. Validar migración: detectar solicitudes con líneas que tenían cost_code distinto al de la primera
SELECT sr.id, sr.request_id, COUNT(DISTINCT srl.cost_code_id) AS distinct_cost_codes
FROM sm_requests sr
JOIN sm_request_lines srl ON srl.request_id = sr.id
WHERE srl.cost_code_id IS NOT NULL
GROUP BY sr.id, sr.request_id
HAVING COUNT(DISTINCT srl.cost_code_id) > 1;

-- 4. SOLO DESPUÉS de validación de James, drop columns en sm_request_lines
ALTER TABLE sm_request_lines 
  DROP COLUMN cost_code_id,
  DROP COLUMN cost_category_id;
```

**IMPORTANTE:** El paso 4 NO se ejecuta automáticamente. Chat reporta el resultado del paso 3 a James, James decide si seguir o resolver inconsistencias primero.

#### Cambios de código (Code implementa)

- **SolicitudForm**: cost_code y cost_category selectors a nivel header (no per línea). Cascada Proyecto → cost_code → categorías válidas.
- **LineEditor**: ELIMINAR campos cost_code y cost_category. Línea más simple.
- **Validación**: solicitud requiere cost_code antes de pasar de Borrador a Enviada (igual que línea hoy).
- **Queries existentes que `SELECT` cost_code de líneas**: refactorear todos para que vengan de la solicitud.
- **Reportes (facturación, etc.)**: actualizar JOINs.
- **Tests**: actualizar — solicitud requiere cost_code, líneas no.
- **Types**: regenerar `database.ts` después de que Chat aplique BD.

#### Assumptions documentadas

- **A7**: Cost code es por solicitud, no por línea (a confirmar con solicitantes — ya James habló con ellos)

#### Cierra item

- **J9** del BACKLOG (cost code refactor) — cerrado con esta implementación.

### Cambio 3 — Pickup nuevo

#### Modelo

Pickup es una **bandera a nivel de línea de solicitud**. NO crea trip. NO usa tarifa. NO se cobra al proyecto.

#### BD (aplica Chat via MCP, NO Code)

```sql
-- 1. Agregar status nuevo "Pickup Aprobado" al CHECK constraint
ALTER TABLE sm_request_lines 
  DROP CONSTRAINT IF EXISTS sm_request_lines_status_check;
ALTER TABLE sm_request_lines 
  ADD CONSTRAINT sm_request_lines_status_check 
  CHECK (status IN (
    'Pendiente', 'Programada', 'En Transito', 
    'Entregada', 'Parcial', 'Cancelada',
    'Pickup Aprobado'
  ));

-- 2. Agregar columnas pickup
ALTER TABLE sm_request_lines 
  ADD COLUMN pickup_by_project BOOLEAN DEFAULT false,
  ADD COLUMN pickup_approved_at TIMESTAMPTZ,
  ADD COLUMN pickup_approved_by UUID REFERENCES people(id),
  ADD COLUMN pickup_completed_at TIMESTAMPTZ,
  ADD COLUMN pickup_received_by_id UUID REFERENCES people(id),
  ADD COLUMN pickup_received_by_name TEXT;
```

#### Status flow de líneas con pickup

```
Pendiente ─────────► Pickup Aprobado ────► Entregada
                          ▲                    ▲
                          │                    │
Programada ───────────────┘                    │
   │                                           │
   ▼                                           │
En Transito → Entregada ───────────────────────┘
                (flow normal fleet)
```

Reglas:
- **Aprobar pickup desde `Pendiente`**: solo cambiar status a `Pickup Aprobado`, setear `pickup_by_project=true`, `pickup_approved_at=now()`, `pickup_approved_by=charris.id`
- **Aprobar pickup desde `Programada`** (línea ya está en un trip): además, eliminar `trip_line_assignments` correspondiente, recalcular `qty_scheduled` de la línea. Si trip queda con 0 assignments → confirmar con Charris en modal antes → auto-cancelar trip con razón "Todas las líneas convertidas a pickup"
- **Registrar entrega**: setear `pickup_completed_at=now()`, `pickup_received_by_id` o `pickup_received_by_name`, `qty_delivered=quantity` (asumir completo), `status='Entregada'`. Cascade trigger se dispara solo y actualiza `sm_requests.status`.

#### UX (Code implementa)

**Aprobar pickup desde backlog (`/programacion`):**
- Cada línea pendiente tiene menú "..." con opción "Aprobar pickup"
- Click → modal de confirmación → línea marcada como pickup, sale del backlog

**Aprobar pickup desde trip programado (`/programacion/viaje/[id]`):**
- Cada línea asignada tiene menú "..." con opción "Convertir a pickup"
- Click → modal de confirmación
- Si era última línea del trip → modal advierte "Esto cancelará el viaje {trip_id}. ¿Continuar?"
- Confirmación → línea sale del trip, marca pickup, va a "Pickups Pendientes de Retiro"

**Sección nueva en dashboard Charris: "Pickups Pendientes de Retiro":**
- Lista todas las líneas con `pickup_by_project=true` AND `pickup_completed_at IS NULL`
- Por cada una, botón "Registrar entrega" → modal pide:
  - `pickup_received_by_id` (dropdown people, opcional)
  - `pickup_received_by_name` (texto, requerido si no hay ID)
  - Notas (opcional)
  - Attachments (opcional)
- Submit → línea pasa a `Entregada`

**En `/solicitudes/[id]`:**
- Línea pickup muestra badge `🤝 Pickup` con detalles:
  - "Aprobado por Charris el [fecha]"
  - Si completado: "Retirado por [nombre] el [fecha]"

#### Verificación de filtros (auditoría de queries por Code)

Code debe revisar TODOS los queries que filtran por `status` en `sm_request_lines`:

| Contexto | Tratamiento de `Pickup Aprobado` |
|----------|----------------------------------|
| Backlog Charris (`/programacion`) | EXCLUIR (no es para programar) |
| Vista PM en solicitud (`/solicitudes/[id]`) | INCLUIR con badge distintivo |
| Reporte "atendidas" | INCLUIR junto con `Entregada` |
| Reporte "pendientes" | EXCLUIR |
| Cascade trigger `cascade_request_status` | Tratar `Pickup Aprobado` como "in_progress" (igual que `Programada`) |

#### Código a borrar

| Item | Acción |
|------|--------|
| Event type `Preparacion` (string en código) | BORRAR todas las referencias |
| Event type `Retiro` (string en código) | BORRAR todas las referencias |
| `handlePreparation` (función) | BORRAR |
| `handlePickup` (función) | BORRAR |
| `PreparationModal.tsx` | BORRAR archivo completo |
| `PickupModal.tsx` | BORRAR archivo completo |
| RPC `complete_pickup_trip` | BORRAR (verificar que no se usa en otro lado) — **Chat aplica DROP FUNCTION** |
| Branch `Retiro` en `handleRevert` | BORRAR |
| Columna `trips.is_self_pickup` | DROP COLUMN — **Chat aplica** |
| Validación J1 en `nuevo/page.tsx:200-213` que validaba `is_self_pickup` | BORRAR (problema desaparece) |
| `FLEET_STEPS` y `PICKUP_STEPS` en `TripCard.tsx` L13-14 | Mantener `FLEET_STEPS`, BORRAR `PICKUP_STEPS` |
| Pickup badges en programación (Batch 11) | Mantener pero ahora basado en `assignments.some(a => a.line.pickup_by_project)` o similar, no en `trips.is_self_pickup` |
| Tests de pickup viejo (`pickup-flow*.spec.ts` si existen) | BORRAR o reescribir para flow nuevo |

#### Assumptions documentadas (a confirmar con Charris post-merge)

- **A5**: Pickup nunca es parcial — proyecto retira todo o nada
- **A6**: Charris (no almacenista) registra entrega de pickup en su dashboard

---

## Sección 4 — Notificaciones documentadas para post-merge

NO se implementan en este merge. Documentadas para sesión futura.

| Notificación | Trigger | Destinatarios | Comentario |
|--------------|---------|---------------|------------|
| `notifyParadaRegistrada` | Parada creada | PM(s) de proyectos del trip + Miguel Calderón (config var) | Toda Parada (ya tiene foto requerida, no condicional) |
| `notifyEntregaConObservaciones` (G3) | Entrega con líneas en `with_observations` | PM(s) del proyecto | Item G3 del backlog |
| `notifyLineaRechazada` (G4) | Entrega con líneas en `rejected` | PM(s) del proyecto | Item G4 del backlog |
| `notifyPickupCompletado` | Charris registra entrega de pickup | PM(s) del proyecto | Nueva |

**NO se implementan** en este merge: requieren features cerrados primero, y se atacan en sesión dedicada de notificaciones.

---

## Sección 5 — Items NO scope merge (parkeados explícitamente)

| Item | Razón |
|------|-------|
| `custody_transfers` (cablear/borrar/decidir) | Decisión 2 — diseño futuro |
| Movimientos internos (trips dentro de mismo proyecto) | Decisión 1 — gerencia |
| Llegada dentro de Parada | Decisión 9 |
| Izaje como event type | Decisión 10 |
| 2 modales de Salida consolidados | Aclaración: solo hay 1 modal de Salida (DispatchModal). EventModal inline es para otros eventos. NO hay nada que consolidar. |
| G20 (multi-entrega verificación) | Decisión 14 |
| G11 (partial-previous warning) | Decisión 14 |
| G3, G4 notificaciones | Sección 4 |
| Notificación de Parada | Sección 4 |
| Notificación de pickup completado | Sección 4 |
| Orden de líneas persistido (`sequence_order`) | Decisión 15 — Panamá es chico |
| Solicitante puede iniciar pickup | Decisión 21 — coordinación informal funciona |
| Pickup parcial | Decisión 18 — assumption a confirmar |
| Tarifa rediseño | Decisión 5 — Valderrama dijo no |
| Dashboards por rol (F5) | Sesión separada |
| Admin settings page | Sesión separada |
| Reportes auto-generados | Sesión separada |
| DGI QR scanning (D12 Level 2) | Roadmap futuro |
| Procurement module completo (D12 Level 3) | Roadmap futuro |
| Warehouse mobile UX (AD-5) | Roadmap futuro |
| Event sourcing (Opción A backend) | Decisión 12 — visión post-v2-merge |
| Constraint CHECK en `trip_events.event_type` | Hallazgo técnico, post-merge |
| Smoke test E2E del DispatchModal role-based | Decisión 13 — pendiente con cuenta real de campo |

---

## Sección 6 — Items que cierra este merge

### Items cerrados en commits previos (ya implementados, marcar en BACKLOG)

- **J2** Eliminar `requires_code` del código — `faae938`
- **J3** RBAC conductores — v2026.04.15-1
- **J4** (+ J4-A, J4-B) Calendarios y filtros unificados — v2026.04.15-1, v2026.04.15-2
- **J6** Tarifa no editable cuando hay rate — v2026.04.15-1
- **J7** (+ J7-ext) Código de costo requerido — v2026.04.15-1, v2026.04.15-2
- **J8a** Scroll/zoom modales mobile — v2026.04.15-1
- **J8b** Duplicar líneas en solicitud — v2026.04.15-1
- **G1** Reversion guard valida registered_by — `4b1cb3a`
- **G6** Dashboard "En Tránsito" clickeable — `bb95851`
- **G8** Pickup badges — `c3216e0`
- **G10** Incidencia min 10 chars — `7bed3f2`
- **G17, G18, G19** EVENTS_V2.md cleanup — `ffd4ef4`, `bdde8a2`
- **D1** Retorno sin Entrega → líneas siguen En Transito (resolución a favor del modelo correcto) — commits 2026-04-13
- **D5, D6, D7, D11** — implementados
- **AD-4** PM sees confirmation code on pickup — `6b92458`

### Items cerrados por este merge (cuando se implementen Cambios 1-3)

- **J1** Pickup flow bloqueado → BORRADO (validación queda obsoleta con nuevo modelo)
- **J5** Overarching event design → CERRADO (este audit lo resolvió)
- **J9** Cost code refactor → CERRADO (Cambio 2)
- **D4** Pickup + fleet lines mezcladas → CERRADO (nuevo modelo lo permite naturalmente)
- **D12** Parada Level 1 → REDISEÑADO en este merge (Cambio 1)
- **AD-1** PickupOrder vs Trip → OBSOLETO (Decisión 11)

### Items que requieren rebranding/eliminación de BACKLOG

- **D3** Signifiers 🔑 per-line → OBSOLETO (J2 eliminó requires_code)
- **G7** DeliveryModal badge 🔑 → OBSOLETO (mismo motivo)

### Items que sobreviven post-merge

- **D2** Shortcut "Programar solicitud" — pending design, post-merge
- **D8** PM con botón Incidencia — Decisión 7 (REMOVER) — cierre durante merge si Code lo incluye en pasada de cleanup
- **D9** Línea removida del dispatch — pending decisión
- **D10** Pickup badge re-test — needs verification post-merge
- **D13** DGI QR scanning — futuro
- **AD-2** custody_transfers — Decisión 2 (POSPUESTO)
- **AD-3** Line-level fulfillment — futuro
- **AD-5** Warehouse mobile UX — futuro
- **G3, G4** notificaciones — Sección 4
- **G5** Timeline per-line detail — pending, post-merge
- **G11** DeliveryModal partial-previous warning — Decisión 14
- **G20** Botón multi-entrega verificar — Decisión 14

---

## Sección 7 — Apéndice: flujo operativo en ICONSA (norte operativo)

Una movilización NO es solo "desde X hasta Y". Puede ser:

1. Sale de taller
2. Pasa por proveedor 1 (retira material/equipo, recibe factura) ← **evento Parada**
3. Entrega en proyecto A ← **evento Entrega**
4. Pasa por proveedor 2 (retira más material) ← **evento Parada**
5. Entrega en proyecto B ← **evento Entrega**
6. (Opcional) equipo se queda en proyecto B haciendo movimientos internos por días ← **NO scope hoy**
7. Vuelve a taller ← **evento Retorno**

El sistema debe poder capturar esta realidad. Events V2 es el intento de modelar esto.

---

## Sección 8 — Handoff a Code

### Workflow

Cada uno de los 3 cambios va a Code separado, con disciplina Superpowers:

1. **Chat aplica BD changes via MCP** (con James aprobando antes)
2. James pasa brief específico de Cambio N a Code
3. Code abre `brainstorming` para confirmar entendimiento
4. James valida el brainstorming
5. Code abre `writing-plans` con plan detallado
6. James aprueba el plan
7. Code ejecuta con `executing-plans` (regenera types, modifica código, tests)
8. Code reporta a James
9. James verifica
10. Smoke test E2E
11. Pasar al siguiente cambio

### Orden secuencial

1. **Cambio 1: Parada** (más chico, calibra workflow Superpowers)
2. **Cambio 2: Cost code** (schema migration con data migration, antes de pickup)
3. **Cambio 3: Pickup** (más grande, depende de status nuevo + queries auditadas)

### Después de los 3 cambios

12. Smoke test E2E completo de los 3 cambios
13. Aplicar BD prod (incluye columnas staging-only ya conocidas + nuevas de los 3 cambios)
14. Merge `jaime/dev` → `main`
15. Tag versión
16. Marcar este doc como `status: shipped` y mover a `Docs/archive/`
17. Actualizar `Docs/reference/EVENTS_V2.md` con el estado final

---

## Sección 9 — Reglas para Code (recordatorios)

Estas reglas viven formales en `.claude/rules/`. Las repito aquí porque son críticas para el rediseño.

1. **Code NO toca BD.** Lee schema vía types regenerados. Nunca ejecuta DDL ni DML en Supabase. Si necesita una columna que no existe, reporta a James — Chat aplica.
2. **Commits sí, push no.** Code commitea atómico. James pushea cuando decide.
3. **Plan Mode obligatorio antes de cambios grandes.** Brainstorming → writing-plans → James aprueba → executing-plans.
4. **Tests obligatorios.** Cada cambio funcional incluye test (nuevo o actualizado). Tests existentes que no son del cambio actual NO deben romperse (regression). Disena los tests. No correrlos.

---

_Fin del doc cerrado de diseño. Cuando los 3 cambios estén implementados y mergeados, este doc pasa a `Docs/archive/` y `EVENTS_V2.md` se actualiza._
