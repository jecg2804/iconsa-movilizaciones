# MovimientOS — Events System v2: Master Implementation Guide

**Para:** Claude Code
**Fecha:** 23 de marzo de 2026
**Autor:** Claude Chat + James Cucalón
**Repo:** ICONSA-Solutions/movimientOS, branch jaime/dev
**Deploy:** rein-eisenwerk.com (Vercel)
**BD:** Supabase project bzeoszympkkicwlfdtcn (prod), vonwkciosksqspyljzfy (staging)

---

## 1. QUÉ ES ESTE DOCUMENTO

Este documento contiene el rediseño completo del sistema de eventos de movilizaciones. Incluye:
- Estado actual del sistema y bugs conocidos
- Cambios de BD ya aplicados y pendientes
- Diseño pantalla por pantalla con wireframes
- Self-pickup como nuevo flujo integrado
- Plan de implementación en batches secuenciales

**Regla fundamental:** Cada batch debe ser implementado, testeado, y validado antes de pasar al siguiente. NO adelantarse. Si un batch rompe algo, se revierte antes de continuar.

---

## 2. ESTADO ACTUAL DEL SISTEMA (pre-rediseño)

### 2.1 — Flujo actual de eventos

Secuencia en `/mis-viajes/[id]`:
```
Salida → (Llegada opcional) → Entrega → Retorno → (Incidencia en cualquier momento)
```

Registrar Salida: botón simple → INSERT trip_events, UPDATE trips.status='En Ruta', UPDATE líneas.status='En Transito'
Registrar Entrega: modal con código 4 dígitos (obligatorio) + receptor dropdown/texto + cantidades por línea
Registrar Retorno: botón simple → UPDATE trips.status='Completado'

### 2.2 — Archivos clave del sistema de eventos

```
src/app/(app)/mis-viajes/page.tsx           — Lista de viajes activos
src/app/(app)/mis-viajes/[id]/page.tsx       — Detalle + registro de eventos
src/hooks/useTripEvents.ts                   — Lógica de registro (INSERT/UPDATE)
src/components/viajes/EventTimeline.tsx       — Timeline visual de eventos
src/components/viajes/EventForm.tsx           — Formulario modal de evento
src/components/viajes/EventButton.tsx         — Botón para cada tipo de evento
src/components/viajes/CodeConfirmation.tsx    — Input del código de 4 dígitos
src/lib/utils/roles.ts                       — canRegisterEvent() y otros guards
src/lib/utils/constants.ts                   — ROLE_ROUTES, EVENT_TYPES, etc.
src/lib/notifications/actions.ts             — Server actions de notificaciones
src/lib/notifications/templates/index.ts     — Templates HTML de emails
src/app/(app)/solicitudes/[id]/page.tsx       — Detalle de solicitud (necesita shortcuts)
src/app/(app)/programacion/page.tsx           — Backlog + viajes (necesita shortcuts)
src/app/(app)/programacion/viaje/[id]/page.tsx — Detalle de viaje en programación
src/app/(app)/dashboard/page.tsx              — Dashboard (necesita "En Tránsito Ahora")
```

### 2.3 — Bugs descubiertos en producción (23-mar-2026)

| Bug | Estado | Detalle |
|-----|--------|---------|
| Timezone UTC en emails | **PENDIENTE Code** | `toLocaleTimeString` sin `timeZone: 'America/Panama'` |
| PM ve todos los botones de eventos | **PENDIENTE Code** | PM debe ver solo Entrega + Incidencia |
| Retorno solo disponible después de Entrega | **PENDIENTE Code** | Debe estar disponible después de Salida |
| RLS trip_events INSERT excluía PM | **ARREGLADO BD** | Policy actualizada — pm incluido |
| RLS trip_line_assignments UPDATE excluía PM/campo/almacen | **ARREGLADO BD** | Policy actualizada |
| RLS trips UPDATE excluía campo/almacen | **ARREGLADO BD** | Policy actualizada (PM deliberadamente excluido) |

### 2.4 — RLS policies actuales (post-fix)

| Tabla | Operación | Roles permitidos |
|-------|-----------|-----------------|
| `trip_events` | INSERT | logistica, campo, almacen, admin, **pm** |
| `trip_events` | SELECT | todos (USING true) |
| `trip_line_assignments` | INSERT | logistica, admin |
| `trip_line_assignments` | UPDATE | logistica, admin, **pm, campo, almacen** |
| `trips` | INSERT | logistica, admin |
| `trips` | UPDATE | logistica, admin, **campo, almacen** (NO pm) |
| `sm_request_lines` | UPDATE | pm, admin, logistica, campo, almacen |

**PM NO puede UPDATE trips** — esto es deliberado. PM no debe registrar Despacho (trips.status='En Ruta') ni Retorno (trips.status='Completado').

### 2.5 — Triggers relevantes

