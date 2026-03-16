


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgmq";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."audit_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  changed_by_id uuid;
  changed text[];
  col text;
  old_val text;
  new_val text;
BEGIN
  -- Get the person_id of whoever is making this change
  SELECT id INTO changed_by_id FROM people WHERE auth_id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action, changed_by, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', changed_by_id, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Find which fields actually changed
    changed := ARRAY[]::text[];
    FOR col IN SELECT column_name FROM information_schema.columns 
               WHERE table_schema = TG_TABLE_SCHEMA AND table_name = TG_TABLE_NAME
               AND column_name NOT IN ('updated_at', 'created_at')
    LOOP
      EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', col, col)
        INTO old_val, new_val USING OLD, NEW;
      IF old_val IS DISTINCT FROM new_val THEN
        changed := array_append(changed, col);
      END IF;
    END LOOP;

    -- Only log if something actually changed (ignore updated_at-only updates)
    IF array_length(changed, 1) > 0 THEN
      INSERT INTO audit_log (table_name, record_id, action, changed_by, old_data, new_data, changed_fields)
      VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', changed_by_id, to_jsonb(OLD), to_jsonb(NEW), changed);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action, changed_by, old_data)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', changed_by_id, to_jsonb(OLD));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$_$;


ALTER FUNCTION "public"."audit_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_priority"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  days_until INTEGER;
BEGIN
  days_until := NEW.date_required - CURRENT_DATE;
  
  IF days_until < 0 THEN
    NEW.priority := 'Vencida';
  ELSIF days_until <= 3 THEN
    NEW.priority := 'Urgente';
  ELSIF days_until <= 7 THEN
    NEW.priority := 'Proxima';
  ELSE
    NEW.priority := 'Normal';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_priority"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capture_initial_priority"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.initial_priority IS NULL THEN
    NEW.initial_priority := NEW.priority;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."capture_initial_priority"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capture_lifecycle_timestamps"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Solicitud enviada
  IF NEW.status = 'Enviada' AND (OLD.status IS NULL OR OLD.status != 'Enviada') THEN
    IF NEW.date_submitted IS NULL THEN
      NEW.date_submitted := now();
    END IF;
  END IF;

  -- Solicitud completada
  IF NEW.status = 'Completada' AND (OLD.status IS NULL OR OLD.status != 'Completada') THEN
    IF NEW.date_completed IS NULL THEN
      NEW.date_completed := now();
    END IF;
  END IF;

  -- Solicitud cancelada
  IF NEW.status = 'Cancelada' AND (OLD.status IS NULL OR OLD.status != 'Cancelada') THEN
    IF NEW.date_cancelled IS NULL THEN
      NEW.date_cancelled := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."capture_lifecycle_timestamps"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capture_trip_cancelled"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'Cancelado' AND (OLD.status IS NULL OR OLD.status != 'Cancelado') THEN
    IF NEW.date_cancelled IS NULL THEN
      NEW.date_cancelled := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."capture_trip_cancelled"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cascade_request_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  total_lines INTEGER;
  delivered INTEGER;
  cancelled INTEGER;
  in_progress INTEGER;
  parcial INTEGER;
  new_status TEXT;
BEGIN
  SELECT COUNT(*) INTO total_lines FROM sm_request_lines WHERE request_id = NEW.request_id;
  SELECT COUNT(*) INTO delivered FROM sm_request_lines WHERE request_id = NEW.request_id AND status = 'Entregada';
  SELECT COUNT(*) INTO cancelled FROM sm_request_lines WHERE request_id = NEW.request_id AND status = 'Cancelada';
  SELECT COUNT(*) INTO in_progress FROM sm_request_lines WHERE request_id = NEW.request_id AND status IN ('Programada', 'En Transito');
  SELECT COUNT(*) INTO parcial FROM sm_request_lines WHERE request_id = NEW.request_id AND status = 'Parcial';

  -- Order matters:
  -- 1. ALL resolved with at least 1 delivered → Completada
  --    (delivered + cancelled = total means everything is resolved;
  --     delivered > 0 means at least something was fulfilled)
  -- 2. ALL cancelled → Cancelada
  -- 3. Any active work (in transit, scheduled, partially delivered, or fully delivered lines) → En Proceso
  -- 4. Nothing moving yet → Enviada
  
  IF delivered + cancelled = total_lines AND delivered > 0 THEN 
    new_status := 'Completada';
  ELSIF cancelled = total_lines THEN 
    new_status := 'Cancelada';
  ELSIF in_progress > 0 OR delivered > 0 OR parcial > 0 THEN 
    new_status := 'En Proceso';
  ELSE 
    new_status := 'Enviada';
  END IF;

  UPDATE sm_requests SET status = new_status, updated_at = now()
  WHERE id = NEW.request_id AND status NOT IN ('Borrador', 'Cancelada');
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."cascade_request_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_confirmation_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.confirmation_code IS NULL OR NEW.confirmation_code = '' THEN
    NEW.confirmation_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_confirmation_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_full_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  proj_code TEXT;
  extra_code TEXT := '';
BEGIN
  SELECT code INTO proj_code FROM projects WHERE id = NEW.project_id;
  IF NEW.extra_id IS NOT NULL THEN
    SELECT code INTO extra_code FROM project_extras WHERE id = NEW.extra_id;
    extra_code := '-' || extra_code;  -- dash before extra: -E1
  END IF;
  NEW.full_code := proj_code || extra_code || '-' || REPLACE(NEW.phase_code, '.', '-');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_full_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_request_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  proj_code TEXT;
  next_num INTEGER;
