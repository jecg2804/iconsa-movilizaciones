-- ============================================================
-- ICONSA MovimientOS — Schema Completo Verificado
-- Generado: 2026-03-06 desde Supabase live
-- Proyecto: bzeoszympkkicwlfdtcn
-- Tablas: 18 (13 maestras + 5 transaccionales)
-- ============================================================

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_request_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  proj_code TEXT;
  next_num INTEGER;
BEGIN
  SELECT code INTO proj_code FROM projects WHERE id = NEW.project_id;
  UPDATE sequences SET next_number = next_number + 1
  WHERE seq_type = 'sm'
    AND COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(NEW.project_id, '00000000-0000-0000-0000-000000000000'::uuid)
  RETURNING next_number - 1 INTO next_num;
  IF next_num IS NULL THEN
    INSERT INTO sequences (seq_type, project_id, next_number) VALUES ('sm', NEW.project_id, 2);
    next_num := 1;
  END IF;
  NEW.request_id := proj_code || '-SM-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_trip_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  next_num INTEGER;
  yr TEXT;
BEGIN
  yr := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  UPDATE sequences SET next_number = next_number + 1
  WHERE seq_type = 'trip' AND project_id IS NULL
  RETURNING next_number - 1 INTO next_num;
  IF next_num IS NULL THEN
    INSERT INTO sequences (seq_type, project_id, next_number) VALUES ('trip', NULL, 2);
    next_num := 1;
  END IF;
  NEW.trip_id := 'MOV-' || yr || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_priority()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  days_diff INTEGER;
BEGIN
  days_diff := NEW.date_required - CURRENT_DATE;
  IF days_diff < 0 THEN NEW.priority := 'Vencida';
  ELSIF days_diff <= 3 THEN NEW.priority := 'Urgente';
  ELSIF days_diff <= 7 THEN NEW.priority := 'Proxima';
  ELSE NEW.priority := 'Normal';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION cascade_request_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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
  SELECT COUNT(*) INTO in_progress FROM sm_request_lines WHERE request_id = NEW.request_id AND status IN ('Programada', 'En Transito');
  IF delivered + cancelled = total_lines AND delivered > 0 THEN new_status := 'Completada';
  ELSIF cancelled = total_lines THEN new_status := 'Cancelada';
  ELSIF delivered > 0 THEN new_status := 'Parcial';
  ELSIF in_progress > 0 THEN new_status := 'En Proceso';
  ELSE new_status := 'Enviada';
  END IF;
  UPDATE sm_requests SET status = new_status, updated_at = now() WHERE id = NEW.request_id AND status NOT IN ('Borrador', 'Cancelada');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_my_app_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_role FROM people WHERE auth_id = auth.uid();
$$;

-- ============================================================
-- TABLAS MAESTRAS (13)
-- ============================================================

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  manager text,
  status text DEFAULT 'Activo',
  location text,
  start_date date,
  end_date date,
  notes text,
  billing_code text,
  budget numeric,
  client text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE REFERENCES auth.users(id),
  code text,
  name text NOT NULL,
  department text,
  position text,
  phone text,
  email text UNIQUE,
  app_role text, -- admin, pm, logistica, campo, almacen, NULL
  status text DEFAULT 'Activo',
  city text,
  supervisor_id uuid REFERENCES people(id),
  cedula text,
  license_type text,
  license_expiry date,
  hire_date date,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE person_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(person_id, project_id)
);

CREATE TABLE equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spectrum_code text,
  description text NOT NULL,
  equipment_type text,
  type_code text, -- EQP, GRU, MAR, EQA, EQL, FND, TEC, ING, VHL, VHP
  brand text,
  model text,
  serial_number text,
  year integer,
  status text DEFAULT 'Activo',
  current_location text,
  plate text,
  capacity text,
  inspection_type text, -- HOROMETRO, ODOMETRO, NULL
  current_project_id uuid REFERENCES projects(id),
  weight_class text,
  acquisition_type text DEFAULT 'Propio',
  last_inspection_date date,
  next_inspection_due date,
  meter_reading numeric,
  insurance_expiry date,
  notes text,
  parent_equipment_id uuid REFERENCES equipment(id), -- accesorio→padre
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  location_type text,
  address text,
  project_id uuid REFERENCES projects(id),
  is_active boolean DEFAULT true,
  contact_name text,
  contact_phone text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE mobilization_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text NOT NULL,
  rate numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE cost_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id),
  phase_code text NOT NULL,
  phase_description text,
  full_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE cost_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE cost_categories IS 'Categorías de código de costo (ICS, EQI, EQA, etc.). Globales, no por proyecto.';

CREATE TABLE cost_code_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_code_id uuid NOT NULL REFERENCES cost_codes(id) ON DELETE CASCADE,
  cost_category_id uuid NOT NULL REFERENCES cost_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cost_code_id, cost_category_id)
);
COMMENT ON TABLE cost_code_categories IS 'Qué categorías son válidas para cada fase de cada proyecto. Derivado de Sage Phase Listing.';