| Trigger | Tabla | Momento | Función | Impacto en rediseño |
|---------|-------|---------|---------|-------------------|
| `trg_cascade_status` | sm_request_lines | AFTER UPDATE | `cascade_request_status()` | Sin cambio — sigue evaluando líneas para determinar status solicitud |
| `trg_update_equipment_location` | trip_events | AFTER INSERT | `update_equipment_location_on_delivery()` | **NECESITA REFACTOR en Batch 4** — ver sección 3.3 |
| `trg_enforce_qty_integrity` | sm_request_lines | BEFORE INSERT/UPDATE | `enforce_qty_integrity()` | **Regla para Batch 9** — ver sección 3.4 |
| `trg_lifecycle_timestamps` | sm_requests | BEFORE UPDATE | `capture_lifecycle_timestamps()` | **Auditado: OK.** Al revertir Entrega, solicitud va de Completada→En Proceso. date_completed NO se borra (correcto — refleja la primera completación). Si se re-completa, el trigger NO sobrescribe date_completed porque verifica IS NULL. |
| `trg_trip_cancelled` | trips | BEFORE UPDATE | `capture_trip_cancelled()` | **Auditado: OK.** Solo dispara al ir a 'Cancelado'. No afecta reversiones. |
| `calculate_priority` | sm_requests | BEFORE I/U | Calcula prioridad por date_required | **Auditado: OK.** No toca eventos, funciona independiente. |
| `generate_confirmation_code` | trips | BEFORE INSERT | Genera código 4 dígitos | Sin cambio |
| `generate_trip_id` | trips | BEFORE INSERT | Genera MOV-YYYY-NNN | Sin cambio |
| `audit_*` | todas | AFTER I/U/D | audit_trigger() | Sin cambio |

---

## 3. CAMBIOS DE BASE DE DATOS

### 3.1 — Ya aplicados (Batch 0 — NO tocar)

```sql
-- RLS fixes en trip_events, trip_line_assignments, trips
-- Aplicados en prod + staging el 23-mar-2026
```

### 3.2 — Pendientes (Batch 4 — Claude Chat ejecutará con aprobación de James)

**Columnas nuevas en tablas existentes:**

| Tabla | Columna | Tipo | Default | Para qué |
|-------|---------|------|---------|----------|
| sm_requests | fulfillment_type | TEXT | 'fleet' | 'fleet' o 'pickup' |
| sm_request_lines | requires_code | BOOLEAN | false | Código de confirmación por línea |
| sm_request_lines | designated_receiver_id | UUID FK→people | NULL | Receptor designado por línea |
| sm_request_lines | designated_receiver_name | TEXT | NULL | Fallback texto del receptor |
| trips | is_self_pickup | BOOLEAN | false | Viaje de retiro |
| trip_line_assignments | qty_dispatched | NUMERIC(10,2) | 0 | Qty real despachada |
| trip_events | reverts_event_id | UUID FK→trip_events | NULL | Para reversiones |
| trip_events | source | TEXT | 'manual' | 'manual' o 'gps' |
| vehicles | gps_vehicle_id | TEXT | NULL | ID en Startrack GPS (future-proof) |

**Tablas nuevas:**

```sql
-- Registro de qué líneas se incluyeron en cada evento de Entrega
CREATE TABLE trip_event_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_event_id UUID NOT NULL REFERENCES trip_events(id),
  request_line_id UUID NOT NULL REFERENCES sm_request_lines(id),
  quantity NUMERIC(10,2) NOT NULL,
  line_status TEXT NOT NULL, -- 'ok', 'partial', 'with_observations', 'rejected'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Observaciones de entrega (material dañado, equivocado, etc.)
CREATE TABLE delivery_observations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_event_id UUID NOT NULL REFERENCES trip_events(id),
  request_line_id UUID NOT NULL REFERENCES sm_request_lines(id),
  observation_type TEXT NOT NULL, -- 'damaged', 'wrong_qty', 'wrong_item', 'rejected', 'other'
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  reported_by UUID REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**ESTOS CAMBIOS DE BD NO ESTÁN HECHOS TODAVÍA.** Claude Chat los ejecutará en Batch 4 con aprobación de James. Code NO debe asumir que estas columnas/tablas existen hasta que se confirme que Batch 4 está completo.

### 3.3 — FIX CRÍTICO: Refactor trigger de ubicación de equipos (Batch 4)

El trigger actual `update_equipment_location_on_delivery()` tiene 2 bugs que rompen multi-entrega y self-pickup:

**Bug A — Multi-entrega:** Procesa TODAS las líneas del viaje, no solo las entregadas en ese evento. En un viaje con líneas a 2 destinos, la primera Entrega mueve la ubicación de equipos que aún no se entregaron.

**Bug B — Self-pickup:** Solo acepta `event_type = 'Entrega'`. El evento de pickup es 'Retiro', así que el equipo recogido NUNCA tendría su ubicación actualizada.

**Trigger actual (BUGGY):**
```sql
IF NEW.event_type != 'Entrega' THEN RETURN NEW; END IF;
FOR assignment IN
    SELECT tla.request_line_id 
    FROM trip_line_assignments tla 
    WHERE tla.trip_id = NEW.trip_id  -- ← procesa TODAS las líneas
