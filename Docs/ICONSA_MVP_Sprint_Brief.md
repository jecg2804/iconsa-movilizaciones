# ICONSA — Sprint Brief: MVP Movilizaciones
## Documento de Contexto para Desarrollo con Claude Code

**Versión:** 3.0 | **Fecha:** 04 Marzo 2026
**Stack:** Next.js (frontend/Vercel) + NestJS (backend/Railway) + Supabase (DB/Auth) + TypeScript + Tailwind CSS
**Builder:** James Cucalón (con Claude Code)

> **IMPORTANTE:** El schema completo y actualizado de la base de datos está en `PROJECT_STATUS.md`.
> Las CREATE TABLE statements en este documento son referencia simplificada.
> En caso de conflicto, PROJECT_STATUS.md es la fuente de verdad.

---

## 1. ¿QUÉ ES ICONSA?

Empresa de construcción pesada en Panamá (~160 empleados). Opera 4 proyectos activos y un taller central en Chilibre. Moviliza equipo pesado (grúas, excavadoras) y materiales entre el taller y los proyectos. Hoy TODO es papel, WhatsApp, y Excel personal. No hay sistema centralizado.

### Proyectos Activos
| Código | Nombre | Gerente |
|--------|--------|---------|
| 25-504 | Astillero de Balboa (ASTIBAL) | Ariel González |
| 25-505 | Paraíso | César Caballero |
| 25-506 | Muelle 14 | Franklin Marciaga |
| 24-404 | Costa Norte | César Caballero |

---

## 2. QUÉ CONSTRUIR (MVP — 5 features)

### Feature 1: Autenticación
- Login con email + contraseña (Supabase Auth)
- 5 roles: `admin`, `pm` (ingeniero de proyecto), `logistica` (Charris), `campo` (conductor), `almacen` (almacenista)
- El rol determina qué pantallas ve y qué datos puede acceder
- Idioma: 100% español

### Feature 2: Solicitud de Movilización
- **Actor:** Ingeniero de Proyecto (pm)
- **Flujo:** Entrar → Escoger proyecto → Crear solicitud → Agregar líneas → Enviar
- **Header:** ID auto (25-506-SM-023), proyecto, solicitante, fecha requerida, notas, estado
- **Líneas:** tipo (Equipo/Material), descripción, desde/hasta, cantidad, unidad, código de costo, notas
- **Estados del header:** Borrador → Enviada → En Proceso → Completada / Parcial / Cancelada
- **Estados de línea:** Pendiente → Programada → En Tránsito → Entregada / Parcial / Cancelada
- **Visibilidad:** PM ve TODAS las solicitudes de TODOS los proyectos (filtro default = su proyecto, pero puede cambiarlo). Esto permite coordinación cross-proyecto.
- **Creación:** PM solo puede CREAR solicitudes para SUS proyectos asignados (via person_projects).
- **Edición:** PM solo puede EDITAR solicitudes de SUS proyectos asignados. Logística y admin editan cualquiera.
- **Reglas de edición por estado:**
  - Borrador: todo editable, agregar/eliminar líneas
  - Enviada: editar header y líneas existentes, NO agregar nuevas líneas, eliminar programada con warning
  - En Proceso / Parcial: solo lectura (TBD con feedback de usuarios)
  - Completada / Cancelada: solo lectura
- **Warning de duplicados:** Al agregar línea (solo en Borrador), si existe línea activa similar, muestra warning visual no bloqueante.

### Feature 3: Backlog y Programación (Vista de Charris)
- **Actor:** Carlos Charris (rol: logistica)
- **Backlog:** Lista de TODAS las líneas pendientes de TODOS los proyectos, con prioridad visual
- **Prioridad auto-calculada:** Vencida (rojo, fecha < hoy), Urgente (naranja, ≤3 días), Próxima (azul, ≤7 días), Normal (verde, >7 días)
- **Crear viaje:** Seleccionar líneas → asignar conductor, vehículo, remolque, fecha, tarifa, permiso ATT, escolta
- **Relación many-to-many:** Un viaje puede llevar líneas de MÚLTIPLES solicitudes. Una línea puede requerir MÚLTIPLES viajes.
- **Tabla pivote:** `trip_line_assignments` conecta líneas con viajes (con cantidad asignada por cada uno)
- **Cancelar viaje:** Líneas asignadas regresan a Pendiente en backlog. Cascada re-evalúa solicitudes.
- **Look-ahead:** Placeholder Fase 2

