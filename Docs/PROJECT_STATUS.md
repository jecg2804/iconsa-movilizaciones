# ICONSA Movilizaciones - Estado del Proyecto

Ultima actualizacion: 2026-03-04 (toolstack actualizado: NestJS backend, n8n eliminado)

Actualizar este archivo despues de CADA paso completado.
Este documento es la UNICA fuente de verdad para el estado del schema, decisiones, y progreso.

---

## INFRAESTRUCTURA

| Componente | Estado | Detalle |
|-----------|--------|---------|
| Supabase | Activo | https://bzeoszympkkicwlfdtcn.supabase.co (Oregon us-west-2) |
| GitHub | Activo | ICONSA-Solutions/movimientOS (org privada) |
| Next.js (frontend) | Inicializado | v16.1.6, localhost:3000, .env.local configurado |
| NestJS (backend) | PENDIENTE | Backend API — deploy target: Railway/Fly.io |
| Supabase Auth | PENDIENTE | Aun no configurado |
| Supabase Storage | PENDIENTE | Para attachments de solicitudes |

Documentacion en repo (docs/):
- [x] README.md (actualizado 2026-03-04)
- [x] ICONSA_Feature_Specification_v3.md (v3.0, markdown, actualizado 2026-03-05)
- [x] ICONSA_MVP_Sprint_Brief.md (v3.0, actualizado 2026-03-04)
- [x] BUILD_PLAN.md (actualizado 2026-03-04)
- [x] ICONSA_Guia_Operativa.md
- [x] PROJECT_STATUS.md (este archivo)

---

## SCHEMA COMPLETO DE BASE DE DATOS

### Convenciones globales
- Todos los IDs son UUID con gen_random_uuid()
- Todas las tablas tienen created_at TIMESTAMPTZ DEFAULT now()
- Todas las tablas (excepto trip_events y sequences) tienen updated_at TIMESTAMPTZ con trigger automatico
- RLS habilitado en TODAS las tablas con politicas de desarrollo
- 10 indices de performance en columnas frecuentemente filtradas

### Trigger global: update_updated_at()
Se ejecuta BEFORE UPDATE en todas las tablas que tienen updated_at.
Automaticamente setea NEW.updated_at = now().


---

### TABLA: equipment (UNIFICADA - equipos + vehiculos)

Antes existia tabla separada vehicles. Se unifico. Vehiculos = type_code VHL/VHP.
Principio: misma estructura = misma tabla, clasificacion por columnas, filtrado en codigo.

| Columna | Tipo | Nullable | Default | Descripcion |
|---------|------|----------|---------|-------------|
| id | UUID PK | No | gen_random_uuid() | Identificador unico |
| spectrum_code | TEXT | Si | - | Codigo Spectrum (GRU508, CAB930) |
| description | TEXT | No | - | Nombre/descripcion |
| equipment_type | TEXT | Si | - | Nombre largo (Equipo Pesado, Gruas, Vehiculos Livianos) |
| type_code | TEXT | Si | - | Codigo corto: EQP, GRU, MAR, EQA, EQL, FND, TEC, ING, VHL, VHP |
| brand | TEXT | Si | - | Marca |
| model | TEXT | Si | - | Modelo |
| serial_number | TEXT | Si | - | Numero de serie |
| year | INTEGER | Si | - | Ano fabricacion (4 digitos) |
| status | TEXT | Si | - | Activo, Inactivo |
| current_location | TEXT | Si | - | Ubicacion actual (texto libre) |
| plate | TEXT | Si | - | Placa (solo VHL/VHP) |
| capacity | TEXT | Si | - | Capacidad (350 HP, 50 TON) |
| inspection_type | TEXT | Si | - | HOROMETRO, ODOMETRO, o NULL |
| current_project_id | UUID FK | Si | - | FK projects. Donde esta AHORA |
| weight_class | TEXT | Si | - | Clase de peso. Para permisos ATT |
| acquisition_type | TEXT | Si | Propio | Propio, Alquilado, Leasing |
| last_inspection_date | DATE | Si | - | Ultima inspeccion |
| next_inspection_due | DATE | Si | - | Proxima inspeccion |
| meter_reading | NUMERIC | Si | - | Lectura horometro/odometro |
| insurance_expiry | DATE | Si | - | Vencimiento seguro |
| notes | TEXT | Si | - | Notas internas |
| created_at | TIMESTAMPTZ | No | now() | Creacion |
| updated_at | TIMESTAMPTZ | No | now() | Ultima modificacion (trigger) |

