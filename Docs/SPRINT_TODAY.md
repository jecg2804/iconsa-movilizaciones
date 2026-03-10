# SPRINT HOY — Entrega MVP Jueves

Lee Docs/SYNC_LOG.md primero. Chat aplicó cambios de BD hoy.

## Contexto
- App deployed: https://www.rein-eisenwerk.com/login
- BD: 19 tablas (nueva: project_extras). 122 cost_codes con extras.
- database.ts regenerado — James lo colocará en src/lib/types/database.ts

## BLOQUE 1: Extras en cascada de cost codes (PRIORIDAD 1)

### Cambio en BD (ya hecho por Chat):
- Nueva tabla `project_extras` (code, description, project_id)
- `cost_codes.extra_id` FK → project_extras (nullable, NULL = proyecto base)
- 12 extras: 6 para 24-404 (Costa Norte), 6 para 25-505 (Paraiso)
- full_code ahora: `24-404E1-01-3100` (con extra) o `24-404-01-3100` (base)
- Trigger `generate_full_code()` actualizado para incluir extras

### Qué implementar:
**Archivo: `src/components/solicitudes/LineEditor.tsx`**

La cascada actual es: Proyecto → Fase → Categoría

Cambiar a: Proyecto → Extra (condicional) → Fase → Categoría

1. Después de seleccionar Proyecto, fetch extras:
```typescript
const { data: extras } = await supabase
  .from('project_extras')
  .select('id, code, description')
  .eq('project_id', selectedProjectId)
  .eq('is_active', true)
  .order('code')
```

2. Si el proyecto tiene extras → mostrar dropdown "Extra" con opción "(Base)" + los extras
   Si NO tiene extras → ocultar dropdown, usar extra_id = null

3. Fetch fases filtrado por proyecto Y extra:
```typescript
// Si seleccionó un extra:
.eq('project_id', selectedProjectId).eq('extra_id', selectedExtraId)
// Si seleccionó "(Base)":
.eq('project_id', selectedProjectId).is('extra_id', null)
```

4. El resto de la cascada (Categoría) funciona igual — filtra por cost_code_id seleccionado

5. El full_code generado automáticamente mostrará: `24-404E1-01-3100-EQI` o `24-404-01-3100-EQI`

### UX del dropdown Extra:
- Label: "Extra / Sección"
- Placeholder: "Seleccionar extra..."
- Opciones: "(Proyecto Base)" + extras del proyecto
- Solo visible cuando el proyecto seleccionado tiene extras
- Cuando cambia: resetear Fase y Categoría

---

## BLOQUE 2: Fase 6 — Admin Masters (PRIORIDAD 2)

**Ruta: `/admin/masters`**
**Acceso: solo `admin`**

Crear CRUD básico para tablas maestras. Una página con tabs/secciones:

### Paso 6.1: Layout con tabs
**Archivo: `src/app/(app)/admin/masters/page.tsx`**
- Tabs: Proyectos | Personas | Equipos | Ubicaciones | Tarifas | Extras
- Cada tab muestra tabla + botón "Agregar"
- Click en fila → editar inline o modal

### Paso 6.2: Tab Proyectos
- Tabla: projects (code, name, manager, status)
- Crear/Editar: code, name, manager, status, location, start_date, end_date, client
- Botón activar/desactivar (status)

### Paso 6.3: Tab Personas
- Tabla: people (name, app_role, department, status)
- Editar: name, app_role (dropdown), department, phone, email, status
- Sección: person_projects — asignar persona a proyectos
- NO crear personas nuevas en MVP (se importan)

### Paso 6.4: Tab Equipos
- Tabla: equipment (spectrum_code, description, type_code, status)
- Editar: description, type_code, status, current_project_id
- Búsqueda por spectrum_code

### Paso 6.5: Tab Ubicaciones
- Tabla: locations (name, location_type, project_id, is_active)
- CRUD completo

### Paso 6.6: Tab Tarifas
- Tabla: mobilization_rates (code, description, rate)
- CRUD completo

### Paso 6.7: Tab Extras
- Tabla: project_extras filtrado por proyecto seleccionado
- CRUD: code (E1, E2...), description, is_active

---

## BLOQUE 3: Vista Calendario (PRIORIDAD 3)

**Ruta: `/programacion/calendario`** (ya existe como placeholder)

### Paso: Implementar calendario
- Usar librería simple: react-day-picker o crear grid manual con Tailwind
- Vista: semana actual + siguiente (2 semanas)
- Cada día muestra viajes programados para esa fecha
- Datos: fetch trips con scheduled_date en rango visible
- Click en viaje → navegar a /programacion/viaje/[id]
- Color por estado: Programado (púrpura), En Ruta (naranja), Completado (verde)
- Mobile-friendly: scroll horizontal si necesario

---

## BLOQUE 4: Notificaciones Email (PRIORIDAD 4 — si da tiempo)

Usar Supabase Edge Functions + Resend para emails.

### Paso: Edge Function para email
**Chat desplegará la Edge Function.** Claude Code solo necesita:
1. Agregar llamada a la Edge Function después de cambios de estado:
   - Solicitud enviada → POST /functions/v1/notify con type='solicitud_enviada'
   - Viaje programado → POST /functions/v1/notify con type='viaje_programado'

---

## NOTAS IMPORTANTES

- **database.ts**: James lo colocará manualmente. Si no está actualizado, leer Supabase via MCP.
- **Después de cada paso**: commit + push + escribir en SYNC_LOG.md
- **Si algo no coincide con Feature Spec**: escribir en .claude/suggestions.md, NO modificar el spec
- **Si necesitas cambio de BD**: escribir solicitud en SYNC_LOG.md, NO modificar Supabase
