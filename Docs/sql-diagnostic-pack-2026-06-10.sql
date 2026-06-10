-- ============================================================================
-- SQL DIAGNOSTIC PACK — MovimientOS — 2026-06-10
-- ============================================================================
-- Misión: bd-funciones-y-sql-pack (discovery 2026-06-10).
-- 100% READ-ONLY. Ninguna query muta datos. Correr via Supabase SQL Editor.
--
-- ENTORNOS:
--   prod    = bzeoszympkkicwlfdtcn  (main branch, operando)
--   staging = vonwkciosksqspyljzfy  (jaime/dev target, Cambios 2-6.5)
--
-- Cada query lleva etiqueta [AMBOS] / [PROD] / [STAGING] y un comentario de
-- QUÉ PREGUNTA responde. Guardar outputs como evidencia (CSV o pegar en doc).
--
-- HALLAZGO CLAVE QUE MOTIVA ESTE PACK: el ledger de migraciones de prod se
-- detiene para movilizaciones el 2026-04-28 (después solo humanos_v2_*), pero
-- prod recibió cambios via SQL Editor que NO registran migración (ej. Events
-- V2 tables de marzo, drop de requires_code, constraint notification_log).
-- => schema_migrations NO describe el schema real de prod. Solo pg_catalog.
--
-- ============================================================================
-- PARTE A (referencia) — RECONSTRUCCIÓN DE FUNCIONES/TRIGGERS
-- ============================================================================
-- Fuentes cruzadas: supabase/migrations/00000000000000_baseline.sql (snapshot
-- PROD 2026-03-16, 14 funciones), supabase/full_schema.sql (2026-03-18, 15
-- funciones — única delta: enforce_qty_integrity), bloques [bd] de
-- Docs/CHANGELOG.md, ledger staging via MCP (45 migraciones), ledger prod via
-- MCP (movilizaciones hasta 2026-04-28), advisors staging 2026-06-10 (19
-- funciones SECURITY DEFINER vivas enumeradas), specs Cambio 5/6/6.5.
--
-- Leyenda confianza:
--   CONFIABLE        = cuerpo completo conocido (snapshot o CHANGELOG)
--   PARCIAL          = existencia y propósito conocidos, cuerpo NO está en repo
--   NO-VERIFICABLE   = requiere pg_get_functiondef vivo (queries Q1.x abajo)
--
-- | # | Función | Versión vigente probable (staging) | Fuente | Confianza | Prod |
-- |---|---------|-------------------------------------|--------|-----------|------|
-- | 1 | audit_trigger() | snapshot 03-18 (SECDEF, sp=public) | full_schema.sql:83 | CONFIABLE cuerpo; el attach a 19 tablas extra (2026-05-13) NO está en ledger staging ni prod → env desconocido | existe (baseline) |
-- | 2 | calculate_priority() | snapshot 03-18 | full_schema.sql:137 | CONFIABLE | existe |
-- | 3 | capture_initial_priority() | snapshot 03-18 | full_schema.sql:164 | CONFIABLE | existe |
-- | 4 | capture_lifecycle_timestamps() | MODIFICADA post-snapshot por fix_lifecycle_timestamps_add_insert_trigger (2026-03-24, AMBOS envs) — cuerpo nuevo NO está en repo | ledger ambos | NO-VERIFICABLE | existe (versión fix) |
-- | 5 | capture_trip_cancelled() | snapshot 03-18 | full_schema.sql:214 | CONFIABLE | existe |
-- | 6 | cascade_request_status() | v4 Cambio 5 (drop_old_columns_simplify_cascade 2026-04-27): in_progress=('Programada','En Transito'), sin 'Pickup Aprobado'. Cuerpo exacto NO en repo. Historia: v1 snapshot → v2 +search_path (Block 1.B) → v3 +'Pickup Aprobado' (Cambio 3) → v4 | ledger staging + spec C5 | NO-VERIFICABLE staging; prod = v1 snapshot CONFIABLE (full_schema.sql:232, OJO: sin SET search_path) | existe (v1) |
-- | 7 | enforce_qty_integrity() | snapshot 03-18 + ALTER SET search_path (Block 1.B staging) | full_schema.sql:278 | CONFIABLE | existe (migr 20260317041400) |
-- | 8 | generate_confirmation_code() | snapshot 03-18 | full_schema.sql:308 | CONFIABLE | existe |
-- | 9 | generate_full_code() | snapshot 03-18 (dashes + extras) | full_schema.sql:324 | CONFIABLE | existe |
-- |10 | generate_request_id() | snapshot 03-18 (SECDEF, off-by-one fix) | full_schema.sql:346 | CONFIABLE | existe |
-- |11 | generate_trip_id() | snapshot 03-18 (SECDEF) | full_schema.sql:378 | CONFIABLE | existe |
-- |12 | get_my_app_role() | snapshot 03-18 (STABLE SECDEF) — TODA la matriz RLS depende de ella | full_schema.sql:408 | CONFIABLE | existe |
-- |13 | rls_auto_enable() | snapshot 03-18 (EVENT TRIGGER) | full_schema.sql:419 | CONFIABLE | existe |
-- |14 | update_equipment_location_on_delivery() | snapshot 03-18 + ALTER search_path (Block 1.B) | full_schema.sql:451 | CONFIABLE | existe |
-- |15 | update_updated_at() | snapshot 03-18 | full_schema.sql:495 | CONFIABLE | existe |
-- |16 | generate_internal_asset_tag() | creada 2026-03-17; staging tiene change_autotag_to_ic_format (20260317174911) que PROD NO TIENE → drift de formato probable | ledger ambos | PARCIAL / NO-VERIFICABLE | existe (formato viejo?) |
-- |17 | log_equipment_status_change() | creada expansión equipment 2026-03-17 | ledger ambos | PARCIAL / NO-VERIFICABLE | existe |
-- |18 | complete_pickup_trip() | creada 2026-03-24 staging, DROPPED por cambio3_pickup_redesign (2026-04-27). Advisors staging 2026-06-10 NO la listan → drop confirmado staging. Prod nunca la tuvo (no está en su ledger) | ledger staging + advisors | CONFIABLE (ausente) | NO existe |
-- |19 | update_equipment_location_on_custody_transfer() | creada 20260408165443 staging; función SIN trigger activo (AD-2) | ledger staging + advisors (viva) | PARCIAL / NO-VERIFICABLE cuerpo | NO existe |
-- |20 | enforce_line_add_delete_only_in_borrador() | Block 2.A 2026-04-14, solo staging; cuerpo NO documentado | CHANGELOG (descripción) | NO-VERIFICABLE | NO existe |
-- |21 | enforce_trip_immutable_post_departure() | Block 2.B 2026-04-14, solo staging; cuerpo NO documentado | CHANGELOG (descripción) | NO-VERIFICABLE | NO existe |
-- |22 | recalc_qty_for_line(uuid) | amend 6.5 (20260501015941): 5 puntos, SIN rama 'Programada', SECDEF sp=public. Cuerpo COMPLETO en CHANGELOG 2026-04-30 | CHANGELOG + verificación post-aplicación 4/4 | CONFIABLE | NO existe |
-- |23 | generate_pickup_id() | Cambio 5 (20260427234458), SECDEF | advisors + spec C5 | PARCIAL / NO-VERIFICABLE cuerpo | NO existe |
-- |24 | generate_external_id() | Cambio 5 (20260427234523), SECDEF | advisors + spec C5 | PARCIAL / NO-VERIFICABLE | NO existe |
-- |25 | auto_cancel_empty_pickup_order() | Cambio 5, SECDEF | advisors + spec C5 | PARCIAL / NO-VERIFICABLE | NO existe |
-- |26 | auto_cancel_empty_external_order() | Cambio 5, SECDEF | advisors + spec C5 | PARCIAL / NO-VERIFICABLE | NO existe |
-- |27 | trg_recalc_from_assignment_change() | Cambio 5 (20260427234613), SECDEF, wrapper que invoca recalc desde trip_line_assignments | advisors + audit-A | PARCIAL / NO-VERIFICABLE | NO existe |
-- |28 | trg_recalc_from_trip_status_change() | Cambio 5, SECDEF | advisors + spec C6 | PARCIAL / NO-VERIFICABLE | NO existe |
-- |29 | trg_recalc_from_pickup_order_status_change() | Cambio 5, SECDEF | advisors + CHANGELOG RLS | PARCIAL / NO-VERIFICABLE | NO existe |
-- |30 | trg_recalc_from_external_order_status_change() | Cambio 5, SECDEF | advisors + CHANGELOG RLS | PARCIAL / NO-VERIFICABLE | NO existe |
-- |31 | enforce_cancellation_reason_trips() | Cambio 6 (20260429204609), cuerpo COMPLETO en CHANGELOG | CHANGELOG 2026-04-29 | CONFIABLE | NO existe |
-- |32 | enforce_cancellation_reason_pickup_orders() | Cambio 6, cuerpo completo | CHANGELOG | CONFIABLE | NO existe |
-- |33 | enforce_cancellation_reason_external_orders() | Cambio 6, cuerpo completo | CHANGELOG | CONFIABLE | NO existe |
-- |34 | enforce_one_active_delivery_per_trip_line() | Cambio 6, cuerpo completo | CHANGELOG | CONFIABLE | NO existe |
-- |35 | enforce_quantity_immutable_with_active_assignments() | v2 Cambio 6.5 BD-7 (3 condiciones de bloqueo), cuerpo COMPLETO. v1 Cambio 6 fue REPLACED | CHANGELOG 2026-04-30 | CONFIABLE | NO existe |
-- |36 | sync_assignment_on_delivery_event() | Cambio 6.5 BD-5, cuerpo completo, INVOKER sp=public | CHANGELOG | CONFIABLE | NO existe |
-- |37 | sync_assignment_on_delivery_revert() | Cambio 6.5 BD-6, cuerpo completo | CHANGELOG | CONFIABLE | NO existe |
-- |38 | enforce_revert_only_on_active_trip() | Cambio 6.5 BD-8, cuerpo completo | CHANGELOG | CONFIABLE | NO existe |
-- |39 | enforce_notes_on_with_observations() | Cambio 6.5 BD-10, cuerpo completo | CHANGELOG | CONFIABLE | NO existe |
--
-- NOTAS CRÍTICAS DE LA RECONSTRUCCIÓN:
--  (a) Las funciones "PARCIAL" (16-17, 19-21, 23-30) tienen cuerpo que vive
--      SOLO en la BD — el repo no versiona sus migraciones. Q1.2 las extrae.
--  (b) CREATE OR REPLACE pisa proconfig: si Cambio 3/5 re-crearon
--      cascade_request_status SIN repetir SET search_path, el hardening del
--      Block 1.B se perdió silenciosamente. Q1.1 lo verifica (col proconfig).
--  (c) En PROD el estado probable es "marzo 2026 + parches SQL Editor":
--      17 funciones (1-17), SIN recalc, SIN triggers Cambio 5/6/6.5, SIN
--      qty_dispatched/qty_rejected, rate_id nullable.
--  (d) Doc-vs-BD: CLAUDE.md dice `rate.amount`; la columna real del snapshot
--      es `mobilization_rates.rate`. Q5.4 confirma en vivo.
--
-- ============================================================================
-- PARTE B — QUERIES
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- S0. META / LEDGER
-- ────────────────────────────────────────────────────────────────────────────

