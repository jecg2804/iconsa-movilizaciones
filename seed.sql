-- ============================================================
-- MovimientOS — Datos Iniciales (seed.sql)
-- ============================================================
-- Ejecutar en Supabase SQL Editor para poblar datos de desarrollo.
-- Incluye: proyectos reales, tarifas reales, ubicaciones, unidades,
-- y usuarios de prueba (uno por rol).
--
-- NOTA: La BD de producción ya tiene 160+ personas y 377+ equipos
-- importados. Este seed es para desarrollo LOCAL desde cero.
-- ============================================================

-- Limpiar en orden correcto (respetar FKs)
TRUNCATE trip_events, trip_line_assignments, trips, sm_request_lines, sm_requests,
         suggestions, sequences, person_projects, cost_codes,
         locations, mobilization_rates, units, equipment, people, projects
         CASCADE;

-- ============================================================
-- PROYECTOS (4 proyectos reales de ICONSA)
-- ============================================================
INSERT INTO projects (code, name, manager, status, location) VALUES
  ('25-504', 'Astillero de Balboa (ASTIBAL)', 'Ariel Gonzales', 'Activo', 'Balboa'),
  ('25-505', 'Paraiso', 'Cesar Caballero', 'Activo', 'Paraíso'),
  ('25-506', 'Muelle 14', 'Franklin Marciaga', 'Activo', 'Balboa'),
  ('24-404', 'Costa Norte', 'Cesar Caballero', 'Activo', 'Colón');

-- ============================================================
-- UBICACIONES (taller central + proyectos + proveedores comunes)
-- ============================================================
INSERT INTO locations (name, location_type, project_id, is_active) VALUES
  ('Taller Chilibre', 'Taller', NULL, true),
  ('Proyecto ASTIBAL', 'Proyecto', (SELECT id FROM projects WHERE code = '25-504'), true),
  ('Proyecto Paraiso', 'Proyecto', (SELECT id FROM projects WHERE code = '25-505'), true),
  ('Proyecto Muelle 14', 'Proyecto', (SELECT id FROM projects WHERE code = '25-506'), true),
  ('Proyecto Costa Norte', 'Proyecto', (SELECT id FROM projects WHERE code = '24-404'), true),
  ('Proveedor - Acero Panamá', 'Proveedor', NULL, true),
  ('Proveedor - Cemento Bayano', 'Proveedor', NULL, true),
  ('Puerto de Balboa', 'Puerto', NULL, true),
  ('Oficina Central', 'Oficina', NULL, true);

-- ============================================================
-- TARIFAS DE MOVILIZACIÓN (14 tarifas reales)
-- ============================================================
INSERT INTO mobilization_rates (code, description, rate, is_active) VALUES
  ('MVG108', 'Movilización Grúa 108', 2000.00, true),
  ('MVG318', 'Movilización Grúa 318', 3000.00, true),
  ('MVG518', 'Movilización Grúa 518', 6400.00, true),
  ('MVGSNY', 'Movilización Grúa Sany', 11000.00, true),
  ('MVPLAT', 'Movilización Canter Plataforma', 200.00, true),
  ('MVTTOP', 'Movilización Tilt-Top', 350.00, true),
  ('MVCALT', 'Movilización Cama Alta', 425.00, true),
  ('MVCB50', 'Movilización Cama Baja 50', 500.00, true),
  ('MVCB75', 'Movilización Cama Baja 75', 600.00, true),
  ('MVCEXT', 'Movilización Mesa Extendible', 550.00, true),
  ('MVVQ11', 'Movilización Camión Volquete', 260.00, true),
  ('MVLPUP', 'Movilización Pick-up', 75.00, true),
  ('MVAPX1', 'Movilización Remolcador MAR213', 5000.00, true),
  ('MVCGRU', 'Movilización Camión Grúa', 300.00, true);

-- ============================================================
-- UNIDADES DE MEDIDA
-- ============================================================
INSERT INTO units (code, description) VALUES
  ('UND', 'Unidad'),
  ('GLB', 'Global'),
  ('M3', 'Metro cúbico'),
  ('TON', 'Tonelada'),
  ('KG', 'Kilogramo'),
  ('GAL', 'Galón'),
  ('M', 'Metro lineal'),
  ('PZA', 'Pieza'),
  ('JGO', 'Juego'),
  ('PAR', 'Par'),
  ('CJA', 'Caja');

-- ============================================================
-- PERSONAS DE PRUEBA (1 por rol + Charris)
-- ============================================================
-- Contraseña de prueba para todos: Test1234!
-- Crear auth users en Supabase Dashboard > Authentication > Users