CREATE TABLE sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_type text NOT NULL,
  project_id uuid REFERENCES projects(id),
  next_number integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX idx_sequences_unique ON sequences (seq_type, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  suggested_value text NOT NULL,
  suggested_by uuid REFERENCES people(id),
  status text DEFAULT 'pendiente',
  reviewed_by uuid REFERENCES people(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE user_app_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people(id),
  app_code text NOT NULL,
  role_code text NOT NULL,
  is_active boolean DEFAULT true,
  granted_by uuid REFERENCES people(id),
  granted_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(person_id, app_code, role_code)
);
COMMENT ON TABLE user_app_roles IS 'Multi-app RBAC. MVP: app_code=movilizaciones. people.app_role remains as shortcut.';

-- ============================================================
-- TABLAS TRANSACCIONALES (5)
-- ============================================================

CREATE TABLE sm_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text UNIQUE,
  project_id uuid NOT NULL REFERENCES projects(id),
  requester_id uuid NOT NULL REFERENCES people(id),
  date_required date NOT NULL,
  date_created timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'Borrador',
  priority text,
  approved_by uuid REFERENCES people(id),
  notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE sm_request_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES sm_requests(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  line_type text NOT NULL CHECK (line_type IN ('Equipo', 'Material')),
  equipment_id uuid REFERENCES equipment(id),
  description text NOT NULL,
  from_location_id uuid REFERENCES locations(id),
  to_location_id uuid REFERENCES locations(id),
  quantity numeric NOT NULL DEFAULT 1,
  unit_id uuid REFERENCES units(id),
  cost_code_id uuid REFERENCES cost_codes(id),
  cost_category_id uuid REFERENCES cost_categories(id),
  category text, -- LEGACY
  material_category text, -- texto libre, solo Material
  po_reference text,
  notes text,
  status text NOT NULL DEFAULT 'Pendiente',
  qty_scheduled numeric DEFAULT 0,
  qty_delivered numeric DEFAULT 0,
  from_text text,
  to_text text,
  equipment_text text,
  unit_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id text UNIQUE,
  scheduled_date date NOT NULL,
  driver_id uuid REFERENCES people(id),
  vehicle_id uuid REFERENCES equipment(id),
  trailer_id uuid REFERENCES equipment(id),
  rate_id uuid REFERENCES mobilization_rates(id),
  cost numeric,
  att_permit boolean DEFAULT false,
  escort boolean DEFAULT false,
  confirmation_code text,
  notes text,
  status text NOT NULL DEFAULT 'Programado',
  actual_departure timestamptz,
  actual_arrival timestamptz,
  route_summary text,
  is_external boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE trip_line_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  request_line_id uuid NOT NULL REFERENCES sm_request_lines(id),
  quantity_assigned numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, request_line_id)
);

CREATE TABLE trip_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id),
  event_type text NOT NULL,
  event_timestamp timestamptz DEFAULT now(),
  location text,
  registered_by uuid REFERENCES people(id),
  confirmation_code_used text,
  received_by_name text,
  notes text,
  created_at timestamptz DEFAULT now()
  -- NO updated_at — eventos son INMUTABLES
);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_updated_at_projects BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_people BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_person_projects BEFORE UPDATE ON person_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_equipment BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_locations BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_mobilization_rates BEFORE UPDATE ON mobilization_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_units BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_cost_codes BEFORE UPDATE ON cost_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_cost_categories BEFORE UPDATE ON cost_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_user_app_roles BEFORE UPDATE ON user_app_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_sm_requests BEFORE UPDATE ON sm_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_sm_request_lines BEFORE UPDATE ON sm_request_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_trips BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_trip_line_assignments BEFORE UPDATE ON trip_line_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_generate_request_id BEFORE INSERT ON sm_requests FOR EACH ROW EXECUTE FUNCTION generate_request_id();
CREATE TRIGGER trg_calculate_priority BEFORE INSERT OR UPDATE OF date_required ON sm_requests FOR EACH ROW EXECUTE FUNCTION calculate_priority();
CREATE TRIGGER trg_cascade_request_status AFTER UPDATE OF status ON sm_request_lines FOR EACH ROW EXECUTE FUNCTION cascade_request_status();
CREATE TRIGGER trg_generate_trip_id BEFORE INSERT ON trips FOR EACH ROW EXECUTE FUNCTION generate_trip_id();

-- ============================================================
-- FK INDEXES (performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cost_codes_project ON cost_codes(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_code_categories_code ON cost_code_categories(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_cost_code_categories_cat ON cost_code_categories(cost_category_id);
CREATE INDEX IF NOT EXISTS idx_equipment_current_project ON equipment(current_project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_parent ON equipment(parent_equipment_id);
CREATE INDEX IF NOT EXISTS idx_locations_project ON locations(project_id);
CREATE INDEX IF NOT EXISTS idx_people_supervisor ON people(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_person_projects_project ON person_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_sequences_project ON sequences(project_id);
CREATE INDEX IF NOT EXISTS idx_sm_request_lines_equipment ON sm_request_lines(equipment_id);
CREATE INDEX IF NOT EXISTS idx_sm_request_lines_from_loc ON sm_request_lines(from_location_id);
CREATE INDEX IF NOT EXISTS idx_sm_request_lines_to_loc ON sm_request_lines(to_location_id);
CREATE INDEX IF NOT EXISTS idx_sm_request_lines_unit ON sm_request_lines(unit_id);
CREATE INDEX IF NOT EXISTS idx_sm_request_lines_cost_code ON sm_request_lines(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_sm_request_lines_cost_category ON sm_request_lines(cost_category_id);
CREATE INDEX IF NOT EXISTS idx_sm_requests_approved_by ON sm_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_suggestions_suggested_by ON suggestions(suggested_by);
CREATE INDEX IF NOT EXISTS idx_suggestions_reviewed_by ON suggestions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_trip_events_trip ON trip_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_events_registered_by ON trip_events(registered_by);
CREATE INDEX IF NOT EXISTS idx_trip_assigns_trip ON trip_line_assignments(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_assigns_line ON trip_line_assignments(request_line_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_trailer ON trips(trailer_id);
CREATE INDEX IF NOT EXISTS idx_trips_rate ON trips(rate_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_user_app_roles_app ON user_app_roles(app_code, role_code) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_user_app_roles_granted_by ON user_app_roles(granted_by);
