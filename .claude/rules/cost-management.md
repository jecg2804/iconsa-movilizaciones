# Cost Codes — Lógica de Cascada desde Base de Datos

## Estructura de tablas

```
cost_codes (98 fases, por proyecto)
  → project_id FK projects
  → phase_code: "01-7113"
  → phase_description: "Movilización"
  → full_code: "25-506-01.7113"

cost_categories (8 categorías, globales)
  → code: "EQI"
  → description: "Equipo ICONSA"

cost_code_categories (530 combos válidos, tabla puente)
  → cost_code_id FK cost_codes
  → cost_category_id FK cost_categories
  → Define qué categorías son válidas para cada fase de cada proyecto

sm_request_lines
  → cost_code_id FK cost_codes (fase seleccionada)
  → cost_category_id FK cost_categories (categoría seleccionada)
  → category TEXT (LEGACY — no usar para nuevas líneas)
  → material_category TEXT (categoría del material, texto libre, solo Material)
```

## Cascada en la UI (LineEditor)

1. Usuario selecciona **Proyecto** en el header de la solicitud
2. Dropdown **"Fase / Código de Costo"** filtra `cost_codes` por `project_id`
   - Muestra: `{phase_code} — {phase_description}`
   - Ejemplo: `01-7113 — Movilización`
3. Al seleccionar una fase, dropdown **"Categoría"** filtra `cost_categories` via `cost_code_categories`
   - Query: JOIN cost_code_categories WHERE cost_code_id = fase seleccionada
   - Muestra: `{code} — {description}`
   - Ejemplo: `EQI — Equipo ICONSA`
4. Sistema auto-genera el código completo (solo lectura):
   - `{proyecto}-{fase}-{categoría}` → `25-506-01.7113-EQI`

## Queries de referencia

```typescript
// Fetch fases filtradas por proyecto
const { data: phases } = await supabase
  .from('cost_codes')
  .select('id, phase_code, phase_description, full_code')
  .eq('project_id', selectedProjectId)
  .order('phase_code')

// Fetch categorías válidas para la fase seleccionada
const { data: categories } = await supabase
  .from('cost_code_categories')
  .select('cost_category_id, cost_categories(id, code, description)')
  .eq('cost_code_id', selectedCostCodeId)

// Guardar en sm_request_lines
{
  cost_code_id: selectedCostCodeId,      // UUID de la fase
  cost_category_id: selectedCategoryId,   // UUID de la categoría
  // NO usar campo 'category' (LEGACY)
}
```

## Campos en formulario de línea

| Campo | Visible cuando | Se guarda en | Requerido |
|-------|---------------|-------------|:---------:|
| Fase / Código de Costo | Siempre | cost_code_id | ✅ |
| Categoría de Costo | Siempre (filtrado por fase) | cost_category_id | ✅ |
| Categoría de Material | Solo line_type = Material | material_category | ❌ |

## NUNCA

- No hardcodear categorías (ICS, EQI, etc.) en el código. Siempre leer de `cost_categories`.
- No usar el campo `category` TEXT para nuevas líneas. Es LEGACY.
- No mostrar categorías que no existen en `cost_code_categories` para la fase seleccionada.