### Feature 4: Ejecución / Eventos
- **Actores:** logistica, campo, almacen (todos pueden registrar eventos — sin restricción por driver_id en MVP)
- **"Mis Viajes":** Lista de viajes activos (NO filtrado por conductor en MVP)
- **Registrar eventos secuenciales:**
  1. **Salida** — marca salida (timestamp) → viaje "En Ruta", líneas "En Tránsito"
  2. **Llegada** — marca llegada al destino → informativo
  3. **Entrega** — confirma con **código de 4 dígitos** → líneas "Entregada", cascada actualiza solicitud
  4. **Retorno** — marca regreso a Chilibre → viaje "Completado"
- **Código de confirmación (tipo Uber):** 4 dígitos generados al crear viaje. Receptor proporciona código al conductor.

### Feature 5: Dashboard
- **Actor:** Todos los roles — métricas globales (sin restricción por rol)
- **KPIs:** Solicitudes pendientes, líneas sin programar, viajes programados hoy/semana, completadas este mes
- **Vista rápida:** Solicitudes recientes con estado, viajes del día

---

## 3. LO QUE NO SE CONSTRUYE AHORA

- ❌ Facturación mensual (Fase 2)
- ❌ Nota de Entrega como documento PDF formal (Fase 2 — los REGISTROS de entrega SÍ están en MVP via eventos)
- ❌ Bitácora de Movilizaciones como pantalla dedicada (Fase 2)
- ❌ Inspección de equipos (Fase 2, probablemente KoboToolbox)
- ❌ Integración con Órdenes de Compra (Fase 2 — campo de texto referencial OK)
- ❌ GPS de flota (Fase 2)
- ❌ Categorización CSI de materiales (Fase 2)
- ❌ Accesorios de equipos como entidad separada (Fase 2)
- ❌ Two-Week Look-Ahead calendario (Fase 2)
- ❌ WhatsApp notifications (Fase 3)
- ❌ Módulo de inventario (Fase 3)
- ❌ Integración con Spectrum ERP (Fase 3+)

---

## 4. MODELO DE DATOS (Supabase / PostgreSQL)

> **Schema completo en PROJECT_STATUS.md** — las CREATE TABLE aquí son referencia simplificada.

### Tablas Maestras (10)

```sql
-- Proyectos
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  manager TEXT,
  status TEXT DEFAULT 'Activo',
  location TEXT,
  start_date DATE, end_date DATE, notes TEXT,
  billing_code TEXT, budget NUMERIC, client TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Personas / Usuarios
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id),
  code TEXT, name TEXT, department TEXT, position TEXT,
  phone TEXT, email TEXT,
  app_role TEXT,  -- NULL=sin acceso, 'admin','pm','logistica','campo','almacen'
  status TEXT DEFAULT 'Activo',
  city TEXT, supervisor_id UUID REFERENCES people(id),
  cedula TEXT, license_type TEXT, license_expiry DATE,
  hire_date DATE, emergency_contact_name TEXT, emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asignación persona-proyecto
CREATE TABLE person_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES people(id),
  project_id UUID REFERENCES projects(id),
  role TEXT, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(person_id, project_id)
);

-- Equipos Y Vehículos (TABLA UNIFICADA)
-- Vehículos = type_code IN ('VHL', 'VHP'). Equipos = el resto.
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spectrum_code TEXT, description TEXT,
  equipment_type TEXT, type_code TEXT,
  brand TEXT, model TEXT, serial_number TEXT, year INTEGER,
  status TEXT DEFAULT 'Activo',
  current_location TEXT, plate TEXT, capacity TEXT,
  inspection_type TEXT, current_project_id UUID REFERENCES projects(id),
  weight_class TEXT, acquisition_type TEXT DEFAULT 'Propio',
  last_inspection_date DATE, next_inspection_due DATE,
  meter_reading NUMERIC, insurance_expiry DATE, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ubicaciones, tarifas, unidades, cost_codes, sequences, suggestions
-- Ver PROJECT_STATUS.md para schema completo
```