-- [Q0.1] [AMBOS] ¿Qué dice el ledger VIVO de migraciones? (comparar prod vs
-- staging lado a lado; recordar: en prod el ledger NO refleja los cambios
-- aplicados via SQL Editor — esta query establece la línea base del cisma)
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;

-- [Q0.2] [AMBOS] ¿Qué schemas existen realmente y quién es dueño? Responde:
-- ¿existe todavía un schema "backup" en prod (migración 040 dice que se
-- dropeó)? ¿cuántos schemas medallion/humanos hay conviviendo con public?
SELECT n.nspname AS schema,
       pg_get_userbyid(n.nspowner) AS owner
FROM pg_namespace n
WHERE n.nspname NOT LIKE 'pg\_%' AND n.nspname <> 'information_schema'
ORDER BY 1;

-- [Q0.3] [AMBOS] ¿Qué schemas están expuestos en PostgREST (API REST)?
-- El config de Supabase normalmente vive como GUC del rol authenticator.
-- Si rolconfig sale NULL, verificar en Dashboard → Settings → API →
-- "Exposed schemas" y documentar a mano.
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname IN ('authenticator', 'anon', 'authenticated', 'service_role')
ORDER BY 1;

-- [Q0.4] [AMBOS] ¿Sobre qué schemas tienen USAGE los roles del API? Si
-- anon/authenticated tienen USAGE sobre schemas humanos/core/raw en prod,
-- la superficie expuesta es mayor que public. (Complementa Q0.3: exposición
-- efectiva = exposed schemas ∩ grants.)
SELECT n.nspname AS schema,
       has_schema_privilege('anon', n.oid, 'USAGE')          AS anon_usage,
       has_schema_privilege('authenticated', n.oid, 'USAGE') AS authenticated_usage,
       has_schema_privilege('service_role', n.oid, 'USAGE')  AS service_role_usage
