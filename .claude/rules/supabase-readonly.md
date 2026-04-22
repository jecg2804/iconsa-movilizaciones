# Rule: Supabase Read-Only

Claude Code tiene acceso de **solo lectura** a Supabase via MCP.

## SÍ puedes
- `SELECT` para verificar schema, columnas, datos
- Validar que cambios de código coinciden con BD real
- Confirmar triggers y funciones antes de depender de ellos

## NO puedes
- `INSERT`, `UPDATE`, `DELETE` de datos
- `CREATE TABLE`, `ALTER TABLE`, `DROP` — cualquier DDL
- Ejecutar migraciones

## SÍ puedes regenerar tipos
Cuando sepas que hubo cambios de schema (ver entries `[bd]` recientes en `Docs/CHANGELOG.md`):
```bash
npx supabase gen types typescript --project-id bzeoszympkkicwlfdtcn > src/lib/types/database.ts
```

## Si necesitas un cambio de BD — convención `[bd-pending]` → `[bd]`

El proyecto NO usa archivos de migración (no `supabase/migrations/`).
Cambios de schema se registran en `Docs/CHANGELOG.md` y James los ejecuta
manualmente en Supabase SQL Editor.

1. **Agrega entry `[bd-pending]` en `Docs/CHANGELOG.md`** (bajo la fecha de hoy):
   ```
   ## YYYY-MM-DD

   ### [bd-pending] {título corto del cambio}
   - Descripción del cambio
   - SQL:
     ```sql
     ALTER TABLE ... ;
     ```
   - Razón: {por qué es necesario}
   - Aplicar en: staging primero, luego prod
   - Rollback: {SQL inverso}
   ```
2. **James ejecuta el SQL manualmente** en Supabase SQL Editor —
   primero en staging (`vonwkciosksqspyljzfy`), luego en prod
   (`bzeoszympkkicwlfdtcn`).
3. **Una vez aplicado, el marker `[bd-pending]` cambia a `[bd]`**
   en el mismo entry (James lo hace, o Code en sesión siguiente).
4. **Si hubo cambios de schema aplicados, regenerar tipos** con el
   comando de la sección anterior.
5. Verifica leyendo Supabase via MCP y continúa.

## Lectura eficiente
- Queries puntuales: `SELECT column_name FROM information_schema.columns WHERE table_name = 'X'`
- No hacer SELECTs masivos. Solo verificar estructura.
- Cost codes: `cost_codes` filtrar por `project_id` + `extra_id`. Categorías via `cost_code_categories`.

## Enforcement técnico (2026-04-13)

### Arquitectura real (verificada via `/mcp` y `list_projects`)

Existe **un solo vector** de acceso a Supabase desde Claude Code: el plugin built-in `plugin:supabase:supabase` del marketplace oficial. Este plugin expone sus tools bajo el namespace `mcp__claude_ai_Supabase__*` (naming confuso — el prefix `claude_ai_` sugiere una integración web pero en realidad es el plugin).

El `.mcp.json` del proyecto **no se usa** — Claude Code no lo lee en este setup. Intentos previos de declarar servidores locales ahí fueron código muerto.

### Branches de Supabase

El proyecto Supabase de MovimientOS usa el feature de **database branching**. Bajo el proyecto principal `bzeoszympkkicwlfdtcn` hay dos branches:

- **main** (`is_default: true`, no persistente) — producción
- **staging** (`is_default: false`, persistente, `project_ref: vonwkciosksqspyljzfy`) — donde corren los tests E2E

Ambas branches se acceden con el **mismo plugin**, pasando el `project_id` correspondiente como parámetro. No hay servidores separados.

**Convención de uso:** Staging (`vonwkciosksqspyljzfy`) es el default para queries exploratorias y auditoría. Producción (`bzeoszympkkicwlfdtcn`) solo cuando se compara drift y Claude Code anuncia explícitamente en el chat: "voy a consultar prod para comparar X".

### Deny-list en `.claude/settings.json` (11 entries)

Claude Code bloquea las 11 tools mutantes del namespace `mcp__claude_ai_Supabase__*`:

`apply_migration`, `create_branch`, `create_project`, `delete_branch`, `deploy_edge_function`, `execute_sql`, `merge_branch`, `pause_project`, `rebase_branch`, `reset_branch`, `restore_project`.

**Enforcement verificado end-to-end:** estas tools desaparecen completamente del index de deferred tools — Claude Code no las expone ni permite cargar su schema. Intentar invocarlas retorna `InputValidationError` inmediatamente sin llegar al servidor. El deny por nombre de tool aplica a **todas las branches automáticamente** porque el bloqueo es a nivel de tool-name, no por project_id.

`execute_sql` está en deny porque en este plugin corre con credenciales privilegiadas — un `DROP TABLE` arbitrario pasaría si no se bloqueara. Para SQL read-only ad-hoc, Claude Code no tiene alternativa — Claude Chat ejecuta las queries vía su propia integración Supabase con confirmación humana.

### Tools permitidas (lectura)

`list_tables`, `list_migrations`, `list_extensions`, `list_branches`, `list_edge_functions`, `list_projects`, `list_organizations`, `get_project`, `get_project_url`, `get_organization`, `get_edge_function`, `get_publishable_keys`, `get_logs`, `get_advisors`, `get_cost`, `generate_typescript_types`, `search_docs`, `confirm_cost`.

Útiles para auditar schema / migraciones / logs / advisories sin tocar nada.

### Regla documental (este archivo)

Es la capa más blanda. Sirve para recordarme la política cuando razono sobre un task, no solo cuando ejecuto una tool. El deny-list técnico es el backstop real — pero esta regla evita que yo intente invocar tools denegadas pensando que están permitidas.

### Si Supabase añade tools mutantes nuevas

Hay que actualizar `.claude/settings.json` manualmente. No hay backstop del lado del plugin (no existe `--read-only` flag para este namespace) — solo el deny-list y mi disciplina.