BEGIN
  SELECT code INTO proj_code FROM projects WHERE id = NEW.project_id;
  
  -- Try UPDATE existing sequence first
  UPDATE sequences 
  SET next_number = next_number + 1
  WHERE seq_type = 'sm' 
    AND COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(NEW.project_id, '00000000-0000-0000-0000-000000000000'::uuid)
  RETURNING next_number - 1 INTO next_num;
  
  -- If no row existed, create one (next to assign = 1, stored next = 2)
  IF next_num IS NULL THEN
    INSERT INTO sequences (seq_type, project_id, next_number) VALUES ('sm', NEW.project_id, 2);
    next_num := 1;
  END IF;
  
  NEW.request_id := proj_code || '-SM-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_request_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_trip_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  next_num INTEGER;
  yr TEXT;
BEGIN
  yr := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  UPDATE sequences 
  SET next_number = next_number + 1
  WHERE seq_type = 'trip' 
    AND project_id IS NULL
  RETURNING next_number - 1 INTO next_num;
  
  IF next_num IS NULL THEN
    INSERT INTO sequences (seq_type, project_id, next_number) VALUES ('trip', NULL, 2);
    next_num := 1;
  END IF;
  
  NEW.trip_id := 'MOV-' || yr || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_trip_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_app_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT app_role FROM people WHERE auth_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_app_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_equipment_location_on_delivery"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  assignment RECORD;
  line RECORD;
BEGIN
  -- Only fire on Entrega events
  IF NEW.event_type != 'Entrega' THEN
    RETURN NEW;
  END IF;

  -- For each line assigned to this trip, update equipment location
  FOR assignment IN
    SELECT tla.request_line_id 
    FROM trip_line_assignments tla 
    WHERE tla.trip_id = NEW.trip_id
  LOOP
    SELECT srl.equipment_id, srl.to_location_id, srl.to_text,
           loc.name as location_name, loc.project_id as dest_project_id
    INTO line
    FROM sm_request_lines srl
    LEFT JOIN locations loc ON loc.id = srl.to_location_id
    WHERE srl.id = assignment.request_line_id
    AND srl.equipment_id IS NOT NULL;

    -- Update equipment current_location and project
    IF line.equipment_id IS NOT NULL THEN
      UPDATE equipment SET 
        current_location = COALESCE(line.location_name, line.to_text),
        current_project_id = line.dest_project_id
      WHERE id = line.equipment_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_equipment_location_on_delivery"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_fields" "text"[]
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_log" IS 'Historial completo de cambios en tablas operativas. Cada INSERT/UPDATE/DELETE queda registrado con old_data y new_data como JSONB, changed_fields como lista, y changed_by para trazabilidad. Solo triggers SECURITY DEFINER escriben aquí.';



CREATE TABLE IF NOT EXISTS "public"."cost_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cost_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."cost_categories" IS 'Categorías de gasto globales: CON (Contratistas), EQA (Equipo Alquilado), EQI (Equipo ICONSA), ICS (Internos), MAT (Materiales), OTR (Otros), SAL (Salarios), SUB (Subcontratos).';



CREATE TABLE IF NOT EXISTS "public"."cost_code_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cost_code_id" "uuid" NOT NULL,
    "cost_category_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cost_code_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."cost_code_categories" IS 'Junction table: qué categorías son válidas para cada fase de cada proyecto. Derivado de Sage Phase Listing. 784 combinaciones.';



CREATE TABLE IF NOT EXISTS "public"."cost_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "phase_code" "text" NOT NULL,
    "phase_description" "text",
    "full_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "extra_id" "uuid"
);


ALTER TABLE "public"."cost_codes" OWNER TO "postgres";


COMMENT ON TABLE "public"."cost_codes" IS 'Fases presupuestarias de Sage/Spectrum por proyecto y extra. full_code se genera automáticamente via trigger: {proyecto}[-{extra}]-{fase}. Ej: 24-404-E1-01-3100.';



COMMENT ON COLUMN "public"."cost_codes"."extra_id" IS 'FK a project_extras. NULL = fase del proyecto base.';



CREATE TABLE IF NOT EXISTS "public"."equipment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "spectrum_code" "text",
    "description" "text" NOT NULL,
    "equipment_type" "text",
    "brand" "text",
    "model" "text",
    "serial_number" "text",
    "year" integer,
    "status" "text" DEFAULT 'Activo'::"text",
    "current_location" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "plate" "text",
    "capacity" "text",
    "type_code" "text",
    "inspection_type" "text",
    "current_project_id" "uuid",
    "notes" "text",
    "weight_class" "text",
    "acquisition_type" "text" DEFAULT 'Propio'::"text",
    "last_inspection_date" "date",
    "next_inspection_due" "date",
    "meter_reading" numeric,
    "insurance_expiry" "date",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_equipment_id" "uuid"
);


ALTER TABLE "public"."equipment" OWNER TO "postgres";


COMMENT ON TABLE "public"."equipment" IS 'Equipos pesados, vehículos, y accesorios unificados. type_code distingue tipo (VHL=vehículo liviano, VHP=pesado, CAB=cabezal, GRU=grúa, etc). spectrum_code = código en Spectrum/Sage. current_location se actualiza automáticamente al entregar.';



COMMENT ON COLUMN "public"."equipment"."parent_equipment_id" IS 'For accessories: references the parent equipment (e.g., boom → crane). NULL for standalone equipment.';



CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "person_id" "uuid",
    "person_name" "text" NOT NULL,
    "person_role" "text" NOT NULL,
    "screen" "text" NOT NULL,
    "category" "text" NOT NULL,
    "priority" "text" DEFAULT 'importante'::"text" NOT NULL,
    "description" "text" NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "status" "text" DEFAULT 'nuevo'::"text" NOT NULL,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "feedback_category_check" CHECK (("category" = ANY (ARRAY['bug'::"text", 'feature'::"text", 'dashboard'::"text", 'mejora'::"text", 'otro'::"text"]))),
    CONSTRAINT "feedback_priority_check" CHECK (("priority" = ANY (ARRAY['critico'::"text", 'importante'::"text", 'nice_to_have'::"text", 'idea'::"text"]))),
    CONSTRAINT "feedback_status_check" CHECK (("status" = ANY (ARRAY['nuevo'::"text", 'revisado'::"text", 'en_progreso'::"text", 'resuelto'::"text", 'descartado'::"text"])))
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "location_type" "text",
    "project_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "contact_name" "text",
    "contact_phone" "text",
    "notes" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "address" "text"
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


