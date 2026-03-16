# MovimientOS — Feature Specification v4

> **Fuente de verdad: código del repo `jaime/dev` + BD Supabase `bzeoszympkkicwlfdtcn`**
> Generado: 2026-03-13 por Claude Chat tras auditoría completa de código y base de datos.
> Reemplaza: Feature Spec v3.3, BUILD_PLAN.md, MVP_Sprint_Brief.md (todos obsoletos).

---

## 1. Visión General

MovimientOS digitaliza el procedimiento IC-LOG-PO-06 de ICONSA (constructora pesada, Panamá). El flujo es: **Solicitudes → Programación → Ejecución → Dashboard**.

**Stack implementado:** Next.js App Router + TypeScript + Tailwind CSS → Vercel | Supabase PostgreSQL + Auth + RLS (proyecto `bzeoszympkkicwlfdtcn`, us-west-2 Oregon).

**URL de producción:** `rein-eisenwerk.com`

**Repo:** `jecg2804/iconsa-movilizaciones`, branch `jaime/dev`

---

## 2. Roles y Permisos (Implementados)

Cinco roles definidos en `people.app_role`, mapeados en `src/lib/utils/constants.ts`:

| Rol | Código | Acceso en Sidebar | Capacidades principales |
|-----|--------|-------------------|------------------------|
| Administrador | `admin` | Dashboard, Solicitudes, Programación, Mis Viajes, Admin | Todo: CRUD completo, masters, gestión usuarios |
| Ingeniero de Proyecto | `pm` | Dashboard, Solicitudes, Programación (RO) | Crea/edita solicitudes de SUS proyectos; VE TODAS las solicitudes; programación read-only |
| Coordinador Logística | `logistica` | Dashboard, Solicitudes (RO), Programación, Mis Viajes | Programa viajes, asigna recursos, registra eventos; NO crea solicitudes |
| Conductor | `campo` | Dashboard, Mis Viajes | Registra eventos de viaje (Salida, Llegada, Entrega, Retorno, Incidencia) |
| Almacenista | `almacen` | Dashboard, Mis Viajes | Registra eventos de viaje |

### Funciones de permisos (src/lib/utils/roles.ts)

- `canAccess(role, route)` — controla visibilidad del sidebar
- `canCreateSolicitud(role)` — solo `pm` y `admin`
- `canEditSolicitud(role, projectId, userProjectIds)` — `admin` cualquiera; `pm` solo sus proyectos
- `canCreateTrip(role)` — solo `logistica` y `admin`
- `canRegisterEvent(role)` — `logistica`, `campo`, `almacen`, `admin`; SIN restricción por driver_id
- `canAccessAdmin(role)` — solo `admin`

### Regla crítica: visibilidad de PM

**PMs ven TODAS las solicitudes de todos los proyectos.** El filtro default muestra su proyecto, pero pueden cambiarlo para ver otros. La restricción aplica solo a CREACIÓN y EDICIÓN: PMs solo pueden crear/editar solicitudes de proyectos donde están asignados (via `person_projects`).

---

## 3. Modelo de Datos (20 tablas — verificado en BD)

### 3.1 Tablas Maestras (11)

**projects** — 5 activos: 24-404 Costa Norte, 25-505 Paraíso, 25-506 Muelle 14, 26-604 Inyecciones Metro, 26-605 Micropilotes Multiplaza.
Campos: id, code, name, manager, status, location, start_date, end_date, notes, billing_code, budget, client, created_at, updated_at.

**people** — 177 activos, 6 con auth_id.
Campos: id, auth_id, code, name, department, position, phone, email, app_role, status, city, supervisor_id, cedula, license_type, license_expiry, hire_date, emergency_contact_name, emergency_contact_phone, created_at, updated_at.

**person_projects** — Asignación persona↔proyecto.
Campos: id, person_id (FK people), project_id (FK projects), role, is_active, created_at, updated_at.

**equipment** — 377 registros. Tabla UNIFICADA (equipos + vehículos).
Campos: id, spectrum_code, description, equipment_type, brand, model, serial_number, year, status, current_location, plate, capacity, type_code, inspection_type, current_project_id, notes, weight_class, acquisition_type, last_inspection_date, next_inspection_due, meter_reading, insurance_expiry, parent_equipment_id, created_at, updated_at.
Vehículos = `type_code IN ('VHL','VHP')`. Remolques = `spectrum_code LIKE 'REM%'`.

**locations** — 7 activas.
Campos: id, name, location_type (Taller/Proyecto/Proveedor/Otro), project_id, is_active, address, contact_name, contact_phone, notes, created_at, updated_at.

