# Cambio 2 — Cost Code a Nivel Solicitud Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover `cost_code_id` y `cost_category_id` de `sm_request_lines` (per-línea) a `sm_requests` (per-solicitud). Reubicar cascada `Proyecto → [Extra] → Fase → Categoría` de `LineEditor` al header de `SolicitudForm`. Validar cost_code requerido al enviar solicitud (Borrador→Enviada). Tolerar solicitudes históricas con `cost_code_id=NULL` sin crashear.

**Architecture:** El hook nuevo `useCostCodeCascade(projectId, initialCostCodeId, initialCostCategoryId)` encapsula la lógica de los 3 fetches (`project_extras`, `cost_codes`, `cost_code_categories`) + estado de extras/fases/categorías + reset cuando cambia el proyecto. `SolicitudForm` consume el hook y expone Selectors en el header. `LineEditor` pierde toda la lógica cost_code (~150 líneas eliminadas). `LineRow` pierde el prop `costCodeDisplay` (cost_code se ve solo en header, no se repite per-línea). `useSolicitudes` mueve los campos del modelo: `LineInput`/`LineWithRelations` los pierden, `SolicitudInput`/`SolicitudWithRelations` los ganan, queries SELECT con JOIN actualizado, mappers + INSERT/UPDATE rediseñados. BD-1 ya aplicada por Chat (columnas existen en ambas tablas, sm_requests poblado por migration). BD-2 (DROP de columnas viejas en sm_request_lines) la aplica Chat post-refactor — gated entre Task 7 y Task 8.

**Tech Stack:** Next.js 16 (App Router), TypeScript ES2022 strict, Supabase (read-only via MCP), React hooks, Tailwind, Playwright tests.

**Master spec:** `Docs/reference/events-v2-redesign-in-progress-v3.md` Sección 3 Cambio 2.
**Brainstorming output:** ver mensaje del 2026-04-27 con respuestas Q1-Q6 + verificaciones V1-V3.

**Out of scope (NO TOCAR):**
- Pickup, Parada (Cambios 1 y 3)
- BD changes — Code NO toca BD; Etapa BD-1 ya aplicada, Etapa BD-2 la aplica Chat entre Task 7 y Task 8
- Notificaciones
- Trip detail mostrando cost_code (E6)
- AD-5 completo (createTrip helper) — solo agregamos `costCode` opt al `createSolicitud` helper

**Decisiones del brainstorming (referencia rápida):**
- Q1=B → custom hook `useCostCodeCascade`
- Q2=A → eliminar `LineWithRelations.cost_code_id` ahora (no esperar BD-2)
- Q3 → eliminar prop `LineRow.costCodeDisplay` completo
- Q4 → Selectors readonly via `disabled={isReadonly}` (mismo pattern de SolicitudForm actual)
- Q5 → `validateForSend` requiere cost_code; edit de solicitud Enviada/Completada/Cancelada NO valida
- Q6 → fix mínimo de `tests/helpers.ts:createSolicitud` (opt `costCode` para header), AD-5 completo fuera

**Estado BD verificado por Chat (2026-04-27):**
- V1 ✅ Trigger `generate_full_code()` dispara en tabla `cost_codes` (master), NO en `sm_request_lines`. BD-2 100% seguro.
- V2 — verificación post-regen (Task 2): si `cost_code_categories` aparece tipada, eliminar cast hack; si no, mantener.
- V3 — pendiente confirmación de James sobre reportes externos. Por defecto asumimos que no afectan.

---

## Task 1: Master spec v3.2 + CHANGELOG entry [bd]

**Goal:** Documentar BD-1 ya aplicada + decisiones Q1-Q6 + V1 verificado en el master spec, y entry CHANGELOG.

**Files:**
- Modify: `Docs/reference/events-v2-redesign-in-progress-v3.md` (frontmatter + Sección 2 Decisión 25 + Sección 3 Cambio 2 BD block reescrito)
- Modify: `Docs/CHANGELOG.md` (nueva entry `[bd]` bajo `## 2026-04-27`)

**Acceptance Criteria:**
- [ ] Frontmatter `updated:` muestra `2026-04-27 (v3.2: cost code BD-1 applied + Q1-Q6 closed)`
- [ ] Sección 2 Decisión 25 agregada documentando V1 + Q1 (custom hook) + Q3 (eliminar costCodeDisplay) + Q5 (validate solo Borrador→Enviada)
- [ ] Sección 3 Cambio 2 bloque "BD" reescrito reflejando que Etapa BD-1 ya fue aplicada y BD-2 queda pendiente post-refactor
- [ ] CHANGELOG entry `[bd]` documentando BD-1 con el SQL ejecutado y resultado de migración (6/6 solicitudes seteadas, sanity MATCH ok)

**Verify:** `git diff --stat HEAD` muestra 2 archivos modificados.

**Steps:**

- [ ] **Step 1: Editar frontmatter del master spec**

En `Docs/reference/events-v2-redesign-in-progress-v3.md` línea 5 (campo `updated`), cambiar:
```yaml
updated: 2026-04-26 (v3.1: lowercase fix + bd applied)
```
por:
```yaml
updated: 2026-04-27 (v3.2: cost code BD-1 applied + Q1-Q6 closed)
```

- [ ] **Step 2: Agregar Decisión 25 en Sección 2**

Localizar el final de la tabla en Sección 2 (después de Decisión 24 que se agregó en Cambio 1). Agregar fila:

```markdown
| 25 | 2026-04-27 | Cost code refactor decisiones cerradas en brainstorming: cascada extraída a hook custom `useCostCodeCascade(projectId, initialCostCodeId, initialCostCategoryId)`; prop `LineRow.costCodeDisplay` eliminado completo (cost_code se muestra solo en header); validación `validateForSend` requiere cost_code, edit de solicitud Enviada/Completada/Cancelada NO valida (preserva históricas con `cost_code_id=NULL`); helper `createSolicitud` en tests gana opt `costCode` (AD-5 fix mínimo, completo queda fuera) | Brainstorming + verificaciones V1-V3 con James/Chat |
```

- [ ] **Step 3: Reescribir bloque "BD" en Sección 3 Cambio 2**

Localizar el bloque ```sql en Sección 3 Cambio 2 que abre con `-- 1. Agregar columnas a sm_requests` y se cierra antes de `**IMPORTANTE:**`. Reemplazar el bloque entero (líneas 238-272 del master) por:

```markdown
**BD — Etapa BD-1 (aplicada por Chat el 2026-04-27, staging):**

```sql
ALTER TABLE sm_requests
  ADD COLUMN cost_code_id UUID REFERENCES cost_codes(id),
  ADD COLUMN cost_category_id UUID REFERENCES cost_categories(id);

UPDATE sm_requests sr
SET
  cost_code_id = (SELECT cost_code_id FROM sm_request_lines
                  WHERE request_id = sr.id ORDER BY line_number LIMIT 1),
  cost_category_id = (SELECT cost_category_id FROM sm_request_lines
                      WHERE request_id = sr.id ORDER BY line_number LIMIT 1);
```

Resultado: 6/6 solicitudes en staging migradas. Sanity check (líneas con cost_code distinto al de la primera): MATCH (0 inconsistencias). Solicitudes históricas con todas las líneas `cost_code_id=NULL` quedaron con `cost_code_id=NULL` en `sm_requests` (caso 24-404-SM-150 — solicitud Completada legacy, render `—` en displays).

**Verificación V1:** Trigger `generate_full_code()` dispara en tabla `cost_codes` (master), NO en `sm_request_lines`. Ningún otro trigger en `sm_request_lines` depende de `cost_code_id` o `cost_category_id`. BD-2 100% seguro.

**BD — Etapa BD-2 (pendiente, aplica Chat post-refactor de Code):**

```sql
ALTER TABLE sm_request_lines
  DROP COLUMN cost_code_id,
  DROP COLUMN cost_category_id;
```

Aplicar solo después de:
1. Code completa Tasks 1-7 (refactor commiteado, build verde, grep regression).
2. Code reporta a James que el código ya no lee `sm_request_lines.cost_code_id`/`cost_category_id`.
3. James confirma V3 (reportes externos no dependen de las columnas viejas).

Code regenera `database.ts` post-BD-2 en Task 8.
```

- [ ] **Step 4: Agregar CHANGELOG entry**

En `Docs/CHANGELOG.md`, agregar entry bajo `## 2026-04-27` (crear sección si no existe arriba de `## 2026-04-26`):

```markdown
## 2026-04-27
- [bd] Cambio 2 cost code Etapa BD-1 — `ALTER TABLE sm_requests ADD COLUMN cost_code_id UUID, cost_category_id UUID` aplicado en staging (`vonwkciosksqspyljzfy`) via Chat MCP. Data migrada con UPDATE desde primera línea de cada solicitud. Resultado: 6/6 solicitudes seteadas, sanity check MATCH (0 inconsistencias). Solicitud histórica `24-404-SM-150` quedó con `cost_code_id=NULL` (legacy Completada). Pendiente Etapa BD-2 (DROP COLUMN en `sm_request_lines`) post-refactor de Code. Trigger `generate_full_code()` verificado: dispara en tabla `cost_codes` master, no afectado por refactor.
```

- [ ] **Step 5: Commit**