LOOP ...
```

**Trigger corregido (se aplica en Batch 4):**
```sql
CREATE OR REPLACE FUNCTION update_equipment_location_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  assignment RECORD;
  line RECORD;
BEGIN
  -- Acepta Entrega Y Retiro (pickup)
  IF NEW.event_type NOT IN ('Entrega', 'Retiro') THEN
    RETURN NEW;
  END IF;

  -- Solo procesa líneas que acabaron de cambiar a 'Entregada'
  -- (no todas las líneas del viaje)
  FOR assignment IN
    SELECT tla.request_line_id 
    FROM trip_line_assignments tla
    JOIN sm_request_lines srl ON srl.id = tla.request_line_id
    WHERE tla.trip_id = NEW.trip_id
    AND srl.status = 'Entregada'
    AND srl.equipment_id IS NOT NULL
  LOOP
    SELECT srl.equipment_id, srl.to_location_id, srl.to_text,
           loc.name as location_name, loc.project_id as dest_project_id
    INTO line
    FROM sm_request_lines srl
    LEFT JOIN locations loc ON loc.id = srl.to_location_id
    WHERE srl.id = assignment.request_line_id;

    IF line.equipment_id IS NOT NULL THEN
      UPDATE equipment SET 
        current_location = COALESCE(line.location_name, line.to_text),
        current_project_id = line.dest_project_id
      WHERE id = line.equipment_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Nota para timing:** Este trigger dispara AFTER INSERT en trip_events. El frontend ya habrá actualizado `sm_request_lines.status` a 'Entregada' ANTES de insertar el trip_event. Entonces el filtro `AND srl.status = 'Entregada'` captura correctamente solo las líneas recién entregadas. Para la segunda Entrega en un viaje multi-destino, las líneas de la primera entrega ya están en 'Entregada' y sus equipos ya fueron movidos — el trigger las procesa de nuevo pero es idempotente (misma ubicación).

### 3.4 — REGLA: enforce_qty_integrity y reversiones (Batch 9)

El trigger `enforce_qty_integrity` valida:
```sql
IF NEW.qty_delivered < 0 THEN RAISE EXCEPTION ...
IF NEW.qty_delivered > NEW.quantity THEN RAISE EXCEPTION ...
```

Cuando Code implemente la reversión de Entrega (Batch 9), la lógica de restar qty_delivered DEBE usar:
```typescript
const newQtyDelivered = Math.max(0, (currentLine.qty_delivered ?? 0) - qtyToRevert)
```

**NUNCA hacer:** `qty_delivered = qty_delivered - X` directamente — si por race condition o bug X > qty_delivered, el trigger bloqueará con excepción y la reversión fallará silenciosamente.

**Nota adicional:** La reversión de Entrega NO debe revertir la ubicación del equipo. La ubicación refleja realidad física (el equipo ya está en el proyecto). Si se necesita corregir la ubicación, se hace manualmente en admin o con la re-entrega posterior.

### 3.5 — RLS y Audit para tablas nuevas (Batch 4)

Las tablas `trip_event_lines` y `delivery_observations` necesitan:

**RLS policies:**
```sql
-- trip_event_lines: mismos permisos que trip_events
ALTER TABLE trip_event_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_all ON trip_event_lines FOR SELECT USING (true);
CREATE POLICY operational_insert ON trip_event_lines FOR INSERT
  WITH CHECK (get_my_app_role() IN ('logistica','campo','almacen','admin','pm'));

-- delivery_observations: mismos permisos  
ALTER TABLE delivery_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_all ON delivery_observations FOR SELECT USING (true);
CREATE POLICY operational_insert ON delivery_observations FOR INSERT
  WITH CHECK (get_my_app_role() IN ('logistica','campo','almacen','admin','pm'));
```