Datos: 377 registros importados registros (equipment_for_supabase.csv)
Distribucion: TEC:121 MAR:48 ING:39 VHL:38 FND:34 EQA:31 EQP:26 GRU:16 VHP:15 EQL:9
Los 14 MOV de Spectrum NO van aqui, ya estan en mobilization_rates.
FKs entrantes: sm_request_lines.equipment_id, trips.vehicle_id, trips.trailer_id

Filtros app:
- Solicitud (ingeniero): type_code NOT IN ('ING') + fallback texto
- Vehiculo (Charris): type_code IN ('VHL','VHP') - pendiente refinar con Astrid
- EQA = equipos menores (distincion para reporteria)

---

### TABLA: people

| Columna | Tipo | Nullable | Default | Descripcion |
|---------|------|----------|---------|-------------|
| id | UUID PK | No | gen_random_uuid() | Identificador unico |
| auth_id | UUID | Si | - | FK Supabase Auth |
| code | TEXT | Si | - | Codigo Spectrum (CUC166) |
| name | TEXT | Si | - | Nombre completo |
| department | TEXT | Si | - | Departamento (pendiente) |
| position | TEXT | Si | - | Cargo (pendiente) |
| phone | TEXT | Si | - | Telefono |
| email | TEXT | Si | - | Correo. Requerido para usuarios sistema |
| app_role | TEXT | Si | NULL | admin, pm, logistica, campo, almacen (NULL = sin acceso al sistema) |
| status | TEXT | Si | - | Activo, Inactivo |
| city | TEXT | Si | - | Ciudad de residencia |
| supervisor_id | UUID FK | Si | - | FK people. Jefe directo |
| cedula | TEXT | Si | - | Cedula Panama |
| license_type | TEXT | Si | - | Tipo licencia conducir |
| license_expiry | DATE | Si | - | Vencimiento licencia |
| hire_date | DATE | Si | - | Fecha contratacion |
| emergency_contact_name | TEXT | Si | - | Contacto emergencia |
| emergency_contact_phone | TEXT | Si | - | Tel emergencia |
| created_at | TIMESTAMPTZ | No | now() | Creacion |
| updated_at | TIMESTAMPTZ | No | now() | Modificacion (trigger) |

Datos: 164 registros (160 importados + 4 test users nuevos). 6 usuarios con auth_id y app_role asignados: admin, almacen, campo, logistica (Charris CHA082), pm×2 (Caballero, Jacome JAC161). Duplicados de Charris y Jacome mergeados en filas reales con código de empleado.
Roles: admin=James, pm=ingenieros, logistica=Charris, campo=conductores, almacen=Yoseph

---

### TABLA: projects

| Columna | Tipo | Nullable | Default | Descripcion |
|---------|------|----------|---------|-------------|
| id | UUID PK | No | gen_random_uuid() | ID |
| code | TEXT UNIQUE | No | - | Codigo (25-506) |
| name | TEXT | No | - | Nombre |
| manager | TEXT | Si | - | Gerente |
| status | TEXT | Si | - | Activo, Completado, Suspendido |
| start_date | DATE | Si | - | Inicio |
| end_date | DATE | Si | - | Fin estimado |
| notes | TEXT | Si | - | Notas |
| billing_code | TEXT | Si | - | Codigo facturacion |
| budget | NUMERIC | Si | - | Presupuesto |
| client | TEXT | Si | - | Cliente |
| location | TEXT | Si | - | Ubicacion fisica del proyecto |
| created_at | TIMESTAMPTZ | No | now() | Creacion |
| updated_at | TIMESTAMPTZ | No | now() | Modificacion (trigger) |

Datos: 4 registros: ASTIBAL (25-504), Paraiso (25-505), Muelle 14 (25-506), Costa Norte (24-404)

---

### TABLA: person_projects (asignacion persona-proyecto)

id UUID PK, person_id FK people (CASCADE), project_id FK projects (CASCADE), role TEXT, is_active BOOLEAN DEFAULT true, created_at, updated_at.
UNIQUE(person_id, project_id). Datos: 11 asignaciones (Admin×4, Charris×4, Caballero×2, Jacome×1).

---

### TABLA: locations

id UUID PK, name TEXT NOT NULL, location_type TEXT (Taller/Almacen/Proyecto/Proveedor/Oficina/Externo), address TEXT, project_id FK projects, is_active BOOLEAN, contact_name TEXT, contact_phone TEXT, notes TEXT, created_at, updated_at.
Datos: 9 registros. Pendiente agregar proveedores frecuentes.