**mobilization_rates** — 14 activas.
Campos: id, code, description, rate, is_active, created_at, updated_at.

**units** — 11 registros.
Campos: id, code, description, created_at, updated_at.

**cost_codes** — 138 registros (fases presupuestarias de Spectrum).
Campos: id, project_id (FK), extra_id (FK project_extras, nullable), phase_code, phase_description, full_code (auto-generado), created_at, updated_at.
Trigger: `generate_full_code()` genera `{proyecto}-{extra?}-{fase}` con dashes.

**cost_categories** — 8 registros: ICS, EQI, EQA, MAT, SAL, OTR, CON, SUB.
Campos: id, code, description, is_active, created_at, updated_at.

**cost_code_categories** — 656 combinaciones (pivote many-to-many).
Campos: id, cost_code_id (FK), cost_category_id (FK), created_at.

**project_extras** — 12 registros (6 en 24-404, 6 en 25-505).
Campos: id, project_id (FK), code (E1, E2...), description, is_active, notes, created_at, updated_at.

### 3.2 Tablas Transaccionales (5)

**sm_requests** — Solicitudes de movilización.
Campos: id, request_id (auto: `{proyecto}-SM-{###}`), project_id (FK), requester_id (FK people), date_required, date_created, date_submitted, date_completed, date_cancelled, status, priority (auto-calculada), approved_by (FK people), notes, attachments (JSONB), initial_priority, created_by (FK people), updated_by (FK people), created_at, updated_at.

**sm_request_lines** — Líneas (ítems) dentro de solicitudes. **Unidad operativa primaria.**
Campos: id, request_id (FK CASCADE), line_number, line_type ('Equipo'|'Material'), equipment_id (FK), equipment_text, description, from_location_id (FK), from_text, to_location_id (FK), to_text, quantity, unit_id (FK), unit_text, cost_code_id (FK), cost_category_id (FK), category (legacy), material_category (solo Material), po_reference, notes, status, qty_scheduled, qty_delivered, delivered_at, updated_by, created_at, updated_at.

**trips** — Viajes físicos.
Campos: id, trip_id (auto: `MOV-{YYYY}-{###}`), scheduled_date, scheduled_time (TIME), driver_id (FK people), vehicle_id (FK equipment), trailer_id (FK equipment), rate_id (FK), cost, att_permit, escort, confirmation_code (4 dígitos auto), notes, status, actual_departure, actual_arrival, route_summary, is_external, date_cancelled, created_by, updated_by, created_at, updated_at.

**trip_line_assignments** — Pivote many-to-many entre viajes y líneas.
Campos: id, trip_id (FK CASCADE), request_line_id (FK), quantity_assigned, qty_delivered (por viaje), created_at, updated_at.
UNIQUE(trip_id, request_line_id).

**trip_events** — Eventos de ejecución. **INMUTABLES** (no UPDATE, no DELETE).
Campos: id, trip_id (FK), event_type, event_timestamp, location, registered_by (FK people), confirmation_code_used, received_by_id (FK people), received_by_name, notes, created_at.

### 3.3 Tablas de Soporte (4)

**sequences** — Generación de IDs secuenciales por proyecto.
**suggestions** — Valores de fallback propuestos por usuarios.
**audit_log** — Auditoría JSONB con OLD/NEW y changed_fields. Triggers en sm_requests, sm_request_lines, trips, trip_line_assignments.
**user_app_roles** — Fundación multi-app RBAC. NO usada por el código MVP (se usa `people.app_role`).

---

## 4. Funciones PostgreSQL (14)

| Función | Tipo | Descripción |
|---------|------|-------------|
| `update_updated_at()` | Trigger | Actualiza `updated_at` en todas las tablas |
| `generate_request_id()` | Trigger | Auto-genera `{proyecto}-SM-{###}` al INSERT en sm_requests |
| `generate_trip_id()` | Trigger | Auto-genera `MOV-{YYYY}-{###}` al INSERT en trips |
| `generate_confirmation_code()` | Trigger | 4 dígitos aleatorios al INSERT en trips |
| `generate_full_code()` | Trigger | `{proyecto}-{extra?}-{fase}` al INSERT/UPDATE de cost_codes |
| `calculate_priority()` | Trigger | Calcula prioridad basada en date_required vs hoy |
| `capture_initial_priority()` | Trigger | Snapshot de initial_priority al INSERT de sm_requests |
| `capture_lifecycle_timestamps()` | Trigger | Captura date_submitted, date_completed, date_cancelled |
| `cascade_request_status()` | Trigger SECURITY DEFINER | Re-evalúa status de solicitud padre cuando cambia una línea |
| `update_equipment_location_on_delivery()` | Trigger | Actualiza current_location/current_project_id de equipos en eventos Entrega |
| `capture_trip_cancelled()` | Trigger | Captura date_cancelled al cancelar viaje |
| `audit_trigger()` | Trigger | Registra cambios en audit_log con JSONB OLD/NEW |
| `get_my_app_role()` | RPC | Retorna app_role del usuario autenticado (base de todo RLS) |
| `rls_auto_enable()` | Utility | Habilita RLS automáticamente |

