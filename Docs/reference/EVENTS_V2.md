# Events V2 — Diseño consolidado del sistema de eventos

> **Consolidación de 2 docs históricos** (2026-04-14):
>
> - `Docs/archive/EVENTS_V2_MASTER_FOR_CODE.md` (23-mar-2026, 737 líneas) —
>   diseño original con wireframes y plan de batches
> - `Docs/archive/EVENTS V2 issues.md` (07-abr-2026, 708 líneas) —
>   living doc con bugs post-batches, decisiones evolutivas, architectural
>   debt, design de Parada, priority matrix
>
> Este doc es el **estado target** del event system: lo que se decidió
> construir y cómo. **No es un changelog** — no describe qué está hecho
> vs qué falta. Ese gap analysis se hace separado leyendo el código
> actual en `jaime/dev`. Contradicciones entre los 2 originales se
> resolvieron **a favor del issues doc (más reciente)**.

---

## 1. Contexto — por qué Events V2

**El sistema de eventos original** (Salida → Llegada → Entrega → Retorno,
modal simple, código obligatorio) tenía gaps conocidos al servir el flujo
operativo real de ICONSA:

- Conductor no podía editar conductor/vehículo/cantidades en la Salida
- Entrega obligaba código en todos los casos, sin considerar entregas rutinarias
- Pickup (retiro por PM en Chilibre) no existía como flujo distinto
- Reversiones no existían — un evento mal registrado quedaba perdido
- Entregas parciales no soportaban qty per-line editable
- Observaciones en la entrega (material dañado, cantidad incorrecta) no
  se capturaban
- Paradas intermedias (pickup en proveedor, entrega en bodega externa)
  no se registraban — perdía data valiosa del trip real

Events V2 es el rediseño que resuelve esos gaps. Se ejecutó parcialmente
en batches 0–11 entre marzo y abril de 2026. Algunas features están
implementadas, otras a medio construir, otras solo diseñadas. El audit
consolidado de abril (Fases A–E) arregló bugs de correctness/seguridad
pero no terminó de **perfeccionar** las features de Events V2.

## 2. Scope

### Dentro del scope de Events V2

- Rediseño de la UI de `/mis-viajes/[id]` (secuencia de eventos, modales)
- Nuevos event types: Preparación, Retiro, Reversión, Parada
- Estados per-line en Entrega (OK, Con observaciones, Rechazado)
- Multi-entrega (N entregas por trip, una por destino)
- Reversiones con audit trail (reverts_event_id, no DELETE)
- Self-pickup como flujo diferenciado (sin Salida/Llegada/Retorno)
- Códigos de confirmación opcionales a nivel línea (`requires_code`)
- Receptores designados a nivel línea (`designated_receiver_id`)
- Sub-status operativo en lista de solicitudes
- Shortcuts en programación y solicitud detail
- Timeline mejorada con detalle per-line + observaciones
- Dashboard "En Tránsito Ahora"
- 4 nuevas notificaciones email planificadas (2 implementadas: `notifyReversionRegistrada`, `notifyMaterialPreparado`; 2 pendientes: `notifyEntregaConObservaciones` G3, `notifyLineaRechazada` G4). Total actual: 18 funciones `notify*` en `src/lib/notifications/actions.ts`

### Fuera del scope de Events V2

- GPS integration (Priority 2)
- Dashboards por rol (Priority 3)
- Reportes auto-generados (Priority 5)
- Procurement module completo (Parada Level 3 — roadmap futuro)
- Architectural debt migrations (AD-1 PickupOrder entity, AD-2 custody_transfers)

---

## 3. Flujos target (estado designado)

### 3.1 Fleet delivery (flujo estándar)

```
Programado → Salida/Despacho → (Llegada opcional) → Entrega* → Retorno → Completado
                                                  ↑
                                            * multi-entrega
                                              posible
```

**Reglas:**

- Retorno está disponible **siempre después de Salida** como botón
  secundario — un camión puede regresar sin entregar (ej. proyecto
  cancelado, material rechazado)
- Cada Entrega cubre un subconjunto de líneas (checkboxes en modal)
- Líneas "Con observaciones" o "Rechazado" se registran en
  `delivery_observations`
- Líneas rechazadas vuelven a Pendiente al Retorno
- Código de confirmación solo aparece si alguna línea de esa entrega
  tiene `requires_code=true`

### 3.2 Self-pickup (flujo separado, secuencia más corta)

```
Programado → Preparación → Retiro → Completado
```

**Reglas:**

- PM indica "Retiro en Chilibre" al crear solicitud (⚠️ D11 cambió esto,
  ver sección 4 — hoy la decisión es de Charris en programación)
- Charris programa como retiro (toggle en `/programacion/viaje/nuevo`)
  → oculta conductor/vehículo, auto-selecciona tarifa MVLPUP $75
- Almacenista marca material listo (evento Preparación)
- PM viene a recoger, almacenista comparte código verbalmente
- PM entra código en su app (evento Retiro) → trip completa automáticamente
- **Código siempre obligatorio en pickup** (independiente del flag
  `requires_code` de la línea) — el código ES el mecanismo de verificación
- No hay Salida, Llegada, ni Retorno en pickup

