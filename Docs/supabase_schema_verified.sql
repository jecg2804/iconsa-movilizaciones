-- MovimientOS Schema - Verificado contra Supabase live
-- Fecha: 2026-03-04 (actualizado con constraints D4-D5 y CASCADE)
-- Fuente: Export directo de Supabase SQL Editor + verificación pg_constraint
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.cost_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  phase_code text NOT NULL,
  phase_description text,
  full_code text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cost_codes_pkey PRIMARY KEY (id),
  CONSTRAINT cost_codes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
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
  status text DEFAULT 'Activo'::text,
  current_location text,
  created_at timestamp with time zone DEFAULT now(),
  plate text,
  capacity text,
  type_code text,
  inspection_type text,
  current_project_id uuid,
  notes text,
  weight_class text,
  acquisition_type text DEFAULT 'Propio'::text,
  last_inspection_date date,
  next_inspection_due date,
  meter_reading numeric,
  insurance_expiry date,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT equipment_pkey PRIMARY KEY (id),
  CONSTRAINT equipment_current_project_id_fkey FOREIGN KEY (current_project_id) REFERENCES public.projects(id)
);

CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  location_type text,
  project_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  contact_name text,
  contact_phone text,
  notes text,
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  address text,
  CONSTRAINT locations_pkey PRIMARY KEY (id),
  CONSTRAINT locations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);

CREATE TABLE public.mobilization_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  rate numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mobilization_rates_pkey PRIMARY KEY (id)
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
  app_role text,
  status text DEFAULT 'Activo'::text,
  created_at timestamp with time zone DEFAULT now(),
  city text,
  supervisor_id uuid,
  cedula text,
  license_type text,
  license_expiry date,
  hire_date date,
  emergency_contact_name text,
  emergency_contact_phone text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT people_pkey PRIMARY KEY (id),
  CONSTRAINT people_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.people(id)
);

CREATE TABLE public.person_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  project_id uuid NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  role text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT person_projects_pkey PRIMARY KEY (id),
  CONSTRAINT person_projects_person_id_project_id_key UNIQUE (person_id, project_id),
  CONSTRAINT person_projects_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT person_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  manager text,
  status text DEFAULT 'Activo'::text,
  created_at timestamp with time zone DEFAULT now(),
  location text,
  updated_at timestamp with time zone DEFAULT now(),
  start_date date,
  end_date date,
  notes text,
  billing_code text,
  budget numeric,
  client text,
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);

CREATE TABLE public.sequences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seq_type text NOT NULL,
  project_id uuid,
  next_number integer NOT NULL DEFAULT 1,
  CONSTRAINT sequences_pkey PRIMARY KEY (id),
  CONSTRAINT sequences_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);

CREATE TABLE public.sm_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id text UNIQUE,
  project_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  date_required date NOT NULL,
  date_created timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'Borrador'::text,
  priority text,
  approved_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  attachments jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT sm_requests_pkey PRIMARY KEY (id),
  CONSTRAINT sm_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT sm_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.people(id),
  CONSTRAINT sm_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.people(id)
);

CREATE TABLE public.sm_request_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  line_number integer NOT NULL,
  line_type text NOT NULL,
  equipment_id uuid,
  description text NOT NULL,
  from_location_id uuid,
  to_location_id uuid,
  quantity numeric NOT NULL DEFAULT 1,
  unit_id uuid,
  cost_code_id uuid,
  category text,
  po_reference text,
  notes text,
  status text NOT NULL DEFAULT 'Pendiente'::text,
  qty_scheduled numeric DEFAULT 0,
  qty_delivered numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  from_text text,
  to_text text,
  equipment_text text,
  unit_text text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sm_request_lines_pkey PRIMARY KEY (id),
  CONSTRAINT sm_request_lines_line_type_check CHECK (line_type = ANY (ARRAY['Equipo'::text, 'Material'::text])),
  CONSTRAINT sm_request_lines_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.sm_requests(id) ON DELETE CASCADE,
  CONSTRAINT sm_request_lines_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id),
  CONSTRAINT sm_request_lines_from_location_id_fkey FOREIGN KEY (from_location_id) REFERENCES public.locations(id),
  CONSTRAINT sm_request_lines_to_location_id_fkey FOREIGN KEY (to_location_id) REFERENCES public.locations(id),
  CONSTRAINT sm_request_lines_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id),
  CONSTRAINT sm_request_lines_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id)
);

CREATE TABLE public.suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  suggested_value text NOT NULL,
  suggested_by uuid,
  status text DEFAULT 'pendiente'::text,
  reviewed_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT suggestions_pkey PRIMARY KEY (id),
  CONSTRAINT suggestions_suggested_by_fkey FOREIGN KEY (suggested_by) REFERENCES public.people(id),
  CONSTRAINT suggestions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.people(id)
);

CREATE TABLE public.trip_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  event_type text NOT NULL,
  event_timestamp timestamp with time zone DEFAULT now(),
  location text,
  registered_by uuid,
  confirmation_code_used text,
  received_by_name text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT trip_events_pkey PRIMARY KEY (id),
  CONSTRAINT trip_events_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id),
  CONSTRAINT trip_events_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.people(id)
);

CREATE TABLE public.trip_line_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  request_line_id uuid NOT NULL,
  quantity_assigned numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT trip_line_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT trip_line_assignments_trip_line_unique UNIQUE (trip_id, request_line_id),
  CONSTRAINT trip_line_assignments_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE,
  CONSTRAINT trip_line_assignments_request_line_id_fkey FOREIGN KEY (request_line_id) REFERENCES public.sm_request_lines(id)
);

CREATE TABLE public.trips (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id text UNIQUE,
  scheduled_date date NOT NULL,
  driver_id uuid,
  vehicle_id uuid,
  trailer_id uuid,
  rate_id uuid,
  cost numeric,
  att_permit boolean DEFAULT false,
  escort boolean DEFAULT false,
  confirmation_code text,
  notes text,
  status text NOT NULL DEFAULT 'Programado'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  actual_departure timestamp with time zone,
  actual_arrival timestamp with time zone,
  route_summary text,
  is_external boolean DEFAULT false,
  CONSTRAINT trips_pkey PRIMARY KEY (id),
  CONSTRAINT trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.people(id),
  CONSTRAINT trips_rate_id_fkey FOREIGN KEY (rate_id) REFERENCES public.mobilization_rates(id),
  CONSTRAINT trips_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.equipment(id),
  CONSTRAINT trips_trailer_id_fkey FOREIGN KEY (trailer_id) REFERENCES public.equipment(id)
);

CREATE TABLE public.units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT units_pkey PRIMARY KEY (id)
);