COMMENT ON TABLE "public"."locations" IS 'Ubicaciones físicas: proyectos, taller Chilibre, almacén central, proveedores. Origen y destino de movilizaciones.';



CREATE TABLE IF NOT EXISTS "public"."mobilization_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "rate" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mobilization_rates" OWNER TO "postgres";


COMMENT ON TABLE "public"."mobilization_rates" IS 'Tarifas estándar de movilización por tipo de equipo/vehículo. 14 códigos predefinidos. Se usan para pre-rellenar el costo del viaje.';



CREATE TABLE IF NOT EXISTS "public"."notification_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "recipient_id" "uuid",
    "recipient_email" "text",
    "recipient_phone" "text",
    "reference_type" "text",
    "reference_id" "uuid",
    "channel" "text" DEFAULT 'email'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "provider_message_id" "text",
    "error_message" "text",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    CONSTRAINT "valid_channel" CHECK (("channel" = ANY (ARRAY['email'::"text", 'whatsapp'::"text", 'in_app'::"text"]))),
    CONSTRAINT "valid_event_type" CHECK (("event_type" = ANY (ARRAY['solicitud_enviada'::"text", 'solicitud_editada'::"text", 'solicitud_cancelada'::"text", 'solicitud_completada'::"text", 'lineas_programadas'::"text", 'viaje_cancelado'::"text", 'viaje_reprogramado'::"text", 'viaje_asignado_conductor'::"text", 'entrega_confirmada'::"text", 'salida_registrada'::"text", 'incidencia_ruta'::"text", 'sugerencia_fallback'::"text", 'retorno_registrado'::"text"]))),
    CONSTRAINT "valid_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."notification_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."people" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_id" "uuid",
    "code" "text",
    "name" "text" NOT NULL,
    "department" "text",
    "position" "text",
    "phone" "text",
    "email" "text",
    "app_role" "text",
    "status" "text" DEFAULT 'Activo'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "city" "text",
    "supervisor_id" "uuid",
    "cedula" "text",
    "license_type" "text",
    "license_expiry" "date",
    "hire_date" "date",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "notifications_enabled" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."people" OWNER TO "postgres";


COMMENT ON TABLE "public"."people" IS 'Personal de ICONSA y subcontratistas. auth_id vincula con Supabase Auth. app_role determina permisos: pm, logistica, campo, almacen, admin.';



CREATE TABLE IF NOT EXISTS "public"."person_projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "person_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."person_projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."person_projects" IS 'Asignación many-to-many de personas a proyectos. Determina qué proyectos puede ver/crear solicitudes cada PM. role = cargo en ese proyecto (Gerente, Superintendente, Ingeniero).';



CREATE TABLE IF NOT EXISTS "public"."project_extras" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."project_extras" OWNER TO "postgres";


COMMENT ON TABLE "public"."project_extras" IS 'Sub-secciones de proyectos para facturación separada en Spectrum. Ej: E1 Camino de acceso en Costa Norte. No todos los proyectos tienen extras.';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "manager" "text",
    "status" "text" DEFAULT 'Activo'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "location" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "start_date" "date",
    "end_date" "date",
    "notes" "text",
    "billing_code" "text",
    "budget" numeric,
    "client" "text"
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Proyectos de construcción de ICONSA. Cada proyecto tiene un código único (ej: 24-404) que se usa en IDs de solicitudes y códigos de costo.';



CREATE TABLE IF NOT EXISTS "public"."sequences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seq_type" "text" NOT NULL,
    "project_id" "uuid",
    "next_number" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."sequences" OWNER TO "postgres";


COMMENT ON TABLE "public"."sequences" IS 'Secuencias auto-incrementales para generar IDs únicos. seq_type=sm_request por proyecto, seq_type=trip global. Patrón: UPDATE SET next_number+1 RETURNING next_number-1.';



CREATE TABLE IF NOT EXISTS "public"."sm_request_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "line_number" integer NOT NULL,
    "line_type" "text" NOT NULL,
    "equipment_id" "uuid",
    "description" "text" NOT NULL,
    "from_location_id" "uuid",
    "to_location_id" "uuid",
    "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
    "unit_id" "uuid",
    "cost_code_id" "uuid",
    "category" "text",
    "po_reference" "text",
    "notes" "text",
    "status" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "qty_scheduled" numeric(10,2) DEFAULT 0,
    "qty_delivered" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "from_text" "text",
    "to_text" "text",
    "equipment_text" "text",
    "unit_text" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "material_category" "text",
    "cost_category_id" "uuid",
    "updated_by" "uuid",
    "delivered_at" timestamp with time zone,
    CONSTRAINT "sm_request_lines_line_type_check" CHECK (("line_type" = ANY (ARRAY['Equipo'::"text", 'Material'::"text"])))
);


ALTER TABLE "public"."sm_request_lines" OWNER TO "postgres";


COMMENT ON TABLE "public"."sm_request_lines" IS 'Líneas individuales de una solicitud. Cada línea = un equipo o material a mover. Unidad operacional principal: Charris programa LÍNEAS, no solicitudes. Estado propio: Pendiente→Programada→En Tránsito→Entregada. Notas de línea = instrucciones del PM para logística.';



COMMENT ON COLUMN "public"."sm_request_lines"."category" IS 'LEGACY: categoría como texto. Usar cost_category_id para nuevas líneas. Se depreca post-MVP.';