### 3.3 Incidencia (cualquier momento)

- Cualquier rol excepto (decisión pendiente en D8) puede registrar
- No cambia status de trip ni líneas
- Notifica a Charris + PMs afectados
- Registro libre de texto + fotos

### 3.4 Reversión (cualquier evento principal)

| Evento revertido | Trip vuelve a | Líneas vuelven a | Ubicación equipo |
|---|---|---|---|
| Salida | Programado | Programada | Sin cambio |
| Entrega | En Ruta | En Transito (si `qty_delivered=0`) o Parcial (si > 0) | **NO revertir** — refleja realidad física |
| Retorno | En Ruta | Sin cambio | Sin cambio |
| Retiro (pickup) | En Ruta | Mismo patrón que Entrega | NO revertir |
| Parada | Sin cambio | Sin cambio | Sin cambio |
| Llegada | En Ruta (limpia `actual_arrival`) | Sin cambio | Sin cambio |

**Reglas:**

- Eventos son **inmutables**: reversión es un INSERT de un evento
  `Reversion` apuntando al original via `reverts_event_id`
- El evento original queda en timeline con badge "⟲ Revertido"
- Si hay múltiples eventos revertibles (ej. Salida → Entrega), hay que
  revertir **en orden inverso** (Entrega primero, luego Salida).
  Implícito por `lastRevertible` que toma el último no-revertido
- Al revertir Entrega: `newQty = Math.max(0, qty_delivered - revertQty)`
  **nunca** restar directo (el trigger `enforce_qty_integrity` bloquea
  negativos)
- Al revertir Entrega: NO revertir `equipment.current_location` — la
  ubicación refleja realidad física del equipo

### 3.5 Parada (stops intermedios — D12 Level 1)

```
Salida → Parada* → (Llegada opcional) → Entrega* → Retorno
           ↑
     múltiples paradas
     posibles por trip
```

**Reglas:**

- Conductor registra Parada en cualquier momento entre Salida y Retorno
- Tipo: Retiro de material, Entrega de material, Intercambio
- Ubicación: texto libre (auto-sugerida desde `from_text` de las líneas
  del trip si aplica)
- **Informativo — NO cambia status de solicitud/línea.** La Entrega al
  proyecto es lo que cambia status. Parada solo registra qué pasó en
  el camino.
- Optional: asociar líneas específicas con status "completo/parcial/
  no_disponible" + notas en texto libre
- Optional: Nro de OC (texto libre — Level 1 no digitaliza OCs)
- Attachments: factura, foto, nota de entrega
- Email notification a stakeholders cuando hay attachment
- Level 2 y 3 son futuro (ver sección 7)

---

## 4. Diseño por pantalla

### 4.1 `/solicitudes` (lista) — Sub-status operativo

Para solicitudes "En Proceso", mostrar sub-texto inline debajo de la
fila con desglose operativo:

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

No columna nueva — texto pequeño gris inline.

### 4.2 `/solicitudes/[id]` (detalle)

**Banner "Material en camino"** (condicional, solo si hay líneas En Transito):

```
┌──────────────────────────────────────────────────────┐
│ 🚛 Material en camino → {destino}                    │
│ Viaje {trip_id} | {conductor} | Salió {hora}         │
│                           [Confirmar Recepción →]    │
└──────────────────────────────────────────────────────┘
```

"Confirmar Recepción →" = `<Link href="/mis-viajes/{trip_uuid}?action=deliver">`

**Barra de progreso por línea:** indicador visual del status actual.

**Timeline consolidada:** eventos de TODOS los viajes asociados a la
solicitud, en orden cronológico.

### 4.3 `/solicitudes/nueva` y `[id]/edit`

> ⚠️ **D11 (post-master):** El radio "Envío por flota / Retiro en
> Chilibre" fue **removido** del formulario de solicitud en `2faf6e2`.
> Decisión: pickup es decisión de Charris en programación, no del PM
> en la solicitud. Esta sección documenta el diseño **original** del
> master que fue rechazado. El toggle de pickup vive en
> `/programacion/viaje/nuevo` (TripForm).

**A nivel de cada línea (expandible "⚙️ Opciones avanzadas"):**

- `☑ Requiere código` — override del default de solicitud
- `Receptor: [Nombre ▼]` — override del default de solicitud

Mayoría de PMs no toca estas opciones.

### 4.4 `/programacion` — Shortcuts (D2 original, revisado)

> **D2 (pending):** El diseño original proponía botones
> "Despachar →" / "Ver Eventos →" por viaje. Decisión evolutiva
> (issues doc): son irrelevantes — duplican el click en la fila del
> trip. Reemplazar con botón "Programar solicitud" a nivel solicitud
> que pre-llena líneas para crear trip. Status: ⏳ pending design.

**Sección "Viajes Activos" (En Ruta):** card por viaje con trip_id,
conductor, destino, hora salida, # líneas. Link "Ver Eventos →".

**Pickup badges:** "🚗 Retiro" en cards de trips con `is_self_pickup=true`.
Botón "📋 Preparar →" pre-abre modal de preparación. **D10:** re-test
pending — el badge fue reportado como missing en batch 11.

### 4.5 `/mis-viajes/[id]` — Eventos

