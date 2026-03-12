![alt text](image.png)# ICONSA Movilizaciones - Estado del Proyecto

Ultima actualizacion: 2026-03-12

Actualizar este archivo despues de CADA paso completado.
Este documento es la UNICA fuente de verdad para el estado del schema, decisiones, y progreso.

---

## INFRAESTRUCTURA

| Componente | Estado | Detalle |
|-----------|--------|---------|
| Supabase | Activo | https://bzeoszympkkicwlfdtcn.supabase.co (Oregon us-west-2) |
| GitHub | Activo | ICONSA-Solutions/movimientOS (org privada) |
| Next.js (frontend) | Activo | v16.1.6, Vercel (branch jaime/dev), .env.local configurado |
| NestJS (backend) | PENDIENTE | Backend API — deploy target: Railway/Fly.io |
| Supabase Auth | Activo | 6 usuarios creados, login email/contraseña |
| Supabase Storage | PENDIENTE | Para attachments de solicitudes |

Documentacion en repo (Docs/):
- [x] README.md
- [x] ICONSA_Feature_Specification_v3.md (v3.2, pendiente actualizar)
- [x] ICONSA_MVP_Sprint_Brief.md (v3, pendiente actualizar)
- [x] BUILD_PLAN.md
- [x] PROJECT_STATUS.md (este archivo)
- [x] supabase_schema_verified.sql (pendiente actualizar)

---

## SCHEMA COMPLETO DE BASE DE DATOS (20 tablas)

### Convenciones globales
- Todos los IDs son UUID con gen_random_uuid()
- Todas las tablas tienen created_at TIMESTAMPTZ DEFAULT now()
- Todas las tablas (excepto trip_events y sequences) tienen updated_at TIMESTAMPTZ con trigger automatico
- RLS habilitado en TODAS las tablas
- FK indexes creados en todas las foreign keys

---

### TABLA: projects

id UUID PK, code TEXT UNIQUE, name TEXT, manager TEXT, status TEXT (Activo/Completado/Suspendido/Cerrado), start_date DATE, end_date DATE, notes TEXT, billing_code TEXT, budget NUMERIC, client TEXT, location TEXT, created_at, updated_at.

Datos: 6 registros (5 activos + ASTIBAL cerrado).

| Codigo | Nombre | Estado |
|--------|--------|--------|
| 24-404 | Costa Norte | Activo |
| 25-504 | Astillero de Balboa (ASTIBAL) | Cerrado |
| 25-505 | Paraiso | Activo |
| 25-506 | Muelle 14 (Rehab.) | Activo |
| 26-604 | Inyecciones Metro | Activo |
| 26-605 | Micropilotes Multiplaza | Activo |

---

### TABLA: people

id UUID PK, auth_id UUID FK auth.users, code TEXT, name TEXT, department TEXT, position TEXT, phone TEXT, email TEXT, app_role TEXT (admin/pm/logistica/campo/almacen/NULL), status TEXT, city TEXT, supervisor_id UUID FK people, cedula TEXT, license_type TEXT, license_expiry DATE, hire_date DATE, emergency_contact_name TEXT, emergency_contact_phone TEXT, created_at, updated_at.

Datos: 177 registros (160 Spectrum + 13 organigrama + 4 test).
Roles: admin=1, pm=11, logistica=1, campo=5, almacen=1.

---

### TABLA: person_projects

id UUID PK, person_id FK people (CASCADE), project_id FK projects (CASCADE), role TEXT, is_active BOOLEAN, created_at, updated_at. UNIQUE(person_id, project_id).
Datos: 12 asignaciones activas (Admin×5, Charris×5, Caballero×2).

---

### TABLA: equipment (UNIFICADA — equipos + vehiculos)

25 columnas incluyendo parent_equipment_id UUID FK equipment (accesorio→equipo padre).
Datos: 377 registros. Distribucion: TEC:121 MAR:48 ING:39 VHL:38 FND:34 EQA:31 EQP:26 GRU:16 VHP:15 EQL:9.

Filtros app:
- Solicitud: type_code NOT IN ('ING') + fallback texto
- Vehiculo: type_code IN ('VHL','VHP')
- Remolque: spectrum_code LIKE 'REM%'

---

### TABLA: locations

id UUID PK, name TEXT, location_type TEXT, address TEXT, project_id FK projects, is_active BOOLEAN, contact_name TEXT, contact_phone TEXT, notes TEXT, created_at, updated_at.
Datos: 7 activas (Taller Chilibre, Oficina Central, 5 proyectos). 4 inactivas.

---

### TABLA: mobilization_rates

id UUID PK, code TEXT, description TEXT, rate NUMERIC, is_active BOOLEAN, created_at, updated_at. Datos: 14 registros.