### Tablas Transaccionales (6)

```sql
-- Solicitudes
CREATE TABLE sm_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE,
  project_id UUID NOT NULL REFERENCES projects(id),
  requester_id UUID NOT NULL REFERENCES people(id),
  approved_by UUID REFERENCES people(id),
  date_required DATE NOT NULL,
  date_created TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'Borrador',
  priority TEXT DEFAULT 'Normal',
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Líneas de solicitud
CREATE TABLE sm_request_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES sm_requests(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  line_type TEXT NOT NULL CHECK (line_type IN ('Equipo','Material')),
  equipment_id UUID REFERENCES equipment(id),
  description TEXT, equipment_text TEXT,
  from_location_id UUID REFERENCES locations(id), from_text TEXT,
  to_location_id UUID REFERENCES locations(id), to_text TEXT,
  quantity NUMERIC NOT NULL, unit_id UUID REFERENCES units(id), unit_text TEXT,
  cost_code_id UUID REFERENCES cost_codes(id), category TEXT,
  po_reference TEXT, notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pendiente',
  qty_scheduled NUMERIC DEFAULT 0, qty_delivered NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Viajes
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT UNIQUE,
  scheduled_date DATE NOT NULL,
  driver_id UUID REFERENCES people(id),
  vehicle_id UUID REFERENCES equipment(id),
  trailer_id UUID REFERENCES equipment(id),
  rate_id UUID REFERENCES mobilization_rates(id),
  cost NUMERIC(10,2),
  att_permit BOOLEAN DEFAULT false,
  escort BOOLEAN DEFAULT false,
  confirmation_code TEXT,
  status TEXT NOT NULL DEFAULT 'Programado',
  notes TEXT,
  actual_departure TIMESTAMPTZ, actual_arrival TIMESTAMPTZ,
  route_summary TEXT, is_external BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asignaciones línea↔viaje (many-to-many)
CREATE TABLE trip_line_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  request_line_id UUID NOT NULL REFERENCES sm_request_lines(id),
  quantity_assigned NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trip_id, request_line_id)
);

-- Eventos de viaje (INMUTABLES)
CREATE TABLE trip_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id),
  event_type TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  location TEXT, registered_by UUID REFERENCES people(id),
  confirmation_code_used TEXT, received_by_name TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
  -- NO updated_at — eventos son inmutables
);
```

### Triggers