FROM pg_namespace n
WHERE n.nspname NOT LIKE 'pg\_%' AND n.nspname <> 'information_schema'
ORDER BY 1;


-- ────────────────────────────────────────────────────────────────────────────
-- S1. FUNCIONES — inventario, cuerpos, drift vs reconstrucción
-- ────────────────────────────────────────────────────────────────────────────

-- [Q1.1] [AMBOS] Inventario completo de funciones en public: firma, SECURITY
-- DEFINER o no, search_path fijado (proconfig), owner y ACL. Responde:
-- (a) ¿cuántas funciones hay realmente en cada env? (esperado: ~39 staging,
--     ~17 prod según reconstrucción);
-- (b) ¿qué funciones PERDIERON el SET search_path al ser re-creadas? (nota b);
-- (c) ¿las migraciones humanos_v2 044/077 revocaron EXECUTE sobre funciones
--     de public en prod? (proacl — si get_my_app_role pierde EXECUTE para
--     authenticated, TODA la matriz RLS de movilizaciones se rompe).
SELECT p.proname AS funcion,
       pg_get_function_identity_arguments(p.oid) AS argumentos,
       p.prosecdef AS security_definer,
       p.proconfig AS config_search_path,
       pg_get_userbyid(p.proowner) AS owner,
       p.proacl::text AS acl,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY 1;

-- [Q1.2] [AMBOS] CUERPO COMPLETO de cada función de public (pg_get_functiondef).
-- ESTE ES EL OUTPUT MÁS IMPORTANTE DEL PACK: cierra todos los NO-VERIFICABLE
-- de la Parte A. Guardar el output completo de ambos envs como evidencia
-- (es la única forma de versionar lo que el repo nunca versionó).
SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS firma,
       pg_get_functiondef(p.oid) AS definicion
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- [Q1.3] [AMBOS] FINGERPRINTS de drift — verificación puntual de la
-- reconstrucción Parte A sin leer 39 cuerpos a mano. Cada fila responde una
-- pregunta binaria con el resultado esperado anotado.
WITH defs AS (
  SELECT p.proname AS fn, pg_get_functiondef(p.oid) AS def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind = 'f'
)
SELECT 'recalc_qty_for_line existe' AS chequeo,
       EXISTS(SELECT 1 FROM defs WHERE fn='recalc_qty_for_line')::text AS resultado,
       'staging: true · prod: false (pre-merge)' AS esperado
UNION ALL
SELECT 'recalc SIN rama Programada (amend 6.5 vigente)',
       COALESCE((SELECT (def NOT LIKE '%v_new_status := ''Programada''%')::text
                 FROM defs WHERE fn='recalc_qty_for_line'), 'n/a — no existe'),
       'staging: true = migración 20260501015941 vigente; false = quedó BD-4'