COMMENT ON COLUMN "public"."sm_request_lines"."material_category" IS 'Categoría del material (texto libre MVP, dropdown CSI codes en Fase 2). Solo aplica cuando line_type = Material.';



COMMENT ON COLUMN "public"."sm_request_lines"."cost_category_id" IS 'FK a cost_categories. Reemplaza el campo text "category" para referencia relacional.';



CREATE TABLE IF NOT EXISTS "public"."sm_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "text",
    "project_id" "uuid" NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "date_required" "date" NOT NULL,
    "date_created" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'Borrador'::"text" NOT NULL,
    "priority" "text",
    "approved_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "created_by" "uuid",
    "updated_by" "uuid",
    "initial_priority" "text",
    "date_submitted" timestamp with time zone,
    "date_completed" timestamp with time zone,
    "date_cancelled" timestamp with time zone
);


ALTER TABLE "public"."sm_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."sm_requests" IS 'Solicitudes de movilización (header). Creadas por PM, programadas por logística. ID auto: {proyecto}-SM-{###}. Lifecycle timestamps automáticos: date_submitted, date_completed, date_cancelled. initial_priority = snapshot histórico. priority = viva (pg_cron 6AM).';



COMMENT ON COLUMN "public"."sm_requests"."date_submitted" IS 'Cuando el PM envió la solicitud (status → Enviada). Para medir tiempo de respuesta de logística.';



COMMENT ON COLUMN "public"."sm_requests"."date_completed" IS 'Cuando la solicitud se completó (status → Completada). Para medir tiempo total de ciclo.';



CREATE TABLE IF NOT EXISTS "public"."suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "suggested_value" "text" NOT NULL,
    "suggested_by" "uuid",
    "status" "text" DEFAULT 'pendiente'::"text",
    "reviewed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."suggestions" OWNER TO "postgres";


COMMENT ON TABLE "public"."suggestions" IS 'Mecanismo de fallback universal. Cuando un usuario no encuentra un valor en un dropdown, puede sugerir uno nuevo. Admin revisa y aprueba/rechaza.';



CREATE TABLE IF NOT EXISTS "public"."trip_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_timestamp" timestamp with time zone DEFAULT "now"(),
    "location" "text",
    "registered_by" "uuid",
    "confirmation_code_used" "text",
    "received_by_name" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "received_by_id" "uuid",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."trip_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."trip_events" IS 'Eventos inmutables del ciclo de vida de un viaje: Salida, Llegada, Entrega, Retorno. NO se pueden editar ni borrar (RLS). event_timestamp = automático now(). registered_by = quién registró. Entrega requiere confirmation_code + received_by.';



COMMENT ON COLUMN "public"."trip_events"."received_by_id" IS 'UUID de la persona que recibió la entrega. NULL para eventos que no son Entrega. received_by_name se mantiene como denormalización y fallback para receptores sin cuenta.';



CREATE TABLE IF NOT EXISTS "public"."trip_line_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "request_line_id" "uuid" NOT NULL,
    "quantity_assigned" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "qty_delivered" numeric DEFAULT 0
);


ALTER TABLE "public"."trip_line_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."trip_line_assignments" IS 'Pivote many-to-many entre viajes y líneas de solicitud. quantity_assigned permite entregas parciales (50 de 100 tubos en un viaje, 50 en otro).';



CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "text",
    "scheduled_date" "date" NOT NULL,
    "driver_id" "uuid",
    "vehicle_id" "uuid",
    "trailer_id" "uuid",
    "rate_id" "uuid",
    "cost" numeric(10,2),
    "att_permit" boolean DEFAULT false,
    "escort" boolean DEFAULT false,
    "confirmation_code" "text",
    "notes" "text",
    "status" "text" DEFAULT 'Programado'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "actual_departure" timestamp with time zone,
    "actual_arrival" timestamp with time zone,
    "route_summary" "text",
    "is_external" boolean DEFAULT false,
    "created_by" "uuid",
    "updated_by" "uuid",
    "scheduled_time" time without time zone,
    "date_cancelled" timestamp with time zone,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."trips" OWNER TO "postgres";


COMMENT ON TABLE "public"."trips" IS 'Viajes programados por Charris. ID auto: MOV-{YYYY}-{###}. Un viaje puede llevar líneas de múltiples solicitudes. confirmation_code = 4 dígitos para validar entrega (tipo Uber). scheduled_time = hora de salida programada.';



COMMENT ON COLUMN "public"."trips"."scheduled_time" IS 'Hora programada de salida. Ejemplo: 10:00. Opcional - Charris puede programar por hora si necesita.';



CREATE TABLE IF NOT EXISTS "public"."units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."units" OWNER TO "postgres";


COMMENT ON TABLE "public"."units" IS 'Unidades de medida para cantidades en líneas de solicitud. Ej: UN, M3, TN, GL, M2.';



CREATE TABLE IF NOT EXISTS "public"."user_app_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "person_id" "uuid" NOT NULL,
    "app_code" "text" NOT NULL,
    "role_code" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_app_roles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_app_roles" IS 'RBAC multi-app. Cada persona puede tener roles diferentes en diferentes apps (movilizaciones, compras, almacén, equipos). MVP usa people.app_role como shortcut. Esta tabla es la fundación para cuando se agreguen más apps.';



COMMENT ON COLUMN "public"."user_app_roles"."app_code" IS 'Application identifier: movilizaciones, compras, almacen, equipos, etc.';



COMMENT ON COLUMN "public"."user_app_roles"."role_code" IS 'Role within the app. For movilizaciones: solicitante, coordinador, operador, receptor, visor, admin';



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cost_categories"
    ADD CONSTRAINT "cost_categories_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."cost_categories"
    ADD CONSTRAINT "cost_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cost_code_categories"
    ADD CONSTRAINT "cost_code_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cost_code_categories"
    ADD CONSTRAINT "cost_code_categories_unique" UNIQUE ("cost_code_id", "cost_category_id");