---

### TABLA: mobilization_rates

id UUID PK, code TEXT, description TEXT, rate NUMERIC, is_active BOOLEAN DEFAULT true, created_at, updated_at.
Datos: 14 registros completos.

---

### TABLA: units

id UUID PK, code TEXT, description TEXT, created_at, updated_at. Datos: 11 registros.

---

### TABLA: cost_codes

id UUID PK, project_id FK projects, phase_code TEXT NOT NULL, phase_description TEXT, full_code TEXT, created_at, updated_at.
Datos: VACIO. Pendiente importar codcost.csv.

---

### TABLA: sequences (interna)

seq_type TEXT, project_id FK projects (nullable), next_number INTEGER.
UNIQUE(seq_type, COALESCE(project_id, UUID_CERO)). Auto-gestionada.
Datos: 5 registros (SM×4 proyectos + MOV global). next_number=1 en todas.

---

## TABLAS TRANSACCIONALES

### TABLA: sm_requests (solicitudes - header)

| Columna | Tipo | Default | Descripcion |
|---------|------|---------|-------------|
| id | UUID PK | gen_random_uuid() | ID |
| request_id | TEXT UNIQUE | auto | 25-506-SM-001 |
| project_id | UUID FK | - | FK projects |
| requester_id | UUID FK | - | FK people |
| date_required | DATE | - | Fecha requerida |
| date_created | TIMESTAMPTZ | now() | Cuando se creo |
| status | TEXT | Borrador | Borrador/Enviada/En Proceso/Completada/Parcial/Cancelada |
| priority | TEXT | auto | Vencida/Urgente/Proxima/Normal |
| approved_by | UUID FK | - | FK people |
| notes | TEXT | - | Notas |
| attachments | JSONB | - | URLs archivos adjuntos |
| created_at | TIMESTAMPTZ | now() | Creacion |
| updated_at | TIMESTAMPTZ | now() | Modificacion (trigger) |

Triggers: generate_request_id(), calculate_priority(), update_updated_at()

---

### TABLA: sm_request_lines (lineas de solicitud)

| Columna | Tipo | Default | Descripcion |
|---------|------|---------|-------------|
| id | UUID PK | gen_random_uuid() | ID |
| request_id | UUID FK | - | FK sm_requests (ON DELETE CASCADE) |
| line_number | INTEGER | - | Numero de linea |
| line_type | TEXT | - | Equipo o Material |
| equipment_id | UUID FK nullable | - | FK equipment (si esta en lista) |
| description | TEXT | - | Descripcion de lo solicitado |
| from_location_id | UUID FK nullable | - | FK locations (origen) |
| to_location_id | UUID FK nullable | - | FK locations (destino) |
| quantity | DECIMAL(10,2) | 1 | Cantidad solicitada |
| unit_id | UUID FK nullable | - | FK units |
| cost_code_id | UUID FK nullable | - | FK cost_codes |
| category | TEXT | - | Categoria del item |
| po_reference | TEXT | - | Referencia OC (texto libre MVP) |
| notes | TEXT | - | Notas de la linea |
| status | TEXT | Pendiente | Pendiente/Programada/En Transito/Entregada/Parcial/Cancelada |
| qty_scheduled | DECIMAL(10,2) | 0 | Cantidad programada en viajes |
| qty_delivered | DECIMAL(10,2) | 0 | Cantidad entregada confirmada |
| from_text | TEXT | - | Fallback: origen texto libre |
| to_text | TEXT | - | Fallback: destino texto libre |
| equipment_text | TEXT | - | Fallback: equipo texto libre |
| unit_text | TEXT | - | Fallback: unidad texto libre |
| created_at | TIMESTAMPTZ | now() | Creacion |
| updated_at | TIMESTAMPTZ | now() | Modificacion |

Trigger: cascade_request_status() - actualiza sm_requests.status basado en estados de lineas.
Constraints: CHECK (line_type IN ('Equipo','Material')). FK request_id ON DELETE CASCADE.

---

### TABLA: trips (viajes programados)