UNION ALL
SELECT 'recalc descuenta qty_rejected',
       COALESCE((SELECT (def LIKE '%qty_rejected%')::text
                 FROM defs WHERE fn='recalc_qty_for_line'), 'n/a — no existe'),
       'staging: true (Cambio 6.5 BD-1/BD-4)'
UNION ALL
SELECT 'cascade_request_status menciona Pickup Aprobado (versión Cambio 3 STALE)',
       COALESCE((SELECT (def LIKE '%Pickup Aprobado%')::text
                 FROM defs WHERE fn='cascade_request_status'), 'n/a'),
       'AMBOS: false esperado (staging=v4 Cambio 5; prod=v1 marzo). true = zombie Cambio 3'
UNION ALL
SELECT 'enforce_quantity_immutable es v6.5 (3 condiciones)',
       COALESCE((SELECT (def LIKE '%ya despachada en viajes activos%')::text
                 FROM defs WHERE fn='enforce_quantity_immutable_with_active_assignments'), 'n/a — no existe'),
       'staging: true. false con LIKE ''%Cancele las asignaciones primero%'' = quedó v Cambio 6'
UNION ALL
SELECT 'complete_pickup_trip eliminada',
       (NOT EXISTS(SELECT 1 FROM defs WHERE fn='complete_pickup_trip'))::text,
       'AMBOS: true (staging la dropeó en Cambio 3; prod nunca la tuvo)'
UNION ALL
SELECT 'generate_internal_asset_tag usa formato IC-',
       COALESCE((SELECT (def LIKE '%IC-%')::text
                 FROM defs WHERE fn='generate_internal_asset_tag'), 'n/a'),
       'staging: true (migr change_autotag_to_ic_format). prod: PROBABLE false — esa migración NO está en ledger prod'
UNION ALL
SELECT 'sync_assignment_on_delivery_event existe (Cambio 6.5 BD-5)',
       EXISTS(SELECT 1 FROM defs WHERE fn='sync_assignment_on_delivery_event')::text,
       'staging: true · prod: false'
UNION ALL
SELECT 'enforce_line_add_delete_only_in_borrador existe (Block 2.A)',
       EXISTS(SELECT 1 FROM defs WHERE fn='enforce_line_add_delete_only_in_borrador')::text,
       'staging: true · prod: false (audit B.1 se aplicó solo a staging)';

-- [Q1.4] [AMBOS] Event triggers a nivel cluster (rls_auto_enable y cualquier
-- otro que Supabase/Chat haya agregado). Responde: ¿hay event triggers
-- desconocidos mutando DDL?
SELECT evtname, evtevent, evtenabled, evtfoid::regprocedure AS funcion
FROM pg_event_trigger
ORDER BY 1;


-- ────────────────────────────────────────────────────────────────────────────
-- S2. TRIGGERS — matriz viva tabla→trigger→función→estado
-- ────────────────────────────────────────────────────────────────────────────

-- [Q2.1] [AMBOS] TODOS los triggers de public y storage con su definición y
-- estado (tgenabled: 'O'=activo, 'D'=DESHABILITADO). Responde: (a) matriz
-- completa de triggers nunca extraída; (b) ¿hay triggers deshabilitados
-- silenciosamente?; (c) ¿qué triggers tiene prod que el repo no documenta?
SELECT n.nspname AS schema,
       c.relname AS tabla,
       t.tgname AS trigger,
       CASE t.tgenabled WHEN 'O' THEN 'activo' WHEN 'D' THEN 'DESHABILITADO'
            WHEN 'R' THEN 'replica' WHEN 'A' THEN 'always' END AS estado,
       pg_get_triggerdef(t.oid) AS definicion
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal
  AND n.nspname IN ('public', 'storage')
ORDER BY 1, 2, 3;

-- [Q2.2] [AMBOS] Cobertura de audit_trigger por tabla. Responde: ¿la expansión
-- del 2026-05-13 (19 tablas Tier 1+2) se aplicó en este env? El entry del
-- CHANGELOG no especifica entorno y NO existe migración registrada en ningún
-- ledger. Esperado pre-expansión: solo sm_requests, sm_request_lines, trips,
-- trip_line_assignments (4).
SELECT c.relname AS tabla, t.tgname AS trigger_audit
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
  AND t.tgfoid = (SELECT oid FROM pg_proc
                  WHERE proname = 'audit_trigger'
                    AND pronamespace = 'public'::regnamespace)
ORDER BY 1;

-- [Q2.3] [STAGING] ¿update_equipment_location_on_custody_transfer tiene
-- trigger atado? AD-2 dice "tabla lista, trigger NO activo" — verificar que
-- sigue así (0 rows esperado).
SELECT t.tgname, c.relname AS tabla
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE NOT t.tgisinternal
  AND t.tgfoid = (SELECT oid FROM pg_proc
                  WHERE proname = 'update_equipment_location_on_custody_transfer'
                    AND pronamespace = 'public'::regnamespace);


-- ────────────────────────────────────────────────────────────────────────────
-- S3. RLS — matriz completa rol→operación→USING/WITH CHECK
-- ────────────────────────────────────────────────────────────────────────────

-- [Q3.1] [AMBOS] LA MATRIZ RLS COMPLETA (jamás extraída). Por cada policy:
-- tabla, nombre, permissive/restrictive, roles, comando, USING y WITH CHECK
-- textuales. Incluye storage. Guardar output completo de ambos envs.
SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       qual AS using_expr,
       with_check AS with_check_expr
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, cmd, policyname;