#### 4.5.1 Botones por rol

| Rol | Despacho | Llegada | Entrega | Retorno | Parada | Incidencia | Reversión |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| logistica | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| campo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| almacen | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **pm** | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ (*ver D8*) | ❌ |

**D5 (pending):** restringir reversión a quien registró el evento + admin.
Hoy cualquier logistica/admin puede revertir cualquier evento.

**D8 (pending):** PM con botón Incidencia — el diseño original era "solo
conductores", pero PM puede necesitar reportar "material nunca llegó",
"item equivocado". Recomendación del issues doc: mantener para PM.

#### 4.5.2 Secuencia de botones (fleet)

```
Estado Programado:  [Despacho]  [Incidencia]
Estado En Ruta:     [Entrega]  [Parada]  [Retorno (secundario)]  [Llegada (opcional)]  [Incidencia]
Después de Entrega: [Entrega (otra)]  [Parada]  [Retorno]  [Incidencia]
Estado Completado:  (sin botones)
```

**Cambio crítico post-master:** Retorno disponible siempre después de
Salida, sin requerir Entrega previa.

#### 4.5.3 Secuencia de botones (pickup)

```
Estado Programado:       [Preparación]  [Incidencia]
Después de Preparación:  [Retiro]  [Incidencia]
Estado Completado:       (sin botones)
```

#### 4.5.4 Modal de Despacho

Reemplaza modal simple de Salida con UI editable:

```
┌────────────────────── DESPACHO ──────────────────────┐
│  Conductor:  [Jose Bonilla          ▼]  ← editable  │
│  Vehículo:   [Cabezal International ▼]  ← editable  │
│  Remolque:   [Lowboy 40T           ▼]  ← editable  │
│                                                      │
│  ─── CARGA ─────────────────────────────────────    │
│  ☑ Grating metal   3 und  Qty: [3]  [✕ Quitar]     │
│  ☑ Grating FRP     2 und  Qty: [2]  [✕ Quitar]     │
│  [+ Agregar línea del backlog]                      │
│                                                      │
│  [📸 Foto de Carga]                                  │
│  Notas: [________________________]                   │
│                                                      │
│             [Cancelar]  [✅ Confirmar Despacho]      │
└──────────────────────────────────────────────────────┘
```

Operaciones al confirmar:

1. UPDATE trips: `status='En Ruta'`, `actual_departure=now()`,
   driver_id, vehicle_id, trailer_id
2. UPDATE sm_request_lines: `status='En Transito'` (líneas asignadas)
3. UPDATE trip_line_assignments: `qty_dispatched`
4. INSERT trip_events: `event_type='Salida'`, `source='manual'`
5. Cascade trigger re-evalúa solicitudes padre
6. Notificación email `salida_registrada` con timezone Panamá

**Rol `campo`:** mismo modal pero con conductor/vehículo/remolque/
líneas/qty en **read-only** (ver). Solo puede confirmar. Banner
informativo: "Valores pre-programados por logística. Confirme la
salida real."

**D9 (pending):** Línea removida del dispatch — ¿desasignar del trip
(vuelve al backlog) o mantener assigned como Programada? Recomendación
issues: opción (a) desasignar. Status: pending decisión.

#### 4.5.5 Modal de Entrega

```
┌────────────────────── ENTREGA ───────────────────────┐
│  Receptor: [Juan E. Jacome     ▼]  (auto si PM)    │
│            o escribir: [________________]           │
│                                                      │
│  ─── LÍNEAS POR RECIBIR ─────────────────────────   │
│  ☑ Grating metal  Qty: [3]  Estado: [OK        ▼]  │
│  ☑ Grating FRP    Qty: [2]  Estado: [OK        ▼]  │
│                                     OK              │
│                                     Con observ.     │
│                                     Rechazado       │
│                                                      │
│  ─── CÓDIGO (solo si línea lo requiere) ──────      │
│  Código: [____]  (4 dígitos)                        │
│                                                      │
│  [  📸 FOTO DE ENTREGA ]                             │
│  Notas: [________________________]                   │
│                                                      │
│             [Cancelar]  [✅ Confirmar Entrega]       │
└──────────────────────────────────────────────────────┘
```

**Estado "Con observaciones":** expone subsección adicional:

```
│  ☑ Grating FRP  Qty: [2]  Estado: [Con observ. ▼] │
│     Tipo: [Material dañado         ▼]              │
│     Detalle: [2 piezas con golpes_______________]  │
│     [📸 Foto del daño]                              │
```

Tipos de observación: `damaged`, `wrong_qty`, `wrong_item`, `other`.

**Estado "Rechazado":** la línea se desmarca (qty=0), no se entrega.
Al Retorno vuelve a Pendiente en el backlog.

**Multi-entrega:** El botón "Registrar Entrega" aparece mientras haya
líneas En Transito en el viaje. Cada Entrega cubre un subconjunto de
líneas. Permite viajes multi-destino.

**Código condicional:** campo visible solo si ALGUNA línea seleccionada
tiene `requires_code=true`. Si ninguna lo requiere, no aparece.

**Receptor pre-seleccionado:** si la línea tiene `designated_receiver_id`
y coincide con el usuario logueado, pre-seleccionado.