id, trip_id (auto MOV-2026-001), scheduled_date DATE, driver_id FK people, vehicle_id FK equipment, trailer_id FK equipment, rate_id FK mobilization_rates, cost DECIMAL, att_permit BOOLEAN, escort BOOLEAN, confirmation_code TEXT (auto 4 digitos), notes TEXT, status TEXT DEFAULT Programado (Programado/En Ruta/Completado/Cancelado), actual_departure TIMESTAMPTZ, actual_arrival TIMESTAMPTZ, route_summary TEXT, is_external BOOLEAN DEFAULT false, created_at, updated_at.
Trigger: generate_trip_id() + confirmation_code

---

### TABLA: trip_line_assignments (pivote many-to-many)

id, trip_id FK trips (CASCADE), request_line_id FK sm_request_lines, quantity_assigned DECIMAL, created_at, updated_at.
UNIQUE(trip_id, request_line_id). Un viaje lleva lineas de MULTIPLES solicitudes. Una linea puede dividirse en MULTIPLES viajes.

---

### TABLA: trip_events (eventos - INMUTABLES)

id, trip_id FK trips, event_type TEXT (Salida/Llegada/Entrega/Retorno/Incidencia), event_timestamp TIMESTAMPTZ, location TEXT, registered_by FK people, confirmation_code_used TEXT, received_by_name TEXT, notes TEXT, created_at.
NO tiene updated_at. Eventos son inmutables una vez registrados.

---

### TABLA: suggestions (fallbacks)

id, table_name TEXT, suggested_value TEXT, suggested_by FK people, status TEXT (pendiente/aprobada/rechazada), reviewed_by FK people, created_at.

---

## TRIGGERS Y FUNCIONES

| Funcion | Tabla | Evento | Descripcion |
|---------|-------|--------|-------------|
| update_updated_at() | Todas (excepto trip_events, sequences) | BEFORE UPDATE | Setea updated_at = now() |
| generate_request_id() | sm_requests | BEFORE INSERT | Auto {project_code}-SM-### |
| generate_trip_id() | trips | BEFORE INSERT | Auto MOV-YYYY-### + codigo 4 digitos |
| calculate_priority() | sm_requests | BEFORE INSERT/UPDATE date_required | Vencida/Urgente/Proxima/Normal |
| cascade_request_status() | sm_request_lines | AFTER UPDATE | Actualiza header basado en lineas |

---

## SEGURIDAD RLS

RLS en TODAS las tablas. Dev: lectura publica masters, full transaccionales. Prod: pm=ve todas, crea/edita sus proyectos. campo=sus viajes. logistica=todo.

## INDICES

sm_requests: project_id, status, requester_id. sm_request_lines: request_id, status, equipment_id. trips: scheduled_date, driver_id, status. trip_line_assignments: trip_id.

---

## DATOS CARGADOS vs PENDIENTES

| Tabla | Estado | Registros |
|-------|--------|----------|
| projects | COMPLETO | 4 |
| locations | COMPLETO (base) | 9 |
| mobilization_rates | COMPLETO | 14 |
| units | COMPLETO | 11 |
| equipment | COMPLETO | 377 |
| people | COMPLETO | 160 |
| cost_codes | PENDIENTE | 0 |
| Transaccionales | VACIO | Se llenan con app |

---

## APP NEXT.JS - COMPONENTES

### Fase 0 — Fundacion (COMPLETADA)
| Archivo | Estado |
|---------|--------|
| lib/types/database.ts | COMPLETADO |
| lib/supabase/client.ts | COMPLETADO |
| lib/supabase/server.ts | COMPLETADO |
| lib/utils/constants.ts | COMPLETADO |
| lib/utils/status.ts | COMPLETADO |
| lib/utils/roles.ts | COMPLETADO |
| lib/utils/format.ts | COMPLETADO |
| hooks/useAuth.ts | COMPLETADO |
| middleware.ts | COMPLETADO |

### Fase 1 — Auth + Layout Shell (COMPLETADA)
| Archivo | Estado |
|---------|--------|
| app/globals.css | COMPLETADO |
| app/layout.tsx | COMPLETADO |
| app/(auth)/login/page.tsx | COMPLETADO |
| components/ui/Button.tsx | COMPLETADO |
| components/ui/Input.tsx | COMPLETADO |
| components/layout/Sidebar.tsx | COMPLETADO |
| components/layout/Topbar.tsx | COMPLETADO |
| components/layout/MobileNav.tsx | COMPLETADO |
| components/layout/AppShell.tsx | COMPLETADO |
| app/(app)/layout.tsx | COMPLETADO |
| app/(app)/dashboard/page.tsx | COMPLETADO (placeholder KPIs) |
| app/page.tsx | COMPLETADO (redirect) |