-- [Q3.2] [AMBOS] ¿Qué tablas de public tienen RLS habilitada/forzada y
-- cuántas policies tiene cada una? Responde: tablas con RLS on pero 0
-- policies (deny-all efectivo para roles no-owner — el bug RLS del Cambio 5
-- fue exactamente esto) y tablas con RLS off.
SELECT c.relname AS tabla,
       c.relrowsecurity AS rls_habilitada,
       c.relforcerowsecurity AS rls_forzada,
       COUNT(p.policyname) AS n_policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE n.nspname = 'public' AND c.relkind = 'r'
GROUP BY 1, 2, 3
ORDER BY rls_habilitada, n_policies, tabla;

-- [Q3.3] [AMBOS] ¿Qué policies dependen de get_my_app_role()? Responde: el
-- radio de explosión si esa función falla o pierde EXECUTE (ver Q1.1c).
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE (qual LIKE '%get_my_app_role%' OR with_check LIKE '%get_my_app_role%')
ORDER BY 1, 2, 3;

-- [Q3.4] [AMBOS] Config de buckets de Storage: ¿límite de tamaño y MIME types
-- viven en el bucket o solo en las policies (Block 4 staging)? Responde si
-- prod tiene el hardening de attachments o quedó sin límites.
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
FROM storage.buckets
ORDER BY 1;


-- ────────────────────────────────────────────────────────────────────────────
-- S4. CONSTRAINTS Y COLUMNAS — el drift estructural prod vs staging
-- ────────────────────────────────────────────────────────────────────────────

-- [Q4.1] [AMBOS] Constraint VIVO de notification_log.valid_event_type.
-- Responde: ¿quedó el superset de 18 event_types en ambos envs (fix
-- 2026-04-20) o alguno volvió a divergir? El código emite 18 tipos; si falta
-- alguno, el INSERT del audit trail de notificaciones falla silencioso.
SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'public.notification_log'::regclass
  AND contype = 'c';

-- [Q4.2] [AMBOS] TODOS los CHECK/UNIQUE/FK de las tablas núcleo de
-- movilizaciones. Responde: ¿qué constraints de Cambio 6/6.5 existen en
-- staging (qty_dispatched_le_assigned, qty_delivered_plus_rejected_le_
-- dispatched, qty_rejected_non_negative, one_revert_per_event) y confirma su
-- AUSENCIA en prod? (Joins por nombre: no falla si la tabla no existe.)
SELECT c.relname AS tabla,
       con.contype AS tipo,
       con.conname AS constraint,
       pg_get_constraintdef(con.oid) AS definicion
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('sm_requests', 'sm_request_lines', 'trips',
                    'trip_line_assignments', 'trip_events', 'trip_event_lines',
                    'pickup_orders', 'pickup_order_lines',
                    'external_orders', 'external_order_lines',
                    'notification_log', 'custody_transfers')
ORDER BY 1, 2, 3;

-- [Q4.3] [AMBOS] Índices únicos parciales (one_revert_per_event vive como
-- UNIQUE INDEX, no como constraint — Q4.2 no lo muestra).
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('trip_events', 'trip_line_assignments', 'sm_request_lines')
ORDER BY 1, 2;

-- [Q4.4] [AMBOS] Checklist de columnas-fantasma: existencia + nullability de
-- las columnas que marcan cada Cambio. Responde de un vistazo en qué "versión"
-- está cada env. Esperado staging: TODAS presentes; esperado prod: NINGUNA de
-- las de Cambios 2-6.5, sí gps en staging / no en prod, qty_dispatched NO en
-- prod (drift confirmado 2026-04-19).
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (
    ('trip_line_assignments', 'qty_dispatched'),      -- Events V2 (drift conocido: staging sí, prod no)
    ('trip_line_assignments', 'qty_rejected'),        -- Cambio 6.5 BD-1
    ('trips', 'cancellation_reason'),                 -- Cambio 6
    ('trips', 'rate_id'),                             -- Cambio 6: is_nullable=NO en staging
    ('trips', 'is_self_pickup'),                      -- debe NO existir en staging (Cambio 3 drop)
    ('sm_requests', 'cost_code_id'),                  -- Cambio 2 BD-1 (staging)
    ('sm_requests', 'cost_category_id'),              -- Cambio 2 BD-1
    ('sm_requests', 'fulfillment_type'),              -- debe NO existir en staging (Cambio 3 drop)
    ('sm_request_lines', 'cost_code_id'),             -- debe NO existir en staging (Cambio 2 BD-2 drop), SÍ en prod
    ('sm_request_lines', 'requires_code'),            -- dropeada en AMBOS (J2 2026-04-19) — verificar
    ('sm_request_lines', 'pickup_by_project'),        -- debe NO existir en staging (Cambio 5 drop), nunca en prod
    ('sm_request_lines', 'attachments'),              -- Cambio 3 (staging)
    ('equipment', 'gps_vehicle_id'),                  -- GPS MVP (staging sí; prod pendiente)
    ('trip_events', 'reverts_event_id'),              -- Batch 9 reversiones (¿prod la tiene?)
    ('trip_events', 'stop_type'),                     -- debe NO existir en staging (Cambio 1 drop)
    ('pickup_orders', 'scheduled_date'),              -- Cambio 5 #5b
    ('external_orders', 'scheduled_date'))
ORDER BY 1, 2;

