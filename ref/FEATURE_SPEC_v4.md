# ICONSA — Feature Specification Document
## Sistema Digital de Movilizaciones (IC-LOG-PO-06)

**Versión:** 4.0
**Fecha:** 14 de marzo de 2026
**Autor:** James Cucalón — Ingeniero Industrial
**Generado por:** Auditoría de código fuente + base de datos Supabase
**Estado:** Refleja la aplicación tal como existe hoy

---

## 1. Resumen Ejecutivo

### 1.1 — Qué es este documento

Referencia única para cualquier persona (developer, consultor, IA, o empleado) que necesite entender, construir, modificar o mantener el sistema. Documenta lo que EXISTE hoy y lo que está PLANIFICADO.

### 1.2 — Qué hace el sistema

Digitaliza el procedimiento IC-LOG-PO-06 (Movilización de Equipos y Materiales) de ICONSA. Reemplaza un flujo basado en papel, WhatsApp, llamadas y Excel.

El sistema provee:
- Creación y seguimiento de solicitudes de movilización
- Herramienta de planificación para el coordinador de logística
- Registro de eventos de ejecución en campo
- Entregas parciales con acumulación de cantidades
- Prioridad auto-calculada por cercanía de fecha
- Dashboard con métricas operativas
- Tracking automático de ubicación de equipos
- Códigos de costo integrados con Spectrum

### 1.3 — Volumen estimado

| Métrica | Estimado |
|---------|----------|
| Solicitudes/semana | 5–15 |
| Líneas/solicitud | 2–4 |
| Viajes/semana | 8–20 |
| Proyectos activos | 3–5 |
| Usuarios concurrentes | 8–12 |
| Usuarios totales | ~20–30 |

---

## 2. Contexto

### 2.1 — La empresa

ICONSA (Ingeniería Continental, S.A.) — constructora mediana en Panamá (~160 empleados). Especializada en construcción pesada: muelles, puentes, infraestructura marítima. Opera 3-5 proyectos simultáneos. Taller de Chilibre es el centro operativo de equipos y logística.

### 2.2 — Herramientas actuales

ICONSA NO tiene M365, SharePoint, ni Teams. Usa: Basecamp, drives personales, WhatsApp, formularios en papel, Excel personal. Nada centralizado. MovimientOS es el primer esfuerzo real de digitalización.

### 2.3 — El proceso actual (IC-LOG-PO-06)

Flujo teórico: Ingeniero solicita (1 semana anticipación) → Gerente aprueba → Charris planifica → Se ejecuta → Facturación mensual.

Flujo real: Ingeniero llama/WhatsApp a Charris con ~3 días de anticipación. No hay backlog formal. Charris planifica mentalmente.

---

## 3. Usuarios y Roles

### 3.1 — Roles del sistema

| Rol | Código | Personas clave | Acceso |
|-----|--------|---------------|--------|
| Ingeniero de Proyecto | `pm` | Caballero, Jacome, Marciaga, Solís | Solicitudes (CRUD sus proyectos, VER todas), Programación (lectura) |
| Coordinador Logística | `logistica` | Carlos Charris | Todo excepto Admin y crear solicitudes |
| Conductor | `campo` | Rafael Diaz, Jose Rios, Moises Montero | Mis Viajes + eventos |
| Almacenista | `almacen` | Joseph | Mis Viajes + eventos |
| Administrador | `admin` | James | Todo |

### 3.2 — Matriz de permisos (rutas)

| Ruta | pm | logistica | campo | almacen | admin |
|------|:--:|:---------:|:-----:|:-------:|:-----:|
| /dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| /solicitudes | ✅ | ✅ | — | — | ✅ |
| /programacion | ✅(lectura) | ✅ | — | — | ✅ |
| /mis-viajes | — | ✅ | ✅ | ✅ | ✅ |
| /admin | — | — | — | — | ✅ |

### 3.3 — Regla crítica de visibilidad

