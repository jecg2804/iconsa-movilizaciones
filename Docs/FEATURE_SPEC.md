# ICONSA — Feature Specification Document
## Sistema Digital de Movilizaciones (IC-LOG-PO-06)

**Versión:** 4.0
**Fecha:** 13 de marzo de 2026
**Autor:** James Cucalón — Ingeniero Industrial
**Empresa:** Ingeniería Continental, S.A. (ICONSA)
**Departamento:** Taller Chilibre / Logística
**Estado:** MVP funcional — en producción de pruebas

---

## Tabla de Contenido

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Contexto y Problema](#2-contexto-y-problema)
3. [Alcance del Sistema](#3-alcance-del-sistema)
4. [Usuarios y Roles](#4-usuarios-y-roles)
5. [Módulos del Sistema](#5-módulos-del-sistema)
6. [Modelo de Datos](#6-modelo-de-datos)
7. [Reglas de Negocio](#7-reglas-de-negocio)
8. [Estados y Transiciones](#8-estados-y-transiciones)
9. [Notificaciones y Automatizaciones](#9-notificaciones-y-automatizaciones)
10. [Requisitos No Funcionales](#10-requisitos-no-funcionales)
11. [Alcance — Qué está construido y qué sigue](#11-alcance)
12. [Glosario](#13-glosario)

---

## 1. Resumen Ejecutivo

### 1.1 — Qué es este documento

Este documento define con precisión qué debe hacer el Sistema Digital de Movilizaciones de ICONSA (MovimientOS). Es la referencia única para cualquier persona (developer, consultor, IA, o futuro empleado) que necesite entender, construir, modificar o mantener el sistema.

### 1.2 — Qué problema resuelve

ICONSA mueve equipos pesados y materiales entre proyectos de construcción, taller central, y proveedores. Actualmente este proceso es manual: formularios en papel (IC-LOG-F-06-03), Excel personal de Charris, WhatsApp para coordinación, y notas de entrega manuscritas. No hay visibilidad en tiempo real, no hay trazabilidad, y los reportes de cumplimiento requieren compilación manual de múltiples fuentes.

### 1.3 — Qué es MovimientOS

Una aplicación web que digitaliza el procedimiento IC-LOG-PO-06 (Movilizaciones) de ICONSA:

1. **Solicitar** — Ingenieros de proyecto crean solicitudes digitales para mover equipos o materiales.
2. **Programar** — Charris (coordinador logística) revisa el backlog, crea viajes, y asigna recursos.
3. **Ejecutar** — Conductores y personal de campo registran eventos en tiempo real (salida, llegada, entrega, retorno).
4. **Monitorear** — Dashboard con KPIs operativos visibles para todos los roles.

### 1.4 — Stack tecnológico

| Capa | Tecnología | Hosting |
|------|-----------|---------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS | Vercel |
| Base de datos | Supabase PostgreSQL + Auth + RLS + Storage (44 tablas) | Supabase (us-west-2) |
| Notificaciones | Resend (server actions, 12 templates) | Vercel |
| Dominio | rein-eisenwerk.com | — |

---

## 2. Contexto y Problema

### 2.1 — Quién es ICONSA

Ingeniería Continental, S.A. es una empresa de construcción pesada en Panamá. Opera proyectos de infraestructura (puertos, metros, puentes, edificaciones) con una flota de 377+ equipos pesados y 177 personas registradas.

### 2.2 — Proyectos activos

| Código | Nombre | Estado |
|--------|--------|--------|
| 24-404 | Costa Norte | Activo |
| 25-504 | ASTIBAL (Astillero de Balboa) | Cerrado |
| 25-505 | Paraíso | Activo |
| 25-506 | Muelle 14 | Activo |
| 26-604 | Inyecciones Metro | Activo |
| 26-605 | Micropilotes Multiplaza | Activo |

Dos proyectos (24-404, 25-505) tienen "extras" (secciones de obra) que afectan la estructura de códigos de costo.

### 2.3 — Herramientas actuales de ICONSA

ICONSA **no tiene Microsoft 365, SharePoint, ni Teams**. Las herramientas en uso son:

- Basecamp (comunicación de proyectos)
- Drives personales (sin centralización)
- WhatsApp (coordinación informal)
- Formularios en papel (procedimientos ISO)
- Excel personal de cada persona (sin fuente de verdad)
- Sage/Spectrum (ERP contable — de ahí vienen cost codes y equipment codes)

### 2.4 — Procedimiento IC-LOG-PO-06

El procedimiento de movilizaciones de ICONSA define el flujo formal:

1. Ingeniero de proyecto identifica necesidad → llena formulario IC-LOG-F-06-03
2. Formulario llega a Charris (coordinador logística) vía Basecamp/WhatsApp
3. Charris programa la movilización en su Excel personal
4. Conductor ejecuta el viaje, recoge nota de entrega firmada
5. Charris compila datos para reportes mensuales

**Problemas con el proceso manual:** Demoras en aprobación, pérdida de formularios, falta de trazabilidad, datos de Charris no accesibles para otros, compilación manual de reportes toma días, imposible saber el estado actual de una solicitud sin llamar a Charris.

---

## 3. Alcance del Sistema

### 3.1 — MVP (actual)

- Login con autenticación email/contraseña
- CRUD completo de solicitudes con líneas (equipo y material)
- Programación de viajes con asignación de líneas
- Calendario look-ahead de 2 semanas
- Registro de eventos de ejecución con código de confirmación
- Entregas parciales (acumulación de cantidades)
- Dashboard global con KPIs
- Admin Masters (CRUD de 6 tablas maestras)
- Tracking automático de ubicación de equipos
- Prioridad automática basada en fecha requerida
- Auditoría completa (audit_log con old/new data)

### 3.2 — Post-MVP (planificado)

- Inspecciones de equipo (IC-EQ-F-01-02, 42 items, tablas ya creadas)
- Reportes auto-generados (facturación mensual, informe Valderrama semanal)
- Dashboards por rol (Tremor/Recharts en Next.js)
- Work orders de mantenimiento
- Fuel tracking
- Importación de datos históricos 2024-2025
- PWA offline para uso en campo

### 3.3 — Fuera de alcance

- Facturación (se mantiene en Sage/Spectrum)
- Inventario de almacén (procedimiento separado IC-LOG-PO-04)
- Mantenimiento de equipos (procedimiento separado IC-EQ-PO-01)
- Combustible (procedimiento separado IC-EQ-PO-06)
- Compras (procedimiento separado IC-LOG-PO-01)

---

## 4. Usuarios y Roles

### 4.1 — Roles del sistema

| Rol | Código | Personas | Qué hace |
|-----|--------|----------|----------|
| Administrador | `admin` | James, Charris, Jacome (testing) | Acceso total. Gestiona tablas maestras, usuarios, configuración. |
| Ingeniero de Proyecto | `pm` | Caballero, Jacome, Marciaga, Solís, ~7 más | Crea y gestiona solicitudes para sus proyectos asignados. Ve todas las solicitudes de todos los proyectos. |
| Coordinador Logística | `logistica` | Charris | Programa viajes, gestiona backlog, edita solicitudes/viajes. No crea solicitudes. |
| Conductor | `campo` | Díaz, Ríos, Montero, ~5 más | Registra eventos de viajes (salida, llegada, entrega, retorno). |
| Almacenista | `almacen` | Personal de almacén | Registra eventos de viajes. Similar a campo. |

### 4.2 — Matriz de acceso

| Módulo | admin | pm | logistica | campo | almacen |
|--------|:-----:|:--:|:---------:|:-----:|:-------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Solicitudes — ver todas | ✅ | ✅ | ✅ | ❌ | ❌ |
| Solicitudes — crear | ✅ | ✅* | ❌ | ❌ | ❌ |
| Solicitudes — editar | ✅ | ✅* | ✅** | ❌ | ❌ |
| Programación — ver | ✅ | ✅ (lectura) | ✅ | ❌ | ❌ |
| Programación — crear viajes | ✅ | ❌ | ✅ | ❌ | ❌ |
| Mis Viajes — ver/eventos | ✅ | ❌ | ✅ | ✅ | ✅ |
| Admin Masters | ✅ | ❌ | ❌ | ❌ | ❌ |

*PM solo para sus proyectos asignados (via `person_projects`).
**Logística edita solicitudes en Borrador/Enviada pero no crea nuevas.

### 4.3 — Regla crítica de visibilidad PM

**PMs ven TODAS las solicitudes de TODOS los proyectos.** El filtro de proyecto viene pre-seleccionado con su proyecto asignado, pero el PM puede cambiar el filtro para ver solicitudes de otros proyectos. Esto permite coordinación cross-proyecto (ej: saber si otro proyecto ya solicitó la misma grúa).

La restricción es solo en **creación**: un PM solo puede crear solicitudes para los proyectos a los que está asignado en `person_projects`.

### 4.4 — Nota sobre licenciamiento

MovimientOS es una aplicación web propia. Todos los empleados de ICONSA pueden acceder sin costo adicional por usuario, a diferencia de plataformas SaaS con licencia per-seat.

## 5. Módulos del Sistema

---

### 5.1 — Módulo: Solicitud de Movilización

**Formulario base:** IC-LOG-F-06-03
**Usuarios principales:** Ingenieros de Proyecto (rol `pm`)
**Propósito:** Solicitar digitalmente el movimiento de equipos y/o materiales.

#### 5.1.1 — Pantalla: Lista de Solicitudes

**URL:** `/solicitudes`
**Acceso:** `pm`, `logistica`, `admin`

**Comportamiento:**
- Muestra TODAS las solicitudes del sistema. Todos los roles con acceso ven todas.
- Para `pm`, el filtro de proyecto viene pre-seleccionado con su proyecto asignado, pero puede cambiarse.
- Para `logistica` y `admin`, sin filtro pre-seleccionado.
- Incluye MiniCalendar arriba con cards de solicitudes por día.
- Incluye FilterBar con chips activos.

**Columnas de la tabla:**
- ID solicitud (monospace, clickeable → detalle)
- Proyecto (código + nombre)
- Solicitante
- Líneas (conteo)
- Fecha requerida
- Fecha enviada (solo si aplica)
- Estado (badge con color)
- Días (días hasta fecha requerida; para completadas/canceladas muestra delta vs fecha requerida, con color)

**Filtros:**
- Proyecto (dropdown)
- Estado (multi-select: Borrador, Enviada, En Proceso, Completada, Cancelada)
- Búsqueda por ID de solicitud
- Filtro combinado via FilterBar

**Acciones:**
- Click en solicitud → `/solicitudes/[id]` (modo edición o lectura según permisos)
- Botón "+ Nueva Solicitud" → `/solicitudes/nueva`. Solo visible para `pm` y `admin`.

#### 5.1.2 — Pantalla: Formulario de Solicitud

**URL:** `/solicitudes/nueva` o `/solicitudes/[id]`
**Acceso:** `pm` (crear/editar sus proyectos), `logistica` (editar), `admin` (todo)

**Concepto:** Formulario tipo factura: cabecera arriba, líneas en el medio, acciones abajo.

**Modos:**
- **Creación:** Formulario en blanco, todos los campos editables, se pueden agregar líneas.
- **Edición Borrador:** Header y líneas editables. Se pueden agregar y eliminar líneas.
- **Edición Enviada:** Header y líneas existentes editables. NO se pueden agregar líneas nuevas. Eliminar programada con warning.
- **Lectura:** Solo ver. Para estados En Proceso, Completada, Cancelada.

##### Sección A: Cabecera

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| Proyecto | Dropdown | ✅ | PM: solo sus proyectos. Admin: todos. Logística: lectura. |
| Solicitante | Texto (readonly) | ✅ | Auto-fill con usuario logueado. NO editable. |
| Aprobado por | Dropdown | ❌ | Filtra `people` por `app_role = 'pm'`. |
| Fecha requerida | Date picker | ✅ | Debe ser ≥ hoy. |
| Prioridad | Badge (readonly) | — | Auto-calculada. No editable. |
| Notas generales | Textarea | ❌ | Observaciones libres. |
| Adjuntos | Carga de archivos (JSONB) | ❌ | PDF, imágenes, Word, Excel. Máximo 10MB. |

##### Sección B: Líneas de solicitud

Cada línea = un ítem (equipo o material) que necesita ser movilizado.

**Vista de tabla:**
- #, Tipo (🔧/📦), Descripción, Desde, Hasta, Cant., Und., Código Costo, Estado, Acciones (✏️🗑️)
- Acciones solo visibles en modo edición.
- Badge de tipo: 🔧 Equipo (azul) / 📦 Material (dorado).
- Badge de estado por línea.

**Botón "+ Agregar Línea":** Solo visible en estado **Borrador**. Una vez enviada, NO se pueden agregar líneas nuevas.

**Toggle tipo de línea:** "🔧 Equipo" o "📦 Material". Determina campos visibles.

**Si Tipo = Equipo:**

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| Equipo | Dropdown con búsqueda | ✅ | Busca en `equipment` (377+ registros). Filtro: `type_code NOT IN ('ING')`. Busca en spectrum_code Y description. Label: `"{spectrum_code} — {description}"`. Incluye Fallback. |
| Descripción | Texto (auto-rellenado) | ✅ | Auto-fill al seleccionar equipo. Editable en fallback. |

**Si Tipo = Material:**

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| Descripción | Texto libre | ✅ | El usuario describe el material. |
| Categoría de material | Texto libre | ❌ | Campo `material_category`. |

**Campos comunes (ambos tipos):**

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| Desde | Dropdown + fallback | ✅ | Locations activas. Fallback → `from_text`. |
| Hasta | Dropdown + fallback | ✅ | Locations activas. Fallback → `to_text`. Desde ≠ Hasta. |
| Cantidad | Numérico | ✅ | > 0. Default: 1. |
| Unidad | Dropdown + fallback | ❌ | Tabla `units` (11 registros). Fallback → `unit_text`. |
| Código de costo | Cascada | ❌ | Proyecto → Extra (si aplica) → Fase → Categoría. Ver sección 7.10. |
| Referencia OC | Texto | ❌ | `po_reference`. |
| Notas | Texto | ❌ | |

##### Sección C: Viajes Programados (solo en modo lectura, post-envío)

Visible cuando la solicitud tiene líneas asignadas a viajes. Muestra:
- Trip ID (monospace, clickeable → `/programacion/viaje/[id]`)
- Fecha programada, conductor, vehículo/remolque
- Líneas asignadas con cantidad
- Estado del viaje (badge)
- Código de confirmación (visible para pm/logistica/admin, NUNCA para campo/almacen)
- Timeline de eventos si existen

##### Warning de duplicados

Al agregar una línea en Borrador, el sistema busca líneas pendientes/programadas con el mismo `equipment_id` (Equipo) o descripción similar (Material) en la misma ruta, en cualquier solicitud activa. Si encuentra coincidencia, muestra aviso: "⚠️ Ya existe una solicitud pendiente para [descripción] hacia [destino] (ID, línea #, estado)." **Informativo, no bloqueante.**

##### Acciones del formulario

| Acción | Cuándo visible | Qué hace |
|--------|---------------|----------|
| Guardar borrador | Borrador | Guarda sin enviar. Redirige a lista si es nuevo. |
| Enviar solicitud | Borrador | Valida → cambia a Enviada → redirige a lista. |
| Guardar cambios | Enviada (edición) | Guarda. Se queda en detalle. |
| Cancelar solicitud | Borrador, Enviada, En Proceso | Confirmación → cancela líneas pendientes, libera programadas. |

**Redirect:** Crear nuevo → redirige a lista. Editar existente → se queda en detalle. Enviar → siempre a lista.

---

### 5.2 — Módulo: Programación de Viajes

**Usuario principal:** Charris (rol `logistica`)
**Propósito:** Convertir solicitudes pendientes en viajes programados.

#### 5.2.1 — Pantalla: Backlog + Viajes

**URL:** `/programacion`
**Acceso:** `logistica`, `admin` (CRUD), `pm` (lectura)

**Layout:** Dos secciones: Backlog arriba (principal), Viajes Recientes abajo.

**Backlog:** Todas las líneas con status `Pendiente` o `Parcial` de solicitudes activas (no Borrador, no Cancelada, no Completada).

**Columnas backlog:**
- Checkbox (para seleccionar)
- ID solicitud (monospace)
- # línea
- Tipo (🔧/📦)
- Descripción
- Desde → Hasta
- Cant. (para Parcial: muestra `available = quantity - qty_delivered`)
- Fecha req. + Días
- Prioridad (badge, calculada client-side)
- Proyecto

**Filtros backlog:** Proyecto, tipo (Equipo/Material/Todos), búsqueda texto.

**Ordenamiento:** Prioridad descendente (Vencida primero), luego fecha requerida ascendente.

**Viajes recientes:** Tabla con filtros por proyecto, estado, conductor, fecha.

**Columnas viajes:**
- Trip ID (monospace, clickeable)
- Fecha, conductor, vehículo
- Líneas (conteo)
- Estado (badge)
- Costo

**Acciones:**
- Seleccionar líneas → "+ Crear Viaje" → `/programacion/viaje/nuevo?lines=id1,id2,...`
- Click en viaje → `/programacion/viaje/[id]`
- MiniCalendar con cards de viajes por día

#### 5.2.2 — Pantalla: Calendario Look-ahead

**URL:** `/programacion` (tab calendario)
**Vista:** 2 semanas (semana actual + siguiente). Grid de días con viajes programados. Click en viaje → detalle. Color por estado.

#### 5.2.3 — Pantalla: Formulario de Viaje

**URL:** `/programacion/viaje/nuevo` o `/programacion/viaje/[id]`
**Acceso:** `logistica`, `admin`

**Modos:**
- **Crear:** Formulario en blanco + selector de líneas del backlog.
- **Editar (Programado):** Todo editable: conductor, vehículo, fecha, líneas, tarifa, notas.
- **Editar (En Ruta):** Solo notas editables.
- **Lectura (Completado/Cancelado):** Solo ver.

**Campos del viaje:**

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| Fecha programada | Date | ✅ | |
| Hora programada | Time | ❌ | `scheduled_time` |
| Conductor | Dropdown | ❌ | `people` filtrado por `app_role = 'campo'`, status = 'Activo'. |
| Vehículo | Dropdown | ❌ | `equipment` filtrado por `type_code IN ('VHL','VHP')`. Search: spectrum_code + description. |
| Remolque | Dropdown | Condicional | Filtrar: `spectrum_code LIKE 'REM%'`. **REQUERIDO** si vehículo es cabezal (`CAB%` o 'CABEZAL'). Opcional para pick-up, volquete, camión grúa. |
| Tarifa | Dropdown | ❌ | `mobilization_rates` activas. |
| Costo | Numérico | ❌ | Pre-rellenado de `rate.rate` si se selecciona tarifa. Sigue editable. |
| Permiso ATT | Toggle | ❌ | `att_permit`. Default: false. |
| Escolta | Toggle | ❌ | `escort`. Default: false. |
| Transporte externo | Toggle | ❌ | `is_external`. Default: false. |
| Notas | Textarea | ❌ | |

**Selector de líneas:** Checkboxes del backlog. Muestra descripción, ruta, cantidad disponible. Para líneas parciales muestra la cantidad aún disponible.

**Código de confirmación:** Auto-generado (4 dígitos) al crear viaje. Generado en frontend + trigger BD como safety net. Visible en formulario para logistica/admin.

**Redirect:** Crear → lista. Editar → se queda en detalle.

**Sección de eventos (en modo lectura):** Si el viaje tiene eventos registrados, muestra timeline debajo.

---

### 5.3 — Módulo: Ejecución y Registro de Eventos

**Usuarios principales:** Conductores (`campo`), Charris (`logistica`), almacenistas (`almacen`)
**Propósito:** Registrar eventos de viajes en tiempo real.

#### 5.3.1 — Pantalla: Lista de Viajes Activos

**URL:** `/mis-viajes`
**Acceso:** `logistica`, `campo`, `almacen`, `admin`

**Muestra:** Viajes con status `Programado` o `En Ruta`, ordenados por fecha ascendente.
**Sin filtro por driver_id** — cualquier usuario con acceso ve y puede registrar eventos en cualquier viaje.

**Cada card muestra:** Trip ID, fecha, conductor, vehículo, líneas asignadas con rutas, estado, barra de progreso de eventos.

#### 5.3.2 — Pantalla: Detalle de Viaje + Eventos

**URL:** `/mis-viajes/[id]`

**Layout:** Info del viaje arriba, líneas asignadas, timeline de eventos, botón prominente para siguiente evento.

**Secuencia de eventos:**

| Orden | Evento | Obligatorio | Efecto en status |
|-------|--------|:-----------:|-----------------|
| 1 | **Salida** | ✅ | Viaje → En Ruta. Líneas → En Transito. |
| 2 | **Llegada** | ❌ | Informativo. Actualiza timeline. |
| 3 | **Entrega** | ✅ | Ver flujo de entrega abajo. |
| 4 | **Retorno** | ❌ | Viaje → Completado. |
| — | **Incidencia** | ❌ | Cualquier momento. No cambia estados. |

**Secuencia progresiva:** No se puede registrar Entrega sin Salida previa. Botones se habilitan progresivamente.

**Flujo de Entrega:**
1. Ingresa código de confirmación (4 dígitos). **MUST be correct — no hay bypass.**
2. Selecciona receptor: dropdown de personas con fallback texto libre. `received_by_id` vincula a `people`.
3. Para cada línea asignada: cantidad entregada (default = `quantity_assigned`).
4. Sistema actualiza `trip_line_assignments.qty_delivered` y `sm_request_lines.qty_delivered`.
5. Si `qty_delivered >= quantity` → línea = Entregada.
6. Si `qty_delivered > 0 AND < quantity` → línea = Parcial.
7. Cascade trigger actualiza solicitud padre.
8. Trigger `update_equipment_location_on_delivery` actualiza `equipment.current_location` y `current_project_id`.

**Timestamps:** `now()` automático, NO editable. El usuario no puede cambiar cuándo ocurrió un evento.

**Eventos son INMUTABLES** — una vez creados, no se editan ni eliminan.

**Código de confirmación visible para:** `pm` (en `/solicitudes/[id]` sección Viajes), `logistica`, `admin`. **NUNCA** para `campo`/`almacen`.

---

### 5.4 — Módulo: Dashboard

**URL:** `/dashboard`
**Acceso:** Todos los roles

**Diseño:** Dashboard operativo único. Todos los roles ven las mismas métricas globales (no filtrado por rol).

**KPIs (4 cards):**
1. **Solicitudes pendientes** — status Enviada + En Proceso
2. **Ítems sin programar** — líneas Pendiente + Parcial de solicitudes activas (excluye Borrador, Cancelada, Completada)
3. **Viajes próximos** — status Programado + En Ruta con scheduled_date entre hoy y +3 días
4. **Completadas este mes** — status Completada con updated_at ≥ primer día del mes

**Componentes adicionales:**
- Chart de solicitudes por proyecto (barras horizontales)
- Actividad reciente (últimas 5 solicitudes activas + viajes de hoy)

**Dashboard es Server Component** — usa valores de BD directamente (no client-side priority).

---

### 5.5 — Módulo: Administración

**URL:** `/admin/masters`
**Acceso:** `admin`

**Layout:** 6 tabs con DataTable + búsqueda + botón agregar + modal de edición.

| Tab | Tabla | Campos editables |
|-----|-------|-----------------|
| Proyectos | `projects` | code, name, manager, status, location, client |
| Personas | `people` | name, app_role, position, department, email, phone, status + sub-sección person_projects |
| Equipos | `equipment` | spectrum_code, description, type_code, status, brand, model |
| Ubicaciones | `locations` | name, location_type, project_id, is_active |
| Tarifas | `mobilization_rates` | code, description, rate, is_active |
| Extras | `project_extras` | code, description, is_active (filtrado por proyecto) |

**Tab Personas incluye:** Sección "Proyectos Asignados" que gestiona `person_projects`. Esto permite onboarding de nuevos usuarios.

**Roles disponibles en dropdown:** admin, pm, logistica, campo, almacen.
**Location types:** Taller, Proyecto, Proveedor, Otro.
**Status proyectos:** Activo, Inactivo, Completado, Suspendido, Cerrado.

## 6. Modelo de Datos

### 6.1 — Resumen (44 tablas)

**Tablas operativas (22):** sm_requests, sm_request_lines, trips, trip_line_assignments, trip_events, equipment, people, projects, project_extras, locations, units, mobilization_rates, cost_codes, cost_categories, cost_code_categories, sequences, suggestions, notification_log, audit_log, feedback, person_projects, user_app_roles

**Tablas nuevas — expansión Mar 2026 (22):** equipment_categories, equipment_assemblies, equipment_assembly_members, inspection_templates, inspection_template_sections, inspection_template_items, equipment_inspections, inspection_responses, inspection_photos, work_orders, work_order_parts, fuel_logs, meter_readings, operator_qualifications, rental_agreements, purchase_orders, purchase_order_lines, mobilization_campaigns, warehouse_items, warehouse_transactions, vendors, equipment_status_log

Para schema completo con columnas, tipos, y constraints: usar **Supabase MCP** (todas las tablas tienen COMMENT ON TABLE/COLUMN). Para funciones, triggers, cascada, y decisiones técnicas: ver `.claude/skills/technical-decisions/SKILL.md`.

### 6.2 — Relaciones clave

| Relación | Cardinalidad | Notas |
|----------|:------------:|-------|
| Solicitud → Líneas | 1:N | Una solicitud tiene múltiples líneas. |
| Solicitud → Proyecto | N:1 | Cada solicitud pertenece a un proyecto. |
| Línea → Viaje | N:M | Via `trip_line_assignments` con `quantity_assigned` y `qty_delivered`. |
| Viaje → Eventos | 1:N | Eventos secuenciales inmutables. |
| Persona → Proyectos | N:M | Via `person_projects`. Determina permisos de PM. |
| Proyecto → Extras | 1:N | Via `project_extras`. Secciones de obra opcionales. |
| Proyecto → Fases | 1:N | Via `cost_codes`. Cada proyecto tiene sus fases de Spectrum. |
| Fase → Extras | N:1 | `cost_codes.extra_id` FK → `project_extras` (nullable). NULL = proyecto base. |
| Fase → Categorías | N:M | Via `cost_code_categories`. Cascada en UI. |
| Equipment → Equipment | Self-ref | `parent_equipment_id` para componentes de equipo. |
| People → People | Self-ref | `supervisor_id`. |

### 6.3 — Equipment (tabla unificada)

La tabla `equipment` (377 registros, 25 columnas) es **unificada**: contiene equipos pesados, vehículos, remolques, y herramientas mayores.

**Filtros por tipo:**
- Equipos para solicitud: `type_code NOT IN ('ING')`
- Vehículos (para viajes): `type_code IN ('VHL','VHP')`
- Remolques: `spectrum_code LIKE 'REM%'`

**Campos de tracking:**
- `current_location` — texto, actualizado automáticamente por trigger al registrar Entrega
- `current_project_id` — uuid FK → projects, actualizado por mismo trigger

### 6.4 — People (177 registros, 20 columnas)

Incluye campos de HR relevantes: `cedula`, `license_type`, `license_expiry`, `hire_date`, `emergency_contact_name/phone`, `supervisor_id`.

`app_role` es el mecanismo activo de RBAC. `auth_id` vincula a Supabase Auth. Solo 6 cuentas auth creadas (testing).

`user_app_roles` existe como fundación futura multi-app RBAC pero **NO se usa en código ni RLS actual**.

---

## 7. Reglas de Negocio

### 7.1 — Auto-generación de IDs

| Entidad | Formato | Ejemplo | Trigger |
|---------|---------|---------|---------|
| Solicitud | `{CódigoProyecto}-SM-{###}` | `25-506-SM-024` | `generate_request_id()` |
| Viaje | `MOV-{YYYY}-{###}` | `MOV-2026-042` | `generate_trip_id()` |
| Código confirmación | 4 dígitos | `3847` | `generate_confirmation_code()` (safety net) + frontend |
| Full code (costo) | `{proy}[-{extra}]-{fase}` | `24-404-E1-01-3100` | `generate_full_code()` |

Secuencias se almacenan en tabla `sequences` (tipo + project_id + next_number).

### 7.2 — Cálculo automático de prioridad

Compara `date_required` con fecha actual:

| Condición | Prioridad | Color |
|-----------|-----------|-------|
| Fecha ya pasó | **Vencida** | 🔴 Rojo |
| Faltan 0–3 días | **Urgente** | 🟠 Naranja |
| Faltan 4–7 días | **Próxima** | 🔵 Azul |
| Faltan 8+ días | **Normal** | 🟢 Verde |

**Trigger BD:** `calculate_priority()` en BEFORE INSERT/UPDATE de `sm_requests`.
**Client-side:** `calculatePriority()` en `lib/utils/format.ts` para display en tiempo real en páginas client.

**Nota:** El trigger usa `'Proxima'` (sin acento). El client-side usa `'Próxima'` (con acento). Los badges manejan ambos.

### 7.3 — Clasificación de tipo de movilización

Basado en `location_type` de las ubicaciones:

| Desde | Hasta | Tipo |
|-------|-------|------|
| Taller | Proyecto | Movilización |
| Proveedor | Proyecto | Movilización (desde proveedor) |
| Proveedor | Taller | Recepción en Taller |
| Proyecto | Taller | Desmovilización |
| Proyecto A | Proyecto B | Movimiento Interno |

### 7.4 — Reglas de edición de solicitudes

| Estado | Header | Líneas existentes | Agregar líneas | Eliminar líneas |
|--------|--------|-------------------|----------------|-----------------|
| **Borrador** | ✅ Editable | ✅ Editable | ✅ Sí | ✅ Sí |
| **Enviada** | ✅ Editable | ✅ Editable | ❌ No | ⚠️ Con warning si programada |
| **En Proceso** | 🔒 Lectura | 🔒 Lectura | ❌ No | ❌ No |
| **Completada** | 🔒 Lectura | 🔒 Lectura | ❌ No | ❌ No |
| **Cancelada** | 🔒 Lectura | 🔒 Lectura | ❌ No | ❌ No |

**Quién puede editar:** PM del proyecto, Charris (logistica), o admin.

### 7.5 — Reglas de edición de viajes

| Estado | Campos editables |
|--------|-----------------|
| **Programado** | Todo: conductor, vehículo, fecha, líneas, tarifa, notas |
| **En Ruta** | Solo notas |
| **Completado** | Solo lectura |
| **Cancelado** | Solo lectura |

### 7.6 — Cancelación

**Cancelar Solicitud:**
- Disponible en Borrador, Enviada, En Proceso.
- Cancela todas las líneas pendientes.
- Líneas ya programadas se liberan (regresan a Pendiente).
- Requiere confirmación.

**Cancelar Viaje:**
- Disponible en Programado (excepcional en En Ruta).
- Libera líneas: resta `qty_scheduled`, revierte status según `qty_delivered`.
- Requiere confirmación.

### 7.7 — Warning de duplicados

Al agregar línea en Borrador, busca líneas pendientes/programadas con mismo `equipment_id` (Equipo) o descripción similar (Material) para misma ruta en solicitudes activas. **Informativo, no bloqueante.**

### 7.8 — Validaciones del formulario de solicitud

| Validación | Momento | Mensaje |
|-----------|---------|---------|
| Proyecto requerido | Al enviar | "Seleccione un proyecto" |
| Solicitante requerido | Al enviar | "Seleccione el solicitante" |
| Fecha requerida ≥ hoy | Al enviar | "La fecha no puede ser pasado" |
| Mínimo 1 línea | Al enviar | "Agregue al menos una línea" |
| Descripción requerida | Al agregar línea | "La descripción es requerida" |
| Cantidad > 0 | Al agregar línea | "Cantidad debe ser mayor a cero" |
| Desde y Hasta requeridos | Al agregar línea | "Indique origen y destino" |
| Desde ≠ Hasta | Al agregar línea | "Origen y destino no pueden ser iguales" |

### 7.9 — Fallback universal en dropdowns

Cada dropdown de tabla maestra tiene opción "No está en lista" que habilita campo de texto libre alternativo (`_text` columns: `from_text`, `to_text`, `equipment_text`, `unit_text`).

### 7.10 — Códigos de costo en cascada

**Cascada completa:**
1. **Proyecto** → seleccionado en header
2. **Extra** (opcional) → dropdown visible solo si proyecto tiene `project_extras`. Opciones: "(Proyecto Base)" + extras del proyecto.
3. **Fase** → `cost_codes` filtrado por `project_id` Y `extra_id` (null para base).
4. **Categoría** → `cost_categories` filtrado via `cost_code_categories` por `cost_code_id`.
5. **Código generado:** `{proyecto}[-{extra}]-{fase}-{categoría}` (ej: `24-404-E1-01-3100-EQI`)

Cuando cambia proyecto: reset extra, fase, categoría.
Cuando cambia extra: reset fase, categoría.
Cuando cambia fase: reset categoría.

### 7.11 — Entregas parciales

- `qty_delivered` acumula (+=) en `trip_line_assignments` Y `sm_request_lines`.
- Si `qty_delivered >= quantity` → status = 'Entregada' + `delivered_at = now()`.
- Si `qty_delivered > 0 AND < quantity` → status = 'Parcial'.
- Líneas Parcial aparecen en backlog con cantidad disponible: `quantity - qty_delivered`.
- Cascade trigger actualiza solicitud padre.

### 7.12 — Tracking de ubicación de equipos

Trigger `update_equipment_location_on_delivery()` en AFTER INSERT de `trip_events`:
- Solo dispara para eventos de tipo 'Entrega'.
- Para cada línea asignada con `equipment_id` NOT NULL:
  - Actualiza `equipment.current_location` con nombre de la ubicación destino.
  - Actualiza `equipment.current_project_id` con el proyecto destino.

---

## 8. Estados y Transiciones

### 8.1 — Estados de Solicitud (sm_requests)

```
Borrador → Enviada → En Proceso → Completada
                                → Cancelada
```

**5 estados válidos:** Borrador, Enviada, En Proceso, Completada, Cancelada.

**⚠️ NO EXISTE estado 'Parcial' a nivel de solicitud.** La cascada produce 'Completada' cuando todas las líneas están resueltas con al menos una entregada.

| Transición | Trigger | Quién |
|-----------|---------|-------|
| → Borrador | Crear solicitud | pm, admin |
| Borrador → Enviada | PM envía solicitud | pm, admin |
| Enviada → En Proceso | Alguna línea programada/en tránsito/entregada/parcial | Sistema (cascade) |
| En Proceso → Completada | Todas las líneas = Entregada + Cancelada (con ≥1 Entregada) | Sistema (cascade) |
| En Proceso → Cancelada | Todas las líneas = Cancelada | Sistema (cascade) |
| Cualquiera → Cancelada | Cancelación manual | logistica, admin |

### 8.2 — Estados de Línea (sm_request_lines)

```
Pendiente → Programada → En Transito → Entregada
                                     → Parcial (→ puede volver a Programada)
     ↓           ↓            ↓
  Cancelada   Cancelada    Cancelada
```

**6 estados válidos:** Pendiente, Programada, En Transito, Entregada, Parcial, Cancelada.

**⚠️ 'En Transito' SIN ACENTO es el valor canónico en BD.** El código usa esta forma exacta. Mismatches fallan silenciosamente.

| Transición | Trigger |
|-----------|---------|
| → Pendiente | Se crea la línea |
| Pendiente → Programada | Charris asigna a viaje |
| Programada → Pendiente | Viaje cancelado (líneas liberadas) |
| Programada → En Transito | Evento Salida registrado |
| En Transito → Entregada | Entrega completa (qty_delivered ≥ quantity) |
| En Transito → Parcial | Entrega incompleta (qty_delivered > 0 AND < quantity) |
| Parcial → Programada | Charris programa otro viaje para el remanente |
| Cualquiera → Cancelada | Cancelación manual |

### 8.3 — Estados de Viaje (trips)

```
Programado → En Ruta → Completado
     ↓
  Cancelado
```

**4 estados válidos:** Programado, En Ruta, Completado, Cancelado.

| Transición | Trigger |
|-----------|---------|
| → Programado | Charris crea viaje |
| Programado → En Ruta | Evento Salida |
| En Ruta → Completado | Evento Retorno |
| Programado → Cancelado | Cancelación manual |

### 8.4 — Regla de cascada de estados

Trigger `cascade_request_status()` — AFTER UPDATE en `sm_request_lines`, SECURITY DEFINER.

Cuando cambia el status de una línea, re-evalúa la solicitud padre:

```sql
-- Cuenta por status
total_lines = COUNT(*) WHERE request_id = X
delivered = COUNT(*) WHERE status = 'Entregada'
cancelled = COUNT(*) WHERE status = 'Cancelada'
in_progress = COUNT(*) WHERE status IN ('Programada', 'En Transito')
parcial = COUNT(*) WHERE status = 'Parcial'

-- Evaluación en orden:
IF delivered + cancelled = total AND delivered > 0 → 'Completada'
IF cancelled = total → 'Cancelada'
IF in_progress > 0 OR delivered > 0 OR parcial > 0 → 'En Proceso'
ELSE → 'Enviada'
```

**NO modifica solicitudes en Borrador o Cancelada.**

**Gotcha importante:** Este trigger es AFTER UPDATE, no INSERT. Si se insertan líneas con status final (ej. seed data), la cascada no se dispara.

---

## 9. Notificaciones y Automatizaciones

### 9.1 — Notificaciones (implementado — Resend server actions)

| Evento | Destinatario | Contenido |
|--------|-------------|-----------|
| Solicitud enviada | Charris (logistica) | "Nueva solicitud {ID} de {Solicitante}. {N} líneas. Fecha req: {Fecha}." |
| Solicitud programada | Solicitante (pm) | "Tu solicitud {ID} programada. Viaje {ViajeID} para {Fecha}." |
| Solicitud completada | Solicitante (pm) | "Tu solicitud {ID} completada." |
| Viaje en ruta | PM del proyecto | "Viaje {ID} en ruta hacia {destino}." |
| Entrega confirmada | PM del proyecto | "Entrega confirmada: {descripción} en {destino}." |

**Canal:** Email via Resend (server actions, 12 templates, fire-and-forget). **Futuro:** WhatsApp.

### 9.2 — Automatizaciones activas (triggers BD)

- Generación de IDs secuenciales (solicitudes y viajes)
- Generación de códigos de confirmación
- Cálculo automático de prioridad
- Cascada de estados (línea → solicitud)
- Tracking de ubicación de equipos
- Timestamps de lifecycle (submitted, completed, cancelled)
- Auditoría completa (INSERT/UPDATE/DELETE en 4 tablas transaccionales)
- Auto-generación de full_code en cost_codes

---

## 10. Requisitos No Funcionales

### 10.1 — Rendimiento
- Carga inicial < 3 segundos en 3G
- Queries de lista < 500ms (sin paginación actual — pendiente)

### 10.2 — Seguridad
- Autenticación via Supabase Auth (email/contraseña)
- RLS habilitado en todas las tablas (68 políticas)
- `get_my_app_role()` como base de todas las políticas
- Cascade trigger con SECURITY DEFINER
- Audit trail completo con old/new data

### 10.3 — UX
- 100% en español (UI, mensajes, placeholders)
- Mobile-first (conductores usan celulares)
- IDs en fuente monoespaciada
- Badges de color para estados y prioridades
- Formularios tipo factura (header + líneas + acciones)

### 10.4 — Datos
- Todos los IDs son UUID
- Timestamps con timezone (timestamptz)
- Auditoría con JSONB old_data/new_data/changed_fields
- Eventos inmutables (no UPDATE/DELETE en trip_events)

---

## 11. Alcance — Qué está construido y qué sigue

### 11.1 — Construido (MVP)

| Módulo | Estado | Fecha |
|--------|--------|-------|
| Auth + Layout | ✅ | 2026-03-04 |
| Solicitudes CRUD | ✅ | 2026-03-05 |
| Programación + Backlog | ✅ | 2026-03-05 |
| Ejecución + Eventos | ✅ | 2026-03-06 |
| Dashboard | ✅ | 2026-03-06 |
| Admin Masters (6 tabs) | ✅ | 2026-03-12 |
| Entregas parciales | ✅ | 2026-03-12 |
| Equipment tracking | ✅ | 2026-03-12 |
| Calendario look-ahead | ✅ | 2026-03-12 |
| Cost codes Spectrum | ✅ | 2026-03-08 |

### 11.2 — Pendiente

Ver `Docs/MASTER_BACKLOG.md` para el roadmap priorizado completo.

**Pre-producción:** RLS real, notificaciones, paginación, person_projects, /solicitudes/[id] completo.
**Post-lanzamiento:** Inspecciones, reportes auto-generados, dashboards por rol, work orders, fuel tracking, datos históricos.

---

## 12. Glosario

| Término | Definición |
|---------|-----------|
| **Solicitud (SM)** | Pedido formal para mover equipo/material. ID: `{Proyecto}-SM-{###}`. |
| **Línea** | Un ítem dentro de una solicitud: equipo o material con origen, destino, cantidad. La unidad operativa primaria. |
| **Viaje (Trip)** | Salida física de un vehículo. ID: `MOV-{YYYY}-{###}`. Puede llevar líneas de múltiples solicitudes. |
| **Backlog** | Todas las líneas pendientes/parciales de programar. Vista principal de Charris. |
| **Charris** | Carlos Charris — Coordinador de Logística. Usuario más importante del sistema. |
| **Cascade** | Trigger que actualiza el status de solicitud basado en los statuses de sus líneas. |
| **Fallback** | Opción "No está en lista" en dropdowns que habilita campo de texto libre. |
| **Spectrum** | Sistema ERP de ICONSA (Sage). Fuente de cost codes y equipment codes. |
| **Extra** | Sección de obra dentro de un proyecto (ej: E1 = Camino de acceso). Afecta estructura de cost codes. |
| **Parcial** | Status de LÍNEA cuando qty_delivered > 0 pero < quantity. NO existe a nivel de solicitud. |
| **En Transito** | Status de línea cuando el viaje está en ruta. Sin acento. Valor canónico en BD. |
