# Skill: Crear página CRUD

Cuando se necesite crear una nueva página con formulario y lista, seguir este patrón:

## Estructura de archivos
Para un módulo llamado `{modulo}`:
```
src/hooks/use{Modulo}.ts          — Hook de datos (fetch, create, update, delete)
src/components/{modulo}/{Modulo}Form.tsx  — Formulario (crear/editar)
src/app/(app)/{modulo}/page.tsx           — Lista con filtros
src/app/(app)/{modulo}/[id]/page.tsx      — Detalle/editar
src/app/(app)/{modulo}/nueva/page.tsx     — Crear nuevo (si aplica)
```

## Patrón del Hook (use{Modulo}.ts)
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

// 1. Definir tipos con relaciones
export interface {Modulo}WithRelations { ... }

// 2. Definir filtros
export interface {Modulo}Filter { ... }

// 3. Hook principal
export function use{Modulo}(initialFilters?) {
  // Estado: items, loading, error, filters
  // Fetch con filtros dinámicos
  // CRUD functions
  // Return todo
}
```

## Patrón del Formulario
- `'use client'`
- useAuth() para permisos
- Guard de acceso al inicio del render
- Campos de header arriba
- Líneas/items en el medio (si aplica)
- Botones de acción abajo
- **Redirect a lista después de guardar** (router.push)

## Convenciones
- Todos los labels en español
- Usar Badge para estados con colores de constants.ts
- Usar SelectWithFallback para dropdowns de tablas maestras
- IDs en fuente monoespaciada (clase `font-mono`)
- Mobile-first: grid responsive con `grid-cols-1 md:grid-cols-2`

## Verificación
- `npm run build` sin errores
- Probar con datos de prueba en Supabase