**PMs ven TODAS las solicitudes de TODOS los proyectos.** Filtro default = su proyecto, pero pueden cambiar. Restricción solo en CREACIÓN: PMs crean solicitudes solo para sus proyectos asignados (via `person_projects`).

---

## 4. Módulos del Sistema

### 4.1 — Módulo: Solicitudes

#### 4.1.1 — Lista de solicitudes (`/solicitudes`)

**Archivo:** `src/app/(app)/solicitudes/page.tsx`
**Hook:** `useSolicitudes`
**Acceso:** pm, logistica, admin

**Filtros disponibles:**
- Proyecto (dropdown, default = proyecto del PM)
- Status (multi-select: Borrador, Enviada, En Proceso, Completada, Cancelada)
- Búsqueda por texto (debounced 400ms)
- MiniCalendar (click en fecha filtra solicitudes con esa date_required)
- FilterBar con chips removibles

**Columnas de la tabla:**
- ID (monospace, link a detalle)
- Proyecto (código)
- Solicitante
- Fecha Requerida (con indicador días restantes, coloreado)
- Líneas (count con iconos Equipo/Material)
- Estado (Badge)
- Prioridad (calculada client-side)
- Fecha creación (columna recién agregada por feedback Charris)

**Acciones:**
- Botón "Nueva Solicitud" (solo pm/admin)
- Click en fila → navega a detalle

#### 4.1.2 — Crear/Editar solicitud (`/solicitudes/nueva`, `/solicitudes/[id]`)

**Archivos:** `src/app/(app)/solicitudes/nueva/page.tsx`, `src/components/solicitudes/SolicitudForm.tsx`
**Hook:** `useSolicitudes`

**Campos del header:**
| Campo | Tipo | Validación | Notas |
|-------|------|-----------|-------|
| Proyecto | Select searchable | Requerido | PM: solo sus proyectos. Admin: todos. |
| Solicitante | Select/ReadOnly | Requerido | Auto-fill con usuario logueado. Editable SOLO para admin. |
| Aprobado por | Select searchable | Opcional | Filtrado por app_role = 'pm' |
| Fecha Requerida | Date input | Requerido para enviar. Admin puede fecha pasada. | |
| Notas | Textarea | Opcional | |
| Adjuntos | — | — | Placeholder "Adjuntos disponibles proximamente" |

**Lifecycle timestamps visibles en modo editar/detalle:**
- Fecha creación, Fecha envío, Fecha completada, Fecha cancelada (badges coloreados)
- Delta de completación (ej: "3 días antes" / "2 días después")

**Barra de identificación:** ID monospace + Badge status + indicador días restantes

#### 4.1.3 — Editor de líneas (`LineEditor`)

**Archivo:** `src/components/solicitudes/LineEditor.tsx`

**Campos por línea:**
| Campo | Tipo | Validación | Notas |
|-------|------|-----------|-------|
| Tipo | Toggle Equipo/Material | Requerido | Cambia campos visibles |
| Equipo | SelectWithFallback | Si tipo=Equipo | Busca spectrum_code + description. Fallback texto libre. |
| Descripción | Input | Requerido | Auto-fill al seleccionar equipo. Libre para Material. |
| Categoría Material | Input | Si tipo=Material | Texto libre (Agregados, Acero, etc.) |
| Desde | SelectWithFallback | Requerido para enviar | Ubicaciones. Fallback texto libre. |
| Hasta | SelectWithFallback | Requerido para enviar | Ubicaciones. Fallback texto libre. |
| Cantidad | Number | Min 1, step 1 | |
| Unidad | SelectWithFallback | Opcional | Fallback texto libre. |
| Extra/Sección | Select | Solo si proyecto tiene extras | BASE, E1-E6 |
| Fase/Código de Costo | Select searchable | Opcional | Filtrado por proyecto + extra |
| Categoría de Costo | Select | Opcional | Filtrado por cost_code seleccionado |
| Referencia OC | Input | Opcional | Orden de compra |
| Notas | Textarea | Opcional | |