```sql
-- Trigger de cascada: actualiza status de solicitud padre
CREATE OR REPLACE FUNCTION cascade_request_status()
RETURNS TRIGGER AS $$
DECLARE
  total_lines INTEGER; delivered INTEGER;
  cancelled INTEGER; in_progress INTEGER; new_status TEXT;
BEGIN
  SELECT COUNT(*) INTO total_lines FROM sm_request_lines WHERE request_id = NEW.request_id;
  SELECT COUNT(*) INTO delivered FROM sm_request_lines WHERE request_id = NEW.request_id AND status = 'Entregada';
  SELECT COUNT(*) INTO cancelled FROM sm_request_lines WHERE request_id = NEW.request_id AND status = 'Cancelada';
  SELECT COUNT(*) INTO in_progress FROM sm_request_lines WHERE request_id = NEW.request_id AND status IN ('Programada', 'En Tránsito');
  
  IF delivered = total_lines THEN new_status := 'Completada';
  ELSIF cancelled = total_lines THEN new_status := 'Cancelada';
  ELSIF delivered > 0 THEN new_status := 'Parcial';
  ELSIF in_progress > 0 THEN new_status := 'En Proceso';
  ELSE new_status := 'Enviada';
  END IF;
  
  UPDATE sm_requests SET status = new_status, updated_at = now()
  WHERE id = NEW.request_id AND status NOT IN ('Borrador', 'Cancelada');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. DATOS MAESTROS PARA SEED

### Proyectos (4)
```
25-504 | Astillero de Balboa (ASTIBAL) | Ariel González
25-505 | Paraíso | César Caballero
25-506 | Muelle 14 | Franklin Marciaga
24-404 | Costa Norte | César Caballero
```

### Ubicaciones (9)
```
Taller Chilibre (Taller), Almacén Central (Almacen),
Muelle 14 (Proyecto→25-506), Proyecto Paraíso (Proyecto→25-505),
ASTIBAL (Proyecto→25-504), Costa Norte (Proyecto→24-404),
Gamboa (Externo), Oficina Central (Oficina), Proveedores varios (Proveedor)
```

### Tarifas de Movilización (14)
```
MVG108=$2,000  MVG318=$3,000  MVG518=$6,400  MVGSNY=$11,000
MVPLAT=$200    MVTTOP=$350    MVCALT=$425    MVCB50=$500
MVCB75=$600    MVCEXT=$550    MVVQ11=$260    MVLPUP=$75
MVAPX1=$5,000  MVCGRU=$300
```

### Unidades (11): und, ml, m², m³, kg, ton, gal, juegos, pzas, ft, qq

### Equipos y Vehículos: 377 (YA IMPORTADOS en tabla unificada `equipment`)
### Empleados: 160 (YA IMPORTADOS en `people`)
### Códigos de Costo: PENDIENTE importar desde codcost.csv

---

## 6. REGLAS DE NEGOCIO CRÍTICAS

### Visibilidad y permisos PM
- PM ve TODAS las solicitudes de todos los proyectos. Filtro default = su proyecto.
- PM solo CREA solicitudes para SUS proyectos (via person_projects).
- PM solo EDITA solicitudes de SUS proyectos.
- Logística edita cualquier solicitud en Borrador/Enviada (no crea solicitudes). Admin crea y edita cualquiera.

### Reglas de edición de solicitudes
- **Borrador:** Todo editable + agregar/eliminar líneas.
- **Enviada:** Editar existentes, NO agregar líneas nuevas. Eliminar programada con warning.
- **En Proceso+:** Solo lectura (TBD con feedback).
- **Completada/Cancelada:** Solo lectura.

### Cancelación
- **Cancelar solicitud:** Cancela líneas pendientes. Líneas programadas se liberan del viaje.
- **Cancelar viaje:** Líneas regresan a Pendiente en backlog. Cascada re-evalúa solicitudes.
- **Eliminar línea programada:** Warning → remueve asignación → elimina línea.

### Warning de líneas duplicadas
- Al agregar línea (solo en Borrador), busca líneas activas similares.
- Muestra warning visual. NO bloquea. PM decide.

### Tipo de movilización (auto-calculado)
- **Movilización:** origen = Chilibre → destino = proyecto
- **Desmovilización:** origen = proyecto → destino = Chilibre
- **Movimiento Interno:** origen = proyecto → destino = proyecto

### Código de confirmación de entrega (tipo Uber)
- 4 dígitos generados al crear viaje. Visible para solicitante y Charris.
- Conductor ingresa código del receptor. Warning si no coincide pero permite continuar.

### Cascada de estados (trigger PostgreSQL)
- TODAS líneas Entregada → Completada
- TODAS líneas Cancelada → Cancelada
- ≥1 Entregada + resto Cancelada → Parcial
- ≥1 Programada/En Tránsito → En Proceso
- No modifica Borrador ni Cancelada

### Registro de eventos (MVP)
- Cualquier usuario logistica/campo/almacen puede registrar eventos.
- No se restringe por driver_id del viaje.

### Dashboard
- Métricas globales. Todos los roles ven las mismas métricas.

### Notificaciones (MVP: email vía NestJS)
- Solicitud enviada → Charris
- Solicitud programada → PM solicitante
- Solicitud completada → PM solicitante
- Solicitud vencida (daily) → Charris + PM
- Sugerencia fallback → Admin
- WhatsApp: Fase futura

---

## 7. PANTALLAS (estructura de navegación)

```
/ (login)
/dashboard (home — KPIs globales)
/solicitudes (lista — TODOS ven TODAS, PM filtro default su proyecto)
/solicitudes/nueva (crear — PM solo sus proyectos)
/solicitudes/[id] (ver/editar según reglas de edición)
/programacion (backlog + viajes — logistica/admin RW, pm RO)
/programacion/viaje/nuevo (crear viaje)
/programacion/viaje/[id] (ver/editar viaje)
/programacion/calendario (Fase 2 placeholder)
/mis-viajes (viajes activos — logistica/campo/almacen)
/mis-viajes/[id] (detalle + registrar eventos)
/admin/masters (gestión masters — solo admin)
```

### Navegación por rol:
| Pantalla | admin | pm | logistica | campo | almacen |
|----------|-------|-----|-----------|-------|---------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Solicitudes | ✅ (todas) | ✅ (todas, default su proyecto) | ✅ (todas) | ❌ | ❌ |
| Nueva Solicitud | ✅ | ✅ (sus proyectos) | ❌ | ❌ | ❌ |
| Programación | ✅ | 👁️ (solo lectura) | ✅ | ❌ | ❌ |
| Mis Viajes | ✅ | ❌ | ✅ | ✅ | ✅ |
| Admin Masters | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 8. UI/UX GUIDELINES

### Design tokens
```
Navy:    #1B3A5C (primary — headers, nav, branding)
Gold:    #F0A500 (accent — ICONSA brand)
Blue:    #0A6EBD (info, links, Enviada)
Purple:  #553C9A (Programada, asignaciones)
Orange:  #B45309 (warning, En Proceso, Urgente)
Green:   #1A7F5A (success, Completada)
Red:     #C0392B (error, Vencida, Cancelada)
Gray:    #5A6272 (secondary text)
```

### Principios
- **Mobile-first:** Ingenieros y conductores usan celular
- **Español 100%:** Toda la interfaz en español
- **Badges de estado con colores:** Siempre visible
- **Monospace para IDs:** 25-506-SM-023 siempre monospace
- **Mínimo clicks:** Crear solicitud debe ser rápido

---

## 9. ARCHIVOS DE REFERENCIA

Documentación clave:
- `PROJECT_STATUS.md` — **Fuente de verdad** para schema completo
- `ICONSA_Feature_Specification_v2.md` — reglas de negocio, estados, transiciones
- `BUILD_PLAN.md` — plan de construcción con 6 fases
- `supabase_schema_verified.sql` — schema SQL definitivo para generación de tipos

Datos ya importados:
- equipment: 377 registros (tabla unificada equipos+vehículos)
- people: 160 registros (pendiente asignar roles a ~15-20)
- projects: 4 registros
- mobilization_rates: 14 registros
- locations: 9 registros
- units: 11 registros
- cost_codes: PENDIENTE importar

---

## 10. DEFINICIÓN DE "TERMINADO" PARA EL MVP

1. ✅ Login con email/contraseña y navegación por rol
2. ✅ PM crea solicitud con líneas para SUS proyectos y la envía
3. ✅ PM ve TODAS las solicitudes (filtro default su proyecto, puede cambiar)
4. ✅ Warning de duplicados al agregar línea (visual, no bloquea)
5. ✅ Charris ve backlog con prioridad visual de TODOS los proyectos
6. ✅ Charris crea viaje asignando líneas, conductor, vehículo, fecha
7. ✅ Eventos de ejecución registrables por logistica/campo/almacen
8. ✅ Entrega con código 4 dígitos
9. ✅ Dashboard con KPIs globales
10. ✅ Estados en cascada automática (trigger PostgreSQL)
11. ✅ Notificaciones email (NestJS): enviada→Charris, programada/completada→PM
12. ✅ Responsive (mobile-first)
13. ✅ Datos reales precargados (proyectos, equipos, empleados, tarifas)