---

## 5. Triggers (37 en BD)

### Negocio (14 triggers)
- `trg_request_id` — BEFORE INSERT on sm_requests → `generate_request_id()`
- `trg_priority` — BEFORE INSERT/UPDATE on sm_requests → `calculate_priority()`
- `trg_initial_priority` — BEFORE INSERT on sm_requests → `capture_initial_priority()`
- `trg_lifecycle_timestamps` — BEFORE UPDATE on sm_requests → `capture_lifecycle_timestamps()`
- `trg_cascade_status` — AFTER UPDATE on sm_request_lines → `cascade_request_status()`
- `trg_trip_id` — BEFORE INSERT on trips → `generate_trip_id()`
- `trg_generate_confirmation_code` — BEFORE INSERT on trips → `generate_confirmation_code()`
- `trg_trip_cancelled` — BEFORE UPDATE on trips → `capture_trip_cancelled()`
- `trg_generate_full_code` — BEFORE INSERT/UPDATE on cost_codes → `generate_full_code()`
- `trg_update_equipment_location` — AFTER INSERT on trip_events → `update_equipment_location_on_delivery()`

### Auditoría (4 tablas × triggers IUD)
- `audit_sm_requests`, `audit_sm_request_lines`, `audit_trips`, `audit_trip_line_assignments`

### updated_at (12 tablas)
- Una por tabla con `updated_at`

---

## 6. RLS (69 políticas)

Patrón general: todas las tablas usan `get_my_app_role()` para determinar permisos.

- **SELECT**: `USING(true)` para `authenticated` en todas las tablas (lectura universal)
- **INSERT**: Generalmente `WITH CHECK` abiertas con `get_my_app_role()` restringiendo por rol en el qualifier
- **UPDATE**: Controlado por rol. sm_request_lines permite UPDATE a pm, admin, logistica, campo, almacen (policy `operational_update`). sm_requests UPDATE solo pm y admin (el cascade trigger es SECURITY DEFINER).
- **DELETE**: Generalmente solo `admin`, excepto trip_line_assignments (logistica + admin) y sm_request_lines (pm + admin).

---

## 7. Estados y Cascada (Implementados)

### Estados de solicitud (sm_requests.status)
`Borrador` → `Enviada` → `En Proceso` → `Completada` / `Cancelada`

### Estados de línea (sm_request_lines.status)
`Pendiente` → `Programada` → `En Transito` → `Entregada` / `Parcial` / `Cancelada`

**'En Transito' sin acento es canónico** — el cascade trigger usa esta forma exacta.

**'Parcial' existe SOLO a nivel de línea**, nunca a nivel de solicitud.

### Estados de viaje (trips.status)
`Programado` → `En Ruta` → `Completado` / `Cancelado`

### Lógica del cascade trigger (`cascade_request_status()`)
Fires AFTER UPDATE on sm_request_lines. Evalúa todas las líneas de la solicitud padre:
- Todas Entregada → solicitud `Completada`
- Todas Cancelada → solicitud `Cancelada`
- ≥1 Entregada + resto Cancelada → solicitud `Completada` (NO Parcial)
- ≥1 en Programada/En Transito/Parcial → solicitud `En Proceso`
- No modifica Borrador ni Cancelada

---

## 8. Pantallas (Implementadas)

### 8.1 Login (`/login`)

**Archivo:** `src/app/(auth)/login/page.tsx`
**Componente:** Server-rendered login form.
**Campos:** Email, Contraseña.
**Auth:** Supabase Auth con `signInWithPassword()`.
**Redirect:** `/dashboard` post-login exitoso.
**Middleware:** `src/middleware.ts` redirige a `/login` si no autenticado; redirige a `/dashboard` si autenticado accede a `/login` o `/`.

### 8.2 Layout Autenticado (`(app)/layout.tsx`)

**Server Component** que:
1. Verifica sesión con `supabase.auth.getUser()`
2. Busca persona en `people` por `auth_id`
3. Redirige a `/login` si no hay usuario o no tiene `app_role`
4. Renderiza `AppShell` con Sidebar, Topbar, MobileNav