**Lógica de cost codes en cascada:**
1. Seleccionar proyecto → cargar extras (si existen)
2. Seleccionar extra (o BASE) → cargar fases filtradas
3. Seleccionar fase → cargar categorías válidas (via cost_code_categories)

**Detección de duplicados:** Al guardar línea, busca líneas similares en BD (mismo equipo + ruta). Muestra warning con opción de continuar.

**Reglas de edición:**
- En Borrador: agregar/editar/eliminar líneas libremente
- En Enviada: editar existentes, NO agregar nuevas
- En Proceso+: solo lectura (excepto admin)

### 4.2 — Módulo: Programación

#### 4.2.1 — Página principal (`/programacion`)

**Archivo:** `src/app/(app)/programacion/page.tsx`
**Hooks:** `useTrips` (backlog + trips list)
**Acceso:** logistica, admin (pm: lectura)

**Dos secciones principales:**

**Backlog (arriba):**
- Tabla de líneas pendientes de programar
- Muestra: descripción, equipo/material icon, ruta (desde→hasta), cantidad **disponible** (quantity - qty_scheduled), proyecto, prioridad
- Líneas Parcial aparecen en backlog con cantidad pendiente
- Filtros: proyecto, tipo (Equipo/Material), búsqueda
- Checkboxes para selección múltiple → botón "Programar Viaje" (navega a /programacion/viaje/nuevo con líneas pre-seleccionadas)

**Viajes recientes (abajo):**
- Tabla de viajes programados/activos
- Columnas: ID (monospace), fecha, conductor, vehículo, status, costo
- Filtros: status, proyecto, conductor, fecha (MiniCalendar)
- Indicador ✅ si viaje tiene Entrega registrada pero está En Ruta (pendiente retorno)

#### 4.2.2 — Crear/Editar viaje (`/programacion/viaje/nuevo`, `/programacion/viaje/[id]`)

**Archivos:** `src/app/(app)/programacion/viaje/nuevo/page.tsx`, `src/components/programacion/TripForm.tsx`
**Hook:** `useTrips`