### Fase 2 — Solicitudes (COMPLETADA)
| Archivo | Estado |
|---------|--------|
| components/ui/Badge.tsx | COMPLETADO |
| components/ui/Select.tsx | COMPLETADO |
| components/ui/DuplicateWarning.tsx | COMPLETADO |
| lib/utils/duplicates.ts | COMPLETADO |
| hooks/useProjects.ts | COMPLETADO |
| hooks/useEquipment.ts | COMPLETADO |
| hooks/useLocations.ts | COMPLETADO |
| components/ui/SelectWithFallback.tsx | COMPLETADO |
| components/ui/DataTable.tsx | COMPLETADO |
| hooks/useSolicitudes.ts | COMPLETADO |
| components/solicitudes/LineRow.tsx | COMPLETADO |
| components/solicitudes/LineEditor.tsx | COMPLETADO |
| components/solicitudes/SolicitudForm.tsx | COMPLETADO |
| app/(app)/solicitudes/page.tsx | COMPLETADO |
| app/(app)/solicitudes/nueva/page.tsx | COMPLETADO |
| app/(app)/solicitudes/[id]/page.tsx | COMPLETADO |

### Fase 3 — Programacion (COMPLETADA)

| Archivo | Estado |
|---------|--------|
| hooks/useVehicles.ts | COMPLETADO |
| hooks/useTrips.ts | COMPLETADO |
| components/programacion/BacklogTable.tsx | COMPLETADO |
| components/programacion/LineSelector.tsx | COMPLETADO |
| components/programacion/TripForm.tsx | COMPLETADO |
| app/(app)/programacion/page.tsx | COMPLETADO |
| app/(app)/programacion/viaje/nuevo/page.tsx | COMPLETADO |
| app/(app)/programacion/viaje/[id]/page.tsx | COMPLETADO |
| app/(app)/programacion/calendario/page.tsx | COMPLETADO (placeholder) |

## APP NEXT.JS - PANTALLAS

| Ruta | Actor | Estado |
|------|-------|--------|
| / | Todos | COMPLETADO (redirect a login/dashboard) |
| /login | Todos | COMPLETADO |
| /dashboard | Todos (metricas globales) | COMPLETADO (placeholder KPIs) |
| /solicitudes | pm, admin, logistica | COMPLETADO |
| /solicitudes/nueva | pm, admin | COMPLETADO |
| /solicitudes/[id] | pm, admin, logistica | COMPLETADO |
| /programacion | logistica, admin, pm(ro) | COMPLETADO |
| /programacion/viaje/nuevo | logistica, admin | COMPLETADO |
| /programacion/viaje/[id] | logistica, admin | COMPLETADO |
| /programacion/calendario | logistica, admin, pm(ro) | COMPLETADO (placeholder) |
| /mis-viajes | logistica, campo, almacen, admin | PENDIENTE |
| /mis-viajes/[id] | logistica, campo, almacen, admin | PENDIENTE |
| /admin/masters | admin | PENDIENTE |

---

## DECISIONES TOMADAS (Auditoria 2026-03-04)

1. PM ve TODAS las solicitudes (filtro default=su proyecto). CREA y EDITA solo para SUS proyectos.
2. Enviada: editar header y lineas existentes, NO agregar lineas nuevas. Solo Borrador permite agregar.
3. SI se puede eliminar linea programada — con warning de confirmacion.
4. Cancelar viaje libera lineas de vuelta al backlog (Pendiente).
5. Eventos: cualquier logistica/campo/almacen puede registrar. Sin restriccion por driver_id en MVP.
6. Dashboard: metricas globales, sin restriccion por rol.
7. Warning de lineas duplicadas: visual, no bloqueante. Solo al agregar en Borrador.
8. Notificaciones email via NestJS incluidas en MVP.
9. Bitacora de Movilizaciones: Fase 2, NO MVP.
10. Edicion en estados En Proceso/Parcial: TBD con feedback de usuarios.

## BUGS CONOCIDOS

