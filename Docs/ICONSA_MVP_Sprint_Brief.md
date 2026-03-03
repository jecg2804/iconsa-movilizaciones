# ICONSA — Sprint Brief: MVP Movilizaciones
## Documento de Contexto para Desarrollo con Claude Code

**Versión:** 1.0 | **Fecha:** Marzo 2026
**Stack:** Next.js 14 (App Router) + TypeScript + Supabase + Tailwind CSS
**Deadline:** 1 semana
**Builder:** James Cucalón (con Claude Code)

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
- **Actor:** Ingeniero de Proyecto
- **Flujo:** Entrar → Escoger proyecto → Crear solicitud → Agregar líneas → Enviar
- **Header:** ID auto (25-506-SM-023), proyecto, solicitante, fecha requerida, notas, estado
- **Líneas:** tipo (Equipo/Material), descripción, desde/hasta, cantidad, unidad, código de costo, notas
- **Estados del header:** Borrador → Enviada → En Proceso → Completada / Parcial / Cancelada
- **Estados de línea:** Pendiente → Programada → En Tránsito → Entregada / Parcial / Cancelada
- PM solo ve solicitudes de SUS proyectos. Admin y Logística ven TODAS.

### Feature 3: Backlog y Programación (Vista de Charris)
- **Actor:** Carlos Charris (rol: logistica)
- **Backlog:** Lista de TODAS las líneas pendientes de TODOS los proyectos, con prioridad visual
- **Prioridad auto-calculada:** Vencida (rojo, fecha < hoy), Urgente (naranja, ≤3 días), Próxima (azul, ≤7 días), Normal (verde, >7 días)
- **Crear viaje:** Seleccionar líneas → asignar conductor, vehículo, remolque, fecha, tarifa, permiso ATT, escolta
- **Relación many-to-many:** Un viaje puede llevar líneas de MÚLTIPLES solicitudes. Una línea puede requerir MÚLTIPLES viajes.
- **Tabla pivote:** `trip_line_assignments` conecta líneas con viajes (con cantidad asignada por cada uno)
- **Look-ahead:** Vista de calendario de 2 semanas con viajes programados por día

### Feature 4: Ejecución / Eventos (Conductor + Receptor)
- **Actor:** Conductor (rol: campo)
- **"Mis Viajes":** Conductor ve los viajes asignados a él (hoy + próximas semanas)
- **Registrar eventos secuenciales:**
  1. **Salida** — conductor marca salida (timestamp, ubicación) → viaje cambia a "En Ruta", líneas a "En Tránsito"
  2. **Llegada** — conductor marca llegada al destino (timestamp) → informativo
  3. **Entrega** — se confirma entrega con **código de 4 dígitos** → líneas a "Entregada", viaje a "Completado"
  4. **Retorno** — conductor marca regreso a Chilibre (timestamp) → cierra ciclo
- **Código de confirmación (tipo Uber):** Al programar un viaje, el sistema genera un código de 4 dígitos. El receptor en el proyecto proporciona el código al conductor para confirmar que la entrega se hizo a la persona indicada. Queda como registro auditable.

### Feature 5: Dashboard
- **Actor:** Todos (métricas filtradas por rol)
- **KPIs:** Solicitudes pendientes, líneas sin programar, viajes programados hoy/semana, completadas este mes
- **Vista rápida:** Solicitudes recientes con estado, viajes del día
- Para el jefe: visibilidad de qué está pasando sin entrar al detalle

---

## 3. LO QUE NO SE CONSTRUYE AHORA

- ❌ Facturación mensual (fase 2)
- ❌ Nota de Entrega como documento PDF formal (fase 2 — los REGISTROS de entrega SÍ están en MVP via eventos)
- ❌ Inspección de equipos (fase 2, probablemente KoboToolbox)
- ❌ Integración con Órdenes de Compra (fase 2 — campo de texto referencial OK)
- ❌ GPS de flota (fase 2+)
- ❌ Categorización CSI de materiales (fase 2)
- ❌ Accesorios de equipos como entidad separada (fase 2)
- ❌ WhatsApp notifications (fase 3)
- ❌ Módulo de inventario (fase 3)
- ❌ Integración con Spectrum ERP (fase 3+)