---

### TABLA: units

id UUID PK, code TEXT, description TEXT, created_at, updated_at. Datos: 11 registros.

---

### TABLA: cost_codes (fases por proyecto — importado de Sage)

id UUID PK, project_id FK projects, phase_code TEXT NOT NULL, phase_description TEXT, full_code TEXT, created_at, updated_at.
Datos: 98 fases (24-404:49, 25-505:23, 25-506:11, 26-604:7, 26-605:8).
UI: dropdown filtra por project_id de la solicitud.

---

### TABLA: cost_categories (categorias de codigo de costo — NUEVA)

id UUID PK, code TEXT UNIQUE, description TEXT, is_active BOOLEAN, created_at, updated_at.
Datos: 8 categorias estandar: CON, EQA, EQI, ICS, MAT, OTR, SAL, SUB.
Son las mismas para todos los proyectos. Cada fase usa un subconjunto.

---

### TABLA: cost_code_categories (tabla puente fase↔categoria — NUEVA)

id UUID PK, cost_code_id FK cost_codes (CASCADE), cost_category_id FK cost_categories (CASCADE), created_at.
UNIQUE(cost_code_id, cost_category_id).
Datos: 530 combinaciones validas importadas de Sage.

Logica cascada UI: Proyecto → Extra (condicional) → Fase (cost_code) → Categorias validas (cost_code_categories) → Codigo auto: {proyecto}-{extra}-{fase}-{categoria}

---

### TABLA: sequences (interna)

seq_type TEXT, project_id FK projects (nullable), next_number INTEGER. UNIQUE(seq_type, COALESCE(project_id, UUID_CERO)).
Datos: 6 registros (5 proyectos SM + 1 trip global). Triggers off-by-one corregidos.

---

### TABLA: user_app_roles (fundacion multi-app RBAC)

id UUID PK, person_id FK people, app_code TEXT, role_code TEXT, is_active BOOLEAN, granted_by FK people, granted_at TIMESTAMPTZ, notes TEXT, created_at, updated_at.
UNIQUE(person_id, app_code, role_code). Datos: 19 registros. Codigo MVP usa people.app_role.

---

### TABLA: suggestions (fallbacks)

id, table_name TEXT, suggested_value TEXT, suggested_by FK people, status TEXT, reviewed_by FK people, created_at.

---

### TABLA: sm_requests (solicitudes header)

id UUID PK, request_id TEXT UNIQUE (auto), project_id FK, requester_id FK, date_required DATE, date_created TIMESTAMPTZ, status TEXT, priority TEXT (auto), approved_by FK, notes TEXT, attachments JSONB, created_at, updated_at.
Triggers: generate_request_id(), calculate_priority().
UI: Solicitante auto-fill NO editable. Aprobado por filtrado por app_role='pm'.

---

### TABLA: sm_request_lines (lineas de solicitud)

25 columnas incluyendo cost_code_id FK cost_codes, cost_category_id FK cost_categories (NUEVA), material_category TEXT (NUEVA, solo Material), category TEXT (LEGACY).
Trigger: cascade_request_status(). CHECK(line_type IN ('Equipo','Material')). FK request_id CASCADE.

Cascada UI: cost_code filtra por project_id → cost_category filtra por cost_code_categories → auto-genera full_code.

---

### TABLA: trips (viajes)

19 columnas. trip_id auto MOV-YYYY-###. confirmation_code 4 digitos. Tarifa y Costo OPCIONALES.
Remolque REQUERIDO cuando vehiculo es cabezal (CAB/CABEZAL).

---

### TABLA: trip_line_assignments (pivote many-to-many)

id, trip_id FK (CASCADE), request_line_id FK, quantity_assigned DECIMAL, created_at, updated_at. UNIQUE(trip_id, request_line_id).

---

### TABLA: trip_events (eventos — INMUTABLES)

id, trip_id FK, event_type TEXT, event_timestamp TIMESTAMPTZ, location TEXT, registered_by FK, confirmation_code_used TEXT, received_by_id FK people (UUID, nullable — solo Entrega), received_by_name TEXT, notes TEXT, created_at. NO updated_at.

---

### TABLA: audit_log (auditoría — no documentada previamente)

id UUID PK, table_name TEXT, record_id UUID, action TEXT (INSERT/UPDATE/DELETE), old_data JSONB, new_data JSONB, changed_by UUID FK people, changed_at TIMESTAMPTZ DEFAULT now().
RLS habilitado. Triggers de auditoría activos en 4 tablas transaccionales (sm_requests, sm_request_lines, trips, trip_events).
Nota: usa auth.uid() — funciona desde browser client. No se usa service_role en la app.

