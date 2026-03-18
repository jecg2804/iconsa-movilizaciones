-- ============================================================
-- ICONSA MovimientOS — Schema Completo Verificado
-- Generado: 2026-03-09 desde Supabase live
-- Proyecto: bzeoszympkkicwlfdtcn (Oregon us-west-2)
-- Tablas: 18 (13 maestras + 5 transaccionales)
-- Triggers de negocio: 8
-- ============================================================

-- ============================================================
-- FUNCIONES (8)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION generate_request_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE proj_code TEXT; next_num INTEGER;
BEGIN
  SELECT code INTO proj_code FROM projects WHERE id = NEW.project_id;
  UPDATE sequences SET next_number = next_number + 1
  WHERE seq_type = 'sm' AND COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(NEW.project_id, '00000000-0000-0000-0000-000000000000'::uuid)
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
DECLARE next_num INTEGER; yr TEXT;
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

CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.confirmation_code IS NULL OR NEW.confirmation_code = '' THEN
    NEW.confirmation_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_full_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE proj_code TEXT;
BEGIN
  SELECT code INTO proj_code FROM projects WHERE id = NEW.project_id;
  NEW.full_code := proj_code || '-' || REPLACE(NEW.phase_code, '.', '-');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_priority()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE days_diff INTEGER;
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
DECLARE total_lines INTEGER; delivered INTEGER; cancelled INTEGER; in_progress INTEGER; new_status TEXT;
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
  code text UNIQUE NOT NULL, name text NOT NULL, manager text,
  status text DEFAULT 'Activo', location text,
  start_date date, end_date date, notes text,
  billing_code text, budget numeric, client text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE REFERENCES auth.users(id),
  code text, name text NOT NULL, department text, position text,
  phone text, email text UNIQUE,
  app_role text, -- admin, pm, logistica, campo, almacen, NULL
  status text DEFAULT 'Activo', city text,
  supervisor_id uuid REFERENCES people(id),
  cedula text, license_type text, license_expiry date, hire_date date,
  emergency_contact_name text, emergency_contact_phone text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE person_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role text, is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  UNIQUE(person_id, project_id)
);

CREATE TABLE equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spectrum_code text, description text NOT NULL, equipment_type text, type_code text,
  brand text, model text, serial_number text, year integer,
  status text DEFAULT 'Activo', current_location text, plate text, capacity text,
  inspection_type text, current_project_id uuid REFERENCES projects(id),
  weight_class text, acquisition_type text DEFAULT 'Propio',
  last_inspection_date date, next_inspection_due date,
  meter_reading numeric, insurance_expiry date, notes text,
  parent_equipment_id uuid REFERENCES equipment(id),
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, location_type text, address text,
  project_id uuid REFERENCES projects(id),
  is_active boolean DEFAULT true, contact_name text, contact_phone text, notes text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE mobilization_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, description text NOT NULL, rate numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, description text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE cost_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id),
  phase_code text NOT NULL, phase_description text,
  full_code text, -- auto: trigger generate_full_code() → {proyecto}-{fase} all dashes
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE cost_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, description text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE cost_code_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_code_id uuid NOT NULL REFERENCES cost_codes(id) ON DELETE CASCADE,
  cost_category_id uuid NOT NULL REFERENCES cost_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cost_code_id, cost_category_id)
);

CREATE TABLE sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_type text NOT NULL, project_id uuid REFERENCES projects(id),
  next_number integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX idx_sequences_unique ON sequences (seq_type, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL, suggested_value text NOT NULL,
  suggested_by uuid REFERENCES people(id),
  status text DEFAULT 'pendiente', reviewed_by uuid REFERENCES people(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE user_app_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people(id),
  app_code text NOT NULL, role_code text NOT NULL,
  is_active boolean DEFAULT true, granted_by uuid REFERENCES people(id),
  granted_at timestamptz DEFAULT now(), notes text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  UNIQUE(person_id, app_code, role_code)
);

-- ============================================================
-- TABLAS TRANSACCIONALES (5)
-- ============================================================

CREATE TABLE sm_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text UNIQUE, project_id uuid NOT NULL REFERENCES projects(id),
  requester_id uuid NOT NULL REFERENCES people(id),
  date_required date NOT NULL, date_created timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'Borrador', priority text,
  approved_by uuid REFERENCES people(id), notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
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
  po_reference text, notes text,
  status text NOT NULL DEFAULT 'Pendiente',
  qty_scheduled numeric DEFAULT 0, qty_delivered numeric DEFAULT 0,
  from_text text, to_text text, equipment_text text, unit_text text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id text UNIQUE, scheduled_date date NOT NULL,
  driver_id uuid REFERENCES people(id),
  vehicle_id uuid REFERENCES equipment(id),
  trailer_id uuid REFERENCES equipment(id),
  rate_id uuid REFERENCES mobilization_rates(id),
  cost numeric, att_permit boolean DEFAULT false, escort boolean DEFAULT false,
  confirmation_code text, -- auto by trigger if NULL
  notes text, status text NOT NULL DEFAULT 'Programado',
  actual_departure timestamptz, actual_arrival timestamptz,
  route_summary text, is_external boolean DEFAULT false,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE trip_line_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  request_line_id uuid NOT NULL REFERENCES sm_request_lines(id),
  quantity_assigned numeric NOT NULL,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, request_line_id)
);

CREATE TABLE trip_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id),
  event_type text NOT NULL, event_timestamp timestamptz DEFAULT now(),
  location text, registered_by uuid REFERENCES people(id),
  confirmation_code_used text,
  received_by_id uuid REFERENCES people(id), -- receptor vinculado a people
  received_by_name text, -- denormalizacion + fallback
  notes text,
  created_at timestamptz DEFAULT now()
  -- NO updated_at — eventos INMUTABLES
);
CREATE INDEX idx_trip_events_received_by ON trip_events(received_by_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_request_id BEFORE INSERT ON sm_requests FOR EACH ROW EXECUTE FUNCTION generate_request_id();
CREATE TRIGGER trg_priority BEFORE INSERT OR UPDATE OF date_required ON sm_requests FOR EACH ROW EXECUTE FUNCTION calculate_priority();
CREATE TRIGGER trg_cascade_status AFTER UPDATE OF status ON sm_request_lines FOR EACH ROW EXECUTE FUNCTION cascade_request_status();
CREATE TRIGGER trg_trip_id BEFORE INSERT ON trips FOR EACH ROW EXECUTE FUNCTION generate_trip_id();
CREATE TRIGGER trg_generate_confirmation_code BEFORE INSERT ON trips FOR EACH ROW EXECUTE FUNCTION generate_confirmation_code();
CREATE TRIGGER trg_generate_full_code BEFORE INSERT OR UPDATE OF phase_code, project_id ON cost_codes FOR EACH ROW EXECUTE FUNCTION generate_full_code();

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER people_updated_at BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER person_projects_updated_at BEFORE UPDATE ON person_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER rates_updated_at BEFORE UPDATE ON mobilization_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cost_codes_updated_at BEFORE UPDATE ON cost_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sm_requests_updated_at BEFORE UPDATE ON sm_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sm_request_lines_updated_at BEFORE UPDATE ON sm_request_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trip_line_assignments_updated_at BEFORE UPDATE ON trip_line_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