**AppShell** (`components/layout/AppShell.tsx`): layout client con sidebar desktop (260px), topbar, y hamburger nav móvil.

**Sidebar** (`components/layout/Sidebar.tsx`): Navegación role-aware. Logo "MovimientOS" con gold accent. Items: Dashboard, Solicitudes, Programación, Mis Viajes, Admin — filtrados por `ROLE_ROUTES[role]`.

**Topbar** (`components/layout/Topbar.tsx`): Nombre del usuario, badge de rol, botón logout.

**MobileNav** (`components/layout/MobileNav.tsx`): Panel deslizable con los mismos items.

### 8.3 Dashboard (`/dashboard`)

**Archivo:** `src/app/(app)/dashboard/page.tsx`
**Server Component** — datos fetched server-side con `createClient()` de server.ts.
**Acceso:** TODOS los roles ven las mismas métricas globales. NO hay filtro por rol ni redirect de campo.

**4 KPIs (KpiCard):**
1. **Solicitudes Pendientes** — count de sm_requests con status IN ('Enviada', 'En Proceso')
2. **Ítems Sin Programar** — count de sm_request_lines con status IN ('Pendiente', 'Parcial') donde la solicitud padre no es Borrador/Cancelada/Completada
3. **Viajes Próximos** — count de trips con status IN ('Programado', 'En Ruta') y scheduled_date entre hoy y +3 días
4. **Completadas (mes)** — count de sm_requests con status='Completada' y updated_at ≥ primer día del mes

**Solicitudes Activas por Proyecto** — Chart de barras horizontales (Recharts/SolicitudesByProjectChart) mostrando solicitudes Enviada + En Proceso agrupadas por proyecto.

**Backlog Crítico** — Líneas Pendiente/Parcial donde date_required venció o >7 días sin programar. Máximo 10 filas.

**Solicitudes Recientes** — Últimas 5 solicitudes activas (Borrador/Enviada/En Proceso).

**Viajes Hoy** — Viajes programados para hoy con estado Programado/En Ruta.

### 8.4 Lista de Solicitudes (`/solicitudes`)

**Archivo:** `src/app/(app)/solicitudes/page.tsx`
**Client Component** — usa `useSolicitudes()` hook.
**Acceso:** admin, pm, logistica.

**Filtros implementados:**
- **Proyecto** — dropdown de todos los proyectos activos. PM default = su primer proyecto.
- **Estado** — badges toggle (Borrador, Enviada, En Proceso, Completada, Cancelada)
- **Fecha** — rango desde/hasta en date_required
- **Búsqueda** — texto libre en request_id, descripción
- **FilterBar** — chips removibles para filtros activos
- **MiniCalendar** — calendario de 2 semanas con solicitudes por fecha requerida

**Columnas de tabla:**
- ID Solicitud (link monoespaciado a detalle)
- Proyecto (código + nombre)
- Solicitante
- Líneas (conteo)
- Fecha Req. (con badge de días al vencimiento y color: rojo <0, naranja ≤3, azul ≤7, gris >7)
- Estado (Badge con colores)

**Expand row:** Muestra líneas con tipo (icono Wrench/Package), descripción, ruta (from → to), cantidad y unidad.

**Prioridad:** Se calcula client-side con `calculatePriority()` para display. Badge visual de prioridad fue ELIMINADO de la UI (la columna "Días" comunica lo mismo).

### 8.5 Crear Solicitud (`/solicitudes/nueva`)

**Archivo:** `src/app/(app)/solicitudes/nueva/page.tsx`
**Acceso:** pm (sus proyectos), admin (cualquiera).

**Header form (SolicitudForm):**
- **Proyecto** — dropdown. PM ve solo sus proyectos asignados; admin ve todos.
- **Solicitante** — auto-fill con usuario logueado. Campo disabled/readonly.
- **Aprobado por** — dropdown filtrado por `app_role = 'pm'`.
- **Fecha requerida** — date picker. REQUERIDO.
- **Notas** — textarea opcional.

**Líneas (LineEditor):**
- Tipo: Equipo o Material (toggle)
- **Equipo** (si tipo = Equipo): SelectWithFallback buscando en spectrum_code Y description. Label: `{spectrum_code} — {description}`. Filtro: `type_code NOT IN ('ING')`.
- **Descripción** — texto libre. REQUERIDO.
- **Categoría de Material** — visible solo si tipo = Material. Dropdown libre.
- **Desde / Hasta** — SelectWithFallback de locations activas.
- **Cantidad** — numérico. Default 1.
- **Unidad** — SelectWithFallback de units.
- **Código de Costo** — Cascada: Proyecto → Extra (condicional, solo si el proyecto tiene extras) → Fase → Categoría → full_code auto-generado.
- **Referencia OC** — texto libre opcional.
- **Notas** — texto libre opcional.