INSERT INTO people (name, email, app_role, department, position, status) VALUES
  ('Carlos Charris', 'charris@iconsa.test', 'logistica', 'Logística', 'Coordinador de Logística', 'Activo'),
  ('Franklin Marciaga', 'marciaga@iconsa.test', 'pm', 'Proyectos', 'Ingeniero de Proyecto', 'Activo'),
  ('Cesar Caballero', 'caballero@iconsa.test', 'pm', 'Proyectos', 'Ingeniero de Proyecto', 'Activo'),
  ('Pedro Conductor', 'conductor@iconsa.test', 'campo', 'Transporte', 'Conductor', 'Activo'),
  ('María Almacén', 'almacen@iconsa.test', 'almacen', 'Almacén', 'Almacenista', 'Activo'),
  ('James Admin', 'admin@iconsa.test', 'admin', 'TI', 'Administrador', 'Activo');

-- ============================================================
-- ASIGNACIONES PERSONA ↔ PROYECTO
-- ============================================================
-- Marciaga: solo Muelle 14
INSERT INTO person_projects (person_id, project_id, role, is_active)
SELECT p.id, pr.id, 'pm', true
FROM people p, projects pr
WHERE p.email = 'marciaga@iconsa.test' AND pr.code = '25-506';

-- Caballero: Paraiso + Costa Norte
INSERT INTO person_projects (person_id, project_id, role, is_active)
SELECT p.id, pr.id, 'pm', true
FROM people p, projects pr
WHERE p.email = 'caballero@iconsa.test' AND pr.code IN ('25-505', '24-404');

-- Charris: todos los proyectos (logística)
INSERT INTO person_projects (person_id, project_id, role, is_active)
SELECT p.id, pr.id, 'logistica', true
FROM people p, projects pr
WHERE p.email = 'charris@iconsa.test';

-- Admin: todos
INSERT INTO person_projects (person_id, project_id, role, is_active)
SELECT p.id, pr.id, 'admin', true
FROM people p, projects pr
WHERE p.email = 'admin@iconsa.test';

-- ============================================================
-- EQUIPOS DE PRUEBA (representativos de cada tipo)
-- ============================================================
INSERT INTO equipment (spectrum_code, description, equipment_type, type_code, brand, model, plate, status, current_location, acquisition_type) VALUES
  ('EQ-001', 'Grúa Telescópica 108 Ton', 'Grúa', 'GRU', 'Liebherr', 'LTM 1100-4.2', NULL, 'Activo', 'Taller Chilibre', 'Propio'),
  ('EQ-002', 'Excavadora CAT 320', 'Excavadora', 'EXC', 'Caterpillar', '320 GC', NULL, 'Activo', 'Taller Chilibre', 'Propio'),
  ('EQ-003', 'Retroexcavadora JCB', 'Retroexcavadora', 'RET', 'JCB', '3CX', NULL, 'Activo', 'Proyecto Muelle 14', 'Propio'),
  ('VH-001', 'Cama Baja 50 Ton', 'Cama Baja', 'VHL', 'Fontaine', 'HRG 50', 'ABC-123', 'Activo', 'Taller Chilibre', 'Propio'),
  ('VH-002', 'Cama Alta', 'Cama Alta', 'VHL', 'Trail King', 'TK80', 'DEF-456', 'Activo', 'Taller Chilibre', 'Propio'),
  ('VH-003', 'Pick-up Toyota Hilux', 'Pick-up', 'VHP', 'Toyota', 'Hilux', 'GHI-789', 'Activo', 'Oficina Central', 'Propio'),
  ('VH-004', 'Cabezal Kenworth T880', 'Cabezal', 'VHL', 'Kenworth', 'T880', 'JKL-012', 'Activo', 'Taller Chilibre', 'Propio'),
  ('VH-005', 'Volquete Hino 500', 'Volquete', 'VHL', 'Hino', '500', 'MNO-345', 'Activo', 'Proyecto Costa Norte', 'Propio');

-- ============================================================
-- SECUENCIAS (para generar IDs automáticos)
-- ============================================================
INSERT INTO sequences (seq_type, project_id, next_number)
SELECT 'SM', id, 1 FROM projects;

INSERT INTO sequences (seq_type, project_id, next_number)
VALUES ('MOV', NULL, 1);

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE 'Seed completado:';
  RAISE NOTICE '  Proyectos: %', (SELECT count(*) FROM projects);
  RAISE NOTICE '  Ubicaciones: %', (SELECT count(*) FROM locations);
  RAISE NOTICE '  Tarifas: %', (SELECT count(*) FROM mobilization_rates);
  RAISE NOTICE '  Unidades: %', (SELECT count(*) FROM units);
  RAISE NOTICE '  Personas: %', (SELECT count(*) FROM people);
  RAISE NOTICE '  Equipos: %', (SELECT count(*) FROM equipment);
  RAISE NOTICE '  Asignaciones: %', (SELECT count(*) FROM person_projects);
  RAISE NOTICE '  Secuencias: %', (SELECT count(*) FROM sequences);
END $$;