ALTER TABLE ONLY "public"."cost_codes"
    ADD CONSTRAINT "cost_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mobilization_rates"
    ADD CONSTRAINT "mobilization_rates_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."mobilization_rates"
    ADD CONSTRAINT "mobilization_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_auth_id_key" UNIQUE ("auth_id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."person_projects"
    ADD CONSTRAINT "person_projects_person_id_project_id_key" UNIQUE ("person_id", "project_id");



ALTER TABLE ONLY "public"."person_projects"
    ADD CONSTRAINT "person_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_extras"
    ADD CONSTRAINT "project_extras_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_extras"
    ADD CONSTRAINT "project_extras_project_id_code_key" UNIQUE ("project_id", "code");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sequences"
    ADD CONSTRAINT "sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sm_request_lines"
    ADD CONSTRAINT "sm_request_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sm_requests"
    ADD CONSTRAINT "sm_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sm_requests"
    ADD CONSTRAINT "sm_requests_request_id_key" UNIQUE ("request_id");



ALTER TABLE ONLY "public"."suggestions"
    ADD CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_events"
    ADD CONSTRAINT "trip_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_line_assignments"
    ADD CONSTRAINT "trip_line_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_line_assignments"
    ADD CONSTRAINT "trip_line_assignments_trip_line_unique" UNIQUE ("trip_id", "request_line_id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_trip_id_key" UNIQUE ("trip_id");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_app_roles"
    ADD CONSTRAINT "user_app_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_app_roles"
    ADD CONSTRAINT "user_app_roles_unique_person_app_role" UNIQUE ("person_id", "app_code", "role_code");



CREATE INDEX "idx_audit_log_changed_at" ON "public"."audit_log" USING "btree" ("changed_at");



CREATE INDEX "idx_audit_log_changed_by" ON "public"."audit_log" USING "btree" ("changed_by");



CREATE INDEX "idx_audit_log_table_record" ON "public"."audit_log" USING "btree" ("table_name", "record_id");



CREATE INDEX "idx_cost_code_categories_cat" ON "public"."cost_code_categories" USING "btree" ("cost_category_id");



CREATE INDEX "idx_cost_code_categories_code" ON "public"."cost_code_categories" USING "btree" ("cost_code_id");



CREATE INDEX "idx_cost_codes_extra" ON "public"."cost_codes" USING "btree" ("extra_id");



CREATE INDEX "idx_cost_codes_project" ON "public"."cost_codes" USING "btree" ("project_id");



CREATE INDEX "idx_equipment_current_project" ON "public"."equipment" USING "btree" ("current_project_id");



CREATE INDEX "idx_equipment_parent" ON "public"."equipment" USING "btree" ("parent_equipment_id");



CREATE INDEX "idx_locations_project" ON "public"."locations" USING "btree" ("project_id");



CREATE INDEX "idx_notif_log_created" ON "public"."notification_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notif_log_event" ON "public"."notification_log" USING "btree" ("event_type");



CREATE INDEX "idx_notif_log_recipient" ON "public"."notification_log" USING "btree" ("recipient_id");



CREATE INDEX "idx_notif_log_ref" ON "public"."notification_log" USING "btree" ("reference_type", "reference_id");



CREATE INDEX "idx_notif_log_status" ON "public"."notification_log" USING "btree" ("status");



CREATE INDEX "idx_people_supervisor" ON "public"."people" USING "btree" ("supervisor_id");



CREATE INDEX "idx_person_projects_project" ON "public"."person_projects" USING "btree" ("project_id");



CREATE INDEX "idx_project_extras_project" ON "public"."project_extras" USING "btree" ("project_id");



CREATE INDEX "idx_sequences_project" ON "public"."sequences" USING "btree" ("project_id");



CREATE UNIQUE INDEX "idx_sequences_unique" ON "public"."sequences" USING "btree" ("seq_type", COALESCE("project_id", '00000000-0000-0000-0000-000000000000'::"uuid"));



CREATE INDEX "idx_sm_lines_request" ON "public"."sm_request_lines" USING "btree" ("request_id");



CREATE INDEX "idx_sm_lines_status" ON "public"."sm_request_lines" USING "btree" ("status");



CREATE INDEX "idx_sm_request_lines_cost_category" ON "public"."sm_request_lines" USING "btree" ("cost_category_id");



CREATE INDEX "idx_sm_request_lines_cost_code" ON "public"."sm_request_lines" USING "btree" ("cost_code_id");



CREATE INDEX "idx_sm_request_lines_equipment" ON "public"."sm_request_lines" USING "btree" ("equipment_id");



CREATE INDEX "idx_sm_request_lines_from_loc" ON "public"."sm_request_lines" USING "btree" ("from_location_id");



CREATE INDEX "idx_sm_request_lines_to_loc" ON "public"."sm_request_lines" USING "btree" ("to_location_id");



CREATE INDEX "idx_sm_request_lines_unit" ON "public"."sm_request_lines" USING "btree" ("unit_id");



CREATE INDEX "idx_sm_requests_approved_by" ON "public"."sm_requests" USING "btree" ("approved_by");



CREATE INDEX "idx_sm_requests_created_by" ON "public"."sm_requests" USING "btree" ("created_by");



CREATE INDEX "idx_sm_requests_project" ON "public"."sm_requests" USING "btree" ("project_id");



CREATE INDEX "idx_sm_requests_requester" ON "public"."sm_requests" USING "btree" ("requester_id");



CREATE INDEX "idx_sm_requests_status" ON "public"."sm_requests" USING "btree" ("status");



CREATE INDEX "idx_sm_requests_updated_by" ON "public"."sm_requests" USING "btree" ("updated_by");



CREATE INDEX "idx_suggestions_reviewed_by" ON "public"."suggestions" USING "btree" ("reviewed_by");



CREATE INDEX "idx_suggestions_suggested_by" ON "public"."suggestions" USING "btree" ("suggested_by");



CREATE INDEX "idx_trip_assigns_line" ON "public"."trip_line_assignments" USING "btree" ("request_line_id");



CREATE INDEX "idx_trip_assigns_trip" ON "public"."trip_line_assignments" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_events_received_by" ON "public"."trip_events" USING "btree" ("received_by_id");



CREATE INDEX "idx_trip_events_registered_by" ON "public"."trip_events" USING "btree" ("registered_by");



CREATE INDEX "idx_trip_events_trip" ON "public"."trip_events" USING "btree" ("trip_id");



CREATE INDEX "idx_trips_created_by" ON "public"."trips" USING "btree" ("created_by");



CREATE INDEX "idx_trips_date" ON "public"."trips" USING "btree" ("scheduled_date");



CREATE INDEX "idx_trips_driver" ON "public"."trips" USING "btree" ("driver_id");



CREATE INDEX "idx_trips_rate" ON "public"."trips" USING "btree" ("rate_id");



CREATE INDEX "idx_trips_status" ON "public"."trips" USING "btree" ("status");



CREATE INDEX "idx_trips_trailer" ON "public"."trips" USING "btree" ("trailer_id");



CREATE INDEX "idx_trips_vehicle" ON "public"."trips" USING "btree" ("vehicle_id");



CREATE INDEX "idx_user_app_roles_app" ON "public"."user_app_roles" USING "btree" ("app_code", "role_code") WHERE ("is_active" = true);



CREATE INDEX "idx_user_app_roles_granted_by" ON "public"."user_app_roles" USING "btree" ("granted_by");



CREATE OR REPLACE TRIGGER "audit_sm_request_lines" AFTER INSERT OR DELETE OR UPDATE ON "public"."sm_request_lines" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger"();



CREATE OR REPLACE TRIGGER "audit_sm_requests" AFTER INSERT OR DELETE OR UPDATE ON "public"."sm_requests" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger"();



CREATE OR REPLACE TRIGGER "audit_trip_line_assignments" AFTER INSERT OR DELETE OR UPDATE ON "public"."trip_line_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger"();



CREATE OR REPLACE TRIGGER "audit_trips" AFTER INSERT OR DELETE OR UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger"();



CREATE OR REPLACE TRIGGER "cost_codes_updated_at" BEFORE UPDATE ON "public"."cost_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "equipment_updated_at" BEFORE UPDATE ON "public"."equipment" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "feedback_updated_at" BEFORE UPDATE ON "public"."feedback" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "locations_updated_at" BEFORE UPDATE ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "people_updated_at" BEFORE UPDATE ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "person_projects_updated_at" BEFORE UPDATE ON "public"."person_projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "project_extras_updated_at" BEFORE UPDATE ON "public"."project_extras" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "rates_updated_at" BEFORE UPDATE ON "public"."mobilization_rates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "sm_request_lines_updated_at" BEFORE UPDATE ON "public"."sm_request_lines" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "sm_requests_updated_at" BEFORE UPDATE ON "public"."sm_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cascade_status" AFTER UPDATE OF "status" ON "public"."sm_request_lines" FOR EACH ROW EXECUTE FUNCTION "public"."cascade_request_status"();



CREATE OR REPLACE TRIGGER "trg_generate_confirmation_code" BEFORE INSERT ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."generate_confirmation_code"();



CREATE OR REPLACE TRIGGER "trg_generate_full_code" BEFORE INSERT OR UPDATE OF "phase_code", "project_id" ON "public"."cost_codes" FOR EACH ROW EXECUTE FUNCTION "public"."generate_full_code"();



CREATE OR REPLACE TRIGGER "trg_initial_priority" BEFORE INSERT ON "public"."sm_requests" FOR EACH ROW EXECUTE FUNCTION "public"."capture_initial_priority"();



CREATE OR REPLACE TRIGGER "trg_lifecycle_timestamps" BEFORE UPDATE ON "public"."sm_requests" FOR EACH ROW EXECUTE FUNCTION "public"."capture_lifecycle_timestamps"();



CREATE OR REPLACE TRIGGER "trg_priority" BEFORE INSERT OR UPDATE OF "date_required" ON "public"."sm_requests" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_priority"();



CREATE OR REPLACE TRIGGER "trg_request_id" BEFORE INSERT ON "public"."sm_requests" FOR EACH ROW WHEN (("new"."request_id" IS NULL)) EXECUTE FUNCTION "public"."generate_request_id"();



CREATE OR REPLACE TRIGGER "trg_trip_cancelled" BEFORE UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."capture_trip_cancelled"();



CREATE OR REPLACE TRIGGER "trg_trip_id" BEFORE INSERT ON "public"."trips" FOR EACH ROW WHEN (("new"."trip_id" IS NULL)) EXECUTE FUNCTION "public"."generate_trip_id"();



CREATE OR REPLACE TRIGGER "trg_update_equipment_location" AFTER INSERT ON "public"."trip_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_equipment_location_on_delivery"();



CREATE OR REPLACE TRIGGER "trip_line_assignments_updated_at" BEFORE UPDATE ON "public"."trip_line_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trips_updated_at" BEFORE UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "units_updated_at" BEFORE UPDATE ON "public"."units" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."cost_code_categories"
    ADD CONSTRAINT "cost_code_categories_cost_category_id_fkey" FOREIGN KEY ("cost_category_id") REFERENCES "public"."cost_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cost_code_categories"
    ADD CONSTRAINT "cost_code_categories_cost_code_id_fkey" FOREIGN KEY ("cost_code_id") REFERENCES "public"."cost_codes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cost_codes"
    ADD CONSTRAINT "cost_codes_extra_id_fkey" FOREIGN KEY ("extra_id") REFERENCES "public"."project_extras"("id");



ALTER TABLE ONLY "public"."cost_codes"
    ADD CONSTRAINT "cost_codes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_current_project_id_fkey" FOREIGN KEY ("current_project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_parent_equipment_id_fkey" FOREIGN KEY ("parent_equipment_id") REFERENCES "public"."equipment"("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."person_projects"
    ADD CONSTRAINT "person_projects_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."person_projects"
    ADD CONSTRAINT "person_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_extras"
    ADD CONSTRAINT "project_extras_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sequences"
    ADD CONSTRAINT "sequences_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."sm_request_lines"
    ADD CONSTRAINT "sm_request_lines_cost_category_id_fkey" FOREIGN KEY ("cost_category_id") REFERENCES "public"."cost_categories"("id");



ALTER TABLE ONLY "public"."sm_request_lines"
    ADD CONSTRAINT "sm_request_lines_cost_code_id_fkey" FOREIGN KEY ("cost_code_id") REFERENCES "public"."cost_codes"("id");



ALTER TABLE ONLY "public"."sm_request_lines"
    ADD CONSTRAINT "sm_request_lines_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id");



ALTER TABLE ONLY "public"."sm_request_lines"
    ADD CONSTRAINT "sm_request_lines_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."sm_request_lines"
    ADD CONSTRAINT "sm_request_lines_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."sm_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sm_request_lines"
    ADD CONSTRAINT "sm_request_lines_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."sm_request_lines"
    ADD CONSTRAINT "sm_request_lines_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id");



ALTER TABLE ONLY "public"."sm_request_lines"
    ADD CONSTRAINT "sm_request_lines_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."sm_requests"
    ADD CONSTRAINT "sm_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."sm_requests"
    ADD CONSTRAINT "sm_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."sm_requests"
    ADD CONSTRAINT "sm_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."sm_requests"
    ADD CONSTRAINT "sm_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."sm_requests"
    ADD CONSTRAINT "sm_requests_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."suggestions"
    ADD CONSTRAINT "suggestions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."suggestions"
    ADD CONSTRAINT "suggestions_suggested_by_fkey" FOREIGN KEY ("suggested_by") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."trip_events"
    ADD CONSTRAINT "trip_events_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."trip_events"
    ADD CONSTRAINT "trip_events_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."trip_events"
    ADD CONSTRAINT "trip_events_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id");



ALTER TABLE ONLY "public"."trip_line_assignments"
    ADD CONSTRAINT "trip_line_assignments_request_line_id_fkey" FOREIGN KEY ("request_line_id") REFERENCES "public"."sm_request_lines"("id");



ALTER TABLE ONLY "public"."trip_line_assignments"
    ADD CONSTRAINT "trip_line_assignments_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "public"."mobilization_rates"("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_trailer_id_fkey" FOREIGN KEY ("trailer_id") REFERENCES "public"."equipment"("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."equipment"("id");



ALTER TABLE ONLY "public"."user_app_roles"
    ADD CONSTRAINT "user_app_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."people"("id");



ALTER TABLE ONLY "public"."user_app_roles"
    ADD CONSTRAINT "user_app_roles_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can view notification logs" ON "public"."notification_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."people"
  WHERE (("people"."auth_id" = "auth"."uid"()) AND ("people"."app_role" = 'admin'::"text")))));