**Cascada de costos:**
1. Seleccionar proyecto → fetch extras de ese proyecto
2. Si hay extras: mostrar dropdown "Extra / Sección" con opción "(Proyecto Base)" + extras
3. Fetch fases (cost_codes) filtradas por project_id Y extra_id (null para base)
4. Seleccionar fase → fetch categorías via cost_code_categories
5. full_code generado: `{proyecto}-{extra?}-{fase}-{categoría}` (ej: `24-404-E1-01-3100-EQI`)

**Duplicados:** Al agregar línea (solo en Borrador), `checkDuplicateLines()` busca líneas activas similares. Warning visual, NO bloqueante.

**Acciones:**
- **Guardar Borrador** — status = 'Borrador', redirect a lista
- **Enviar** — valida campos requeridos + ≥1 línea, status = 'Enviada', redirect a lista

### 8.6 Detalle/Editar Solicitud (`/solicitudes/[id]`)

**Archivo:** `src/app/(app)/solicitudes/[id]/page.tsx`

**Modo determinado por `determineMode()`:**
- Borrador/Enviada + admin → `edit`
- Borrador/Enviada + pm del proyecto → `edit`
- Completada/Cancelada/En Proceso → `readonly` (excepto admin en En Proceso)
- Sin permisos → `readonly`

**Reglas de edición:**
- **Borrador:** Todo editable + agregar/eliminar líneas.
- **Enviada:** Editar header y líneas existentes. NO agregar nuevas.
- **En Proceso+:** Solo lectura (excepto admin).
- Eliminar línea Programada: warning → elimina asignaciones de viaje.

**Sección "Viajes Programados" (solo lectura):**
Visible cuando hay trips asociados a líneas de esta solicitud. Muestra: trip_id, fecha, conductor, vehículo, estado, código de confirmación (visible para pm/logistica/admin, NUNCA para campo/almacen).

**Acciones:**
- Guardar cambios
- Enviar (Borrador → Enviada)
- Cancelar solicitud (con confirmación)

### 8.7 Programación (`/programacion`)

**Archivo:** `src/app/(app)/programacion/page.tsx`
**Acceso:** logistica (RW), admin (RW), pm (RO).

**Dos secciones:**

**1. Backlog (BacklogTable)** — Líneas en estado Pendiente, Parcial, o Programada cuyas solicitudes NO son Borrador/Cancelada/Completada.
- Filtros: proyecto, tipo (Equipo/Material), búsqueda texto
- Columnas: ID Solicitud, Descripción, Tipo, Ruta (from → to), Cantidad (disponible/total), Prioridad, Fecha Req, Días
- Click en línea → checkboxes para programar
- Disponible = quantity - qty_scheduled (para Pendiente/Parcial)

**2. Viajes Recientes (DataTable)** — Lista de trips con filtros:
- Proyecto (inferido de las líneas), Estado, Conductor, Fecha, Búsqueda
- MiniCalendar con viajes por scheduled_date
- FilterBar con chips
- Columnas: ID Viaje, Fecha, Conductor, Vehículo, Líneas (conteo), Costo, Estado
- Click → navega a detalle del viaje

**Botón "Nuevo Viaje"** — solo visible para logistica/admin.

### 8.8 Crear Viaje (`/programacion/viaje/nuevo`)

**Archivo:** `src/app/(app)/programacion/viaje/nuevo/page.tsx`
**Acceso:** logistica, admin.

**TripForm campos:**
- **Fecha programada** — date picker. REQUERIDO.
- **Hora programada** — time picker. Opcional.
- **Conductor** — dropdown de personas con `app_role = 'campo'`.
- **Vehículo** — dropdown de equipment con `type_code IN ('VHL','VHP')`.
- **Remolque** — dropdown de equipment con `spectrum_code LIKE 'REM%'`. **REQUERIDO si vehículo es cabezal** (CAB/CABEZAL).
- **Tarifa** — dropdown de mobilization_rates activas. Opcional. Si se selecciona, pre-rellena Costo con `rate`.
- **Costo** — numérico editable. Opcional.
- **Permiso ATT** — checkbox.
- **Escolta** — checkbox.
- **Externo** — checkbox.
- **Notas** — textarea.

**LineSelector** — Selección de líneas del backlog para asignar al viaje. Permite ajustar cantidad asignada (entregas parciales). Muestra cantidad disponible.

**Pre-selección:** Si se navega desde backlog con líneas seleccionadas, llegan via query params.