**Operaciones al confirmar (orden CRÍTICO — actualizado 2026-04-16):**

1. INSERT trip_events (`event_type='Entrega'`) con UUID pre-generado — **PRIMERO**, como checkpoint de idempotencia (retry bajo red mala hace early-return si el event_id ya existe via 23505)
2. INSERT trip_event_lines (una fila por línea incluida) — **OBLIGATORIO**
3. INSERT delivery_observations (si hay líneas con observaciones)
4. UPDATE sm_request_lines (qty_delivered, status)
5. UPDATE trip_line_assignments (qty_delivered)
6. El trigger `update_equipment_location_on_delivery` dispara automáticamente y filtra por `srl.status='Entregada'`
7. Cascade trigger re-evalúa solicitudes padre
8. Notificaciones: `notifyEntregaConfirmada` per línea. (`notifyEntregaConObservaciones` y `notifyLineaRechazada` pendientes — ver G3, G4 en BACKLOG)

#### 4.5.6 Modal de Preparación (pickup)

```
┌──────────── PREPARACIÓN ─────────────────────────────┐
│  Material listo para retiro                          │
│                                                      │
│  ☑ Válvula check 4"   2 UND                         │
│                                                      │
│  [📸 Foto]                                           │
│  Notas: [Ubicado en estante B3_______]              │
│                                                      │
│             [Cancelar]  [✅ Material Listo]          │
└──────────────────────────────────────────────────────┘
```

Simple: INSERT trip_events con `event_type='Preparacion'`. No cambia
status de trip ni líneas. Informativo + notifica al PM (`material_preparado`).

#### 4.5.7 Modal de Retiro (pickup)

```
┌───────────────── RETIRO ─────────────────────────────┐
│  Retira: [Juan E. Jacome] (auto)                    │
│                                                      │
│  ☑ Válvula check 4"  Qty: [2]  Estado: [OK ▼]      │
│                                                      │
│  Código: [____]  (siempre requerido en pickup)      │
│  Pida el código al almacenista.                     │
│                                                      │
│  [📸 Foto]                                           │
│                                                      │
│             [Cancelar]  [✅ Confirmar Retiro]        │
└──────────────────────────────────────────────────────┘
```

Funciona igual que Entrega, con 2 diferencias:

- Código siempre obligatorio (independiente de `requires_code` de líneas)
- Trip completa al confirmar (RPC `complete_pickup_trip` → `status='Completado'`,
  `actual_arrival=now()`). No hay Retorno posterior.

#### 4.5.8 Modal de Parada

```
┌─────────────── PARADA INTERMEDIA ────────────────────┐
│  Ubicación: [TUBOTEC SA - Milla 8_______________]   │
│  (auto-suggested from "desde" of trip lines,        │
│   or free text for unplanned stops)                 │
│                                                      │
│  Tipo de parada:                                     │
│  ○ Retiro de material/equipo                         │
│  ○ Entrega de material/equipo                        │
│  ○ Intercambio (deja y recoge)                       │
│                                                      │
│  ── Líneas afectadas (optional) ──                   │
│  ☑ OC 29902 Tubos PVC   [Completo ▼]               │
│     Notas: [Faltan 65 tubos, los tendrán el jueves] │
│  ☑ OC 29903 Tubos cuadrados  [Completo ▼]          │
│                                                      │
│  ── Referencia OC (optional) ──                      │
│  Nro OC: [29902____]                                │
│                                                      │
│  ── Documentos ──                                    │
│  📎 [Subir factura / nota de entrega / foto]         │
│                                                      │
│  Notas: [________________________]                   │
│                                                      │
│            [Cancelar]  [✅ Registrar Parada]         │
└──────────────────────────────────────────────────────┘
```

**Operaciones al confirmar:**

1. INSERT trip_events: `event_type='Parada'`, `location`,
   `stop_type`, attachments
2. INSERT trip_event_lines per línea afectada (si hay) con quantity
   y status en campo libre
3. NO cambia status de líneas ni solicitud
4. Notificación email a stakeholders cuando hay attachment (factura)

**Reglas:**

- Parada es **optional** — no requerida antes de Entrega
- Disponible después de Salida y antes de Retorno
- Múltiples Paradas por trip (una por stop)
- Timeline muestra 📍 icon con location + type + attachments

#### 4.5.9 Botón Reversión

Solo visible para `logistica`/`admin` (D5 propone restringir a
`registered_by + admin`, pending). Solo activo si hay un evento
revertible (último no-revertido que sea Salida/Entrega/Llegada/Retorno/
Retiro/Parada).

```
┌────────────────────────────────────────────────┐
│  ⟲ Revertir {tipo evento}                      │
│  Razón: [_________________________________]    │
│  [Cancelar]  [⟲ Confirmar Reversión]           │
└────────────────────────────────────────────────┘
```

Al confirmar: INSERT trip_events con `event_type='Reversion'` y
`reverts_event_id` apuntando al evento original. Lógica específica
por tipo de evento revertido (ver sección 3.4). El evento original
queda en timeline con badge "⟲ Revertido".

#### 4.5.10 Timeline mejorada