CREATE POLICY "admin_delete" ON "public"."cost_categories" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_delete" ON "public"."cost_code_categories" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_delete" ON "public"."cost_codes" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_delete" ON "public"."equipment" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_delete" ON "public"."locations" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_delete" ON "public"."mobilization_rates" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_delete" ON "public"."people" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_delete" ON "public"."person_projects" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_delete" ON "public"."project_extras" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_delete" ON "public"."projects" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_delete" ON "public"."sm_request_lines" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = ANY (ARRAY['pm'::"text", 'admin'::"text"])));



CREATE POLICY "admin_delete" ON "public"."sm_requests" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_delete" ON "public"."suggestions" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_delete" ON "public"."trips" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_manage" ON "public"."suggestions" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_update" ON "public"."cost_categories" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_update" ON "public"."cost_codes" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_update" ON "public"."equipment" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_update" ON "public"."feedback" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_update" ON "public"."locations" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_update" ON "public"."mobilization_rates" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_update" ON "public"."people" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_update" ON "public"."person_projects" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_update" ON "public"."project_extras" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_update" ON "public"."projects" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_update" ON "public"."units" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_write" ON "public"."cost_categories" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_write" ON "public"."cost_code_categories" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_write" ON "public"."cost_codes" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_write" ON "public"."equipment" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_write" ON "public"."locations" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_write" ON "public"."mobilization_rates" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_write" ON "public"."people" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_write" ON "public"."person_projects" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_write" ON "public"."project_extras" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_write" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_write" ON "public"."sequences" TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text")) WITH CHECK (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_write" ON "public"."units" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = 'admin'::"text"));



CREATE POLICY "admin_write" ON "public"."user_app_roles" TO "authenticated" USING (("public"."get_my_app_role"() = 'admin'::"text")) WITH CHECK (("public"."get_my_app_role"() = 'admin'::"text"));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_insert" ON "public"."feedback" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."suggestions" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."cost_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cost_code_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cost_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "logistica_admin_delete" ON "public"."trip_line_assignments" FOR DELETE TO "authenticated" USING (("public"."get_my_app_role"() = ANY (ARRAY['logistica'::"text", 'admin'::"text"])));



CREATE POLICY "logistica_admin_insert" ON "public"."trip_line_assignments" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = ANY (ARRAY['logistica'::"text", 'admin'::"text"])));