| # | Bug | Estado | Fecha |
|---|-----|--------|-------|
| 1 | Botón "Enviar Solicitud" fallaba (trigger generate_request_id) | RESUELTO | 2026-03-05 |
| 2 | Crear viaje fallaba por indexes duplicados en sequences | RESUELTO | 2026-03-05 |
| 3 | Tarifa seleccionada no pre-rellena campo Costo | PENDIENTE | 2026-03-05 |
| 4 | Dropdowns no filtrados (conductor muestra 164 personas, equipo sin filtro) | PENDIENTE | 2026-03-05 |
| 5 | Guardar/Enviar no redirige a pantalla anterior | PENDIENTE | 2026-03-05 |
| 6 | Viajes Recientes: falta columna remolque, tarifa, ruta; falta filtros | PENDIENTE | 2026-03-05 |
| 7 | Líneas del viaje no muestran fecha requerida | PENDIENTE | 2026-03-05 |
| 8 | Remolque siempre opcional — debe ser requerido cuando vehículo es cabezal | PENDIENTE | 2026-03-05 |

## MEJORAS DESCUBIERTAS DURANTE TESTING

| # | Mejora | Prioridad | Fase |
|---|--------|-----------|------|
| 1 | Agrupación de viajes de grúa para facturación (multiplicador) | Media | Fase 2 |
| 2 | Relación BD entre tarifa y tipo de vehículo/remolque para auto-sugerencia | Media | Fase 2 |
| 3 | Campos de nota de entrega (código equipo, descripción, placa) en viaje | Media | Fase 2 |
| 4 | Toggle de código de confirmación por solicitante según tipo de carga | Baja | TBD |
| 5 | Integración GPS Skydata (https://app.skydatapa.com/) para tracking de flota | Alta | Fase 2 |

## PENDIENTES VIDA REAL (James con equipo ICONSA)

| # | Pendiente | Con quién | Estado |
|---|-----------|-----------|--------|
| 1 | Lista de conductores activos y flota de Charris | Charris | TIENE LISTA |
| 2 | Clasificar personas por departamento y cargo | Charris + HR | PENDIENTE |
| 3 | Importar códigos de costo por proyecto (Memo de inicio) | Astrid | PENDIENTE |
| 4 | Confirmar categorías de equipo a excluir de dropdown | Astrid | PARCIAL (ING confirmado) |
| 5 | Placas de vehículos | Charris/Fleetwise | PENDIENTE |
| 6 | Definir roles y accesos de usuarios finales | Gerencia | PENDIENTE |
| 7 | Confirmar lógica de tarifas con cabezal/remolque/grúa | Charris + Gerencia | PENDIENTE |
| 8 | Ubicaciones adicionales (proveedores frecuentes) | Charris | PENDIENTE |

## DECISIONES PENDIENTES

Astrid: EQA=menores, no ING dropdown, flota transporte vs proyecto, CSI.
Charris: flota exacta, ubicaciones proveedores.
Ingenieros: quienes crean solicitudes, vehiculos uso interno, movimientos internos.
General: proyectos adicionales, codigos costo, empleados con acceso, metricas Valderrama.
Edicion en estados En Proceso/Parcial: definir con feedback de usuarios.

---

## FASES FUTURAS (no MVP)

Fase 2: Facturacion mensual, Nota de Entrega PDF, Bitacora de Movilizaciones (vista filtrable), Inspecciones de equipos, Two-Week Look-Ahead, Integracion OC, Categorias CSI, Accesorios de equipos, GPS flota.
Fase 3: Inventario/Almacen, WhatsApp, Metabase dashboards, Spectrum lectura, QR equipos, PWA offline.
Futuro: Combustible, mantenimiento, ordenes trabajo, planillas, compras, herramientas, equipos menores, vehiculos livianos.

---

## LOGICA DE FILTROS

Principio: UNA tabla equipment, clasificacion por type_code, filtrado en queries.
Solicitud (ingeniero): type_code NOT IN (ING) + fallback texto.
Vehiculo (Charris): type_code IN (VHL,VHP) pendiente refinar con Astrid.
Remolque: filtrar por descripcion CAMA/PLATAFORMA/REMOLQUE.
Desde/Hasta: tabla locations + fallback. Vehiculo interno: equipment_text (MVP).

---

## REFERENCIA RAPIDA

| Recurso | Ubicacion |
|---------|----------|
| Demo UI | demo_v8.jsx |
| Feature Spec | docs/ICONSA_Feature_Specification_v3.md |
| Sprint Brief | docs/ICONSA_MVP_Sprint_Brief.md |
| Build Plan | docs/BUILD_PLAN.md |
| SOP | IC-LOG-PO-06 |
| GitHub | github.com/ICONSA-Solutions/movimientOS |
| Supabase | bzeoszympkkicwlfdtcn.supabase.co |
| CSV Equipment | equipment_for_supabase.csv (377) |
| CSV Employees | employees_for_supabase.csv (160) |