```
🚛 DESPACHO — 9:31 AM — Charris
   Jose Bonilla | International + Lowboy
   📎 1 foto

📍 PARADA — 10:15 AM — Conductor en TUBOTEC SA
   Tipo: Retiro de material
   OC 29902: Parcial — "Faltan 65 tubos, los tendrán el jueves"
   📎 Factura-TUBOTEC-1234.pdf

✅ ENTREGA — 11:10 AM — Jacome
   Grating metal: 3/3 OK ✓
   Grating FRP: 2/2 ⚠️ Material dañado
   📎 2 fotos

🏠 RETORNO — 12:26 PM — Charris
```

**Badge "⟲ Revertido":** eventos revertidos se muestran con opacity
reducida + línea diagonal + tooltip con razón del revert.

**D6 (pending):** links clickeables en eventos — click en trip →
`/mis-viajes/[id]`, click en solicitud → `/solicitudes/[id]`.

### 4.6 `/dashboard` — En Tránsito Ahora

Sección nueva visible solo cuando hay viajes En Ruta. Cards por viaje
con trip_id, destino, conductor, hora salida. Desaparece cuando no
hay viajes activos. **D6 (pending):** hacer clickeables.

---

## 5. Modelo de datos

### 5.1 Columnas nuevas (Batch 4 del plan original, ya aplicadas en staging)

| Tabla | Columna | Tipo | Default | Para qué |
|---|---|---|---|---|
| sm_requests | `fulfillment_type` | TEXT | 'fleet' | 'fleet' o 'pickup' (pero D11 quitó el toggle del form) |
| sm_request_lines | `requires_code` | BOOLEAN | false | Código de confirmación por línea |
| sm_request_lines | `designated_receiver_id` | UUID FK→people | NULL | Receptor designado |
| sm_request_lines | `designated_receiver_name` | TEXT | NULL | Fallback texto del receptor |
| trips | `is_self_pickup` | BOOLEAN | false | Viaje de retiro |
| trip_line_assignments | `qty_dispatched` | NUMERIC(10,2) | 0 | Qty real despachada |
| trip_events | `reverts_event_id` | UUID FK→trip_events | NULL | Para reversiones |
| trip_events | `source` | TEXT | 'manual' | 'manual' o 'gps' |
| trip_events | `location` | TEXT | NULL | Ubicación de Parada |
| trip_events | `stop_type` | TEXT | NULL | 'retiro'/'entrega'/'intercambio' |
| vehicles | `gps_vehicle_id` | TEXT | NULL | ID Startrack GPS (future-proof) |

### 5.2 Tablas nuevas

**`trip_event_lines`** — línea del evento por línea de solicitud:

```sql
CREATE TABLE trip_event_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_event_id UUID NOT NULL REFERENCES trip_events(id),
  request_line_id UUID NOT NULL REFERENCES sm_request_lines(id),
  quantity NUMERIC(10,2) NOT NULL,
  line_status TEXT NOT NULL, -- 'ok', 'partial', 'with_observations', 'rejected'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Obligatorio para cada Entrega/Retiro:** una fila por línea incluida
en el evento. Sin esto: (a) el trigger de ubicación no filtra correctamente,
(b) la reversión no sabe qué deshacer, (c) el timeline no puede mostrar
detalle per-line.

**`delivery_observations`** — problemas reportados en entrega:

```sql
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

**Inmutable:** sobrevive a reversiones del evento Entrega que las creó.
Son evidencia histórica del reporte del conductor.

### 5.3 Refactor del trigger de ubicación

El trigger original `update_equipment_location_on_delivery` tenía 2 bugs
que el refactor de Batch 4 resolvió:

- **Multi-entrega:** procesaba TODAS las líneas del viaje, no solo las
  entregadas en ese evento
- **Self-pickup:** solo aceptaba `event_type='Entrega'`, ignoraba `'Retiro'`

Trigger corregido: procesa solo líneas con `srl.status='Entregada'` (las
que acaban de cambiar), acepta ambos `Entrega` y `Retiro`, SECURITY DEFINER
con `SET search_path = public, pg_temp`.

### 5.4 Reglas de enforce_qty_integrity

El trigger valida:

```plpgsql
IF NEW.qty_delivered < 0 THEN RAISE EXCEPTION ...
IF NEW.qty_delivered > NEW.quantity THEN RAISE EXCEPTION ...
```

**Regla para el código de reversión:**

```typescript
const newQtyDelivered = Math.max(0, (currentLine.qty_delivered ?? 0) - qtyToRevert)
```

**Nunca** hacer `qty_delivered = qty_delivered - X` directamente — si X
excede el actual, el trigger bloquea con excepción y la reversión falla
silenciosamente.

**Regla adicional:** reversión de Entrega NO revierte `equipment.current_location`.
Refleja realidad física del equipo.

### 5.5 Flujo RLS (post-Batch 0)