CREATE POLICY "logistica_admin_insert" ON "public"."trips" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = ANY (ARRAY['logistica'::"text", 'admin'::"text"])));



CREATE POLICY "logistica_admin_update" ON "public"."trip_line_assignments" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = ANY (ARRAY['logistica'::"text", 'admin'::"text"])));



CREATE POLICY "logistica_admin_update" ON "public"."trips" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = ANY (ARRAY['logistica'::"text", 'admin'::"text"])));



ALTER TABLE "public"."mobilization_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "operational_insert" ON "public"."trip_events" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = ANY (ARRAY['logistica'::"text", 'campo'::"text", 'almacen'::"text", 'admin'::"text"])));



CREATE POLICY "operational_update" ON "public"."sm_request_lines" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = ANY (ARRAY['pm'::"text", 'admin'::"text", 'logistica'::"text", 'campo'::"text", 'almacen'::"text"])));



ALTER TABLE "public"."people" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."person_projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pm_admin_insert" ON "public"."sm_request_lines" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = ANY (ARRAY['pm'::"text", 'admin'::"text"])));



CREATE POLICY "pm_admin_insert" ON "public"."sm_requests" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_app_role"() = ANY (ARRAY['pm'::"text", 'admin'::"text"])));



CREATE POLICY "pm_admin_update" ON "public"."sm_requests" FOR UPDATE TO "authenticated" USING (("public"."get_my_app_role"() = ANY (ARRAY['pm'::"text", 'admin'::"text"])));



