-- ICONSA Movilizaciones - Schema verificado 2026-03-03
-- Fuente: Supabase information_schema despues de todos los fixes
-- Este archivo es referencia para generacion de tipos TypeScript

CREATE TABLE public.cost_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id),
  phase_code text NOT NULL,
  phase_description text,
  full_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.equipment (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  spectrum_code text,
  description text NOT NULL,
  equipment_type text,
  brand text,
  model text,
  serial_number text,
  year integer,
  status text DEFAULT 'Activo',
  current_location text,
  plate text,
  capacity text,
  type_code text,
  inspection_type text,
  current_project_id uuid REFERENCES public.projects(id),
  notes text,
  weight_class text,
  acquisition_type text DEFAULT 'Propio',
  last_inspection_date date,
  next_inspection_due date,
  meter_reading numeric,
  insurance_expiry date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  location_type text,
  project_id uuid REFERENCES public.projects(id),
  is_active boolean DEFAULT true,
  address text,
  contact_name text,
  contact_phone text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.mobilization_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  rate numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.people (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE,
  code text,
  name text NOT NULL,
  department text,
  position text,
  phone text,
  email text UNIQUE,
  app_role text,  -- NULL=sin acceso, 'admin','pm','logistica','campo','almacen'
  status text DEFAULT 'Activo',
  city text,
  supervisor_id uuid REFERENCES public.people(id),
  cedula text,
  license_type text,
  license_expiry date,
  hire_date date,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.person_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.people(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  role text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
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
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sequences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seq_type text NOT NULL,
  project_id uuid REFERENCES public.projects(id),
  next_number integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);

CREATE TABLE public.sm_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id text UNIQUE,  -- auto: 25-506-SM-001
  project_id uuid NOT NULL REFERENCES public.projects(id),
  requester_id uuid NOT NULL REFERENCES public.people(id),
  date_required date NOT NULL,
  date_created timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'Borrador',
  priority text,  -- auto: Vencida/Urgente/Proxima/Normal
  approved_by uuid REFERENCES public.people(id),
  notes text,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sm_request_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.sm_requests(id),
  line_number integer NOT NULL,
  line_type text NOT NULL,  -- 'Equipo' o 'Material'
  equipment_id uuid REFERENCES public.equipment(id),
  description text NOT NULL,
  from_location_id uuid REFERENCES public.locations(id),
  to_location_id uuid REFERENCES public.locations(id),
  quantity numeric NOT NULL DEFAULT 1,
  unit_id uuid REFERENCES public.units(id),
  cost_code_id uuid REFERENCES public.cost_codes(id),
  category text,
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
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.trips (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id text UNIQUE,  -- auto: MOV-2026-001
  scheduled_date date NOT NULL,
  driver_id uuid REFERENCES public.people(id),
  vehicle_id uuid REFERENCES public.equipment(id),
  trailer_id uuid REFERENCES public.equipment(id),
  rate_id uuid REFERENCES public.mobilization_rates(id),
  cost numeric,
  att_permit boolean DEFAULT false,
  escort boolean DEFAULT false,
  confirmation_code text,  -- auto: 4 digitos
  notes text,
  status text NOT NULL DEFAULT 'Programado',
  actual_departure timestamptz,
  actual_arrival timestamptz,
  route_summary text,
  is_external boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.trip_line_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id),
  request_line_id uuid NOT NULL REFERENCES public.sm_request_lines(id),
  quantity_assigned numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.trip_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id),
  event_type text NOT NULL,  -- Salida/Llegada/Entrega/Retorno/Incidencia
  event_timestamp timestamptz DEFAULT now(),
  location text,
  registered_by uuid REFERENCES public.people(id),
  confirmation_code_used text,
  received_by_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  suggested_value text NOT NULL,
  suggested_by uuid REFERENCES public.people(id),
  status text DEFAULT 'pendiente',
  reviewed_by uuid REFERENCES public.people(id),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);