-- [Q4.5] [PROD] ¿Qué tablas de movilizaciones existen HOY en prod public?
-- Responde: el inventario real (¿44? ¿llegaron trip_event_lines y
-- delivery_observations via SQL Editor en marzo?) sin depender del ledger.
SELECT c.relname AS tabla,
       (SELECT count(*) FROM pg_attribute a
        WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped) AS n_columnas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY 1;


-- ────────────────────────────────────────────────────────────────────────────
-- S5. BL-EXCLUSIVITY (BACKLOG) — línea en 3 modalidades a la vez
-- ────────────────────────────────────────────────────────────────────────────

-- [Q5.1] [STAGING hoy; PROD solo POST-merge] Query de diagnóstico del BACKLOG.
-- Responde: ¿alguna línea tiene simultáneamente assignment de trip + pickup +
-- external? (si >1 modalidad, recalc_qty_for_line suma fuentes múltiples y el
-- backlog miente). 0 rows = constraint sería seguro. NOTA PROD: HOY esta query
-- FALLA en prod porque pickup_order_lines/external_order_lines NO existen —
-- esa ausencia es en sí la respuesta (BL-EXCLUSIVITY no aplica en prod
-- pre-merge). Correr Q4.5 primero para confirmar.
WITH multi_modality AS (
  SELECT srl.id, srl.request_id,
    EXISTS (SELECT 1 FROM trip_line_assignments WHERE request_line_id = srl.id) AS in_trips,
    EXISTS (SELECT 1 FROM pickup_order_lines WHERE request_line_id = srl.id) AS in_pickup,
    EXISTS (SELECT 1 FROM external_order_lines WHERE request_line_id = srl.id) AS in_external
  FROM sm_request_lines srl
)
SELECT * FROM multi_modality
WHERE (in_trips::int + in_pickup::int + in_external::int) > 1;


-- ────────────────────────────────────────────────────────────────────────────
-- S6. FORENSICS DE DATA FICTION [PROD] — cuantificar la intervención manual
-- ────────────────────────────────────────────────────────────────────────────
-- Contexto (James, 2026-06-10): la mayoría de movilizaciones requirió
-- intervención manual en BD (corregir horas, dar cierre); solicitudes
-- atascadas En Transito; eventos capturados fuera de momento; ítems múltiples
-- en una línea. Estas queries cuantifican cada afirmación.
--
-- ⚠ LIMITACIÓN DE COBERTURA: hasta 2026-05-13 el audit_trigger SOLO cubría
-- sm_requests, sm_request_lines, trips y trip_line_assignments. Ediciones
-- manuales a trip_events ANTERIORES a esa fecha NO están en audit_log — para
-- esas se usan señales indirectas (F6-F8).
--
-- ⚠ FIRMA DE INTERVENCIÓN MANUAL: el audit_trigger resuelve changed_by via
-- auth.uid(). SQL Editor / service role ⇒ auth.uid() = NULL ⇒ changed_by NULL.
-- Desde 2026-05-13 Chat setea request.jwt.claims ⇒ sus cambios figuran como
-- Jaime Cucalon. Entonces: changed_by NULL = fuera de la app (James/Chat
-- pre-patrón); Jaime con horario raro = Chat/James post-patrón.

-- [F1] [PROD] Panorama del audit_log: volumen por tabla × acción, y ventana
-- temporal. Responde: ¿las 787 filas cubren qué y desde cuándo?
SELECT table_name, action, COUNT(*) AS n,
       MIN(changed_at) AS primera, MAX(changed_at) AS ultima
FROM audit_log
GROUP BY 1, 2
ORDER BY n DESC;

-- [F2] [PROD] ¿QUIÉN hizo los cambios? changed_by NULL = SQL Editor / fuera
-- de la app. Responde: proporción app vs manual, y qué usuarios reales tocaron
-- qué tablas.
SELECT COALESCE(p.name, '«SIN USUARIO — SQL Editor/service role»') AS quien,
       p.app_role,
       COUNT(*) AS cambios,
       COUNT(DISTINCT a.table_name) AS tablas_distintas,
       MIN(a.changed_at) AS primera,
       MAX(a.changed_at) AS ultima
FROM audit_log a
LEFT JOIN people p ON p.id = a.changed_by
GROUP BY 1, 2
ORDER BY cambios DESC;

-- [F3] [PROD] ¿Qué CAMPOS se corrigieron más (solo UPDATEs), partido por
-- dentro/fuera de la app? Responde: "corregir horas y dar cierre" — ¿qué
-- columnas exactamente y cuántas veces?
SELECT a.table_name,
       f.campo,
       COUNT(*) AS veces,
       SUM((a.changed_by IS NULL)::int) AS fuera_de_app,
       SUM((a.changed_by IS NOT NULL)::int) AS via_app
FROM audit_log a
CROSS JOIN LATERAL unnest(a.changed_fields) AS f(campo)
WHERE a.action = 'UPDATE'
GROUP BY 1, 2
HAVING COUNT(*) > 1
ORDER BY veces DESC
LIMIT 50;

-- [F4] [PROD] Patrón temporal de intervenciones manuales por semana.
-- Responde: ¿la intervención manual fue puntual (arranque) o crónica
-- (el sistema nunca se sostuvo solo)?
SELECT date_trunc('week', changed_at)::date AS semana,
       COUNT(*) AS cambios_totales,
       SUM((changed_by IS NULL)::int) AS manuales,
       ROUND(100.0 * SUM((changed_by IS NULL)::int) / COUNT(*), 1) AS pct_manual
