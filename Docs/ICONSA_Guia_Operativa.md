# Guia Operativa: Datos y Acciones Pendientes

## Datos Ya Cargados en Supabase

- Proyectos: 4 (ASTIBAL, Paraiso, Muelle 14, Costa Norte)
- Personas de prueba: 9 (James, Edward, Charris, 5 conductores, Yoseph)
- Ubicaciones: 6 (Taller Chilibre, Almacen Central, 4 proyectos)
- Tarifas: 14 tarifas de movilizacion
- Unidades: 11 unidades de medida
- Asignaciones PM-Proyecto: 2 (Edward a Muelle 14 y Paraiso)

## Datos Pendientes de Importar

Equipment.csv: ~392 equipos. Importar via Supabase Table Editor, Insert, Import CSV.
Vehiculos.csv: 56 vehiculos. Mismo proceso.
codcost.csv: Codigos de costo por proyecto. Verificar si hay archivos para todos los proyectos.
Employee_Listing.csv: 161 empleados. Solo importar los que necesiten acceso al sistema.

## Informacion a Recopilar EN PERSONA

### De Carlos Charris
- Lista completa de conductores activos
- Ubicaciones adicionales (proveedores frecuentes, Gamboa, etc.)
- Verificar tarifas vigentes
- Vehiculos activos actualmente

### De Ingenieros de Proyecto
- Quienes van a crear solicitudes (nombres y correos)
- Mapeo persona a proyecto
- Codigos de costo para ASTIBAL y Costa Norte

### Del Jefe
- Quien mas necesita acceso al dashboard
- Confirmar proyectos activos para MVP
- Metricas para reportes semanales de Valderrama

### De Andy
- Invitar al repo de GitHub
- Compartir acceso a Supabase
- Definir flujo de trabajo (branches)

## Como Agregar Datos

### Proyecto nuevo (en Supabase SQL Editor)
INSERT INTO projects (code, name, manager)
VALUES ('XX-XXX', 'Nombre', 'Gerente');

INSERT INTO locations (name, location_type, project_id)
SELECT 'Nombre', 'proyecto', id FROM projects WHERE code = 'XX-XXX';

### Usuario nuevo
INSERT INTO people (name, email, app_role, department, position)
VALUES ('Nombre', 'correo@iconsa.com', 'pm', 'Depto', 'Cargo');
-- Roles: admin, pm, logistica, campo, almacen

### Asignar PM a proyecto
INSERT INTO person_projects (person_id, project_id)
SELECT p.id, pr.id FROM people p, projects pr
WHERE p.email = 'correo@iconsa.com' AND pr.code = '25-506';

## Accesos

Supabase: https://supabase.com/dashboard (James)
GitHub: https://github.com/jecg2804/iconsa-movilizaciones (James, invitar Andy)
App dev: http://localhost:3000
App produccion: Pendiente

## Proximos Pasos

1. Importar Equipment.csv, Vehiculos.csv, codcost.csv
2. Definir usuarios finales con roles y correos reales
3. Invitar Andy al repo
4. Construir pantallas MVP con Claude Code
5. Configurar Supabase Auth
6. Testing con datos reales
7. Deploy a produccion