**Audit triggers:**
```sql
CREATE TRIGGER audit_trip_event_lines
  AFTER INSERT OR UPDATE OR DELETE ON trip_event_lines
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_delivery_observations
  AFTER INSERT OR UPDATE OR DELETE ON delivery_observations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

**Todos estos cambios SQL se ejecutan juntos en Batch 4.**

---

## 4. DISEÑO POR PANTALLA

### 4.1 — `/solicitudes` (lista) — Sub-status operativo

**Cambio:** Para cada solicitud con status "En Proceso", mostrar un sub-texto debajo que describe el estado operativo real.

**Lógica (frontend computed, no BD):**
```typescript
function getOperationalSummary(lines: RequestLine[]): string {
  const inTransit = lines.filter(l => l.status === 'En Transito').length
  const delivered = lines.filter(l => l.status === 'Entregada').length
  const scheduled = lines.filter(l => l.status === 'Programada').length
  const pending = lines.filter(l => l.status === 'Pendiente').length
  const partial = lines.filter(l => l.status === 'Parcial').length
  const total = lines.length

  if (inTransit > 0) return `🚛 ${inTransit} en tránsito`
  if (delivered > 0 && (pending > 0 || scheduled > 0 || partial > 0))
    return `📦 ${delivered} de ${total} entregadas`
  if (scheduled > 0) return `📅 ${scheduled} programada${scheduled > 1 ? 's' : ''}`
  if (pending > 0) return `⏳ ${pending} sin programar`
  return ''
}
```

**Dónde mostrar:** Debajo de la fila de cada solicitud "En Proceso", como texto pequeño gris. NO es una columna nueva — es un sub-texto inline.

**Data source:** Las líneas ya se cargan para la solicitud. Si no están disponibles en la lista, necesitan un count query agrupado por status.

### 4.2 — `/solicitudes/[id]` (detalle) — Banner + Barra de progreso

**Banner de acción (condicional):** Solo aparece cuando hay líneas En Transito.

```
┌──────────────────────────────────────────────────────┐
│ 🚛 Material en camino → {destino}                    │
│ Viaje {trip_id} | {conductor} | Salió {hora}         │
│                           [Confirmar Recepción →]    │
└──────────────────────────────────────────────────────┘
```

"Confirmar Recepción →" = `<Link href="/mis-viajes/{trip_uuid}?action=deliver">`

**Barra de progreso por línea:** Cada línea de la solicitud muestra un indicador visual de su status actual.

**Timeline consolidada:** Debajo de la sección de líneas, mostrar eventos de TODOS los viajes asociados a esta solicitud, en orden cronológico. Ya existe parcialmente en la sección "Viajes Programados" — expandirla con eventos.

### 4.3 — `/solicitudes/nueva` y `[id]/edit` — Fulfillment type + código/receptor por línea

**NOTA: Estos cambios dependen de Batch 4 (migración BD). No implementar hasta que se confirme.**

**A nivel de solicitud (arriba del formulario de líneas):**

```
Tipo de movilización: (●) Envío por flota   (○) Retiro en Chilibre
☐ Requiere código de confirmación    [aplica a todas las líneas]
Receptor general: [ Seleccionar...  ▼]    [aplica a todas las líneas]
```

- `fulfillment_type`: radio buttons. Default 'fleet'. Si selecciona 'pickup', nota: "Sujeto a confirmación de Logística. Tarifa: B/. 75.00"
- Checkbox código: cuando se marca, setea `requires_code=true` en TODAS las líneas.
- Receptor general: dropdown de people. Cuando se selecciona, setea `designated_receiver_id` en TODAS las líneas.

**A nivel de cada línea (expandible "⚙️ Opciones avanzadas"):**

```
☑ Requiere código    (override del default de solicitud)
Receptor: [Nombre ▼]  (override del default de solicitud)
```

La mayoría de PMs nunca toca estas opciones. Los defaults de solicitud aplican automáticamente.

### 4.4 — `/programacion` — Shortcuts

**Sección nueva arriba: "Viajes Activos" (viajes En Ruta):**

Card por viaje con: trip_id, conductor, destino, hora salida, # líneas, link "Ver Eventos →" que navega a `/mis-viajes/[id]`.

**Viajes programados para hoy:**

Agregar botón "🚛 Despachar →" en cada card de viaje Programado con fecha = hoy. Navega a `/mis-viajes/[id]?action=dispatch`.

**Viajes pickup programados:**

Badge "🚗 Retiro" en la card. Botón "📋 Preparar →" navega a `/mis-viajes/[id]?action=prepare`.

### 4.5 — `/mis-viajes/[id]` — Eventos rediseñados

**URL params:**
- `?action=dispatch` → pre-abre modal de Despacho al cargar la página
- `?action=deliver` → pre-abre modal de Entrega
- `?action=prepare` → pre-abre modal de Preparación (pickup)

#### 4.5.1 — Botones de eventos según rol

| Rol | Salida/Despacho | Llegada | Entrega | Retorno | Incidencia | Reversión |
|-----|:-:|:-:|:-:|:-:|:-:|:-:|
| logistica | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| campo | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| almacen | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **pm** | **❌** | **❌** | **✅** | **❌** | **✅** | **❌** |

**PM solo ve Entrega + Incidencia.** Implementar en el JSX condicionalmente.

#### 4.5.2 — Secuencia de botones (fleet)

```
Estado Programado:  [Despacho]  [Incidencia]
Estado En Ruta:     [Entrega]  [Retorno (secundario)]  [Llegada (opcional)]  [Incidencia]
Después de Entrega: [Retorno]  [Incidencia]
Estado Completado:  (sin botones)
```

**CAMBIO CRÍTICO:** Retorno está disponible siempre después de Salida, como botón secundario. No requiere Entrega previa. Un camión puede regresar sin entregar.

#### 4.5.3 — Secuencia de botones (pickup)

```
Estado Programado:  [Preparación]  [Incidencia]
Después de Preparación:  [Retiro]  [Incidencia]
Estado Completado:  (sin botones)
```

Pickup: Preparación (almacenista marca material listo) → Retiro (PM confirma que recogió). No hay Salida/Llegada/Retorno.

#### 4.5.4 — Modal de Despacho (reemplaza modal simple de Salida)

**NOTA: Este modal depende de Batch 4 (columna qty_dispatched). El modal simple de Salida sigue funcionando hasta que se implemente este.**

```
┌────────────────────── DESPACHO ──────────────────────┐
│                                                       │
│  Conductor:  [Jose Bonilla          ▼]  ← editable   │
│  Vehículo:   [Cabezal International ▼]  ← editable   │
│  Remolque:   [Lowboy 40T           ▼]  ← editable   │
│                                                       │
│  ─── CARGA ──────────────────────────────────────     │
│  ☑ Grating metal       3 und  Qty: [3 ]  [✕ Quitar] │
│  ☑ Grating FRP         2 und  Qty: [2 ]  [✕ Quitar] │
│                                                       │
│  [+ Agregar línea del backlog]                        │
│                                                       │
│  [📸 Foto de Carga]                                   │
│                                                       │
│  Notas: [________________________]                    │
│                                                       │
│             [Cancelar]  [✅ Confirmar Despacho]       │
└───────────────────────────────────────────────────────┘
```

Al confirmar:
1. UPDATE trips: status='En Ruta', actual_departure=now(), driver_id, vehicle_id, trailer_id
2. UPDATE sm_request_lines: status='En Transito' (líneas asignadas)
3. UPDATE trip_line_assignments: qty_dispatched
4. INSERT trip_events: event_type='Salida', source='manual'
5. Cascade trigger re-evalúa solicitudes padre
6. Notificación email salida_registrada (con timezone America/Panama)

#### 4.5.5 — Modal de Entrega (refactored)

**NOTA: Estados por línea y multi-entrega dependen de Batch 4 (tabla trip_event_lines). Hasta entonces, el modal actual funciona con los fixes de Batch 1 (PM ve botón de Entrega).**

```
┌────────────────────── ENTREGA ───────────────────────┐
│                                                       │
│  Receptor: [Juan E. Jacome     ▼]  (auto si PM)     │
│            o escribir: [________________]             │
│                                                       │
│  ─── LÍNEAS POR RECIBIR ────────────────────────     │
│  ☑ Grating metal    Qty: [3]   Estado: [OK       ▼] │
│  ☑ Grating FRP      Qty: [2]   Estado: [OK       ▼] │
│                                        OK             │
│                                        Con observ.    │
│                                        Rechazado      │
│                                                       │
│  ─── CÓDIGO (solo si línea lo requiere) ───────      │
│  Código: [____]  (4 dígitos)                         │
│                                                       │
│  [  📸  FOTO DE ENTREGA  ]  ← botón grande          │
│                                                       │
│  Notas: [________________________]                    │
│                                                       │
│             [Cancelar]  [✅ Confirmar Entrega]        │
└───────────────────────────────────────────────────────┘
```

**Cuando Estado = "Con observaciones":**
```
│  ☑ Grating FRP    Qty: [2]    Estado: [Con observ. ▼]│
│     Tipo: [Material dañado       ▼]                   │
│     Detalle: [2 piezas con golpes________________]    │
│     [📸 Foto del daño]                                │
```

Tipos: "Material dañado", "Cantidad incorrecta", "Item equivocado", "Otro"

**Cuando Estado = "Rechazado":**
La línea se desmarca (qty=0). No se entrega. Al Retorno, regresa a Pendiente en backlog.

**Multi-entrega:** El botón "Registrar Entrega" aparece mientras haya líneas En Transito en el viaje. Cada Entrega cubre un subconjunto de líneas (checkboxes). Permite viajes multi-destino.

**Código condicional:** Campo de código solo aparece si ALGUNA línea seleccionada tiene `requires_code=true`. Si ninguna lo requiere, campo no aparece.

**Receptor pre-seleccionado:** Si la línea tiene `designated_receiver_id` y coincide con el usuario logueado, ya está seleccionado.

Al confirmar:
1. INSERT trip_events: event_type='Entrega', received_by_id, received_by_name, confirmation_code_used
2. INSERT trip_event_lines: una fila por cada línea incluida en esta entrega
3. Para cada línea: UPDATE qty_delivered, status (Entregada/Parcial)
4. Para líneas "Con observaciones": INSERT delivery_observations
5. Trigger update_equipment_location_on_delivery (refactored para leer trip_event_lines)
6. Cascade trigger re-evalúa solicitudes padre
7. Notificaciones: entrega_confirmada, entrega_con_observaciones (si aplica)

#### 4.5.6 — Modal de Preparación (pickup — nuevo)

```
┌──────────────── PREPARACIÓN ─────────────────────────┐
│  Material listo para retiro                           │
│                                                       │
│  ☑ Válvula check 4"    2 UND                         │
│                                                       │
│  [📸 Foto]                                            │
│  Notas: [Ubicado en estante B3___]                    │
│                                                       │
│             [Cancelar]  [✅ Material Listo]           │
└───────────────────────────────────────────────────────┘
```

Simple: INSERT trip_events con event_type='Preparacion'. No cambia status de trip ni líneas. Solo informativo + notifica al PM.

#### 4.5.7 — Modal de Retiro (pickup — nuevo)

```
┌───────────────────── RETIRO ─────────────────────────┐
│                                                       │
│  Retira: [Juan E. Jacome] (auto)                     │
│                                                       │
│  ☑ Válvula check 4"    Qty: [2]   Estado: [OK ▼]    │
│                                                       │
│  Código: [____]  (siempre requerido en pickup)       │
│  Pida el código al almacenista.                      │
│                                                       │
│  [📸 Foto]                                            │
│                                                       │
│             [Cancelar]  [✅ Confirmar Retiro]         │
└───────────────────────────────────────────────────────┘
```

Funciona igual que Entrega pero: código siempre obligatorio (invertido — almacenista lo tiene). Trip → Completado al confirmar. No hay Retorno.

#### 4.5.8 — Botón de Reversión

Solo visible para logistica/admin. Solo activo si el último evento es Salida, Entrega, o Retorno.

```
┌────────────────────────────────────────────────┐
│  ⟲ Revertir {tipo evento}                      │
│  Razón: [_________________________________]    │
│  [Cancelar]  [⟲ Confirmar Reversión]           │
└────────────────────────────────────────────────┘
```

Crea evento tipo 'Reversion' con reverts_event_id apuntando al evento revertido. El evento original queda en timeline con badge "⟲ Revertido".

| Revertir | Trip vuelve a | Líneas vuelven a |
|----------|--------------|-----------------|
| Salida | Programado | Programada |
| Entrega | En Ruta | En Transito (resta qty_delivered con GREATEST(0, current - reverted)) |
| Retorno | En Ruta | Sin cambio |

#### 4.5.9 — Timeline mejorada

Mostrar tipo de icono + hora + quién registró + líneas incluidas (para Entrega) + observaciones + badge de reversión.

```
🚛 DESPACHO — 9:31 AM — Charris
   Jose Bonilla | International + Lowboy
   📎 1 foto