```bash
git add Docs/reference/events-v2-redesign-in-progress-v3.md Docs/CHANGELOG.md
git commit -m "docs: spec v3.2 + CHANGELOG — Cambio 2 BD-1 applied + Q1-Q6 closed

Master spec actualizado:
- Frontmatter v3.2
- Sección 2 Decisión 25 (Q1-Q6 + V1)
- Sección 3 Cambio 2 BD block reescrito (BD-1 done, BD-2 pending)

CHANGELOG entry [bd] documentando ALTER TABLE sm_requests ADD
columnas cost_code_id, cost_category_id aplicado en staging.
6/6 solicitudes migradas, sanity MATCH ok.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Regenerar `database.ts` post-BD-1

**Goal:** Sincronizar tipos generados con staging (Etapa BD-1 ya aplicada). Verificar V2 (¿cost_code_categories tipada?). Restaurar helper `Row<T>` que el regen borra.

**Files:**
- Modify (regenerate): `src/lib/types/database.ts`

**Acceptance Criteria:**
- [ ] `database.ts` regenerado contra staging
- [ ] `sm_requests.Row` incluye `cost_code_id: string | null` y `cost_category_id: string | null`
- [ ] `sm_request_lines.Row` SIGUE TENIENDO `cost_code_id` y `cost_category_id` (pre-BD-2 — esperado)
- [ ] Helper `Row<T extends keyof Database['public']['Tables']>` restaurado al final del archivo
- [ ] V2 verificado: si `cost_code_categories` aparece como tabla tipada, reportar; si no, dejar comentario en código consumidor (LineEditor consumer desaparecerá en Task 4 igual)
- [ ] `npm run build` pasa

**Verify:**
```bash
grep -E "cost_code_id|cost_category_id" src/lib/types/database.ts | head -10
# Expected: matches en sm_requests Y sm_request_lines (BD-1 estado)
grep -E "cost_code_categories:" src/lib/types/database.ts
# Expected: si aparece, V2 pass (tabla tipada); si no, V2 ambiguo
npm run build
# Expected: pasa
```

**Steps:**

- [ ] **Step 1: Regenerar `database.ts` (stderr aislado)**

```bash
npx supabase gen types typescript --project-id vonwkciosksqspyljzfy 2>/dev/null > src/lib/types/database.ts
```

Verificar que la primera línea es `export type Json =` y NO un warning de npm. Si vino corrupto, repetir.

- [ ] **Step 2: Verificar columnas esperadas**

```bash
grep -A 3 "sm_requests:" src/lib/types/database.ts | head -20
```
Expected: dentro del `Row` de `sm_requests` aparecen `cost_code_id: string | null` y `cost_category_id: string | null`.

```bash
grep -A 3 "sm_request_lines:" src/lib/types/database.ts | head -20
```
Expected: dentro del `Row` de `sm_request_lines` SIGUEN apareciendo `cost_code_id` y `cost_category_id` (pre-BD-2).

- [ ] **Step 3: Verificar V2 (cost_code_categories tipada)**

```bash
grep "cost_code_categories:" src/lib/types/database.ts
```

Si aparece la línea (tipada como tabla regular): **V2 pass**. En Task 4 step E (LineEditor cleanup) la lógica con cast hack desaparecerá igual, así que V2 termina siendo informativo. Si no aparece: **V2 ambiguo** — reportar a James pero no bloquea (el cast hack se elimina junto con LineEditor cleanup).

- [ ] **Step 4: Restaurar helper `Row<T>` al final**

```bash
echo "" >> src/lib/types/database.ts
echo "// Helper type for row access" >> src/lib/types/database.ts
echo "export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']" >> src/lib/types/database.ts
tail -4 src/lib/types/database.ts
```
Expected output:
```
} as const

// Helper type for row access
export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
```

- [ ] **Step 5: Verificar build**

```bash
npm run build 2>&1 | grep -E "(error|Compiled|Failed)" | head -10
```
Expected: `✓ Compiled successfully in <time>`. Si hay errores TS por columnas inesperadas, reportar.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/database.ts
git commit -m "chore: regenerar database.ts post-BD-1 (cost_code en sm_requests)

Etapa BD-1 ya aplicada por Chat el 2026-04-27 en staging:
- sm_requests.Row gana cost_code_id, cost_category_id
- sm_request_lines.Row mantiene cost_code_id, cost_category_id
  (pre-BD-2, esperado)
- Row<T> helper restaurado al final

Build verde. V2 verificado: <pass/ambiguo según resultado de step 3>.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Hook `useCostCodeCascade` (nuevo archivo)

**Goal:** Crear el hook custom que encapsula la cascada `Proyecto → [Extra] → Fase → Categoría`. Hook standalone, no usado todavía (Task 4 lo consume). Esto permite isolation y commit atómico independiente.

**Files:**
- Create: `src/hooks/useCostCodeCascade.ts`

**Acceptance Criteria:**
- [ ] Hook acepta `projectId: string | null`, `initialCostCodeId?: string | null`, `initialCostCategoryId?: string | null`
- [ ] Hook retorna interface estable con `extraOptions`, `hasExtras`, `selectedExtraId`, `setSelectedExtraId`, `costCodeOptions`, `loadingCostCodes`, `categoryOptions`, `loadingCategories`, `costCodeId`, `setCostCodeId`, `costCategoryId`, `setCostCategoryId`, `loadingExtras`
- [ ] Reset cost_code+category cuando cambia projectId (para coherencia con LineEditor actual)
- [ ] Reset category cuando cambia costCodeId
- [ ] Detecta extra del costCode inicial al editar (si `initialCostCodeId` provisto y `hasExtras`)
- [ ] `npm run build` pasa
- [ ] Hook no se usa en ningún componente todavía (consumer en Task 4)

**Verify:**
```bash
ls src/hooks/useCostCodeCascade.ts
# Expected: file exists
npm run build
# Expected: pasa
```

**Steps:**

- [ ] **Step 1: Crear `src/hooks/useCostCodeCascade.ts`**

```typescript
'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SelectOption } from '@/components/ui/Select'

export interface UseCostCodeCascadeReturn {
  // Extras
  extraOptions: SelectOption[]
  hasExtras: boolean
  selectedExtraId: string | null
  setSelectedExtraId: (id: string | null) => void
  loadingExtras: boolean
  // Cost codes (filtrados por proyecto + extra)
  costCodeOptions: SelectOption[]
  loadingCostCodes: boolean
  costCodeId: string | null
  setCostCodeId: (id: string | null) => void
  // Cost categories (filtrados via cost_code_categories por costCodeId)
  categoryOptions: SelectOption[]
  loadingCategories: boolean
  costCategoryId: string | null
  setCostCategoryId: (id: string | null) => void
}

/**
 * Cascada Proyecto → [Extra] → Fase → Categoría para selección de cost_code.
 *
 * - Si el proyecto tiene extras (project_extras), `hasExtras=true` y se debe
 *   seleccionar uno antes de listar fases.
 * - Si no, las fases se listan directamente filtrando por `project_id` y
 *   `extra_id IS NULL`.
 * - Categorías se listan desde `cost_code_categories` filtrado por `costCodeId`.
 *
 * Reset behavior:
 * - Cambio de projectId → reset cost_code, category, extra
 * - Cambio de costCodeId → reset category
 *
 * Si se provee `initialCostCodeId` y el proyecto tiene extras, detecta el
 * extra correspondiente para hidratar `selectedExtraId` al editar.
 */