### 8.9 Detalle/Editar Viaje (`/programacion/viaje/[id]`)

**Archivo:** `src/app/(app)/programacion/viaje/[id]/page.tsx`

**Modo:** `determineTripMode(status, role)`:
- Completado/Cancelado → `readonly`
- pm/campo/almacen → `readonly`
- logistica/admin → `edit`

**Contenido:**
- TripForm editable (según modo)
- Lista de asignaciones existentes (AssignmentRow) con opción de quitar
- LineSelector para agregar nuevas líneas
- Eventos de ejecución (timeline read-only)
- Código de confirmación visible (KeyRound icon)

**Acciones:** Guardar cambios, Cancelar viaje.
Cancelar viaje: libera todas las líneas (resta qty_scheduled, vuelve a Pendiente o Parcial).

### 8.10 Mis Viajes — Lista (`/mis-viajes`)

**Archivo:** `src/app/(app)/mis-viajes/page.tsx`
**Acceso:** logistica, campo, almacen, admin.
**Hook:** `useMyTrips()` — fetch trips con assignments y events completos.

Muestra viajes activos (Programado, En Ruta) como cards con:
- Trip ID, fecha, conductor, vehículo, estado
- Lista de líneas asignadas con rutas
- Botón "Ver Detalle"

### 8.11 Mis Viajes — Detalle (`/mis-viajes/[id]`)

**Archivo:** `src/app/(app)/mis-viajes/[id]/page.tsx`
**Hook:** `useTripEvents()` para registrar eventos.

**Eventos disponibles (EventButton):**
- **Salida** — Disponible cuando viaje está en Programado. Cambia trip a `En Ruta`, líneas a `En Transito`.
- **Llegada** — Disponible cuando viaje está en En Ruta.
- **Entrega** — Requiere:
  1. **Código de confirmación** — 4 dígitos, DEBE coincidir exactamente. Sin bypass. Si no coincide → mensaje rojo, botón disabled.
  2. **Recibido por** — dropdown de personas del proyecto destino. Fallback texto libre.
  3. **Cantidades entregadas** — por línea, permite entrega parcial.
  Resultado: acumula qty_delivered en assignment Y en línea, cambia línea a Entregada (si total) o Parcial (si parcial).
- **Retorno** — Disponible después de Entrega. Cambia trip a `Completado`.
- **Incidencia** — Disponible siempre. Solo registra nota.

**Timeline de eventos:** Cronológico, muestra tipo, timestamp, registrado por, notas.

**CodeConfirmation** (`components/viajes/CodeConfirmation.tsx`): Input de 4 dígitos, validación exacta contra `confirmation_code` del viaje. Dropdown de receptor. Sin bypass.

### 8.12 Admin Masters (`/admin/masters`)

**Archivo:** `src/app/(app)/admin/masters/page.tsx`
**Acceso:** solo admin.

**6 tabs con CRUD completo:**

1. **Proyectos** — DataTable + Modal. Campos: code, name, manager, status, location, client. Toggle activar/desactivar.
2. **Personas** — DataTable + Modal. Campos: name, app_role (dropdown de 5 roles + sin acceso), position, department, email, phone, status. Panel "Proyectos Asignados" dentro de cada persona (person_projects CRUD con botón agregar/quitar).
3. **Equipos** — DataTable + Modal. Campos: spectrum_code, description, type_code, status. Búsqueda por spectrum_code.
4. **Ubicaciones** — CRUD: name, location_type (Taller/Proyecto/Proveedor/Otro), project_id, is_active, address.
5. **Tarifas** — CRUD: code, description, rate, is_active.
6. **Extras** — Filtro por proyecto (dropdown). CRUD: code (E1, E2...), description, is_active.

Cada tab tiene: búsqueda por nombre/código, DataTable con sort, Modal para crear/editar (componente Modal.tsx con dialog nativo, backdrop click, ESC).

### 8.13 Calendario (`/programacion/calendario`)

**Implementado como MiniCalendar** component embebido en las páginas de Solicitudes y Programación. NO es una página separada — la ruta existe como placeholder pero el look-ahead se implementó inline.

MiniCalendar muestra 2 semanas (semana actual + siguiente) con items agrupados por fecha. Click en día filtra la lista correspondiente.

---

## 9. Hooks (Implementados)