FROM audit_log
GROUP BY 1
ORDER BY 1;

-- [F5] [PROD] Cierres manuales de estado: UPDATEs de status con detalle
-- de→a y si fueron fuera de la app. Responde: ¿cuántas
-- solicitudes/líneas/trips recibieron "cierre" por SQL en vez de por flujo?
SELECT a.table_name,
       a.old_data->>'status' AS de_status,
       a.new_data->>'status' AS a_status,
       COUNT(*) AS n,
       SUM((a.changed_by IS NULL)::int) AS fuera_de_app
FROM audit_log a
WHERE a.action = 'UPDATE'
  AND 'status' = ANY(a.changed_fields)
GROUP BY 1, 2, 3
ORDER BY n DESC;

-- [F5b] [PROD] Detalle fila-por-fila de los cierres manuales (para revisar
-- casos): qué registro, cuándo, y el diff de status.
SELECT a.changed_at, a.table_name, a.record_id,
       a.old_data->>'status' AS de_status,
       a.new_data->>'status' AS a_status,
       a.changed_fields
FROM audit_log a
WHERE a.action = 'UPDATE'
  AND 'status' = ANY(a.changed_fields)
  AND a.changed_by IS NULL
ORDER BY a.changed_at;

-- [F6] [PROD] Horas corregidas en trips (audit cubre trips desde el inicio):
-- cambios a actual_departure / actual_arrival / scheduled_date /
-- scheduled_time con delta. Responde: "corregir horas" cuantificado donde SÍ
-- hay cobertura de audit.
SELECT a.changed_at AS cuando_se_corrigio,
       a.record_id AS trip,
       f.campo,
       a.old_data->>f.campo AS valor_antes,
       a.new_data->>f.campo AS valor_despues,
       (a.changed_by IS NULL) AS fuera_de_app
FROM audit_log a
CROSS JOIN LATERAL unnest(a.changed_fields) AS f(campo)
WHERE a.table_name = 'trips'
  AND a.action = 'UPDATE'
  AND f.campo IN ('actual_departure', 'actual_arrival', 'scheduled_date', 'scheduled_time')
ORDER BY a.changed_at;

-- [F7] [PROD] Captura tardía de eventos — señal indirecta (cubre el período
-- SIN audit en trip_events): gap entre event_timestamp y created_at. Ambos
-- default now() ⇒ deberían diferir por milisegundos. Gap > 2 min = el
-- timestamp fue insertado con valor explícito o editado después (backdating).
SELECT t.trip_id, te.event_type,
       te.event_timestamp, te.created_at,
       ROUND(EXTRACT(EPOCH FROM (te.created_at - te.event_timestamp)) / 3600.0, 2) AS gap_horas
FROM trip_events te
JOIN trips t ON t.id = te.trip_id
WHERE ABS(EXTRACT(EPOCH FROM (te.created_at - te.event_timestamp))) > 120
ORDER BY ABS(EXTRACT(EPOCH FROM (te.created_at - te.event_timestamp))) DESC;

-- [F7b] [PROD] Distribución de ese gap (todas las filas, bucketizado).
-- Responde: ¿qué % de los 159 eventos se registró "en el momento"?
SELECT CASE
         WHEN ABS(EXTRACT(EPOCH FROM (created_at - event_timestamp))) <= 60   THEN 'a. <= 1 min (en el momento)'
         WHEN ABS(EXTRACT(EPOCH FROM (created_at - event_timestamp))) <= 3600 THEN 'b. 1 min – 1 h'
         WHEN ABS(EXTRACT(EPOCH FROM (created_at - event_timestamp))) <= 86400 THEN 'c. 1 h – 1 día'
         ELSE 'd. > 1 día'
       END AS bucket,
       COUNT(*) AS eventos
FROM trip_events
GROUP BY 1
ORDER BY 1;

-- [F8] [PROD] Captura en ráfaga: trips cuyo ciclo completo de eventos (>= 3,
-- p.ej. Salida+Entrega+Retorno) se CREÓ en una ventana < 10 minutos. Un viaje
-- real toma horas ⇒ ráfaga = alguien lo registró todo junto después de los
-- hechos. Responde: ¿cuántos de los 48 trips tienen timeline "reconstruido"?
SELECT t.trip_id,
       COUNT(*) AS n_eventos,
       string_agg(DISTINCT te.event_type, ', ') AS tipos,
       MAX(te.created_at) - MIN(te.created_at) AS ventana_creacion,
       MAX(te.event_timestamp) - MIN(te.event_timestamp) AS ventana_eventos
FROM trip_events te
JOIN trips t ON t.id = te.trip_id
GROUP BY t.trip_id
HAVING COUNT(*) >= 3
   AND MAX(te.created_at) - MIN(te.created_at) < interval '10 minutes'
ORDER BY n_eventos DESC;

-- [F9] [PROD] Solicitudes/líneas atascadas: líneas En Transito o Parcial con
-- días sin movimiento. Responde: "atascadas porque nadie registra la entrega"
-- — cuántas, de qué proyecto, hace cuánto.
SELECT r.request_id,
       pr.code AS proyecto,
       srl.line_number,
       LEFT(srl.description, 60) AS descripcion,
       srl.status,
       srl.quantity, srl.qty_scheduled, srl.qty_delivered,
       (CURRENT_DATE - srl.updated_at::date) AS dias_sin_movimiento,
       r.status AS status_solicitud
