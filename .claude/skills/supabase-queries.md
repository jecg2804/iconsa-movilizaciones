# Skill: Queries de Supabase

Patrones estándar para queries en este proyecto.

## Cliente correcto
- **Server Components / Route Handlers:** `import { createClient } from '@/lib/supabase/server'`
- **Client Components (hooks):** `import { createClient } from '@/lib/supabase/client'`

## Query con relaciones (joins)
```typescript
const { data, error } = await supabase
  .from('sm_requests')
  .select(`
    *,
    project:projects!sm_requests_project_id_fkey(id, code, name),
    requester:people!sm_requests_requester_id_fkey(id, name),
    lines:sm_request_lines(id, status)
  `)
  .order('date_required', { ascending: true })
```

## Filtros dinámicos
```typescript
let query = supabase.from('tabla').select('...')
if (filtro.projectId) query = query.eq('project_id', filtro.projectId)
if (filtro.statuses.length > 0) query = query.in('status', filtro.statuses)
```

## Filtros de equipos
- Solicitud (ingeniero escoge equipo): `type_code NOT IN ('ING')`
- Vehículo (Charris): `type_code IN ('VHL','VHP')`
- Remolque: `spectrum_code LIKE 'REM%'` (NO por descripción)
- **Search**: buscar en spectrum_code Y description con `.or()`:
  `.or(`spectrum_code.ilike.%${search}%,description.ilike.%${search}%`)`
- **Label dropdown**: `"{spectrum_code} — {description}"` ej: "CAB930 — CABEZAL 350 HP"

## Filtros de personas
- Conductor: `.eq('app_role', 'campo')`
- Solicitante: auto-fill con usuario logueado, NO editable (disabled en UI)
- Aprobado por: `.eq('app_role', 'pm')` — solo personal de proyecto

## Cost codes en cascada
```typescript
// 1. Fetch fases filtradas por proyecto seleccionado
const { data: phases } = await supabase
  .from('cost_codes')
  .select('id, phase_code, phase_description, full_code')
  .eq('project_id', selectedProjectId)
  .order('phase_code')

// 2. Fetch categorías válidas para la fase seleccionada
const { data: validCats } = await supabase
  .from('cost_code_categories')
  .select('cost_category_id, cost_categories(id, code, description)')
  .eq('cost_code_id', selectedCostCodeId)

// 3. Guardar en sm_request_lines
// Usar cost_code_id y cost_category_id (FK), NO el campo 'category' (LEGACY)
```

## Manejo de errores
```typescript
if (error) {
  console.error('Error:', error.message)
  setError(error.message)
  return
}
```

## NUNCA
- No usar `supabase.rpc()` sin verificar que la función existe
- No hacer queries sin tipado (usar Database types)
- No hardcodear UUIDs
- No hardcodear categorías de costo (ICS, EQI, etc.) — leer de cost_categories
- No usar el campo `category` TEXT para nuevas líneas — es LEGACY
- No usar `user_app_roles` en código MVP — usar `people.app_role`
