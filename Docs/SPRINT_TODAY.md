# SPRINT HOY — Entrega MVP Jueves

Lee Docs/SYNC_LOG.md primero. Chat aplicó cambios de BD hoy.

## Contexto
- App deployed: https://www.rein-eisenwerk.com/login
- BD: 19 tablas (nueva: project_extras). 122 cost_codes con extras. 30 person_projects.
- database.ts regenerado — James lo colocará en src/lib/types/database.ts

---

## BLOQUE 1: Extras en cascada de cost codes

### Cambio en BD (ya hecho por Chat):
- Nueva tabla `project_extras` (code, description, project_id)
- `cost_codes.extra_id` FK → project_extras (nullable, NULL = proyecto base)
- 12 extras para 24-404 y 25-505. Los otros 3 proyectos no tienen extras.
- full_code con extra: `24-404-E1-01-3100` (dash antes de E1)
- full_code base: `24-404-01-3100` (sin cambio)

### Qué implementar:
**Archivo: `src/components/solicitudes/LineEditor.tsx`**

Cascada actual: Proyecto → Fase → Categoría
Cambiar a: Proyecto → Extra (condicional) → Fase → Categoría

1. Después de seleccionar Proyecto, fetch extras del proyecto:
```typescript
const { data: extras } = await supabase
  .from('project_extras')
  .select('id, code, description')
  .eq('project_id', selectedProjectId)
  .eq('is_active', true)
  .order('code')
```

2. Si el proyecto tiene extras → mostrar dropdown "Extra / Sección" con opción "(Proyecto Base)" + los extras. Si NO tiene extras → ocultar dropdown, usar extra_id = null.

3. Fetch fases filtrado por proyecto Y extra:
```typescript
// Si seleccionó un extra:
.eq('project_id', selectedProjectId).eq('extra_id', selectedExtraId)
// Si seleccionó "(Proyecto Base)" o proyecto sin extras:
.eq('project_id', selectedProjectId).is('extra_id', null)
```

4. El resto de la cascada (Categoría) funciona igual — filtra por cost_code_id seleccionado.

5. El full_code generado automáticamente mostrará: `24-404-E1-01-3100-EQI` o `24-404-01-3100-EQI`

### UX del dropdown Extra:
- Label: "Extra / Sección"
- Placeholder: "Seleccionar extra..."
- Opciones: "(Proyecto Base)" + extras del proyecto
- Solo visible cuando el proyecto seleccionado tiene extras
- Cuando cambia: resetear Fase y Categoría

---

## BLOQUE 2: Fase 6 — Admin Masters + Onboarding

**Ruta: `/admin/masters`**
**Acceso: `admin`**

### Paso 6.1: Layout con tabs
**Archivo: `src/app/(app)/admin/masters/page.tsx`**
- Tabs: Proyectos | Personas | Equipos | Ubicaciones | Tarifas | Extras
- Cada tab muestra DataTable + botón "Agregar"
- Click en fila → modal de edición

### Paso 6.2: Tab Proyectos
- CRUD: code, name, manager, status, location, client
- Botón activar/desactivar

### Paso 6.3: Tab Personas (CRÍTICO para onboarding)
- DataTable: name, app_role, position, department, email, status
- Editar: app_role (dropdown: admin/pm/logistica/campo/almacen), position, department, email, phone
- Sección dentro de cada persona: "Proyectos Asignados" → lista de person_projects con botón agregar/quitar
- Esto permite a un admin registrar gente nueva y asignarla a proyectos

### Paso 6.4: Tab Equipos
- DataTable: spectrum_code, description, type_code, status
- Editar campos principales. Búsqueda por spectrum_code.

### Paso 6.5: Tab Ubicaciones
- CRUD completo: name, location_type, project_id, is_active

### Paso 6.6: Tab Tarifas
- CRUD: code, description, rate, is_active

### Paso 6.7: Tab Extras
- Filtrar por proyecto (dropdown selector arriba)
- CRUD: code (E1, E2...), description, is_active

---

## BLOQUE 3: Vista Calendario (Look-Ahead)

**Ruta: `/programacion/calendario`** (ya existe como placeholder)

- Vista: 2 semanas (semana actual + siguiente)
- Grid de días con viajes programados por fecha
- Datos: fetch trips con scheduled_date en rango visible
- Click en viaje → navegar a /programacion/viaje/[id]
- Color por estado: Programado (púrpura), En Ruta (naranja), Completado (verde)
- Mobile-friendly
- Librería sugerida: grid manual con Tailwind (no agregar dependencia nueva)

---

## BLOQUE 4: Notificaciones Email (si da tiempo)

Esto requiere coordinación con Chat para Edge Functions. Si llegas aquí:
1. Escribir en SYNC_LOG.md: "Code: Listo para Bloque 4. Necesito Edge Function de email."
2. James coordinará con Chat para deployer la función.

---

## NOTAS IMPORTANTES

- **database.ts**: James lo colocará. Si no está, consultar Supabase via MCP.
- **Después de cada paso**: commit + push + escribir en Docs/SYNC_LOG.md
- **Si algo no coincide con Feature Spec**: escribir en .claude/suggestions.md, NO modificar el spec
- **Si necesitas cambio de BD**: escribir en SYNC_LOG.md, NO modificar Supabase
- **Orden de prioridad**: Bloque 1 → 2 → 3 → 4