---

## 4. MODELO DE DATOS (Supabase / PostgreSQL)

### Tablas Maestras

```sql
-- Proyectos
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,        -- '25-506'
  name TEXT NOT NULL,                -- 'Muelle 14'
  manager TEXT,                      -- 'Franklin Marciaga'
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Personas / Usuarios
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id),  -- Link to Supabase Auth
  code TEXT,                         -- Spectrum code
  name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  phone TEXT,
  email TEXT UNIQUE,
  app_role TEXT NOT NULL DEFAULT 'pm', -- 'admin', 'pm', 'logistica', 'campo', 'almacen'
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Asignación persona-proyecto (qué proyectos puede ver cada PM)
CREATE TABLE person_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES people(id),
  project_id UUID REFERENCES projects(id),
  UNIQUE(person_id, project_id)
);

-- Equipos (equipo pesado que se moviliza)
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spectrum_code TEXT,                -- 'CRN001'
  description TEXT NOT NULL,         -- 'Grúa 318 – Liebherr LTM 1060'
  equipment_type TEXT,               -- 'Grúa', 'Excavadora', 'Generador'
  brand TEXT,
  model TEXT,
  year INTEGER,
  status TEXT DEFAULT 'active',
  current_location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vehículos de transporte (cabezales, camiones, pick-ups)
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spectrum_code TEXT,                -- 'CAB930'
  description TEXT NOT NULL,         -- 'Cabezal Mack 350HP'
  vehicle_type TEXT,                 -- 'Cabezal', 'Plataforma', 'Camión Grúa', 'Pick-up'
  brand TEXT,
  model TEXT,
  plate TEXT,
  capacity TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ubicaciones
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,         -- 'Taller Chilibre', 'Muelle 14'
  location_type TEXT,                -- 'taller', 'proyecto', 'almacen', 'proveedor'
  project_id UUID REFERENCES projects(id), -- Si es un proyecto
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tarifas de movilización
CREATE TABLE mobilization_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,         -- 'MVCB50'
  description TEXT NOT NULL,         -- 'Movilización Cama Baja 50'
  rate DECIMAL(10,2) NOT NULL,       -- 500.00
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unidades de medida
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,         -- 'und', 'kg', 'ton'
  description TEXT
);

-- Códigos de costo
CREATE TABLE cost_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  phase_code TEXT NOT NULL,          -- '01-7113'
  phase_description TEXT,            -- 'Movilización'
  full_code TEXT,                    -- '25-506-01.7113'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tablas Transaccionales

```sql
-- Solicitudes (header)
CREATE TABLE sm_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,   -- '25-506-SM-023' (auto-generated)
  project_id UUID NOT NULL REFERENCES projects(id),
  requester_id UUID NOT NULL REFERENCES people(id),
  date_required DATE NOT NULL,
  date_created TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'Borrador',
    -- 'Borrador', 'Enviada', 'En Proceso', 'Completada', 'Parcial', 'Cancelada'
  priority TEXT,
    -- 'Vencida', 'Urgente', 'Próxima', 'Normal' (auto-calculated)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Líneas de solicitud
