## Lectura Eficiente de Docs

Orden de lectura al inicio de sesión (de menor a mayor contexto):
1. `SYNC_LOG.md` — cambios recientes (corto)
2. `BUILD_PLAN.md` — confirmar fase actual (escanear)
3. `PROJECT_STATUS.md` — pendientes (escanear sección relevante)
4. Feature Spec — solo la sección de la pantalla que vas a implementar

**NO cargar Feature Spec completo.** Solo la sección que necesitas.

## Supabase MCP

- Usar MCP read-only para verificar schema en vez de cargar supabase_schema_verified.sql completo.
- Queries puntuales: `SELECT column_name FROM information_schema.columns WHERE table_name = 'X'`
- No hacer SELECTs masivos de datos. Solo verificar estructura.

## Commits

- Commits pequeños y frecuentes (después de cada paso).
- No acumular 5 cambios en un solo commit grande.
- Build antes de commit: `npm run build` para verificar que compila.

## Eficiencia
- Prompts específicos con rutas de archivo: "Edita src/hooks/useTrips.ts" no "mejora los trips"
- Un archivo por prompt cuando sea posible
- Si la tarea necesita tocar 5+ archivos, planifica primero en Plan Mode