---

### TABLA: project_extras (extras/secciones por proyecto)

id UUID PK, project_id FK projects, code TEXT, name TEXT, created_at, updated_at.
Datos: 12 extras (24-404: 6, 25-505: 6). Proyectos sin extras usan fases base.
Relación: cost_codes.extra_id FK project_extras (nullable, NULL = proyecto base).
UI: dropdown "Extra / Sección" solo visible si proyecto tiene extras.

---

## TRIGGERS Y FUNCIONES

| Funcion | Descripcion |
|---------|-------------|
| update_updated_at() | Setea updated_at = now() en BEFORE UPDATE |
| generate_request_id() | Auto {project_code}-SM-### (off-by-one corregido) |
| generate_trip_id() | Auto MOV-YYYY-### (off-by-one corregido) |
| generate_confirmation_code() | Auto 4 digitos random si NULL en BEFORE INSERT trips (safety net) |
| generate_full_code() | Auto {proyecto}-{fase} todo con dashes en BEFORE INSERT/UPDATE cost_codes |
| calculate_priority() | Vencida/Urgente/Proxima/Normal basado en date_required |
| cascade_request_status() | Actualiza header basado en estados de lineas (SECURITY DEFINER). Orden: Completada→Cancelada→Parcial→En Proceso→Enviada |
| get_my_app_role() | Helper SECURITY DEFINER: retorna app_role del usuario auth |
| capture_initial_priority() | Captura priority en INSERT → initial_priority (trg_initial_priority) |
| capture_lifecycle_timestamps() | Captura date_submitted/completed/cancelled en cambio de status (trg_lifecycle_timestamps) |
| capture_trip_cancelled() | Captura date_cancelled cuando viaje se cancela (trg_trip_cancelled) |
| update_equipment_location() | Actualiza equipment.current_location en evento Entrega (trg_update_equipment_location) |
| audit_trigger() | Escribe en audit_log en INSERT/UPDATE/DELETE (×4 tablas transaccionales) |

**pg_cron:** ELIMINADO (era recalculación diaria de prioridad). Trigger `calculate_priority()` sigue activo en INSERT/UPDATE.
**Prioridad UI:** Badges de prioridad eliminados de la UI. La columna "Días" con color comunica la misma info. Campo `priority` en BD se mantiene.

---

## APP NEXT.JS — ESTADO

| Fase | Estado | Fecha |
|------|--------|-------|
| 0 — Fundacion | COMPLETADA | 2026-03-04 |
| 1 — Auth + Layout | COMPLETADA | 2026-03-04 |
| 2 — Solicitudes | COMPLETADA | 2026-03-05 |
| 3 — Programacion | COMPLETADA | 2026-03-05 |
| 4 — Ejecucion/Eventos | COMPLETADA | 2026-03-06 |
| 5 — Dashboard | COMPLETADA (basico, mejora pendiente) | 2026-03-06 |
| 6 — Admin Masters | COMPLETADA | 2026-03-12 |

Bugs #3-8 corregidos 2026-03-06.

## PANTALLAS

| Ruta | Actor | Estado |
|------|-------|--------|
| /login | Todos | ✅ |
| /dashboard | Todos | ✅ (basico, mejora por rol pendiente) |
| /solicitudes | pm, admin, logistica | ✅ |
| /solicitudes/nueva | pm, admin | ✅ |
| /solicitudes/[id] | pm, admin, logistica | ✅ |
| /programacion | logistica, admin, pm(ro) | ✅ |
| /programacion/viaje/nuevo | logistica, admin | ✅ |
| /programacion/viaje/[id] | logistica, admin | ✅ |
| /programacion/calendario | placeholder | ✅ |
| /mis-viajes | logistica, campo, almacen, admin | ✅ |
| /mis-viajes/[id] | logistica, campo, almacen, admin | ✅ |
| /admin | admin | ✅ (redirect a /admin/masters) |
| /admin/masters | admin | ✅ |

---

## PENDIENTE PARA CLAUDE CODE (proxima sesion)

1. **UX por discutir**: Backlog con mas contexto visual, columna "FECHA" ambigua en viajes recientes
2. **Notificaciones email**: Fase 6.2 (NestJS Edge Functions)
3. **RLS policies reales**: Preparar SQL para policies por rol

## PENDIENTE PARA JAMES EN SUPABASE

1. ~~**RLS GAP CRITICO**~~: ✅ RESUELTO 2026-03-12. sm_request_lines permite UPDATE para todos los roles operativos. sm_requests UPDATE sigue pm+admin (cascade trigger es SECURITY DEFINER).
2. ~~**cascade_request_status() BUG**~~: ✅ RESUELTO 2026-03-12. Orden correcto: Completada→Cancelada→Parcial→En Proceso→Enviada. 2 solicitudes corregidas.
3. **17 personas con app_role pero sin auth account**: Crear cuentas Supabase Auth antes de lanzamiento.
4. **Verificar audit_log**: Crear solicitud de prueba desde browser y verificar que audit_log se pobla correctamente.