| Hook | Archivo | Descripción |
|------|---------|-------------|
| `useAuth` | `hooks/useAuth.ts` | user, person, role, userProjects, userProjectIds, loading, signOut |
| `useProjects` | `hooks/useProjects.ts` | allProjects, userProjects (filtrado por person_projects) |
| `useEquipment` | `hooks/useEquipment.ts` | equipment filtrado por type_code NOT IN ('ING') |
| `useLocations` | `hooks/useLocations.ts` | locations activas |
| `useVehicles` | `hooks/useVehicles.ts` | vehicles (VHL/VHP), trailers (REM%) |
| `useSolicitudes` | `hooks/useSolicitudes.ts` | CRUD completo: lista con filtros, fetchSolicitud, saveSolicitud, updateSolicitud, cancelSolicitud |
| `useTrips` | `hooks/useTrips.ts` | Backlog, lista viajes con filtros, fetchTrip, saveTrip, updateTrip, cancelTrip |
| `useMyTrips` | `hooks/useMyTrips.ts` | Viajes con assignments y events para la vista de ejecución |
| `useTripEvents` | `hooks/useTripEvents.ts` | registerEvent con transiciones de estado |

---

## 10. Componentes UI Reutilizables

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| Button | `ui/Button.tsx` | Variantes: primary, secondary, ghost, danger. Loading state. |
| Badge | `ui/Badge.tsx` | Variantes: status (request), line, trip, priority. Colores automáticos. |
| Select | `ui/Select.tsx` | Dropdown genérico con opciones tipadas. |
| SelectWithFallback | `ui/SelectWithFallback.tsx` | Dropdown + "No está en lista" → texto libre → genera suggestion. |
| DataTable | `ui/DataTable.tsx` | Tabla con sort, expand row, mobile render. |
| Modal | `ui/Modal.tsx` | Dialog nativo, backdrop click, ESC para cerrar. |
| Input | `ui/Input.tsx` | Input estilizado. |
| Card | `ui/Card.tsx` | Container con borde y sombra. |
| EmptyState | `ui/EmptyState.tsx` | Placeholder para listas vacías. |
| LoadingSpinner | `ui/LoadingSpinner.tsx` | Spinner de carga. |
| DuplicateWarning | `ui/DuplicateWarning.tsx` | Warning visual de líneas duplicadas. |
| MiniCalendar | `ui/MiniCalendar.tsx` | Calendario de 2 semanas con items por fecha. |
| FilterBar | `ui/FilterBar.tsx` | Barra de filtros con chips removibles. |
| KpiCard | `dashboard/KpiCard.tsx` | Tarjeta de métrica con icono y color. |
| RecentActivity | `dashboard/RecentActivity.tsx` | Solicitudes recientes + Viajes hoy. |
| SolicitudesByProjectChart | `dashboard/SolicitudesByProjectChart.tsx` | Barras horizontales Recharts. |
| SolicitudForm | `solicitudes/SolicitudForm.tsx` | Header form (proyecto, solicitante, fecha, notas). |
| LineEditor | `solicitudes/LineEditor.tsx` | Editor de línea (modal/panel). |
| LineRow | `solicitudes/LineRow.tsx` | Fila de línea con progreso de entrega. |
| BacklogTable | `programacion/BacklogTable.tsx` | Tabla del backlog con selección de líneas. |
| TripForm | `programacion/TripForm.tsx` | Formulario de viaje. |
| LineSelector | `programacion/LineSelector.tsx` | Selección de líneas del backlog. |
| EventTimeline | `viajes/EventTimeline.tsx` | Timeline cronológica de eventos. |
| EventButton | `viajes/EventButton.tsx` | Botones de registro de evento. |
| CodeConfirmation | `viajes/CodeConfirmation.tsx` | Input de código + receptor para entrega. |

---

## 11. Utilidades

| Archivo | Funciones principales |
|---------|----------------------|
| `constants.ts` | COLORS, REQUEST_STATUSES, LINE_STATUSES, TRIP_STATUSES, PRIORITIES, APP_ROLES, LINE_TYPES, EVENT_TYPES, ROLE_ROUTES, ROLE_LABELS |
| `status.ts` | `getStatusColor()`, `getStatusLabel()` |
| `roles.ts` | `canAccess()`, `canCreateSolicitud()`, `canEditSolicitud()`, `canCreateTrip()`, `canRegisterEvent()`, `canAccessAdmin()` |
| `format.ts` | `formatDate()`, `formatDateTime()`, `formatCurrency()`, `formatId()`, `formatQty()`, `daysUntilDue()`, `formatDaysUntilDue()`, `daysUntilDueColor()`, `formatCompletionDelta()` |
| `priorities.ts` | `calculatePriority()` — client-side para display (BD usa trigger + pg_cron 6AM) |
| `duplicates.ts` | `checkDuplicateLines()` — busca líneas activas similares |

---

## 12. Datos Actuales en BD