| Tabla | Operación | Roles permitidos |
|---|---|---|
| `trip_events` | INSERT | logistica, campo, almacen, admin, **pm** |
| `trip_events` | SELECT | todos |
| `trip_line_assignments` | INSERT | logistica, admin |
| `trip_line_assignments` | UPDATE | logistica, admin, **pm, campo, almacen** |
| `trips` | INSERT | logistica, admin |
| `trips` | UPDATE | logistica, admin, **campo, almacen** (NO pm) |
| `sm_request_lines` | UPDATE | pm, admin, logistica, campo, almacen |
| `trip_event_lines` | INSERT | logistica, campo, almacen, admin, pm |
| `delivery_observations` | INSERT | logistica, campo, almacen, admin, pm |

**PM no puede UPDATE trips** — diseño deliberado. PM no registra Despacho
ni Retorno. Solo Entrega (que no toca trips.status) e Incidencia.

---

## 6. Decisiones de diseño (D1–D12)

### D1 — Retorno sin Entrega → trip Completado pero líneas En Transito

**Status:** ✅ Resuelto. Retorno ahora maneja líneas no-entregadas:
vuelven a Pendiente/Parcial con `qty_scheduled` decrementado. Trip
completa, cascade re-evalúa solicitudes.

### D2 — Shortcuts en programación son irrelevantes

**Status:** ⏳ Pending design. "Despachar →" / "Ver Eventos →" duplican
el click en la fila. Reemplazar con botón "Programar solicitud" que
pre-llena líneas para crear trip. Más útil para Charris.

### D3 — Signifiers en backlog

**Status:** ⏳ Pending implementation. Badge 🔑 para líneas con
`requires_code=true`. Pickup badges diferidos hasta redesign de pickup
(ver AD-1).

### D4 — Pickup + fleet lines mezcladas en un trip

**Status:** ⏳ DEFERRED. Hidden pickup del solicitud form (D11), se
redesign cuando Charris/PMs clarifiquen cómo pickup se decide en la
realidad. Decisión: pickup es a nivel programación (Charris), no
solicitud (PM).

### D5 — Reversión restringida a quien registró + admin

**Status:** ⏳ Pending implementation. Hoy cualquier logistica/admin
revierte cualquier evento. Si Jacome registró Entrega, Charris no
debería poder revertirla.

### D6 — Dashboard "En Tránsito" con links clickeables

**Status:** ⏳ Pending implementation. Click en trip → `/mis-viajes/[id]`.
Click en solicitud → `/solicitudes/[id]`.

### D7 — Reversión cascade: Llegada edge case

**Status:** ✅ Fixed. Llegada en `revertibleTypes`. Revert limpia
`actual_arrival`. Orden natural: hay que revertir Llegada antes de Salida
(enforced por `lastRevertible`).

### D8 — PM con botón Incidencia

**Status:** ⏳ Pending decisión. Diseño original era "solo conductores".
Recomendación del issues doc: mantener para PM (útil para reportar
"material nunca llegó", "item equivocado").

### D9 — Línea removida del dispatch queda como Programada

**Status:** ⏳ Pending decisión. Cuando Charris desmarca una línea en
DispatchModal, queda assigned al trip con `status='Programada'`. Opciones:

- (a) Unassign del trip (DELETE trip_line_assignment) → vuelve al backlog
- (b) Mantener como Programada para dispatch attempt siguiente

Recomendación: opción (a) — más limpia.

### D10 — Pickup badge missing en lista de solicitudes

**Status:** ⏳ Needs re-test. Batch 11 agregó el badge pero James
reportó que no aparece. Needs verification post-staging wipe + new
test data.

### D11 — Remover pickup del solicitud form (DECIDIDO)

**Status:** ✅ Implementado (`2faf6e2`). Radio "Envío por flota / Retiro
en Chilibre" removido del formulario de solicitud. Pickup vive en
`/programacion/viaje/nuevo` (TripForm), donde Charris decide. Tarifa
MVLPUP $75.

### D12 — Parada event (diseño completo, Level 1 implementado)

**Status:** ✅ Level 1 implementado (`446b0c7`). Level 2 (DGI QR
scanning) y Level 3 (procurement module completo) son roadmap futuro.
Ver sección 7.

---

## 7. Architectural debt (AD1–AD5)

### AD-1: Self-pickup forzado en Trip entity

**Problema:** `trips.is_self_pickup=true` forzó pickup en Trip con null
driver, null vehicle, phantom conductor fields. Cada Trip query/display
ahora verifica `is_self_pickup` para ocultar fields sin sentido.

**Diseño correcto** (`Docs/reference/Self-pickup.md`): `pickup_orders`
table con state machine propio (Creado → Preparado → Completado). Trip
y PickupOrder convergen en `custody_transfers`.

**Effort:** ~2 semanas (schema + frontend + data migration).

**Status:** ⏳ DEFERRED. Plan antes de construir más features sobre
el hack.

### AD-2: `custody_transfers` table — la primitiva universal

**Problema:** El trigger de ubicación de equipos está acoplado a
`trip_events`. Agregar nuevo fulfillment method (third-party, inter-project)
requiere modificar el trigger.

**Diseño correcto:** Todos los movimientos (Entrega, Retiro, futuros)
escriben a `custody_transfers`. Un solo trigger en esa tabla actualiza
`equipment.current_location`. Log inmutable de cadena de custodia.

**Schema:**