ALTER TABLE "public"."project_extras" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read_all" ON "public"."audit_log" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."cost_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."cost_code_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."cost_codes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."equipment" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."locations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."mobilization_rates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."people" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."person_projects" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."project_extras" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."projects" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."sequences" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."sm_request_lines" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."sm_requests" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."suggestions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."trip_events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."trip_line_assignments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."trips" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."units" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all" ON "public"."user_app_roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_own_or_admin" ON "public"."feedback" FOR SELECT TO "authenticated" USING ((("person_id" = ( SELECT "people"."id"
   FROM "public"."people"
  WHERE ("people"."auth_id" = "auth"."uid"()))) OR ("public"."get_my_app_role"() = 'admin'::"text")));



ALTER TABLE "public"."sequences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sm_request_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sm_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suggestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_line_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_app_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";













































































































































































































































































































































GRANT ALL ON FUNCTION "public"."audit_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_priority"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_priority"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_priority"() TO "service_role";



GRANT ALL ON FUNCTION "public"."capture_initial_priority"() TO "anon";
GRANT ALL ON FUNCTION "public"."capture_initial_priority"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."capture_initial_priority"() TO "service_role";



GRANT ALL ON FUNCTION "public"."capture_lifecycle_timestamps"() TO "anon";
GRANT ALL ON FUNCTION "public"."capture_lifecycle_timestamps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."capture_lifecycle_timestamps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."capture_trip_cancelled"() TO "anon";
GRANT ALL ON FUNCTION "public"."capture_trip_cancelled"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."capture_trip_cancelled"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cascade_request_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."cascade_request_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cascade_request_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_confirmation_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_confirmation_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_confirmation_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_full_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_full_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_full_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_request_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_request_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_request_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_trip_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_trip_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_trip_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_app_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_app_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_app_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_equipment_location_on_delivery"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_equipment_location_on_delivery"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_equipment_location_on_delivery"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



























GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."cost_categories" TO "anon";
GRANT ALL ON TABLE "public"."cost_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_categories" TO "service_role";



GRANT ALL ON TABLE "public"."cost_code_categories" TO "anon";
GRANT ALL ON TABLE "public"."cost_code_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_code_categories" TO "service_role";



GRANT ALL ON TABLE "public"."cost_codes" TO "anon";
GRANT ALL ON TABLE "public"."cost_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_codes" TO "service_role";



GRANT ALL ON TABLE "public"."equipment" TO "anon";
GRANT ALL ON TABLE "public"."equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."mobilization_rates" TO "anon";
GRANT ALL ON TABLE "public"."mobilization_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."mobilization_rates" TO "service_role";



GRANT ALL ON TABLE "public"."notification_log" TO "anon";
GRANT ALL ON TABLE "public"."notification_log" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_log" TO "service_role";



GRANT ALL ON TABLE "public"."people" TO "anon";
GRANT ALL ON TABLE "public"."people" TO "authenticated";
GRANT ALL ON TABLE "public"."people" TO "service_role";



GRANT ALL ON TABLE "public"."person_projects" TO "anon";
GRANT ALL ON TABLE "public"."person_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."person_projects" TO "service_role";



GRANT ALL ON TABLE "public"."project_extras" TO "anon";
GRANT ALL ON TABLE "public"."project_extras" TO "authenticated";
GRANT ALL ON TABLE "public"."project_extras" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."sequences" TO "anon";
GRANT ALL ON TABLE "public"."sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."sequences" TO "service_role";



GRANT ALL ON TABLE "public"."sm_request_lines" TO "anon";
GRANT ALL ON TABLE "public"."sm_request_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."sm_request_lines" TO "service_role";



GRANT ALL ON TABLE "public"."sm_requests" TO "anon";
GRANT ALL ON TABLE "public"."sm_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."sm_requests" TO "service_role";



GRANT ALL ON TABLE "public"."suggestions" TO "anon";
GRANT ALL ON TABLE "public"."suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."trip_events" TO "anon";
GRANT ALL ON TABLE "public"."trip_events" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_events" TO "service_role";



GRANT ALL ON TABLE "public"."trip_line_assignments" TO "anon";
GRANT ALL ON TABLE "public"."trip_line_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_line_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."trips" TO "anon";
GRANT ALL ON TABLE "public"."trips" TO "authenticated";
GRANT ALL ON TABLE "public"."trips" TO "service_role";



GRANT ALL ON TABLE "public"."units" TO "anon";
GRANT ALL ON TABLE "public"."units" TO "authenticated";
GRANT ALL ON TABLE "public"."units" TO "service_role";



GRANT ALL ON TABLE "public"."user_app_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_app_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_app_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