**Campos del viaje:**
| Campo | Tipo | Validación | Notas |
|-------|------|-----------|-------|
| Fecha Programada | Date | Requerido | |
| Hora de Salida | Time | Opcional | |
| Conductor | Select searchable | Opcional | Filtrado: app_role = 'campo' |
| Vehículo (Cabezal) | Select searchable | Opcional | Filtrado: type_code IN ('VHL','VHP') |
| Remolque | Select searchable | Condicional | REQUERIDO si vehículo es cabezal (CAB###). Filtrado: LIKE 'REM%'. |
| Tarifa | Select searchable | Opcional | Al seleccionar, auto-rellena Costo |
| Costo (B/.) | Number | Opcional | Pre-rellenado de tarifa, editable |
| Permiso ATT | Checkbox | — | Badge ATT visible |
| Escolta | Checkbox | — | Badge Escolta visible |
| Viaje externo | Checkbox | — | Transporte no es flota propia |
| Notas | Textarea | Opcional | Editable incluso en En Ruta |

**Asignación de líneas (LineSelector):**
- Tabla de líneas del backlog
- Pre-seleccionadas si viajan desde /programacion con checkboxes
- Cantidad asignable por línea (default = disponible)
- Fórmula: `available = quantity - qty_scheduled`

**Barra de identificación:** Trip ID monospace + Badge status + Badge ATT + Badge Escolta + Código confirmación (4 dígitos, visible para pm/logistica/admin)

**Código de confirmación:** Generado dual — frontend (useTrips) + trigger BD (safety net). 4 dígitos aleatorios. Mecanismo de delegación: PM comparte el código con quien debe recibir.

### 4.3 — Módulo: Ejecución (Mis Viajes)

#### 4.3.1 — Lista de viajes (`/mis-viajes`)

**Archivo:** `src/app/(app)/mis-viajes/page.tsx`
**Acceso:** logistica, campo, almacen, admin

Lista simple de viajes del usuario (conductor) con cards clickeables.

#### 4.3.2 — Detalle y eventos (`/mis-viajes/[id]`)

**Archivo:** `src/app/(app)/mis-viajes/[id]/page.tsx`
**Hook:** `useTripEvents`

**Información mostrada:**
- Datos del viaje (conductor, vehículo, fecha, ruta)
- Lista de líneas asignadas (descripción, ruta, cantidad con qty entregada)
- Timeline de eventos registrados
- Banner "Material entregado — pendiente retorno" (si hay Entrega pero no Retorno)

**Secuencia de eventos:**
1. **Salida** — Registra salida del taller/origen. Viaje pasa a En Ruta. Líneas a En Transito.
2. **Llegada** — Registra llegada a destino. Informativo.
3. **Entrega** — Requiere código confirmación (4 dígitos). Selector de receptor (personas del proyecto destino). Input de cantidad por línea. Actualiza qty_delivered.
4. **Retorno** — Viaje pasa a Completado.

**Evento de Entrega — detalle:**
- Ingreso de código de confirmación (CodeConfirmation component)
- Dropdown de receptor (filtrado por personas del proyecto destino + personal operativo)
- Para cada línea: input de cantidad entregada (default = quantity_assigned)
- Actualiza: trip_line_assignments.qty_delivered, sm_request_lines.qty_delivered (acumulado), status de línea (Entregada si completa, Parcial si incompleta)
- Cascade trigger actualiza solicitud padre

**Timestamps:** Automáticos (now()), NO editables por usuario.

### 4.4 — Módulo: Dashboard

**Archivo:** `src/app/(app)/dashboard/page.tsx` (Server Component)
**Acceso:** Todos los roles

**4 KPIs:**
1. Solicitudes Pendientes (Enviadas + En Proceso)
2. Ítems Sin Programar (líneas Pendiente + Parcial, excluyendo solicitudes Borrador/Cancelada/Completada)
3. Viajes Próximos (Programado + En Ruta, hoy + 3 días)
4. Completadas del mes

**Widgets:**
- Chart: Solicitudes activas por proyecto (bar chart horizontal)
- Backlog Crítico: líneas pendientes vencidas o >7 días sin programar (top 10)
- Solicitudes Recientes: últimas 5 activas con status, prioridad, proyecto
- Viajes Hoy: viajes programados/en ruta de hoy

**Dashboard es global** — todos los roles ven las mismas métricas. Dashboards personalizados por rol son feature futuro.

### 4.5 — Módulo: Administración

**Archivo:** `src/app/(app)/admin/masters/page.tsx`
**Acceso:** Solo admin

**6 tabs CRUD:**
1. **Proyectos** — code, name, status (Activo/Cerrado toggle)
2. **Personas** — name, app_role, status. Modal con formulario.
3. **Equipos** — spectrum_code, description, type_code, status, current_location
4. **Ubicaciones** — name, location_type, project_id
5. **Tarifas** — code, description, rate (B/.)
6. **Extras** — code, description por proyecto (secciones de cost codes)

Cada tab: búsqueda, DataTable sorteable, modal para crear/editar, toggle de status.

**Admin mode override:** Admin puede editar cualquier solicitud independientemente de status (cambiar status, fecha pasada, solicitante editable).

### 4.6 — Módulo: Calendario

**Archivo:** `src/app/(app)/programacion/calendario/page.tsx`
**Acceso:** logistica, admin

Calendario look-ahead de 2 semanas con viajes programados.

---

## 5. Estados y Transiciones

### 5.1 — Solicitudes

```
Borrador → Enviada → En Proceso → Completada / Cancelada
```

**NO existe 'Parcial' a nivel de solicitud.**

| Transición | Trigger | Quién |
|-----------|---------|-------|
| → Borrador | Crear solicitud | pm, admin |
| Borrador → Enviada | Click "Enviar" | pm, admin |
| Borrador → Cancelada | Cancelar | pm, admin |
| Enviada → En Proceso | Línea cambia a Programada/En Transito/Entregada/Parcial | Sistema (cascada) |
| En Proceso → Completada | delivered + cancelled = total AND delivered > 0 | Sistema (cascada) |
| → Cancelada | Todas líneas canceladas | Sistema (cascada) |
| → Enviada | Nada en movimiento | Sistema (cascada) |

### 5.2 — Líneas

```
Pendiente → Programada → En Transito → Entregada / Parcial / Cancelada
```

**'En Transito' SIN acento es canónico.**

| Transición | Trigger |
|-----------|---------|
| → Pendiente | Crear línea |
| Pendiente → Programada | Asignar a viaje |
| Programada → Pendiente | Cancelar viaje (libera líneas) |
| Programada → En Transito | Evento Salida |
| En Transito → Entregada | Evento Entrega con qty_delivered >= quantity |
| En Transito → Parcial | Evento Entrega con qty_delivered < quantity |
| Cualquiera → Cancelada | Cancelación manual |

### 5.3 — Viajes

```
Programado → En Ruta → Completado / Cancelado
```

### 5.4 — Cascada

Trigger AFTER UPDATE en sm_request_lines. SECURITY DEFINER. Cuenta: total, delivered, cancelled, in_progress (Programada+En Transito), parcial.

Prioridad de evaluación:
1. `delivered + cancelled = total AND delivered > 0` → Completada
2. `cancelled = total` → Cancelada
3. `in_progress > 0 OR delivered > 0 OR parcial > 0` → En Proceso
4. Default → Enviada

NO modifica solicitudes en Borrador o Cancelada.

---

## 6. Reglas de Negocio

### 6.1 — Auto-generación de IDs
- Solicitudes: `{código_proyecto}-SM-{###}` (secuencial por proyecto)
- Viajes: `MOV-{YYYY}-{###}` (secuencial global por año)
- Código confirmación: 4 dígitos aleatorios (generado dual: frontend + trigger BD)

### 6.2 — Prioridad automática
Calculada por días hasta date_required: <0=Vencida, 0-3=Urgente, 4-7=Próxima, 8+=Normal.
Dual: trigger BD (INSERT/UPDATE) + client-side `calculatePriority()`.

### 6.3 — Entregas parciales
- `qty_delivered` acumula en trip_line_assignments Y sm_request_lines
- Si qty_delivered >= quantity → Entregada
- Si qty_delivered > 0 y < quantity → Parcial
- Líneas Parcial reaparecen en backlog con cantidad disponible

### 6.4 — Equipment location tracking
Trigger BD en trip_events (INSERT donde event_type='Entrega'): actualiza equipment.current_location y current_project_id.

### 6.5 — Cost codes en cascada
Proyecto → Extra/Sección (opcional) → Fase (cost_codes) → Categoría (cost_code_categories → cost_categories).
`full_code` auto-generado: `{proyecto}[-{extra}]-{fase}`.

### 6.6 — Fallback universal en dropdowns
Cada Select tiene "No está en lista" → campo texto libre (columnas `_text`). Sugerencia se crea en tabla `suggestions` para que admin agregue el valor.

### 6.7 — Remolque condicional
Requerido cuando vehículo es cabezal (CAB### o código que empiece con CAB). Remolques: spectrum_code LIKE 'REM%'.

### 6.8 — Edición de solicitudes
- Borrador: todo editable, agregar/quitar líneas
- Enviada: editar líneas existentes, NO agregar nuevas
- En Proceso+: solo lectura (excepto admin)

### 6.9 — Detección de duplicados
Al crear línea, busca en BD líneas similares (mismo equipo + misma ruta). Warning visual con opción de continuar.

---

## 7. Modelo de Datos

Ver `Docs/SPEC.md` para schema completo con columnas, triggers, funciones, RLS.

Resumen: 20 tablas, 14 funciones, 27 triggers, 69 RLS policies.

---

## 8. Notificaciones

### Implementado
Nada. Pendiente pre-producción.

### Planificado (email via NestJS)
| Evento | Destinatario |
|--------|-------------|
| Solicitud enviada | Charris (logistica) |
| Solicitud programada | PM solicitante |
| Solicitud completada | PM solicitante |
| Solicitud vencida | Charris + PM |

---

## 9. Requisitos No Funcionales

- UI 100% en español
- Mobile-first (conductores e ingenieros usan celulares)
- Monospace para IDs de solicitud y viaje
- Redirect después de guardar: nuevo→lista, editar→se queda, enviar→lista
- Equipos filtrados: type_code NOT IN ('ING')
- Solicitante auto-fill con usuario logueado, readonly (excepto admin)
- Aprobado por filtrado: solo personas con app_role = 'pm'

---

## 10. Lo que Está Construido y Funciona

- Login con Supabase Auth
- CRUD solicitudes con líneas (equipo + material + cost codes)
- Backlog de líneas pendientes con prioridad visual y cantidades disponibles
- Crear viajes, asignar líneas múltiples, programar
- Calendario look-ahead 2 semanas
- Registrar 4 tipos de eventos (Salida → Llegada → Entrega → Retorno)
- Entrega con código confirmación 4 dígitos + selector receptor
- Entregas parciales (qty_delivered acumula, status Parcial, backlog muestra disponible)
- Dashboard global con 4 KPIs + chart + backlog crítico + recientes
- Admin Masters (6 tabs CRUD)
- Cost codes en cascada desde Spectrum (138 fases, 656 combos)
- Equipment location tracking automático
- Prioridad viva client-side
- Admin mode override
- formatQty (cantidades como enteros)

---

## 11. Lo que Falta — Ver Docs/ROADMAP.md

Prioridad 1: Fix RLS, notificaciones email, file attachments, user guide, feedback forms.
Prioridad 2: Movilizaciones externas, ATT adjuntos, conductores de proyecto, entrega por personal proyecto, admin mejorada.
Prioridad 3: Dashboards personalizados, reportes Metabase, datos históricos.
Prioridad 4: GPS, Spectrum API, QR, PWA offline, inventario, otros SOPs.

---

## 12. Preguntas Abiertas

1. ¿Cómo manejar movilizaciones donde el conductor/vehículo son del proyecto, no de la flota?
2. ¿El popup de movilización externa qué campos debe tener?
3. ¿Quién exactamente puede recibir entregas? ¿Cualquier persona del proyecto o solo calificados?
4. ¿Qué ve cada rol en su dashboard personalizado? (Gerente vs Charris vs PM)
5. ¿Cómo integramos el permiso ATT como adjunto? ¿Upload en el viaje o referencia a documento externo?
6. ¿Las cantidades se confirman al momento de Salida (qty_dispatched) o solo al momento de Entrega?
7. ¿Driver-vehicle qualification matrix: de dónde viene esta data? ¿Charris la mantiene o viene de otro sistema?

---

## 13. Glosario

- **Solicitud (SM):** Pedido formal para mover equipo/material. ID: `{Proyecto}-SM-{###}`.
- **Línea:** Un ítem dentro de solicitud (equipo o material + origen/destino/cantidad).
- **Viaje (Trip):** Salida física de vehículo. ID: `MOV-{YYYY}-{###}`. Puede llevar líneas de múltiples solicitudes.
- **Backlog:** Líneas pendientes de programar. Vista principal de Charris.
- **Charris:** Carlos Charris — Coordinador de Logística. Usuario principal del sistema.
- **Chilibre:** Taller central de ICONSA (= Almacén Central). Origen/destino principal.
- **Parcial:** Status de línea cuando qty_delivered < quantity. NO existe a nivel de solicitud.
- **Fase / Código de Costo:** Línea presupuestaria de Spectrum. Cada proyecto tiene fases, algunas en secciones (extras E1-E6).
- **Cascada:** Trigger que re-evalúa status de solicitud basándose en status de sus líneas.
- **Código de confirmación:** 4 dígitos generados al crear viaje. PM comparte con quien debe recibir.
- **Fallback:** "No está en lista" → texto libre cuando valor no existe en dropdown.