```sql
CREATE TABLE custody_transfers (
  id UUID PK,
  equipment_id UUID FK,
  from_location TEXT,
  to_location TEXT,
  from_custodian UUID FK→people,
  to_custodian UUID FK→people,
  timestamp TIMESTAMPTZ,
  confirmation_method TEXT,
  fulfillment_method TEXT -- 'fleet_delivery' | 'self_pickup' | 'third_party'
);
```

**Effort:** ~1 semana (schema + trigger refactor + backfill).

**Status:** ⏳ Pending. Foundational para Parada, pickup, y future methods.
La tabla existe en staging pero el trigger no está activo.

### AD-3: Fulfillment a nivel Trip, no línea

**Problema:** `sm_requests.fulfillment_type` + `trips.is_self_pickup`
son header-level. Una solicitud es fleet O pickup, no mixed. PM que
necesita 1 item por truck + 1 por pickup tiene que crear 2 solicitudes
separadas.

**Diseño correcto:** `fulfillment_method` a nivel `sm_request_lines`.
Charris asigna algunas líneas a un Trip y crea PickupOrder para otras.
La solicitud agrega status sobre ambas.

**Effort:** ~1 semana (mover campo a line level, update UI, update
programming flow).

**Status:** ⏳ DEFERRED. Depende de AD-1 (PickupOrder entity).

### AD-4: PM ve código en pickup

**Problema original:** `canSeeConfirmationCode = role IN ('logistica',
'admin', 'pm')` — PM podía ver el código en pickup, rompiendo el
mecanismo de verificación (la idea es que el almacén tiene el código,
no el PM).

**Status:** ✅ Fixed (`6b92458`). PM no ve código en trips `is_self_pickup=true`.

### AD-5: No warehouse worker mobile UX optimization

**Recomendación del Self-pickup doc:** 4 audio tones distintos, touch
targets 56×56dp para guantes, high contrast outdoor, offline con queued
sync.

**Status:** 🔮 Future. No bloqueante para MVP pero importante para
adopción en Chilibre warehouse.

---

## 8. Reglas críticas — NUNCA violar

1. **'En Transito' SIN acento** es canónico en BD. Mismatches fallan silenciosamente.
2. **PM no puede UPDATE trips.** RLS lo bloquea. No darle botones de Salida/Retorno.
3. **Eventos son inmutables.** Nunca UPDATE ni DELETE trip_events. Solo INSERT nuevos (incluyendo reversiones).
4. **`qty_delivered` acumula (+=), no sobrescribe (=).** Entregas parciales dependen de esto.
5. **Cascade trigger es AFTER UPDATE en sm_request_lines.** INSERT con status final no lo dispara (gotcha de seed data).
6. **Timestamps automáticos, NO editables.** `now()` siempre. El usuario no puede cambiar cuándo ocurrió.
7. **UI 100% español.** Botones, labels, mensajes, placeholders.
8. **Mobile-first.** Conductores y PMs usan celulares.
9. **Monospace para IDs.** `25-506-SM-038` y `MOV-2026-001` siempre monoespaciados.
10. **No romper features existentes.** Entregas parciales, cascada, attachments, notificaciones — todo debe seguir funcionando.
11. **Reversión de Entrega: `Math.max(0, qty - revert)`.** Nunca restar `qty_delivered` directamente.
12. **Reversión de Entrega NO revierte ubicación de equipo.** `current_location` refleja realidad física.
13. **Trigger de ubicación filtra por `srl.status='Entregada'`.** No procesar líneas que aún no se entregaron en trips multi-destino.
14. **`trip_event_lines` es obligatorio para cada Entrega/Retiro.** Sin este registro no se puede revertir ni mostrar detalle.

---

## 9. Priority matrix — qué va cuándo

### ⛔ Deployment blocker (antes de merge a prod)

- Batch 4 migración aplicada en prod (columnas + tablas + RLS + triggers)
- `complete_pickup_trip()` function en prod
- Audit Fase B.1 fixes aplicados en prod (RLS en 22 tablas, CHECK constraints,
  triggers, indexes)

**Deploy sequence:** merge_branch Supabase (staging → prod) → git merge
jaime/dev → main → Vercel auto-deploys.

### 🎯 Event system perfected — Priority 1

Items confirmados como "construidos pero no perfeccionados" (gap analysis
pendiente para determinar exactamente qué):

1. Editable DispatchModal (Batch 7)
2. Entrega per-line con observaciones (Batch 8)
3. Reversión por tipo de evento (Batch 9)
4. Self-pickup flow completo (Batch 10)
5. Parada Level 1 (post-Batch 11)

Items pendientes del design:

- D2 Programar solicitud button
- D3 Signifiers 🔑 en backlog
- D5 Reversión restricted a registrante
- D6 Dashboard links clickeables
- D8 PM Incidencia decisión
- D9 Línea removida del dispatch decisión
- D10 Pickup badge re-test

### 🔮 Priority 2+ (fuera de scope de Events V2)

- GPS integration (Tenna-style)
- Dashboards por rol
- Admin settings page
- Reports auto-generados
- Purchase orders + invoices (Parada Level 3)
- Architectural debt migrations (AD-1, AD-2, AD-3)

---

## 10. Parada — Levels 2 y 3 (roadmap)

### Level 2: DGI QR invoice scanning (Panama-specific)