| Tabla | Registros | Notas |
|-------|-----------|-------|
| Proyectos activos | 5 | 24-404, 25-505, 25-506, 26-604, 26-605 |
| Personas activas | 177 | 6 con cuenta Supabase Auth |
| Equipos | 377 | Importados de Spectrum |
| Ubicaciones activas | 7 | |
| Tarifas activas | 14 | |
| Unidades | 11 | |
| Cost codes | 138 | 5 proyectos × fases de Spectrum |
| Categorías de costo | 8 | ICS, EQI, EQA, MAT, SAL, OTR, CON, SUB |
| Combos código-categoría | 656 | |
| Project extras | 12 | 24-404: 6, 25-505: 6 |
| Solicitudes | 9 | Datos de prueba |
| Líneas de solicitud | 13 | |
| Viajes | 8 | |
| Eventos de viaje | 21 | |
| Asignaciones línea-viaje | 9 | |
| Audit log | 103 | |

---

## 13. Features Pendientes / Planificadas

### Alta prioridad

1. **Notificaciones email/WhatsApp** — Solicitud enviada → Charris; Programada → PM; Completada → PM; Vencida (daily) → Charris + PM. Backend NestJS pendiente.

2. **Detalle de solicitud (`/solicitudes/[id]`)** — Debe mostrar información completa matching lo ingresado en el formulario de creación. Actualmente las líneas se muestran pero falta exposición completa de campos como cost code, categoría, material_category, po_reference.

3. **Paginación** — Listas actuales cargan todos los registros. Necesario cuando crezca el volumen.

4. **NestJS backend** — Deployment en Railway/Fly.io para automations, cron jobs, y notificaciones.

5. **Documentación restructure** — SPEC.md (este doc vive ahí), CLAUDE.md (prune a 50-80 líneas), ROADMAP.md (reemplaza BUILD_PLAN + SPRINT_TODAY).

### Media prioridad

6. **Bug #11** — Cost category se limpia al agregar línea de material. Bajo investigación.

7. **Exposición de líneas en toda la UI** — Las líneas son la unidad operativa primaria pero están subexpuestas. El frontend debe mostrar contenido de líneas (no solo conteos) en listas, dashboard, y reportes.

8. **Metabase reporting** — Post-MVP cuando haya suficiente data real. Tendencias históricas, utilización de flota, costos acumulados.

9. **Nota de Entrega formal** — Exportable a PDF (IC-LOG-04-04). MVP captura datos via eventos.

10. **Datos históricos** — Linking solicitudes 2024-2025 con registros de movilizaciones de reportes de facturación, log operativo de Charris, y notas de entrega manuscritas (fuzzy matching requerido).

### Baja prioridad / Post-MVP

11. **KoboToolbox** — Integración con inspecciones de campo.
12. **Python ETL/AI** — Data layer para análisis avanzado.
13. **PWA offline** — Via Next.js para uso en campo sin conexión.
14. **Migración a user_app_roles** — Tabla existe pero código usa `people.app_role`.
15. **Alertas de solicitudes vencidas** — Cron job diario NestJS → Charris + PM.

---

## 14. Decisiones de Arquitectura Documentadas

1. **Prioridad client-side vs BD:** `calculatePriority()` client-side para páginas interactivas; trigger en BD para dashboard (Server Component) — pg_cron 6AM es aceptable.

2. **created_by ≠ requester_id:** `created_by` = quien opera el sistema; `requester_id` = quien solicita el equipo. Un admin puede crear en nombre de un PM.

3. **Eventos inmutables:** trip_events no tienen UPDATE ni DELETE. Una vez creados, no se modifican.

4. **cascade_request_status() es SECURITY DEFINER:** Permite que el trigger actualice sm_requests aunque el usuario que disparó el cambio en la línea (campo/logistica) no tenga permisos directos de UPDATE en sm_requests.

5. **Entregas parciales:** qty_delivered se acumula en sm_request_lines y en trip_line_assignments (por viaje). Línea con entrega parcial queda en estado 'Parcial' y reaparece en el backlog con cantidad disponible reducida.

6. **Equipment unificada:** Equipos y vehículos en la misma tabla. Vehículos = type_code VHL/VHP. Remolques = spectrum_code LIKE 'REM%'. No hay tabla separada.

7. **MiniCalendar inline:** El look-ahead de 2 semanas se implementó como componente inline en Solicitudes y Programación, no como página separada.

8. **Prioridad visual eliminada:** Badges de prioridad (Vencida/Urgente/Próxima/Normal) eliminados de la UI. La columna "Días" con color comunica la misma información sin redundancia. El campo `priority` y trigger permanecen en BD.