✅ ENTREGA — 11:10 AM — Jacome
   Grating metal: 3/3 OK ✓
   Grating FRP: 2/2 ⚠️ Material dañado
   📎 2 fotos

🏠 RETORNO — 12:26 PM — Charris
```

### 4.6 — `/dashboard` — En Tránsito Ahora

Nueva sección visible cuando hay viajes En Ruta. Muestra trip_id, destino, conductor, hora salida. Desaparece cuando no hay viajes activos.

---

## 5. SELF-PICKUP — Diseño Integrado

### 5.1 — Concepto

PM indica "Retiro en Chilibre" al crear solicitud. Charris programa como retiro (sin conductor/vehículo, tarifa MVLPUP $75). Almacenista prepara. PM recoge y confirma con código.

### 5.2 — Flujo

```
Fleet:   Solicitud → Programación → Despacho → (Llegada) → Entrega → Retorno
Pickup:  Solicitud → Programación → Preparación → Retiro
```

### 5.3 — Tarifa

MVLPUP = "Movilizacion Pick-up" = B/. 75.00. Auto-seleccionada cuando is_self_pickup=true.

### 5.4 — Código de confirmación en pickup

Mismo mecanismo existente. El código se genera al crear el viaje (trigger). El código se envía por email al solicitante y es visible en detalle de solicitud y mis-viajes. La diferencia: en pickup el almacenista lo comparte verbalmente al PM cuando viene a recoger. PM lo ingresa en el app para confirmar. **Código siempre obligatorio en pickup** (independiente de requires_code de la línea).

### 5.5 — Impacto en pantallas

| Pantalla | Cambio para pickup |
|----------|-------------------|
| Solicitud form | Radio "Envío por flota / Retiro en Chilibre" |
| Programación crear viaje | Toggle "Retiro": oculta conductor/vehículo, auto-selecciona MVLPUP |
| Programación card | Badge "🚗 Retiro", botón "📋 Preparar →" |
| mis-viajes/[id] | Secuencia diferente (Preparación → Retiro), badge visual |

---

## 6. NOTIFICACIONES

### 6.1 — Modificar existentes

| Notificación | Fix |
|---|---|
| salida_registrada (actions.ts) | Agregar `timeZone: 'America/Panama'` a toLocaleTimeString |
| retorno_registrado (templates/index.ts) | Agregar `timeZone: 'America/Panama'` a toLocaleTimeString |

### 6.2 — Nuevas (después de Batch 4)

| Notificación | Trigger | Destinatario |
|---|---|---|
| entrega_con_observaciones | Línea con status 'with_observations' o 'rejected' | Charris + PM solicitante |
| linea_rechazada | Línea rechazada en entrega | Charris + PM solicitante |
| reversion_registrada | Evento revertido | Charris + PMs afectados |
| material_preparado | Evento Preparación registrado (pickup) | PM solicitante |

---

## 7. PLAN DE IMPLEMENTACIÓN — BATCHES SECUENCIALES

### Batch 0: RLS fixes ✅ COMPLETADO
- trip_events INSERT: +pm
- trip_line_assignments UPDATE: +pm, campo, almacen
- trips UPDATE: +campo, almacen (NO pm)

### Batch 1: PM solo ve Entrega + Incidencia
**Archivos:** `src/app/(app)/mis-viajes/[id]/page.tsx`
**Cambio:** Si role==='pm', solo mostrar botones de Entrega e Incidencia. No Salida, Llegada, Retorno.
**Commit:** `fix: PM role only sees Entrega and Incidencia buttons in mis-viajes`
**Validación:** Login como PM → solo ve Entrega+Incidencia. Login como logistica → ve todos.

### Batch 2: Timezone fix en emails
**Archivos:** `src/lib/notifications/actions.ts`, `src/lib/notifications/templates/index.ts`
**Cambio:** Agregar `timeZone: 'America/Panama'` en notifySalidaRegistrada y retornoRegistrado.
**Commit:** `fix: timezone America/Panama in salida and retorno email notifications`
**Validación:** npm run build sin errores.

### Batch 3: Retorno disponible después de Salida
**Archivos:** `src/app/(app)/mis-viajes/[id]/page.tsx`
**Cambio:** Agregar botón Retorno secundario siempre que haya Salida y no haya Retorno (sin requerir Entrega). Excluir PM de ver este botón.
**Commit:** `fix: Retorno button available after Salida without requiring Entrega`
**Validación:** Viaje En Ruta sin Entrega → botón Retorno visible para logistica/campo/almacen. PM no lo ve.

### Batch 4: Migración BD (Claude Chat ejecuta, NO Code)
- 9 columnas nuevas (ver sección 3.2)
- 2 tablas nuevas: trip_event_lines, delivery_observations (ver sección 3.2)
- Refactor trigger update_equipment_location_on_delivery (ver sección 3.3)
- RLS policies para tablas nuevas (ver sección 3.5)
- Audit triggers para tablas nuevas (ver sección 3.5)
- Claude Chat ejecuta con aprobación de James
- Code regenera types: `npx supabase gen types typescript`
- **Code NO implementa features que dependen de Batch 4 hasta confirmación.**

### Batch 5: Sub-status operativo + shortcuts
**Archivos:** solicitudes lista, solicitudes detalle, programacion
**Cambios:**
- Sub-texto operativo en lista de solicitudes ("🚛 2 en tránsito")
- Banner "Confirmar Recepción →" en solicitud detalle
- Botones "Despachar →" y "Ver Eventos →" en programación
- URL params ?action= en mis-viajes/[id]
**Validación:** Solicitud "En Proceso" muestra desglose. Links navegan correctamente.

### Batch 6: Código/receptor por línea en solicitud form
**Archivos:** solicitud form (nueva/edit)
**Cambios:** Toggle fulfillment_type, checkbox código bulk/por línea, selector receptor bulk/por línea.
**Validación:** Crear solicitud con código en 1 línea y receptor en otra. Verificar datos en BD.

### Batch 7: Modal de Despacho editable
**Archivos:** mis-viajes/[id] (nuevo componente DispatchModal)
**Cambios:** Reemplaza modal simple de Salida. Editar conductor/vehículo/remolque/cantidades/agregar/remover líneas.
**Validación:** Cambiar conductor en despacho → BD refleja cambio. Remover línea → vuelve a Pendiente.

### Batch 8: Modal de Entrega con estados por línea + multi-entrega
**Archivos:** mis-viajes/[id] (refactor EventForm/modal de Entrega), useTripEvents.ts
**Cambios:** Estados por línea (OK/Con observaciones/Rechazado), código condicional, multi-entrega, INSERT trip_event_lines + delivery_observations.
**REGLA CRÍTICA (ver sección 3.3):** Cada Entrega/Retiro DEBE insertar en trip_event_lines una fila por cada línea incluida. Esto es lo que permite: (a) el trigger de ubicación filtrar correctamente, (b) la reversión saber qué deshacer, (c) el timeline mostrar detalle por línea.
**Secuencia de operaciones en registerEvent para Entrega:**
1. UPDATE sm_request_lines (qty_delivered, status) — PRIMERO, antes del INSERT en trip_events
2. UPDATE trip_line_assignments (qty_delivered)
3. INSERT trip_events (event_type='Entrega')
4. INSERT trip_event_lines (una fila por línea incluida)
5. INSERT delivery_observations (si hay líneas con observaciones)
6. El trigger de ubicación dispara automáticamente (AFTER INSERT en trip_events) y filtra por srl.status='Entregada'
**Validación:** Entrega con 1 línea OK y 1 con observaciones. Verificar trip_event_lines tiene 2 filas. Verificar delivery_observations tiene 1 fila. Segunda entrega en mismo viaje funciona. Trigger de ubicación solo mueve equipos de líneas Entregadas.

### Batch 9: Reversión
**Archivos:** mis-viajes/[id] (nuevo componente/botón), useTripEvents.ts (nueva función)
**Cambios:** Botón revertir, modal con razón, lógica de reversión por tipo de evento.
**REGLA CRÍTICA qty_delivered (ver sección 3.4):** Al revertir Entrega, usar `Math.max(0, qty_delivered - qtyToRevert)`. NUNCA restar directamente — `enforce_qty_integrity` bloqueará si resultado < 0.
**REGLA CRÍTICA ubicación:** La reversión de Entrega NO revierte equipment.current_location. La ubicación refleja realidad física.
**Validación:** Revertir Salida → viaje vuelve a Programado. Revertir Entrega → qty_delivered decrementado correctamente, equipo no se mueve.

### Batch 10: Self-pickup
**Archivos:** solicitud form, programación crear viaje, mis-viajes/[id] (modales Preparación/Retiro)
**Cambios:** Toggle pickup en solicitud, toggle retiro en crear viaje (oculta conductor, auto MVLPUP), secuencia Preparación→Retiro en mis-viajes, código siempre obligatorio en pickup.
**Validación:** Crear solicitud pickup. Charris programa como retiro. Almacenista prepara. PM retira con código.

### Batch 11: Visual polish + notificaciones nuevas
**Archivos:** dashboard, timeline, templates de notificación
**Cambios:** "En Tránsito Ahora" en dashboard, timeline con observaciones/reversiones, 4 notificaciones nuevas.
**Validación:** Dashboard muestra viajes activos. Emails de observaciones se envían.

---

## 8. REGLAS CRÍTICAS — NUNCA VIOLAR

1. **'En Transito' SIN acento** es canónico en BD. Mismatches fallan silenciosamente.
2. **PM no puede UPDATE trips.** RLS lo bloquea. No darle botones de Salida/Retorno.
3. **Eventos son inmutables.** Nunca UPDATE ni DELETE trip_events. Solo INSERT nuevos (incluyendo reversiones).
4. **qty_delivered acumula (+=), no sobrescribe (=).** Entregas parciales dependen de esto.
5. **Cascade trigger es AFTER UPDATE en sm_request_lines.** INSERT con status final no lo dispara.
6. **Timestamps automáticos, NO editables.** now() siempre. El usuario no puede cambiar cuándo ocurrió.
7. **UI 100% español.** Botones, labels, mensajes, placeholders.
8. **Mobile-first.** Conductores y PMs usan celulares.
9. **Monospace para IDs.** `25-506-SM-038` y `MOV-2026-001` siempre monoespaciados.
10. **No romper features existentes.** Entregas parciales, cascada, attachments, notificaciones — todo debe seguir funcionando.
11. **Reversión de Entrega: Math.max(0, qty - revert).** NUNCA restar qty_delivered directamente. enforce_qty_integrity bloquea negativos.
12. **Reversión de Entrega NO revierte ubicación de equipo.** current_location refleja realidad física.
13. **Trigger de ubicación filtra por srl.status='Entregada'.** No procesar líneas que aún no se entregaron en viajes multi-destino.
14. **trip_event_lines es obligatorio para cada Entrega/Retiro.** Sin este registro no se puede revertir ni mostrar detalle en timeline.

---

## 9. AUDITORÍA DE COMPATIBILIDAD (verificado 23-mar-2026)

Cada sistema existente fue auditado contra los cambios del rediseño:

| Sistema | Resultado | Detalle |
|---------|-----------|---------|
| Cascada de estados (línea→solicitud) | ✅ Compatible | cascade_request_status() sigue funcionando. Reversión de Entrega cambia línea a En Transito, cascada re-evalúa solicitud correctamente. |
| Entregas parciales (qty_delivered acumula) | ✅ Compatible | La lógica += no cambia. Multi-entrega es exactamente el mismo patrón. |
| Lifecycle timestamps | ✅ Compatible | date_completed no se borra al revertir (correcto). Se re-setea solo si IS NULL al re-completar. |
| Calendar/filtros en solicitudes | ✅ Compatible | Filtra por date_required, no afectado por eventos. |
| Prioridad auto-calculada | ✅ Compatible | calculate_priority() no toca eventos. |
| Confirmación code generation | ✅ Compatible | Mismo trigger, mismo mecanismo. Pickup usa el mismo código — solo cambia quién lo comparte. |
| Audit log | ✅ Compatible | audit_trigger() genérico funciona con tablas nuevas. |
| RLS policies | ✅ Corregido | PM incluido en trip_events INSERT y trip_line_assignments UPDATE. PM excluido de trips UPDATE. |
| Notificaciones email | ⚠️ Necesita fix | Timezone faltante (Batch 2). Templates nuevos (Batch 11). |
| Trigger ubicación equipos | ⚠️ Necesita refactor | Multi-entrega + Retiro — se refactoriza en Batch 4. |
| enforce_qty_integrity | ⚠️ Regla para Code | Math.max(0, ...) en reversión. Documentado en Batch 9. |
| Check constraints | ✅ Compatible | Solo line_type check ('Equipo'/'Material'). No afecta eventos. |
| Backlog query | ✅ Compatible | Filtra por status 'Pendiente'/'Parcial'. Líneas rechazadas en Retorno vuelven a 'Pendiente' — aparecen automáticamente. |
| File attachments | ✅ Compatible | trip_events.attachments JSONB sigue igual. delivery_observations.attachments usa mismo patrón. |