CREATE TABLE sm_request_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES sm_requests(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  line_type TEXT NOT NULL,           -- 'Equipo' or 'Material'
  equipment_id UUID REFERENCES equipment(id), -- Only if type = 'Equipo'
  description TEXT NOT NULL,
  from_location_id UUID REFERENCES locations(id),
  to_location_id UUID REFERENCES locations(id),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_id UUID REFERENCES units(id),
  cost_code_id UUID REFERENCES cost_codes(id),
  category TEXT,                     -- 'EQI', 'MAT', etc.
  po_reference TEXT,                 -- Text field for now (OC reference)
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pendiente',
    -- 'Pendiente', 'Programada', 'En Tránsito', 'Entregada', 'Parcial', 'Cancelada'
  qty_scheduled DECIMAL(10,2) DEFAULT 0,
  qty_delivered DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Viajes (movilizaciones programadas)
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT UNIQUE NOT NULL,      -- 'MOV-2026-042' (auto-generated)
  scheduled_date DATE NOT NULL,
  driver_id UUID REFERENCES people(id),
  vehicle_id UUID REFERENCES vehicles(id),
  trailer_id UUID REFERENCES vehicles(id), -- nullable
  rate_id UUID REFERENCES mobilization_rates(id),
  cost DECIMAL(10,2),
  att_permit BOOLEAN DEFAULT false,
  escort BOOLEAN DEFAULT false,
  confirmation_code TEXT,            -- 4-digit code for delivery confirmation (auto-generated)
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Programado',
    -- 'Programado', 'En Ruta', 'Completado', 'Cancelado'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asignaciones línea-viaje (tabla pivote many-to-many)
CREATE TABLE trip_line_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  request_line_id UUID NOT NULL REFERENCES sm_request_lines(id),
  quantity_assigned DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Eventos de viaje (ejecución)
CREATE TABLE trip_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id),
  event_type TEXT NOT NULL,
    -- 'Salida', 'Llegada', 'Entrega', 'Retorno', 'Incidencia'
  event_timestamp TIMESTAMPTZ DEFAULT now(),
  location TEXT,
  registered_by UUID REFERENCES people(id),
  confirmation_code_used TEXT,       -- For 'Entrega' events: the 4-digit code entered
  received_by_name TEXT,             -- For 'Entrega': name of person receiving
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Secuencias para auto-IDs
CREATE TABLE sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_type TEXT NOT NULL,            -- 'sm', 'trip'
  project_id UUID REFERENCES projects(id), -- For 'sm' type (per-project sequence)
  next_number INTEGER NOT NULL DEFAULT 1,
  UNIQUE(seq_type, project_id)
);

-- Sugerencias de fallback
CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,          -- 'equipment', 'locations', etc.
  suggested_value TEXT NOT NULL,
  suggested_by UUID REFERENCES people(id),
  status TEXT DEFAULT 'pendiente',   -- 'pendiente', 'aprobada', 'rechazada'
  reviewed_by UUID REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Funciones y Triggers