---

## DECISIONES TOMADAS (34)

1. PM ve TODAS las solicitudes, CREA/EDITA solo SUS proyectos.
2. Enviada: editar existentes, NO agregar lineas nuevas.
3. SI se puede eliminar linea programada con warning.
4. Cancelar viaje libera lineas al backlog.
5. Eventos: sin restriccion por driver_id en MVP.
6. Dashboard: global base, adaptativo por rol.
7. Warning duplicados: visual, no bloqueante.
8. Notificaciones email via NestJS en MVP.
9. Bitacora: Fase 2.
10. En Proceso/Parcial: TBD.
11. Tarifa y Costo OPCIONALES.
12. Salida y Entrega obligatorios. Llegada y Retorno opcionales.
13. Codigo confirmacion: MUST be correct, sin bypass. Receptor dropdown personas proyecto + fallback. received_by_id FK people.
14. Sin solicitud: fuerza retroactiva en MVP.
15. Servicios externos: is_external + costo manual.
16. user_app_roles: fundacion multi-app, MVP usa people.app_role.
17. parent_equipment_id: accesorio→equipo padre.
18. Categoria material: texto libre MVP, CSI Fase 2.
19. Cost codes cascada: proyecto→fase→categoria desde Spectrum
20. cost_categories: 8 estandar, subconjunto por fase via cost_code_categories.
21. Solicitante: auto-fill, NO editable.
22. Aprobado por: filtrado app_role='pm'.
23. Remolque: spectrum_code LIKE 'REM%'.
24. ASTIBAL: Cerrado.
25. Taller Chilibre = Almacen Central.
26. Commits: auto push a jaime/dev.
27. Dashboard MVP: operativo unico para todos, NO por rol.
28. Timestamps eventos: now() automatico, NO editable.
29. PM ve codigo en /solicitudes/[id] seccion Viajes Programados.
30. Codigo visible para pm/logistica/admin. NUNCA campo/almacen.
31. full_code con dashes (no puntos). Trigger generate_full_code().
32. Search equipos por spectrum_code Y description.
33. Keyboard navigation en Select (arrow keys + enter).
34. Claude Code NO tiene acceso a Supabase.

---

## BUGS CORREGIDOS (14)

| # | Bug | Fecha |
|---|-----|-------|
| 1 | Trigger generate_request_id | 2026-03-05 |
| 2 | Indexes duplicados sequences | 2026-03-05 |
| 3 | Tarifa no pre-rellena Costo | 2026-03-06 |
| 4 | Dropdowns no filtrados | 2026-03-06 |
| 5 | Redirect incorrecto al guardar | 2026-03-06 |
| 6 | Viajes Recientes falta info | 2026-03-06 |
| 7 | Fecha requerida en lineas viaje | 2026-03-06 |
| 8 | Remolque siempre opcional | 2026-03-06 |
| 9 | IDs off-by-one | 2026-03-06 |
| 10 | Remolque incluye camiones | 2026-03-06 |
| 11 | Categoria costo eliminada al agregar Categoria Material | PENDIENTE |
| 12 | CodeConfirmation permitia bypass | 2026-03-07 |
| 13 | confirmation_code NULL en viajes nuevos | 2026-03-08 |
| 14 | qty_delivered siempre 0 en lineas Entregada (fix en useTripEvents) | 2026-03-11 |
| 15 | created_by usaba requester_id en vez de personId (fix semantico) | 2026-03-12 |
| 16 | cascade_request_status() orden incorrecto (Parcial antes de En Proceso) | 2026-03-12 (BD) |
| 17 | RLS bloqueaba UPDATE sm_request_lines para logistica/campo/almacen | 2026-03-12 (BD) |
| 18 | formatCompletionDelta timezone: TIMESTAMPTZ desfase 1 dia en UTC-5 | 2026-03-12 |
| 19 | Columna Dias en solicitudes: completadas/canceladas mostraban dias vs hoy | 2026-03-12 |

---

## FASES FUTURAS

Fase 2: Facturacion, Nota Entrega PDF, Bitacora, Inspecciones, Look-Ahead, OC, CSI, Accesorios, GPS Skydata, Metabase.
Fase 3: Inventario, WhatsApp, Spectrum, QR, PWA offline.
Futuro: Combustible, mantenimiento, ordenes trabajo, compras, proveedores (sucursales/credito/OC).
