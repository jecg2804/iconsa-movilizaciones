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
Cuando sepas que hubo cambios de schema (Chat te lo dirá en SYNC_LOG):
```bash
npx supabase gen types typescript --project-id bzeoszympkkicwlfdtcn > src/lib/types/database.ts
```

## Si necesitas un cambio de BD
1. Escribe en `Docs/SYNC_LOG.md`:
   ```
   Code: SOLICITUD BD — {descripción exacta del cambio}.
   Razón: {por qué es necesario}.
   ```
2. James lo verá y delegará a Chat para ejecutar.
3. Chat escribirá confirmación en SYNC_LOG.md.
4. Verifica leyendo Supabase via MCP y continúa.

## Lectura eficiente
- Queries puntuales: `SELECT column_name FROM information_schema.columns WHERE table_name = 'X'`
- No hacer SELECTs masivos. Solo verificar estructura.
- Cost codes: `cost_codes` filtrar por `project_id` + `extra_id`. Categorías via `cost_code_categories`.

## Enforcement técnico (2026-04-13)

Esta regla documental es la capa más blanda. Existen **tres vectores** de acceso a Supabase desde Claude Code y cada uno tiene su propio enforcement.

### Vector 1 — Servidores locales del `.mcp.json` (read-only duro)

Dos servidores separados declarados en `.mcp.json`:

- `supabase-staging` → `vonwkciosksqspyljzfy` — **default** para queries exploratorias y auditoría
- `supabase-prod` → `bzeoszympkkicwlfdtcn` — solo cuando se compara drift con producción

Ambos corren con flag `--read-only` del paquete `@supabase/mcp-server-supabase`. El servidor rechaza cualquier mutación a nivel protocolo — `execute_sql` corre como usuario Postgres read-only y las tools mutantes están deshabilitadas en el servidor mismo.

**Convención de uso:** Staging es el default. Producción solo se consulta cuando Claude Code anuncia explícitamente en el chat: "voy a consultar prod para comparar X". James puede validar antes de que la query corra.

### Vector 2 — Integración web `claude_ai_Supabase`

James conectó Supabase en claude.ai web como integración OAuth. Esa integración aparece en Claude Code con prefix `mcp__claude_ai_Supabase__*`. **Claude Chat la usa para planificación, ejecución de migraciones, gestión de branches.** Claude Code NO debe mutar por este vector.

Como esta integración **no** respeta el `--read-only` flag (no viene de `.mcp.json`), la única defensa es el deny-list en `.claude/settings.json`.

### Vector 3 — Regla documental (este archivo)

Es la capa más blanda. Sirve para recordarme la política cuando razono sobre un task, no solo cuando ejecuto una tool. Funciona incluso si las otras dos capas fallan — pero depende 100% de mi disciplina.

### Tools bloqueadas (33 entries en `.claude/settings.json`)

**Vectores 1 (locales, 22 entries × 2 servidores × 11 tools):**
`apply_migration`, `create_branch`, `delete_branch`, `merge_branch`, `reset_branch`, `rebase_branch`, `deploy_edge_function`, `create_project`, `pause_project`, `restore_project`, `update_storage_config`.

**Vector 2 (`claude_ai_Supabase`, 11 entries):**
Las mismas 10 mutantes menos `update_storage_config` (no expuesta en esa integración) **más `execute_sql`** — porque ese endpoint corre con credenciales privilegiadas y puede ejecutar DDL/DML si no se bloquea explícitamente. Para SQL read-only Claude Code usa los servidores locales (Vector 1).

### Tools permitidas en `claude_ai_Supabase` (solo lectura)

`list_tables`, `list_migrations`, `list_extensions`, `list_branches`, `list_edge_functions`, `list_projects`, `list_organizations`, `get_project`, `get_project_url`, `get_organization`, `get_edge_function`, `get_publishable_keys`, `get_logs`, `get_advisors`, `get_cost`, `generate_typescript_types`, `search_docs`, `confirm_cost`.

Útiles para auditar schema/migraciones/logs/advisories sin tocar nada. Para ejecutar SQL arbitrario de solo lectura, usar los servidores locales (Vector 1) donde el flag `--read-only` del servidor hace de backstop.

### Si Supabase añade tools mutantes nuevas

Hay que actualizar `.claude/settings.json` manualmente. Para Vector 1, el flag `--read-only` del servidor sigue siendo el backstop. Para Vector 2, no hay backstop — solo el deny-list y mi disciplina.