```sql
-- Auto-generate request ID: {project_code}-SM-{###}
CREATE OR REPLACE FUNCTION generate_request_id()
RETURNS TRIGGER AS $$
DECLARE
  proj_code TEXT;
  next_num INTEGER;
BEGIN
  SELECT code INTO proj_code FROM projects WHERE id = NEW.project_id;
  
  INSERT INTO sequences (seq_type, project_id, next_number)
  VALUES ('sm', NEW.project_id, 1)
  ON CONFLICT (seq_type, project_id) DO UPDATE SET next_number = sequences.next_number + 1
  RETURNING next_number INTO next_num;
  
  NEW.request_id := proj_code || '-SM-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_request_id
BEFORE INSERT ON sm_requests
FOR EACH ROW
WHEN (NEW.request_id IS NULL)
EXECUTE FUNCTION generate_request_id();

-- Auto-generate trip ID: MOV-{YYYY}-{###}
CREATE OR REPLACE FUNCTION generate_trip_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  INSERT INTO sequences (seq_type, project_id, next_number)
  VALUES ('trip', NULL, 1)
  ON CONFLICT (seq_type, project_id) DO UPDATE SET next_number = sequences.next_number + 1
  RETURNING next_number INTO next_num;
  
  NEW.trip_id := 'MOV-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(next_num::TEXT, 3, '0');
  NEW.confirmation_code := LPAD((floor(random() * 10000))::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trip_id
BEFORE INSERT ON trips
FOR EACH ROW
WHEN (NEW.trip_id IS NULL)
EXECUTE FUNCTION generate_trip_id();

-- Auto-calculate priority based on date_required
CREATE OR REPLACE FUNCTION calculate_priority()
RETURNS TRIGGER AS $$
DECLARE
  days_diff INTEGER;
BEGIN
  days_diff := NEW.date_required - CURRENT_DATE;
  IF days_diff < 0 THEN NEW.priority := 'Vencida';
  ELSIF days_diff <= 3 THEN NEW.priority := 'Urgente';
  ELSIF days_diff <= 7 THEN NEW.priority := 'Próxima';
  ELSE NEW.priority := 'Normal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_priority
BEFORE INSERT OR UPDATE OF date_required ON sm_requests
FOR EACH ROW
EXECUTE FUNCTION calculate_priority();

-- Cascade: update header status based on line statuses
CREATE OR REPLACE FUNCTION cascade_request_status()
RETURNS TRIGGER AS $$
DECLARE
  total_lines INTEGER;
  delivered INTEGER;
  cancelled INTEGER;
  in_progress INTEGER;
  new_status TEXT;
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

CREATE TRIGGER trg_cascade_status
AFTER UPDATE OF status ON sm_request_lines
FOR EACH ROW
EXECUTE FUNCTION cascade_request_status();
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

### Ubicaciones (8+)
```
Taller Chilibre (taller), Almacén Central (almacen), 
Muelle 14 (proyecto→25-506), Proyecto Paraíso (proyecto→25-505), 
ASTIBAL (proyecto→25-504), Costa Norte (proyecto→24-404), 
Gamboa (otro), Oficina Central (otro)
```

### Tarifas de Movilización (14)
```
MVG108  | Movilización Grúa 108          | $2,000
MVG318  | Movilización Grúa 318          | $3,000
MVG518  | Movilización Grúa 518          | $6,400
MVGSNY  | Movilización Grúa Sany         | $11,000
MVPLAT  | Movilización Canter Plataforma | $200
MVTTOP  | Movilización Tilt-Top          | $350
MVCALT  | Movilización Cama Alta         | $425
MVCB50  | Movilización Cama Baja 50      | $500
MVCB75  | Movilización Cama Baja 75      | $600
MVCEXT  | Movilización Mesa Extendible   | $550
MVVQ11  | Movilización Camión Volquete   | $260
MVLPUP  | Movilización Pick-up           | $75
MVAPX1  | Movilización Remolcador MAR213 | $5,000
MVCGRU  | Movilización Camión Grúa       | $300
```

### Unidades (11)
```
und, ml, m², m³, kg, ton, gal, juegos, pzas, ft, qq
```

### Usuarios de Prueba (5)
```
admin    | James Cucalón       | admin
pm       | Edward Rodríguez    | pm (proyectos: 25-506, 25-505)
logistica| Carlos Charris      | logistica
campo    | Coco                | campo (conductor)
almacen  | Yoseph Caballero    | almacen
```

### Conductores (5)
```
Coco, Bonilla, Monchi, Rafael, Pedro — todos con rol 'campo'
```

### Equipos (importar desde Equipment.csv — ~392 registros)
### Vehículos (importar desde Vehiculos.csv — 56 registros)
### Códigos de Costo (importar desde codcost.csv — variable por proyecto)

---

## 6. REGLAS DE NEGOCIO CRÍTICAS

### Tipo de movilización (auto-calculado del desde/hasta)
- **Movilización:** origen = Chilibre → destino = proyecto
- **Desmovilización:** origen = proyecto → destino = Chilibre
- **Movimiento Interno:** origen = proyecto → destino = proyecto

### Código de confirmación de entrega (tipo Uber)
- Se genera automáticamente al crear el viaje (4 dígitos random)
- Solo visible para: el solicitante original y Charris
- Al entregar, el conductor ingresa el código que le da el receptor
- Si el código coincide → entrega confirmada, queda registro de quién recibió
- Si no coincide → warning, pero permite continuar (para casos donde receptor no tiene el código)

### Cascada de estados
- Cuando TODAS las líneas de una solicitud = Entregada → header = Completada
- Cuando ≥1 línea programada y ninguna entregada → header = En Proceso
- Cuando hay mezcla de entregadas y pendientes → header = Parcial
- Se ejecuta como trigger PostgreSQL

### Fallback universal
- Cada dropdown tiene opción "No está en lista" → campo de texto libre
- Se crea registro en tabla `suggestions` para que admin lo revise

---

## 7. PANTALLAS (estructura de navegación)

```
/ (login)
/dashboard (home — varía por rol)
/solicitudes (lista de solicitudes — PM ve las suyas, logistica ve todas)
/solicitudes/nueva (crear solicitud)
/solicitudes/[id] (ver/editar solicitud)
/programacion (backlog + viajes — solo logistica/admin)
/programacion/viaje/nuevo (crear viaje)
/programacion/viaje/[id] (ver/editar viaje)
/programacion/calendario (two-week look-ahead)
/mis-viajes (conductor — viajes asignados)
/mis-viajes/[id] (detalle del viaje + registrar eventos)
/admin/masters (gestión de tablas maestras — solo admin)
```

### Navegación por rol:
| Pantalla | admin | pm | logistica | campo | almacen |
|----------|-------|-----|-----------|-------|---------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Solicitudes | ✅ (todas) | ✅ (sus proyectos) | ✅ (todas) | ❌ | ❌ |
| Nueva Solicitud | ✅ | ✅ | ❌ | ❌ | ❌ |
| Programación | ✅ | 👁️ (solo lectura) | ✅ | ❌ | ❌ |
| Mis Viajes | ❌ | ❌ | ❌ | ✅ | ❌ |
| Admin Masters | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 8. UI/UX GUIDELINES

### Design tokens (mantener consistencia con demos anteriores)
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
- **Badges de estado con colores:** Siempre visible el estado de cualquier entidad
- **Monospace para IDs:** 25-506-SM-023 siempre en font monospace
- **Mínimo clicks:** Crear solicitud debe ser rápido — no wizard de 5 pasos

---

## 9. ARCHIVOS DE REFERENCIA

En el proyecto hay archivos CSV con datos reales para importar:
- `Equipment.csv` — ~392 equipos de Spectrum
- `Vehiculos.csv` — 56 vehículos de transporte
- `Proyectos.csv` — 4 proyectos activos
- `TarifasMov.csv` — 14 tarifas de movilización
- `Employee_Listing.csv` — 161 empleados (necesita limpieza)
- `codcost.csv` — Códigos de costo por proyecto

Y el Feature Specification completo en:
- `ICONSA_Feature_Specification_v1.docx` — documento formal con todas las reglas de negocio, estados, transiciones, y campos detallados. Referencia autoritativa para cualquier duda.

---

## 10. DEFINICIÓN DE "TERMINADO" PARA EL MVP

El MVP está terminado cuando:
1. ✅ Un usuario puede entrar con email/contraseña y ver solo lo que le corresponde
2. ✅ Un PM puede crear una solicitud con líneas y enviarla
3. ✅ Charris ve TODAS las solicitudes en un backlog con prioridad visual
4. ✅ Charris puede crear un viaje asignando líneas, conductor, vehículo, fecha
5. ✅ Un conductor puede ver sus viajes asignados
6. ✅ Se pueden registrar eventos de ejecución (salida, entrega con código 4 dígitos, retorno)
7. ✅ El dashboard muestra KPIs básicos de solicitudes y viajes
8. ✅ Los estados se actualizan en cascada automáticamente
9. ✅ Funciona en celular (responsive)
10. ✅ Datos reales de ICONSA precargados (proyectos, equipos, vehículos, tarifas)
