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