FROM sm_request_lines srl
JOIN sm_requests r ON r.id = srl.request_id
JOIN projects pr ON pr.id = r.project_id
WHERE srl.status IN ('En Transito', 'Parcial')
ORDER BY dias_sin_movimiento DESC;

-- [F9b] [PROD] Trips zombi: En Ruta viejos, o Completado SIN evento Entrega
-- activo (= cerrados a mano o sin registrar entrega). Si la columna
-- reverts_event_id no existe en prod (ver Q4.4), quitar la sub-condición.
SELECT t.trip_id, t.status, t.scheduled_date, t.actual_departure,
       (CURRENT_DATE - t.scheduled_date) AS dias_desde_programado,
       EXISTS (SELECT 1 FROM trip_events te
               WHERE te.trip_id = t.id AND te.event_type = 'Entrega') AS tiene_entrega,
       (SELECT COUNT(*) FROM trip_events te WHERE te.trip_id = t.id) AS n_eventos
FROM trips t
WHERE (t.status = 'En Ruta')
   OR (t.status = 'Completado'
       AND NOT EXISTS (SELECT 1 FROM trip_events te
                       WHERE te.trip_id = t.id AND te.event_type = 'Entrega'))
ORDER BY t.scheduled_date;

-- [F10] [PROD] Bundling de ítems en una línea — heurística: líneas Material
-- con señales de multi-ítem en la descripción (comas, " y ", "+", longitud).
-- Responde: "solicitantes meten muchos items en UNA línea" — cuántas líneas y
-- cuáles (insumo para diseñar el fix UX, no para constraint).
SELECT r.request_id,
       srl.line_number,
       srl.quantity,
       srl.unit_text,
       length(srl.description) AS largo,
       (length(srl.description) - length(replace(srl.description, ',', ''))) AS comas,
       srl.description
FROM sm_request_lines srl
JOIN sm_requests r ON r.id = srl.request_id
WHERE srl.line_type = 'Material'
  AND (srl.description LIKE '%,%'
       OR srl.description ILIKE '% y %'
       OR srl.description LIKE '%+%'
       OR length(srl.description) > 80)
ORDER BY comas DESC, largo DESC;

-- [F10b] [PROD] Distribución de líneas por solicitud y de quantity=1 en
-- Material. Pocas líneas/solicitud + mucho qty=1 con descripción larga =
-- confirmación cuantitativa del bundling.
SELECT (SELECT COUNT(*) FROM sm_request_lines l WHERE l.request_id = r.id) AS lineas_por_solicitud,
       COUNT(*) AS solicitudes
FROM sm_requests r
GROUP BY 1
ORDER BY 1;

-- [F11] [PROD] Tarifas: trips por tarifa + mismatch costo vs tarifa.
-- Responde: (a) el patrón "grúas agrupan N movilizaciones bajo una tarifa del
-- equipo movilizado" — qué tarifas concentran trips; (b) cuántos trips tienen
-- cost editado a mano distinto del rate (o sin tarifa — recordar que en prod
-- rate_id sigue nullable).
SELECT mr.code AS tarifa,
       mr.description,
       mr.rate AS tarifa_monto,
       COUNT(t.id) AS n_trips,
       SUM((t.cost IS DISTINCT FROM mr.rate)::int) AS trips_costo_distinto,
       SUM((t.cost IS NULL)::int) AS trips_sin_costo
FROM trips t
LEFT JOIN mobilization_rates mr ON mr.id = t.rate_id
GROUP BY 1, 2, 3
ORDER BY n_trips DESC;

-- [F11b] [PROD] Trips sin tarifa (rate_id NULL) — en staging esto ya es
-- imposible (NOT NULL Cambio 6); en prod mide la deuda de datos que el
-- merge tendrá que sanear ANTES de aplicar el NOT NULL.
SELECT t.trip_id, t.scheduled_date, t.status, t.cost
FROM trips t
WHERE t.rate_id IS NULL
ORDER BY t.scheduled_date;

-- [F12] [PROD] Integridad qty pre-merge: líneas donde qty_scheduled +
-- qty_delivered > quantity o negativos (prod tiene el CHECK qty_invariant
-- SOLO si Block 2.C se aplicó — que fue staging-only ⇒ prod puede tener
-- drift). Responde: cuánta data violaría los constraints del merge.
SELECT r.request_id, srl.line_number, srl.status,
       srl.quantity, srl.qty_scheduled, srl.qty_delivered
FROM sm_request_lines srl
JOIN sm_requests r ON r.id = srl.request_id
WHERE srl.qty_scheduled + srl.qty_delivered > srl.quantity
   OR srl.qty_scheduled < 0
   OR srl.qty_delivered < 0;

-- [F12b] [PROD] Assignments con qty_delivered > quantity_assigned (CHECKs de
-- Cambio 6/6.5 no existen en prod — medir el drift que bloquearía el merge).
SELECT t.trip_id, tla.request_line_id, tla.quantity_assigned, tla.qty_delivered
FROM trip_line_assignments tla
JOIN trips t ON t.id = tla.trip_id
WHERE tla.qty_delivered > tla.quantity_assigned;

-- ============================================================================
-- FIN DEL PACK — 33 queries (Q0.1–Q5.1 estructura, F1–F12b forensics)
-- Procedimiento sugerido: correr S0–S5 en AMBOS envs y S6 en prod; pegar
-- outputs en un doc de evidencia con fecha; diff Q1.2/Q3.1 prod vs staging.
-- ============================================================================