**Scope:** Cuando conductor sube factura, opción de escanear el QR
code de la DGI para extraer CUFE (Código Único de Factura Electrónica).

**Flow:**

1. Conductor toma foto de factura O tap "Escanear QR"
2. Cámara escanea el QR DGI → URL tipo
   `https://dgi-fep.mef.gob.pa/Consultas/FacturasPorCUFE?cufe=FE01...`
3. App extrae CUFE del URL
4. CUFE se almacena junto al attachment
5. Cualquiera puede verificar contra DGI clickeando el link

**Schema change:** `invoice_cufe` en trip_events (o tabla `invoices`
separada linked a trip_events).

**Valor:** Advantage panameña única — ningún tool US/internacional
tiene esto. Toda factura electrónica desde 2023 tiene QR obligatorio.

**Status:** 🔮 Future (después de que Level 1 esté en uso por un tiempo).

### Level 3: Full procurement module

**Scope:** Activar `purchase_orders` + `purchase_order_lines` (tablas
ya existen vacías). Digitalizar OCs, trackear fulfillment, match
invoices.

**Pre-requisitos:**

- IC-LOG-PO-01 procedure entendido y mapeado
- Workflow Calderon/Jose Miguel para crear OCs definido
- Decisión: ¿ICONSA se registra con PAC para facturación electrónica?
  (mandatory >B/.36,000/año o >100 invoices/mes desde enero 2026)

**Features:**

- OC digitization (upload PDF → Claude API extrae líneas)
- OC tracking (qty_ordered/received/pending por línea)
- Invoice matching por CUFE
- OC status dashboard para Calderon
- DGI API integration para invoice data completa
- Solicitud-OC linking (el FK `sm_request_lines.purchase_order_line_id`
  ya existe)

**Status:** 🔮 Future — sprint separado.

---

## 11. Testing checklist (6 flows E2E)

Después de cada cambio significativo, correr estos flows:

1. **Fleet básico** — crear solicitud → programar → dispatch → deliver → retorno
2. **Código verificación** — solicitud con `requires_code=true` → dispatch → entrega sin código debe fallar, con código correcto debe pasar
3. **Reversión cycle** — dispatch → revert Salida → re-dispatch / deliver → revert Entrega → verify qty_delivered decrementado → re-deliver
4. **Pickup** — crear pickup solicitud → programar retiro → preparación → retiro con código → trip Completado
5. **Multi-delivery** — solicitud qty=10 → dispatch → deliver qty=6 (Parcial) → deliver qty=4 (Entregada)
6. **Parada intermedia** — solicitud con líneas de proveedor → programar → dispatch → registrar Parada con factura + notas de parcial → Entrega en proyecto → Retorno → verificar timeline completo

### Integrity audit (SQL después de cada flow)

```sql
-- No qty_delivered > quantity
SELECT * FROM sm_request_lines WHERE qty_delivered > quantity;

-- No Completada solicitud con líneas no-Entregadas
SELECT r.request_id, srl.status FROM sm_request_lines srl
JOIN sm_requests r ON r.id = srl.request_id
WHERE r.status = 'Completada' AND srl.status NOT IN ('Entregada','Cancelada');

-- No Completado trip con líneas En Transito
SELECT t.trip_id, srl.status FROM trips t
JOIN trip_line_assignments tla ON tla.trip_id = t.id
JOIN sm_request_lines srl ON srl.id = tla.request_line_id
WHERE t.status = 'Completado' AND srl.status = 'En Transito';
```

---

## 12. Notificaciones — estado target

### Modificaciones a existentes

| Notificación | Cambio |
|---|---|
| `salida_registrada` | Timezone `America/Panama` en `toLocaleTimeString` |
| `retorno_registrado` | Timezone `America/Panama` en `toLocaleTimeString` |

### Nuevas (Batch 11 y siguientes)

| Notificación | Trigger | Destinatario |
|---|---|---|
| `entrega_con_observaciones` | Línea con `with_observations` o `rejected` | Charris + PM solicitante |
| `linea_rechazada` | Línea rechazada en entrega | Charris + PM solicitante |
| `reversion_registrada` | Evento revertido | Charris + PMs afectados |
| `material_preparado` | Evento Preparación registrado (pickup) | PM solicitante |

---

## 13. Cómo usar este doc

- **Al tocar código del event system:** leer sección 3 (flujos target)
  y sección 4 (diseño por pantalla) para entender la intención original
- **Al revisar un bug:** cruzar contra sección 8 (reglas críticas) — si
  el bug viola alguna, el fix es obvio
- **Al planificar una mejora:** revisar sección 6 (decisiones D1–D12) y
  sección 7 (AD1–AD5) para no re-inventar decisiones ya tomadas
- **Al discutir con James:** este doc refleja lo que **se decidió**,
  no lo que **está construido** — el gap analysis contra jaime/dev es
  separado
- **Al agregar features nuevos al event system:** editar este doc primero
  para documentar la decisión, después implementar

Este doc es **consultivo, no prescriptivo**. James puede cambiar cualquier
decisión si la realidad del uso lo pide. Si una decisión cambia,
actualizar la sección correspondiente + dejar nota en CHANGELOG.