export function useCostCodeCascade(
  projectId: string | null,
  initialCostCodeId?: string | null,
  initialCostCategoryId?: string | null,
): UseCostCodeCascadeReturn {
  const supabase = useMemo(() => createClient(), [])

  // --- Estado público ---
  const [extraOptions, setExtraOptions] = useState<SelectOption[]>([])
  const [hasExtras, setHasExtras] = useState(false)
  const [selectedExtraId, setSelectedExtraId] = useState<string | null>(null)
  const [loadingExtras, setLoadingExtras] = useState(false)

  const [costCodeOptions, setCostCodeOptions] = useState<SelectOption[]>([])
  const [loadingCostCodes, setLoadingCostCodes] = useState(false)
  const [costCodeId, setCostCodeId] = useState<string | null>(initialCostCodeId ?? null)

  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [costCategoryId, setCostCategoryId] = useState<string | null>(initialCostCategoryId ?? null)

  // --- Reset al cambiar proyecto ---
  // (No resetea en mount cuando initialCostCodeId está provisto — lo respeta)
  useEffect(() => {
    if (!projectId) {
      setExtraOptions([])
      setHasExtras(false)
      setSelectedExtraId(null)
      setCostCodeOptions([])
      setCostCodeId(null)
      setCategoryOptions([])
      setCostCategoryId(null)
    }
  }, [projectId])

  // --- Fetch extras del proyecto ---
  useEffect(() => {
    if (!projectId) return

    let cancelled = false
    setLoadingExtras(true)

    ;(supabase.from.bind(supabase) as (table: string) => ReturnType<typeof supabase.from>)('project_extras')
      .select('id, code, description')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('code')
      .then(({ data }: { data: Array<{ id: string; code: string; description: string | null }> | null }) => {
        if (cancelled) return
        const extras = data ?? []
        if (extras.length > 0) {
          setExtraOptions(extras.map((e) => ({
            value: e.id,
            label: `${e.code} — ${e.description ?? e.code}`,
          })))
          setHasExtras(true)
          // Si NO estamos editando (no hay initialCostCodeId), reset extra
          if (!initialCostCodeId) {
            setSelectedExtraId(null)
          }
        } else {
          setExtraOptions([])
          setHasExtras(false)
          setSelectedExtraId(null)
        }
        setLoadingExtras(false)
      })

    return () => { cancelled = true }
  }, [projectId, supabase, initialCostCodeId])

  // --- Detectar extra del costCode inicial al editar ---
  useEffect(() => {
    if (!initialCostCodeId || !projectId || !hasExtras) return

    let cancelled = false
    supabase
      .from('cost_codes')
      .select('extra_id')
      .eq('id', initialCostCodeId)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        if (data?.extra_id) {
          setSelectedExtraId(data.extra_id as string)
        } else {
          setSelectedExtraId('__base__')
        }
      })

    return () => { cancelled = true }
  }, [initialCostCodeId, projectId, hasExtras, supabase])

  // --- Fetch cost codes filtrados por proyecto + extra ---
  useEffect(() => {
    if (!projectId) {
      setCostCodeOptions([])
      return
    }

    if (hasExtras && selectedExtraId === null && !loadingExtras) {
      setCostCodeOptions([])
      return
    }

    if (loadingExtras) return

    let cancelled = false
    setLoadingCostCodes(true)

    const query = supabase
      .from('cost_codes')
      .select('id, phase_code, phase_description, full_code, extra_id')
      .eq('project_id', projectId)
      .order('full_code')

    const extraFilter = selectedExtraId === '__base__' ? null : selectedExtraId
    const finalQuery = extraFilter
      ? query.eq('extra_id', extraFilter)
      : query.is('extra_id', null)

    finalQuery.then(({ data }) => {
      if (cancelled) return
      const options: SelectOption[] = (data ?? []).map((cc) => ({
        value: cc.id,
        label: cc.full_code
          ? `${cc.full_code} — ${cc.phase_description ?? ''}`
          : `${cc.phase_code} — ${cc.phase_description ?? ''}`,
      }))
      setCostCodeOptions(options)

      // Si el costCodeId actual no está en las opciones, resetear
      if (costCodeId && !options.some((o) => o.value === costCodeId)) {
        setCostCodeId(null)
        setCostCategoryId(null)
      }
      setLoadingCostCodes(false)
    })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, selectedExtraId, hasExtras, loadingExtras, supabase])

  // --- Fetch categorías cuando cambia costCodeId ---
  useEffect(() => {
    if (!costCodeId) {
      setCategoryOptions([])
      setCostCategoryId(null)
      return
    }

    let cancelled = false
    setLoadingCategories(true)

    // cost_code_categories puede no estar tipada en database.ts (V2 ambiguo).
    // El cast `as (table) => ...` se mantiene defensivo.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from.bind(supabase) as (table: string) => ReturnType<typeof supabase.from>)('cost_code_categories')
      .select('cost_category_id, cost_categories(id, code, description)')
      .eq('cost_code_id', costCodeId)
      .then(({ data }: { data: Array<{ cost_category_id: string; cost_categories: { id: string; code: string; description: string | null } | null }> | null }) => {
        if (cancelled) return
        const options: SelectOption[] = (data ?? [])
          .map((row) => {
            const cat = row.cost_categories
            if (!cat) return null
            return { value: cat.id, label: `${cat.code} — ${cat.description ?? cat.code}` }
          })
          .filter((opt): opt is SelectOption => opt !== null)
          .sort((a, b) => a.label.localeCompare(b.label))
        setCategoryOptions(options)

        if (costCategoryId && !options.some((o) => o.value === costCategoryId)) {
          setCostCategoryId(null)
        }
        setLoadingCategories(false)
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costCodeId, supabase])

  return {
    extraOptions,
    hasExtras,
    selectedExtraId,
    setSelectedExtraId,
    loadingExtras,
    costCodeOptions,
    loadingCostCodes,
    costCodeId,
    setCostCodeId,
    categoryOptions,
    loadingCategories,
    costCategoryId,
    setCostCategoryId,
  }
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | grep -E "(error|Compiled|Failed)" | head -5
```
Expected: pasa.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCostCodeCascade.ts
git commit -m "feat: hook useCostCodeCascade — cascada cost_code reusable

Encapsula los 3 fetches (project_extras, cost_codes, cost_code_categories)
+ estado de extras/fases/categorías + reset cuando cambia proyecto/extra.

Reset behavior:
- Cambio projectId → reset cost_code, category, extra, options
- Cambio costCodeId → reset category
- initialCostCodeId+hasExtras → detecta extra para hidratar al editar

Sin consumer todavía. Task 4 lo usa desde SolicitudForm.

Cast hack 'cost_code_categories' as untyped table mantenido (V2
ambiguo) — defensivo hasta que el tipo aparezca en database.ts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Refactor cost_code a nivel solicitud (atomic large)

**Goal:** Mover cost_code/cost_category de per-línea a per-solicitud en el data layer + UI atómicamente. Sin esto en un solo commit, build rompe entre commits intermedios.

**Files:**
- Modify: `src/hooks/useSolicitudes.ts` (tipos, queries, mappers, INSERT/UPDATE)
- Modify: `src/components/solicitudes/SolicitudForm.tsx` (state + Selectors + cascada via hook + propagate)
- Modify: `src/components/solicitudes/LineEditor.tsx` (eliminar todo lo de cost_code)
- Modify: `src/components/solicitudes/LineRow.tsx` (eliminar prop costCodeDisplay + render)
- Modify: `src/app/(app)/solicitudes/nueva/page.tsx` (eliminar carga local de costCodes, eliminar prop a LineRow, ajustar validateForSend, ajustar props a LineEditor + SolicitudForm)
- Modify: `src/app/(app)/solicitudes/[id]/page.tsx` (similar a nueva — initialData del SolicitudForm trae cost_code, validateForSend, mapper line→LineInput sin cost_code, props ajustadas)

**Acceptance Criteria:**
- [ ] `SolicitudInput` interface tiene `cost_code_id?: string | null` y `cost_category_id?: string | null` opcionales
- [ ] `SolicitudWithRelations` tiene `cost_code_id`, `cost_category_id`, `cost_code: { id, phase_code, phase_description, full_code } | null`, `cost_category: { id, code, description } | null`
- [ ] `LineInput` NO tiene `cost_code_id` ni `cost_category_id`
- [ ] `LineWithRelations` NO tiene `cost_code_id`, `cost_category_id`, `cost_code`, `cost_category`
- [ ] `fetchSolicitud` SELECT incluye JOIN `cost_code:cost_codes!sm_requests_cost_code_id_fkey(...)` y `cost_category:cost_categories!sm_requests_cost_category_id_fkey(...)` a nivel `sm_requests`. JOIN per-línea eliminado.
- [ ] `mapLineToInsert` no incluye `cost_code_id`/`cost_category_id`
- [ ] `createSolicitud` INSERT a `sm_requests` incluye `cost_code_id`/`cost_category_id` del `SolicitudInput`
- [ ] `updateSolicitud` header update incluye `cost_code_id`/`cost_category_id`. Line update NO los incluye.
- [ ] `SolicitudForm` consume `useCostCodeCascade(projectId, initialData?.costCodeId, initialData?.costCategoryId)` y renderiza Selectors Extra/Fase/Categoría en el header (después de "Aprobado por", antes de "Notas")
- [ ] SolicitudForm `propagate` incluye `cost_code_id` y `cost_category_id` en el `SolicitudInput`
- [ ] `LineEditor` SIN: state `costCodeId`/`costCategoryId`, useEffect cascada, cost_code Selectors JSX, validación cost_code/category, prop `costCodes`
- [ ] `LineRow` SIN: prop `costCodeDisplay`, render del costCode (líneas 51, 95-96, 211-212)
- [ ] `nueva/page.tsx`: carga local de `costCodes` ELIMINADA (el hook se encarga); `validateForSend` agrega `cost_code_id` y `cost_category_id` requeridos; prop `costCodeDisplay` a LineRow eliminado; prop `costCodes` a LineEditor eliminado
- [ ] `[id]/page.tsx`: similar; mapper `line.cost_code_id`/`cost_category_id` no se preserva al mapear a LineInput; `initialData` del SolicitudForm pasa `costCodeId`/`costCategoryId` desde `solicitud.cost_code_id`/`cost_category_id`
- [ ] `npm run build` pasa
- [ ] `grep -rn "line\.cost_code_id\|line\.cost_category_id" src/` retorna 0 matches

**Verify:**
```bash
grep -rn "line\.cost_code_id\|line\.cost_category_id" src/
# Expected: 0 matches
grep -rn "costCodeDisplay" src/
# Expected: 0 matches
npm run build
# Expected: pasa
```

**Steps:**

Esta task tiene 8 sub-bloques (A-H) que se ejecutan secuencialmente y se commitean al final como un solo commit. Build solo se verifica al final.

- [ ] **Step 4-A: Modificar tipos en `useSolicitudes.ts`**

En `src/hooks/useSolicitudes.ts`:

**A.1** — `SolicitudWithRelations` (línea 16). Agregar 4 campos después de `requester`:

```typescript
export interface SolicitudWithRelations {
  id: string
  request_id: string | null
  project_id: string
  requester_id: string
  approved_by: string | null
  date_required: string
  date_created: string | null
  date_submitted: string | null
  date_completed: string | null
  date_cancelled: string | null
  status: string
  priority: string | null
  notes: string | null
  attachments: unknown
  fulfillment_type: string | null
  cost_code_id: string | null
  cost_category_id: string | null
  created_at: string | null
  updated_at: string | null
  project: { id: string; code: string; name: string } | null
  requester: { id: string; name: string } | null
  cost_code: { id: string; phase_code: string; phase_description: string | null; full_code: string | null } | null
  cost_category: { id: string; code: string; description: string | null } | null
  lines: LineWithRelations[]
}
```

**A.2** — `LineWithRelations` (línea 39). Eliminar líneas 54-55 y 71-72:

Reemplazar el interface entero por:
```typescript
export interface LineWithRelations {
  id: string
  request_id: string
  line_number: number
  line_type: string
  equipment_id: string | null
  description: string
  equipment_text: string | null
  from_location_id: string | null
  from_text: string | null
  to_location_id: string | null
  to_text: string | null
  quantity: number
  unit_id: string | null
  unit_text: string | null
  category: string | null
  material_category: string | null
  po_reference: string | null
  notes: string | null
  status: string
  qty_scheduled: number | null
  qty_delivered: number | null
  designated_receiver_id: string | null
  designated_receiver_name: string | null
  created_at: string
  updated_at: string
  equipment: { id: string; spectrum_code: string | null; description: string } | null
  from_location: { id: string; name: string } | null
  to_location: { id: string; name: string } | null
  unit: { id: string; code: string; description: string | null } | null
}
```

**A.3** — `SolicitudInput` (línea 75). Agregar 2 campos opcionales:

```typescript
export interface SolicitudInput {
  project_id: string
  requester_id: string
  approved_by?: string | null
  date_required: string
  notes?: string | null
  attachments?: unknown[] | null
  fulfillment_type?: string | null
  cost_code_id?: string | null
  cost_category_id?: string | null
}
```

**A.4** — `LineInput` (línea 85). Eliminar líneas 98-99:

```typescript
export interface LineInput {
  id?: string
  line_type: 'Equipo' | 'Material'
  equipment_id: string | null
  equipment_text: string | null
  description: string
  from_location_id: string | null
  from_text: string | null
  to_location_id: string | null
  to_text: string | null
  quantity: number
  unit_id: string | null
  unit_text: string | null
  category: string | null
  material_category: string | null
  po_reference: string | null
  notes: string | null
  designated_receiver_id?: string | null
  designated_receiver_name?: string | null
}
```

- [ ] **Step 4-B: Actualizar queries y mappers en `useSolicitudes.ts`**

**B.1** — `fetchSolicitud` SELECT (líneas 366-385). Reemplazar el bloque entero del select template:

```typescript
const fetchSolicitud = useCallback(
  async (id: string): Promise<SolicitudWithRelations | null> => {
    const { data, error } = await supabase
      .from('sm_requests')
      .select(`
        *,
        project:projects!sm_requests_project_id_fkey(id, code, name),
        requester:people!sm_requests_requester_id_fkey(id, name),
        cost_code:cost_codes!sm_requests_cost_code_id_fkey(id, phase_code, phase_description, full_code),
        cost_category:cost_categories!sm_requests_cost_category_id_fkey(id, code, description),
        lines:sm_request_lines(
          *,
          equipment:equipment!sm_request_lines_equipment_id_fkey(id, spectrum_code, description),
          from_location:locations!sm_request_lines_from_location_id_fkey(id, name),
          to_location:locations!sm_request_lines_to_location_id_fkey(id, name),
          unit:units!sm_request_lines_unit_id_fkey(id, code, description)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }
    // ... resto del mapper sigue
```

NOTA: el FK exacto puede llamarse `sm_requests_cost_code_id_fkey` o variante. Verificar con un fetch de prueba si falla. Alternativa segura: usar el nombre de la columna directamente: `cost_code:cost_code_id(id, phase_code, phase_description, full_code)`.

**B.2** — Mapper de línea en `fetchSolicitud` (líneas 401-444). Eliminar las 4 líneas que asignan cost_code:

```typescript
// Mapear lineas con sus relaciones
const lines: LineWithRelations[] = sortedLines.map((rawLine) => {
  const line = rawLine as Record<string, unknown>
  const eq = line.equipment as LineWithRelations['equipment']
  const fromLoc = line.from_location as LineWithRelations['from_location']
  const toLoc = line.to_location as LineWithRelations['to_location']
  const unit = line.unit as LineWithRelations['unit']
  // (sin cost_code/cost_category — eliminados)

  return {
    id: line.id as string,
    request_id: line.request_id as string,
    line_number: line.line_number as number,
    line_type: line.line_type as string,
    equipment_id: (line.equipment_id as string | null) ?? null,
    description: line.description as string,
    equipment_text: (line.equipment_text as string | null) ?? null,
    from_location_id: (line.from_location_id as string | null) ?? null,
    from_text: (line.from_text as string | null) ?? null,
    to_location_id: (line.to_location_id as string | null) ?? null,
    to_text: (line.to_text as string | null) ?? null,
    quantity: line.quantity as number,
    unit_id: (line.unit_id as string | null) ?? null,
    unit_text: (line.unit_text as string | null) ?? null,
    // (sin cost_code_id, cost_category_id — eliminados)
    category: (line.category as string | null) ?? null,
    material_category: (line.material_category as string | null) ?? null,
    po_reference: (line.po_reference as string | null) ?? null,
    notes: (line.notes as string | null) ?? null,
    designated_receiver_id: (line.designated_receiver_id as string | null) ?? null,
    designated_receiver_name: (line.designated_receiver_name as string | null) ?? null,
    status: line.status as string,
    qty_scheduled: (line.qty_scheduled as number | null) ?? null,
    qty_delivered: (line.qty_delivered as number | null) ?? null,
    created_at: line.created_at as string,
    updated_at: line.updated_at as string,
    equipment: eq ? (Array.isArray(eq) ? eq[0] : eq) : null,
    from_location: fromLoc ? (Array.isArray(fromLoc) ? fromLoc[0] : fromLoc) : null,
    to_location: toLoc ? (Array.isArray(toLoc) ? toLoc[0] : toLoc) : null,
    unit: unit ? (Array.isArray(unit) ? unit[0] : unit) : null,
  }
})
```

**B.3** — Mapper de solicitud en `fetchSolicitud` (líneas 447 onwards). Agregar mapper de cost_code al return de la solicitud:

```typescript
const costCode = data.cost_code as SolicitudWithRelations['cost_code'] | SolicitudWithRelations['cost_code'][]
const costCategory = data.cost_category as SolicitudWithRelations['cost_category'] | SolicitudWithRelations['cost_category'][]

return {
  id: data.id,
  request_id: data.request_id,
  project_id: data.project_id,
  requester_id: data.requester_id,
  approved_by: data.approved_by ?? null,
  date_required: data.date_required,
  date_created: data.date_created ?? null,
  date_submitted: data.date_submitted ?? null,
  date_completed: data.date_completed ?? null,
  date_cancelled: data.date_cancelled ?? null,
  status: data.status,
  priority: data.priority ?? null,
  notes: data.notes ?? null,
  attachments: data.attachments,
  fulfillment_type: data.fulfillment_type ?? null,
  cost_code_id: (data.cost_code_id as string | null) ?? null,
  cost_category_id: (data.cost_category_id as string | null) ?? null,
  created_at: data.created_at ?? null,
  updated_at: data.updated_at ?? null,
  project: project ? (Array.isArray(project) ? project[0] : project) : null,
  requester: requester ? (Array.isArray(requester) ? requester[0] : requester) : null,
  cost_code: costCode ? (Array.isArray(costCode) ? costCode[0] : costCode) : null,
  cost_category: costCategory ? (Array.isArray(costCategory) ? costCategory[0] : costCategory) : null,
  lines,
}
```

NOTA: el código actual del fetchSolicitud puede tener un return más simple. Adaptar manteniendo el patrón.

**B.4** — `mapLineToInsert` (líneas 213-233). Eliminar las 2 líneas de cost_code:

```typescript
function mapLineToInsert(line: LineInput, requestId: string, lineNumber: number) {
  return {
    request_id: requestId,
    line_number: lineNumber,
    line_type: line.line_type,
    equipment_id: line.equipment_id,
    equipment_text: line.equipment_text,
    description: line.description,
    from_location_id: line.from_location_id,
    from_text: line.from_text,
    to_location_id: line.to_location_id,
    to_text: line.to_text,
    quantity: line.quantity,
    unit_id: line.unit_id,
    unit_text: line.unit_text,
    // (sin cost_code_id, cost_category_id)
    category: line.category,
    material_category: line.material_category,
    po_reference: line.po_reference,
    notes: line.notes,
    designated_receiver_id: line.designated_receiver_id ?? null,
    designated_receiver_name: line.designated_receiver_name ?? null,
  }
}
```

**B.5** — `createSolicitud` INSERT del header. Localizar el INSERT a `sm_requests`. Agregar `cost_code_id` y `cost_category_id` al objeto. El INSERT actual probablemente tiene un patrón como:

```typescript
const { data: newRequest, error: createError } = await supabase
  .from('sm_requests')
  .insert({
    project_id: header.project_id,
    requester_id: header.requester_id,
    approved_by: header.approved_by ?? null,
    date_required: header.date_required,
    notes: header.notes ?? null,
    attachments: header.attachments ?? null,
    fulfillment_type: header.fulfillment_type ?? 'fleet',
    cost_code_id: header.cost_code_id ?? null,
    cost_category_id: header.cost_category_id ?? null,
    status: 'Borrador',
    created_by: personId ?? null,
  })
  .select('id')
  .single()
```

Buscar las líneas que hacen `.from('sm_requests').insert({...})` en `createSolicitud` (alrededor de línea 470-510 según offset). Agregar las 2 propiedades.

**B.6** — `updateSolicitud` header update (líneas 600-608). Agregar 2 condicionales:

```typescript
const headerUpdate: Record<string, unknown> = {}
if (header.project_id !== undefined) headerUpdate.project_id = header.project_id
if (header.requester_id !== undefined) headerUpdate.requester_id = header.requester_id
if (header.approved_by !== undefined) headerUpdate.approved_by = header.approved_by
if (header.date_required !== undefined) headerUpdate.date_required = header.date_required
if (header.notes !== undefined) headerUpdate.notes = header.notes
if (header.attachments !== undefined) headerUpdate.attachments = header.attachments
if (header.fulfillment_type !== undefined) headerUpdate.fulfillment_type = header.fulfillment_type
if (header.cost_code_id !== undefined) headerUpdate.cost_code_id = header.cost_code_id
if (header.cost_category_id !== undefined) headerUpdate.cost_category_id = header.cost_category_id
if (personId) headerUpdate.updated_by = personId
```

**B.7** — `updateSolicitud` line update (líneas 668-669). Eliminar las 2 líneas de cost_code:

```typescript
const lineUpdate: Record<string, unknown> = {
  line_type: line.line_type,
  equipment_id: line.equipment_id,
  equipment_text: line.equipment_text,
  description: line.description,
  from_location_id: line.from_location_id,
  from_text: line.from_text,
  to_location_id: line.to_location_id,
  to_text: line.to_text,
  quantity: line.quantity,
  unit_id: line.unit_id,
  unit_text: line.unit_text,
  // (sin cost_code_id, cost_category_id)
  category: line.category,
  material_category: line.material_category,
  po_reference: line.po_reference,
  notes: line.notes,
  designated_receiver_id: line.designated_receiver_id ?? null,
  designated_receiver_name: line.designated_receiver_name ?? null,
}
```

- [ ] **Step 4-C: Actualizar `SolicitudForm.tsx`**

**C.1** — Imports: agregar `useCostCodeCascade` y `Select`:

```typescript
import { Select, type SelectOption } from '@/components/ui/Select'
import { useCostCodeCascade } from '@/hooks/useCostCodeCascade'
```

(Select ya estaba importado.)

**C.2** — Extender `initialData` (líneas 17-31) con campos opcionales:

```typescript
initialData?: {
  requestId?: string | null
  projectId: string
  requesterId: string
  approvedBy: string | null
  dateRequired: string
  dateCreated?: string
  notes: string | null
  status: string
  priority: string | null
  dateSubmitted?: string | null
  dateCompleted?: string | null
  dateCancelled?: string | null
  fulfillmentType?: string | null
  costCodeId?: string | null
  costCategoryId?: string | null
}
```

**C.3** — Dentro del componente, después de `const [fulfillmentType, setFulfillmentType] = useState...`, consumir el hook:

```typescript
const cascade = useCostCodeCascade(
  projectId || null,
  initialData?.costCodeId ?? null,
  initialData?.costCategoryId ?? null,
)
```

**C.4** — Actualizar `propagate` (líneas 85-99) para incluir cost_code:

```typescript
const propagate = useCallback(
  (overrides?: Partial<SolicitudInput>) => {
    const data: SolicitudInput = {
      project_id: overrides?.project_id ?? projectId,
      requester_id: overrides?.requester_id ?? requesterId,
      approved_by: overrides?.approved_by !== undefined ? overrides.approved_by : approvedBy,
      date_required: overrides?.date_required ?? dateRequired,
      notes: overrides?.notes !== undefined ? overrides.notes : notes || null,
      attachments: overrides?.attachments !== undefined ? overrides.attachments : attachments,
      fulfillment_type: overrides?.fulfillment_type ?? fulfillmentType,
      cost_code_id: overrides?.cost_code_id !== undefined ? overrides.cost_code_id : cascade.costCodeId,
      cost_category_id: overrides?.cost_category_id !== undefined ? overrides.cost_category_id : cascade.costCategoryId,
    }
    onChange(data)
  },
  [projectId, requesterId, approvedBy, dateRequired, notes, attachments, fulfillmentType, cascade.costCodeId, cascade.costCategoryId, onChange],
)
```

**C.5** — Agregar useEffect que propaga cuando cambia el cost_code:

```typescript
// Propagar cuando cambia el cost_code o category (cascada interna)
useEffect(() => {
  propagate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [cascade.costCodeId, cascade.costCategoryId])
```

**C.6** — Agregar handlers para cost_code y cost_category (modificar el setter del cascade para que dispare propagate inmediato):

NOTA: como `propagate` ya consume `cascade.costCodeId` y `cascade.costCategoryId` y el useEffect de C.5 dispara propagate cuando cambian, NO necesitamos handlers especiales. El usuario llama `cascade.setCostCodeId(val)` directamente desde el JSX `onChange` y el useEffect propaga.

**C.7** — Agregar JSX de los Selectors al header. Localizar el grid `<div className="grid grid-cols-1 gap-4 md:grid-cols-2">` (línea 188). Después del Select "Aprobado por" (línea 224-232) y antes del Input "Fecha Requerida" (línea 234), insertar el bloque de Selectors:

```tsx
{/* Cost code header — cascada Proyecto → [Extra] → Fase → Categoría */}
{cascade.hasExtras && (
  <Select
    label="Extra / Sección *"
    placeholder={cascade.loadingExtras ? 'Cargando...' : 'Seleccionar extra...'}
    options={[
      { value: '__base__', label: '(Proyecto Base)' },
      ...cascade.extraOptions,
    ]}
    value={cascade.selectedExtraId}
    onChange={(val) => cascade.setSelectedExtraId(val)}
    disabled={isReadonly || cascade.loadingExtras}
  />
)}

<Select
  label="Fase / Código de Costo *"
  placeholder={
    cascade.loadingCostCodes
      ? 'Cargando...'
      : cascade.hasExtras && !cascade.selectedExtraId
        ? 'Seleccione un extra primero'
        : 'Seleccionar fase...'
  }
  options={cascade.costCodeOptions}
  value={cascade.costCodeId}
  onChange={(val) => cascade.setCostCodeId(val)}
  disabled={isReadonly || cascade.loadingCostCodes || (cascade.hasExtras && !cascade.selectedExtraId)}
  searchable
/>

<Select
  label="Categoría de Costo *"
  placeholder={
    cascade.loadingCategories
      ? 'Cargando...'
      : cascade.costCodeId
        ? 'Seleccionar categoría...'
        : 'Seleccione una fase primero'
  }
  options={cascade.categoryOptions}
  value={cascade.costCategoryId}
  onChange={(val) => cascade.setCostCategoryId(val)}
  disabled={isReadonly || !cascade.costCodeId || cascade.loadingCategories}
/>
```

**C.8** — Reset cost_code cuando cambia el proyecto: el hook YA hace reset al cambiar `projectId`. La cascada usa `useState` con default null, y el effect de "Reset al cambiar proyecto" en `useCostCodeCascade` lo limpia. Sin acción extra.

- [ ] **Step 4-D: Limpiar `LineEditor.tsx`**

**D.1** — Eliminar el prop `costCodes` de `LineEditorProps` (línea 24):
```typescript
// Eliminar: costCodes: SelectOption[]
```

**D.2** — Eliminar `costCodes` del destructuring (línea 58):
```typescript
function LineEditor({
  equipment,
  locations,
  units,
  // (sin costCodes)
  projectId,
  initialData,
  isEditing,
  onSave,
  onCancel,
  onCheckDuplicates,
}: LineEditorProps) {
```

**D.3** — Eliminar useState `costCodeId` y `costCategoryId` (líneas 96-101):

```typescript
// Eliminar:
//   const [costCodeId, setCostCodeId] = useState<string | null>(initialData?.cost_code_id ?? null)
//   const [costCategoryId, setCostCategoryId] = useState<string | null>(initialData?.cost_category_id ?? null)
```

**D.4** — Eliminar TODO el bloque de cascada (extras, cost_codes filtrados, categorías). Líneas 109-283:

```typescript
// Eliminar:
//   - useState extraOptions, selectedExtraId, hasExtras, loadingExtras, filteredCostCodes, loadingCostCodes, categoryOptions, loadingCategories
//   - useEffect "Fetch extras del proyecto"
//   - useEffect "Fetch cost codes filtrados"
//   - useEffect "Detectar extra del costCode inicial"
//   - useEffect "Fetch categorias cuando cambia fase"
```

**D.5** — Eliminar `cost_code_id` y `cost_category_id` del payload de `handleSave` (líneas 341-342):

Localizar la función `handleSave` que hace `onSave({ ... })`. Quitar las 2 propiedades:

```typescript
onSave({
  id: initialData?.id,
  line_type: lineType,
  equipment_id: equipmentValue.id,
  equipment_text: equipmentValue.text,
  description: description.trim(),
  from_location_id: fromValue.id,
  from_text: fromValue.text,
  to_location_id: toValue.id,
  to_text: toValue.text,
  quantity: parseFloat(quantity) || 0,
  unit_id: unitValue.id,
  unit_text: unitValue.text,
  // (sin cost_code_id, cost_category_id)
  category: null,
  material_category: materialCategory,
  po_reference: poReference || null,
  notes: lineNotes || null,
})
```

**D.6** — Eliminar la dependencia de `useCallback` para `handleSave` (línea 359-360 aprox): quitar `costCodeId` y `costCategoryId` del array.

**D.7** — Eliminar la validación per-línea (líneas 396-405):

```typescript
// Eliminar:
//   if (!costCodeId) { newErrors.cost_code = ... }
//   if (!costCategoryId) { newErrors.cost_category = ... }
// Y eliminar costCodeId, costCategoryId de las deps del useCallback de validate (línea 405).
```

**D.8** — Eliminar el JSX de los 4 elementos cost_code en el render (líneas 572-607 aprox):

```typescript
// Eliminar:
//   - {hasExtras && <Select label="Extra / Sección *" ...>}
//   - <Select label="Fase / Código de Costo *" .../>
//   - <Select label="Categoría de Costo *" .../>
```

NOTA: el campo "Referencia OC" (línea 609-614) se MANTIENE — es per-línea (no per-solicitud).

**D.9** — Eliminar handler `handleExtraChange` y `handleCostCodeChange` si existen (eran para resetear category y cascada). Si no existen como handlers separados, omitir.

- [ ] **Step 4-E: Limpiar `LineRow.tsx`**

**E.1** — Eliminar `costCodeDisplay?: string` del interface (línea 22).

**E.2** — Eliminar `costCodeDisplay` del destructuring (línea 42).

**E.3** — Eliminar la línea `const costCode = costCodeDisplay ?? '—'` (línea 51).

**E.4** — Eliminar el render mono-spaced del costCode en desktop (líneas 95-96):
```typescript
// Eliminar:
//   <span className="shrink-0 font-mono text-xs text-iconsa-gray" title={costCode}>
//     {costCode}
//   </span>
```

**E.5** — Eliminar el render mobile del costCode (líneas 211-213):
```typescript
// Eliminar:
//   {costCode !== '—' && (
//     <span className="font-mono text-iconsa-gray">{costCode}</span>
//   )}
```

- [ ] **Step 4-F: Actualizar `nueva/page.tsx`**

**F.1** — Eliminar el state `costCodes` y su useEffect de carga (líneas 68 + 119-134):

```typescript
// Eliminar:
//   const [costCodes, setCostCodes] = useState<CostCodeRow[]>([])
//   useEffect(() => { async function fetchCostCodes() { ... } }, [supabase, header.project_id])
//   const costCodeOptions: SelectOption[] = useMemo(() => { ... }, [costCodes]) — línea 186-192
```

NOTA: el tipo `CostCodeRow` se importa de algún lado. Si después del cleanup queda import sin usar, eliminarlo.

**F.2** — `validateForSend` (líneas 271-288). Agregar requerimientos cost_code:

```typescript
const validateForSend = useCallback((): boolean => {
  const errors: Record<string, string> = {}
  if (!header.project_id) errors.project = 'Seleccione un proyecto'
  if (!header.requester_id) errors.requester = 'Seleccione el solicitante'
  if (!header.date_required) {
    errors.date = 'Ingrese la fecha requerida'
  } else if (role !== 'admin') {
    const today = new Date().toISOString().split('T')[0]
    if (header.date_required < today) {
      errors.date = 'La fecha requerida no puede ser en el pasado'
    }
  }
  if (lines.length === 0) {
    errors.lines = 'Agregue al menos una linea a la solicitud'
  }
  if (!header.cost_code_id) {
    errors.cost_code = 'Seleccione el código de costo (Fase)'
  }
  if (!header.cost_category_id) {
    errors.cost_category = 'Seleccione la categoría de costo'
  }
  setHeaderErrors(errors)
  return Object.keys(errors).length === 0
}, [header.project_id, header.requester_id, header.date_required, header.cost_code_id, header.cost_category_id, lines.length])
```

**F.3** — Eliminar prop `costCodes={costCodeOptions}` de LineEditor invocaciones (líneas 473 aprox).

**F.4** — Eliminar prop `costCodeDisplay={...}` de LineRow invocaciones (línea 460):

```typescript
// Eliminar:
//   costCodeDisplay={getDisplayName(costCodeOptions, line.cost_code_id)}
```

**F.5** — Si `getDisplayName` queda sin uso post-cleanup, eliminar import + funcion local si existe.

- [ ] **Step 4-G: Actualizar `[id]/page.tsx`**

**G.1** — Mapper `line` → `LineInput` (líneas 50-51):

```typescript
// Eliminar:
//   cost_code_id: line.cost_code_id,
//   cost_category_id: line.cost_category_id,
```

**G.2** — Eliminar state `costCodes` (línea 118) y su useEffect (líneas 274 aprox).

**G.3** — Si hay `costCodeDisplay` calculado en el mapper (línea 480-482 aprox: `costCodeDisplay: (() => { ... })()`):

```typescript
// Eliminar el bloque entero costCodeDisplay del mapper de display props (línea 480-482)
```

**G.4** — Eliminar prop `costCodes={costCodes}` de LineEditor invocaciones (líneas 664, 681).

**G.5** — Eliminar prop `costCodeDisplay={names.costCodeDisplay}` de LineRow invocación (línea 650).

**G.6** — `initialData` del SolicitudForm: agregar `costCodeId` y `costCategoryId` desde la solicitud cargada. Localizar donde se construye el `initialData` para `<SolicitudForm initialData={...}>`. Agregar:

```typescript
const solicitudInitialData = {
  requestId: solicitud?.request_id,
  projectId: solicitud?.project_id ?? '',
  requesterId: solicitud?.requester_id ?? '',
  approvedBy: solicitud?.approved_by ?? null,
  dateRequired: solicitud?.date_required ?? '',
  // ... otros campos existentes
  costCodeId: solicitud?.cost_code_id ?? null,
  costCategoryId: solicitud?.cost_category_id ?? null,
}
```

**G.7** — `validateForSend` en `[id]/page.tsx`: si existe (probable que sí), aplicar mismo cambio que F.2.

**G.8** — Si en `[id]/page.tsx` hay un mapper `solicitud → SolicitudInput` para el handleSave/update, agregar `cost_code_id` y `cost_category_id`. Buscar `header` o `headerData` en el archivo.

- [ ] **Step 4-H: Build verde + grep**

```bash
npm run build 2>&1 | grep -E "(error|Compiled|Failed)" | head -10
```
Expected: pasa.

```bash
grep -rn "line\.cost_code_id\|line\.cost_category_id\|costCodeDisplay" src/
```
Expected: 0 matches.

```bash
grep -rn "cost_code_id\|cost_category_id" src/components/solicitudes/LineEditor.tsx src/components/solicitudes/LineRow.tsx
```
Expected: 0 matches.

```bash
grep -n "cost_code_id" src/hooks/useSolicitudes.ts
```
Expected: matches en `SolicitudInput.cost_code_id`, `SolicitudWithRelations.cost_code_id`, header insert/update — pero NO en `LineInput`, `LineWithRelations`, `mapLineToInsert`, line update.

- [ ] **Step 4-I: Commit (Task 4 atomic)**

```bash
git add src/hooks/useSolicitudes.ts src/components/solicitudes/SolicitudForm.tsx src/components/solicitudes/LineEditor.tsx src/components/solicitudes/LineRow.tsx "src/app/(app)/solicitudes/nueva/page.tsx" "src/app/(app)/solicitudes/[id]/page.tsx"
git commit -m "feat: cost code refactor a nivel solicitud (atomic)

Mueve cost_code_id y cost_category_id de sm_request_lines a
sm_requests. Cierra J9 del BACKLOG.

Data layer (useSolicitudes.ts):
- SolicitudInput gana cost_code_id, cost_category_id opcionales
- SolicitudWithRelations gana cost_code_id, cost_category_id +
  JOINs cost_code, cost_category
- LineInput pierde cost_code_id, cost_category_id
- LineWithRelations pierde cost_code_id, cost_category_id,
  cost_code, cost_category
- fetchSolicitud SELECT con JOIN sm_requests cost_code/category;
  JOIN per-línea eliminado
- mapLineToInsert sin cost_code_id/cost_category_id
- createSolicitud INSERT a sm_requests con cost_code/category
- updateSolicitud header update con cost_code/category;
  line update sin

UI (componentes solicitudes):
- SolicitudForm consume hook useCostCodeCascade y muestra
  Selectors Extra/Fase/Categoría en header (cascada)
- propagate() incluye cost_code_id, cost_category_id
- LineEditor pierde state, cascada (4 useEffects), Selectors,
  validación per-línea, prop costCodes (~150 líneas eliminadas)
- LineRow pierde prop costCodeDisplay y render del costCode

Páginas:
- nueva/page.tsx: carga local de costCodes eliminada;
  validateForSend requiere cost_code_id y cost_category_id;
  prop costCodeDisplay eliminado de LineRow; prop costCodes
  eliminado de LineEditor
- [id]/page.tsx: mapper line→LineInput sin cost_code;
  initialData del SolicitudForm pasa costCodeId/costCategoryId;
  validateForSend igual que nueva; prop costCodeDisplay y
  costCodes eliminados

Cobertura edge cases:
- Solicitudes históricas con cost_code_id=NULL renderean
  '—' sin crashear
- Validación bloquea solo Borrador→Enviada (Q5)
- Cambio de proyecto resetea cost_code/category via hook (E1)
- Selectors readonly via disabled={isReadonly} (Q4)

Build verde. Grep regression: 0 matches en
'line.cost_code_id', 'line.cost_category_id', 'costCodeDisplay'.

BD-2 (DROP cost_code_id/cost_category_id de sm_request_lines)
queda pendiente para Chat post-Task 7 verification.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Cleanup `useTrips.BacklogLine.cost_code_id` (código muerto)

**Goal:** Eliminar el campo `cost_code_id` del tipo `BacklogLine` en `useTrips.ts` (código muerto sin consumers) + el literal hardcoded en `programacion/viaje/[id]/page.tsx:451`.

**Files:**
- Modify: `src/hooks/useTrips.ts` (tipo BacklogLine + SELECT + mapper)
- Modify: `src/app/(app)/programacion/viaje/[id]/page.tsx` (literal hardcoded en mapper)

**Acceptance Criteria:**
- [ ] `BacklogLine` interface en `useTrips.ts` SIN `cost_code_id`
- [ ] SELECT del backlog en `useTrips.ts` sin `cost_code_id`
- [ ] Mapper de backlog en `useTrips.ts` sin `cost_code_id`
- [ ] `programacion/viaje/[id]/page.tsx:451` literal sin `cost_code_id: null`
- [ ] `npm run build` pasa
- [ ] `grep -n "cost_code_id" src/hooks/useTrips.ts src/app/\(app\)/programacion/viaje/\[id\]/page.tsx` retorna 0 matches

**Verify:**
```bash
grep -n "cost_code_id" src/hooks/useTrips.ts "src/app/(app)/programacion/viaje/[id]/page.tsx"
# Expected: 0 matches
npm run build
# Expected: pasa
```

**Steps:**

- [ ] **Step 1: Eliminar `cost_code_id` del tipo `BacklogLine` en `useTrips.ts`**

Línea 31 del archivo:
```typescript
// Eliminar:
//   cost_code_id: string | null
```

- [ ] **Step 2: Eliminar `cost_code_id` del SELECT del backlog**

Línea 455 (dentro del SELECT del backlog):
```typescript
// Eliminar la línea:
//   cost_code_id,
```

- [ ] **Step 3: Eliminar `cost_code_id` del mapper del backlog**

Línea 524:
```typescript
// Eliminar:
//   cost_code_id: (row.cost_code_id as string | null) ?? null,
```

- [ ] **Step 4: Eliminar `cost_code_id` del literal en `programacion/viaje/[id]/page.tsx:451`**

```typescript
// Eliminar:
//   cost_code_id: null,
```

NOTA: También se puede eliminar la línea inmediatamente siguiente `category: null` si forma parte del mismo bloque obsoleto — verificar contexto. El literal construye un `BacklogLine` parcial; mientras el tipo nuevo no requiera `category`, eliminar.

- [ ] **Step 5: Verificar build + grep**

```bash
npm run build 2>&1 | grep -E "(error|Compiled|Failed)" | head -5
```
Expected: pasa.

```bash
grep -n "cost_code_id" src/hooks/useTrips.ts "src/app/(app)/programacion/viaje/[id]/page.tsx"
```
Expected: 0 matches.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useTrips.ts "src/app/(app)/programacion/viaje/[id]/page.tsx"
git commit -m "chore: eliminar BacklogLine.cost_code_id (código muerto)

cost_code_id estaba en BacklogLine pero ningún consumer lo leía.
Era código muerto desde antes — Cambio 2 lo aprovecha para limpiar.

Cambios:
- useTrips.BacklogLine sin cost_code_id (tipo)
- SELECT backlog sin cost_code_id
- Mapper backlog sin cost_code_id
- programacion/viaje/[id]/page.tsx mapper literal sin cost_code_id: null

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Helper `createSolicitud` — opt `costCode` para header

**Goal:** Arreglar `tests/helpers.ts:createSolicitud` para que setee cost_code en el header (necesario porque la nueva validación bloquea Borrador→Enviada sin cost_code). Fix mínimo (Q6); AD-5 completo queda fuera.

**Files:**
- Modify: `tests/helpers.ts` (helper createSolicitud)

**Acceptance Criteria:**
- [ ] `createSolicitud` acepta opt `costCode?: { extra?: RegExp; fase: RegExp; categoria: RegExp }` opcional
- [ ] Si se provee, llena los Selectors del header en orden: Extra (si visible) → Fase → Categoría
- [ ] Si no se provee, helper imprime warning a consola pero no bloquea (tests legacy que no setean cost_code seguirán fallando al enviar — escalonable)
- [ ] `npm run build` pasa
- [ ] tests/helpers.ts no tiene `stopType` ni `cost_code_id` (manteniendo grep limpio)

**Verify:**
```bash
grep -n "costCode\b" tests/helpers.ts
# Expected: matches en signature y dentro de la función
npm run build
# Expected: pasa
```

**Steps:**

- [ ] **Step 1: Modificar firma de `createSolicitud`**

Localizar la firma del helper (línea 66-82 del archivo). Agregar el campo `costCode` después de `lines`:

```typescript
export async function createSolicitud(
  page: Page,
  opts: {
    project?: RegExp
    date?: string
    lines: Array<{
      type: 'Equipo' | 'Material'
      equipmentSearch?: string
      description?: string
      from: string | { dropdown: RegExp }
      to: string | { dropdown: RegExp }
      quantity?: number
      unit?: RegExp
    }>
    /**
     * Cost code del header. Después del Cambio 2, la validación bloquea
     * Borrador→Enviada sin cost_code. Si se omite, el helper hace warn y los
     * envíos posteriores fallarán salvo que el test lo seteé manualmente.
     */
    costCode?: {
      extra?: RegExp
      fase: RegExp
      categoria: RegExp
    }
    send?: boolean
  },
): Promise<{ dbId: string; displayId: string }> {
```

- [ ] **Step 2: Agregar lógica de selección del cost_code después de "Set date" y antes del loop de líneas**

Localizar la parte que hace `await page.getByRole('textbox', { name: 'Fecha Requerida' }).fill(...)` (línea 91 aprox). Inmediatamente después:

```typescript
// Cost code header (Cambio 2 — required para envío)
if (opts.costCode) {
  // Esperar render de los Selectors del header (depende del proyecto)
  await page.waitForTimeout(800)

  // Extra (solo si el proyecto tiene extras y la opt lo provee)
  if (opts.costCode.extra) {
    await pick(page, /Extra \/ Sección/, opts.costCode.extra)
    await page.waitForTimeout(400)
  }

  // Fase
  await pick(page, /Fase \/ Código de Costo/, opts.costCode.fase)
  await page.waitForTimeout(400)

  // Categoría
  await pick(page, /Categoría de Costo/, opts.costCode.categoria)
  await page.waitForTimeout(300)
} else {
  // eslint-disable-next-line no-console
  console.warn('[createSolicitud] No costCode provisto. El envío Borrador→Enviada fallará por validación cost_code requerido.')
}
```

NOTA: el helper `pick(page, label, value)` ya existe en `tests/helpers.ts` (usado para project/from/to). Reutilizarlo.

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | grep -E "(error|Compiled|Failed)" | head -5
```
Expected: pasa. (Build no compila tests, pero sí valida TS.)

- [ ] **Step 4: Verificar grep**

```bash
grep -n "costCode\b" tests/helpers.ts | head -10
```
Expected: matches en signature de `createSolicitud` + dentro del bloque de selección.

- [ ] **Step 5: Commit**

```bash
git add tests/helpers.ts
git commit -m "test: createSolicitud helper — opt costCode para header

Cambio 2 hace cost_code requerido en validateForSend (Borrador→
Enviada). Helper acepta opt costCode={extra?, fase, categoria}
para rellenar los Selectors del header cuando aplica.

Si no se provee, console.warn y el envío fallará por validación.
Tests E2E que llaman createSolicitud + send=true tienen que pasar
costCode o setear-y-enviar manualmente.

AD-5 completo (createTrip helper roto) queda fuera del Cambio 2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Verificación (no commit) + reportar a James para BD-2

**Goal:** Confirmar que el codebase está listo para Etapa BD-2. Reportar a James para que aplique `DROP COLUMN cost_code_id, cost_category_id` en `sm_request_lines` (staging).

**Files:** N/A (solo verificación + reporte)

**Acceptance Criteria:**
- [ ] `npm run build` pasa
- [ ] `grep -rn "line\.cost_code_id\|line\.cost_category_id\|costCodeDisplay" src/` retorna 0 matches
- [ ] `grep -rn "cost_code_id" src/components/solicitudes/LineEditor.tsx src/components/solicitudes/LineRow.tsx src/hooks/useTrips.ts` retorna 0 matches
- [ ] `git log --oneline jaime/dev` muestra los 6 commits del Cambio 2
- [ ] `git status` clean (working tree limpio)
- [ ] Reporte verbal a James con: lista de commits, output de grep, confirmación que BD-2 es seguro

**Steps:**

- [ ] **Step 1: Build final**

```bash
npm run build 2>&1 | tail -3
```
Expected: `Compiled successfully`.

- [ ] **Step 2: Grep regression completa**

```bash
echo "=== line.cost_code_id / line.cost_category_id / costCodeDisplay ==="
grep -rn "line\.cost_code_id\|line\.cost_category_id\|costCodeDisplay" src/ tests/ 2>/dev/null || echo "0 matches"
echo ""
echo "=== cost_code_id en archivos limpios ==="
grep -rn "cost_code_id" src/components/solicitudes/LineEditor.tsx src/components/solicitudes/LineRow.tsx src/hooks/useTrips.ts 2>/dev/null || echo "0 matches"
echo ""
echo "=== cost_code_id en useSolicitudes (esperado en SolicitudInput/Solicitud, no en LineInput) ==="
grep -n "cost_code_id\|cost_category_id" src/hooks/useSolicitudes.ts | head -10
```

- [ ] **Step 3: Verificar commits del Cambio 2**

```bash
git log --oneline jaime/dev | head -10
```
Expected: top de la lista (en orden inverso cronológico):
1. `test: createSolicitud helper — opt costCode para header`
2. `chore: eliminar BacklogLine.cost_code_id (código muerto)`
3. `feat: cost code refactor a nivel solicitud (atomic)`
4. `feat: hook useCostCodeCascade — cascada cost_code reusable`
5. `chore: regenerar database.ts post-BD-1 (cost_code en sm_requests)`
6. `docs: spec v3.2 + CHANGELOG — Cambio 2 BD-1 applied + Q1-Q6 closed`

- [ ] **Step 4: Status limpio**

```bash
git status --short
```
Expected: solo archivos no relacionados untracked (ej. `Docs/archive/...` random) o `repomix.config.json` modificado por hook ajeno. Sin staged changes pendientes.

- [ ] **Step 5: Reportar a James**

Texto verbal a James con formato:

```
Cambio 2 — Tasks 1-6 completos. 6 commits en jaime/dev.

Hashes:
- <hash> docs: spec v3.2 + CHANGELOG
- <hash> chore: regenerar database.ts post-BD-1
- <hash> feat: hook useCostCodeCascade
- <hash> feat: cost code refactor a nivel solicitud (atomic)
- <hash> chore: eliminar BacklogLine.cost_code_id
- <hash> test: createSolicitud helper opt costCode

Build verde. Grep regression: 0 matches en line.cost_code_id,
line.cost_category_id, costCodeDisplay.

Listo para BD-2. Cuando apliques `ALTER TABLE sm_request_lines
DROP COLUMN cost_code_id, DROP COLUMN cost_category_id` en staging,
arranco Task 8 (regenerar database.ts final + cleanup tipos
finales).
```

ESPERAR confirmación de James (BD-2 aplicada) antes de continuar a Task 8.

---

## Task 8 (gated por James): Regenerar `database.ts` post-BD-2 + cleanup final

**Goal:** Sincronizar tipos generados con staging post-BD-2. Code ya no consume `sm_request_lines.cost_code_id`/`cost_category_id`, así que la regeneración solo limpia el shape de los tipos sin requerir cambios de código.

**Files:**
- Modify (regenerate): `src/lib/types/database.ts`

**Acceptance Criteria:**
- [ ] `database.ts` regenerado contra staging post-BD-2
- [ ] `sm_request_lines.Row` NO incluye `cost_code_id` ni `cost_category_id`
- [ ] `sm_requests.Row` SIGUE incluyendo `cost_code_id` y `cost_category_id` (BD-1 mantenida)
- [ ] Helper `Row<T>` restaurado al final
- [ ] `npm run build` pasa (Code ya no leía las columnas viejas — refactor en Task 4 lo aseguró)
- [ ] CHANGELOG entry [bd] documentando BD-2 aplicada

**Verify:**
```bash
grep -A 3 "sm_request_lines:" src/lib/types/database.ts | head -20
# Expected: Row sin cost_code_id ni cost_category_id
grep -A 3 "sm_requests:" src/lib/types/database.ts | head -20
# Expected: Row con cost_code_id y cost_category_id
npm run build
# Expected: pasa
```

**Steps:**

- [ ] **Step 1: ESPERAR confirmación de James que BD-2 fue aplicada en staging**

Antes de continuar, James debe haber:
- Ejecutado `ALTER TABLE sm_request_lines DROP COLUMN cost_code_id, DROP COLUMN cost_category_id` en staging via Chat MCP
- Confirmado verbalmente que el ALTER completó sin errores

Si James no confirmó, NO ejecutar este task.

- [ ] **Step 2: Regenerar `database.ts`**

```bash
npx supabase gen types typescript --project-id vonwkciosksqspyljzfy 2>/dev/null > src/lib/types/database.ts
head -3 src/lib/types/database.ts
```
Expected: primera línea `export type Json =`. Si vino corrupto, repetir.

- [ ] **Step 3: Verificar columnas esperadas**

```bash
grep -A 25 "sm_request_lines:" src/lib/types/database.ts | head -40
```
Expected: dentro del `Row` de `sm_request_lines` NO aparecen `cost_code_id` ni `cost_category_id`.

```bash
grep -A 25 "sm_requests:" src/lib/types/database.ts | head -40
```
Expected: dentro del `Row` de `sm_requests` siguen apareciendo `cost_code_id` y `cost_category_id`.

- [ ] **Step 4: Restaurar helper `Row<T>` al final**

```bash
echo "" >> src/lib/types/database.ts
echo "// Helper type for row access" >> src/lib/types/database.ts
echo "export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']" >> src/lib/types/database.ts
tail -4 src/lib/types/database.ts
```

- [ ] **Step 5: Verificar build (debe pasar sin cambios de código adicionales — Task 4 ya limpió todo)**

```bash
npm run build 2>&1 | grep -E "(error|Compiled|Failed)" | head -5
```
Expected: pasa. Si hay TS errors, significa que Task 4 dejó algún consumer huérfano de las columnas viejas — reportar y corregir.

- [ ] **Step 6: Agregar CHANGELOG entry para BD-2**

En `Docs/CHANGELOG.md`, agregar bajo la sección `## YYYY-MM-DD` correspondiente a la fecha de aplicación (probable misma fecha o cercana a la de Task 1):

```markdown
- [bd] Cambio 2 cost code Etapa BD-2 — `ALTER TABLE sm_request_lines DROP COLUMN cost_code_id, DROP COLUMN cost_category_id` aplicado en staging (`vonwkciosksqspyljzfy`) via Chat MCP. Cierra el refactor cost_code per-línea → per-solicitud (J9). Code regenerado contra staging confirma cleanup. Pendiente prod en merge final v2.
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/types/database.ts Docs/CHANGELOG.md
git commit -m "chore: regenerar database.ts post-BD-2 + CHANGELOG

Etapa BD-2 aplicada por Chat:
- sm_request_lines.Row sin cost_code_id, cost_category_id
- sm_requests.Row mantiene cost_code_id, cost_category_id (BD-1)
- Row<T> helper restaurado

Code ya no leía las columnas viejas (Task 4 lo aseguró), build
pasa sin cambios de código adicionales. Cierra J9.

CHANGELOG entry [bd] documentando DROP COLUMN sm_request_lines
en staging.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review (writing-plans)

**1. Spec coverage check:**

| Spec requirement | Task que lo cubre |
|---|---|
| BD-1 ya aplicada documentada | Task 1 (CHANGELOG) |
| Regenerar database.ts post-BD-1 | Task 2 |
| SolicitudForm: cost_code/category selectors a nivel header | Task 4 step C |
| Cascada Proyecto → cost_code → categorías a nivel header | Task 3 (hook) + Task 4 step C |
| LineEditor: ELIMINAR campos cost_code y cost_category | Task 4 step D |
| Validación solicitud requiere cost_code antes de Borrador→Enviada | Task 4 step F.2 + G.7 |
| Queries que SELECT cost_code de líneas refactoreadas | Task 4 step B (fetchSolicitud) |
| Tests: actualizar (helper) | Task 6 |
| Types: regenerar database.ts post-BD aplicada | Tasks 2 y 8 |
| Cierra J9 | Task 4 commit message + Task 8 commit message |
| Q1 (custom hook) | Task 3 |
| Q2 (eliminar LineWithRelations.cost_code_id ahora) | Task 4 step A.2 |
| Q3 (eliminar prop costCodeDisplay completo) | Task 4 step E |
| Q4 (Selectors readonly via disabled) | Task 4 step C.7 |
| Q5 (validate solo Borrador→Enviada) | Task 4 step F.2 + G.7 (no se valida en edit Enviada) |
| Q6 (helper costCode opt) | Task 6 |
| Edge case 24-404-SM-150 NULL | Cubierto por Q5 (validate solo en transición) — no requiere código adicional, render '—' es default |
| useTrips.BacklogLine cleanup (H2 / step 9 preview) | Task 5 |
| programacion/viaje/[id]/page.tsx:451 literal | Task 5 step 4 |
| BD-2 gated | Task 7 verification + Task 8 |
| CHANGELOG BD-1 + BD-2 | Tasks 1 y 8 |

**Sin gaps detectados.**

**2. Placeholder scan:**
- Sin "TBD", "TODO", "implement later".
- Steps tienen código completo o instrucciones exactas.
- Excepción: Task 4 step B.1 menciona "El FK exacto puede llamarse..." con alternativa segura — instruction concreta, no placeholder.
- Excepción: Task 7 step 5 reporte tiene `<hash>` placeholders que son para llenar al ejecutar, no del plan.

**3. Type consistency check:**
- `SolicitudInput.cost_code_id?: string | null`: definido en Task 4 step A.3, consumido en Task 4 step B.5 (createSolicitud), B.6 (updateSolicitud), C.4 (propagate), F.2 (validateForSend) — consistente.
- `SolicitudWithRelations.cost_code` y `cost_category`: definido en Task 4 step A.1, mappeado en Task 4 step B.3, consumido por `[id]/page.tsx` Task 4 step G.6 — consistente.
- `useCostCodeCascade` return shape: definido en Task 3 step 1, consumido en Task 4 step C.3-C.7 — campos coinciden (`cascade.costCodeId`, `cascade.setCostCodeId`, etc.).
- `LineInput`/`LineWithRelations` cleanup: tipos definidos en Task 4 step A.2 y A.4, consumers limpiados en Task 4 steps D.5, F.4, G.1 — consistente.

**Plan listo para ejecución. ~7 commits + 1 verificación + 1 gated commit.**
