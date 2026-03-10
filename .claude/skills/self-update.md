# Skill: Self-Update — Mantener documentación sincronizada

Claude Code debe mantener la documentación actualizada como parte de su flujo normal.

## Después de cada paso completado

1. Actualizar `Docs/PROJECT_STATUS.md`:
   - Estado de la fase/pantalla completada
   - Bugs encontrados y resueltos
   
2. Escribir en `Docs/SYNC_LOG.md`:
   - Qué se implementó
   - Si se encontró alguna discrepancia con los specs
   - Si se necesita un cambio de BD (para que James lo delegue a Chat)

## Cuando descubras una discrepancia

Si el código no coincide con Feature Spec o BUILD_PLAN:
1. NO modifiques el spec
2. Escribe en `Docs/SYNC_LOG.md`: "Code: Discrepancia — {spec} dice X, código hace Y, razón: Z"
3. Si propones un cambio al spec, escríbelo en `.claude/suggestions.md`

## Cuando necesites un cambio de BD

Claude Code puede LEER Supabase (via MCP read-only) pero NO puede escribir.
1. Escribe en `Docs/SYNC_LOG.md`: "Code: SOLICITUD BD — {descripción del cambio}. Razón: {por qué}."
2. James lo verá y delegará a Chat para ejecutar
3. Chat escribirá confirmación en SYNC_LOG.md
4. Tú verificas leyendo Supabase y continúas

## Cuando descubras un patrón reutilizable

Si implementas algo que podría ser una skill:
1. Escribe en `.claude/suggestions.md`: "Sugerencia skill: {nombre} — {descripción}"
2. James y Chat decidirán si crear la skill

## Formato de SYNC_LOG.md

```markdown
## {fecha} — Code: {descripción breve}
- Qué se hizo
- Archivos modificados
- Discrepancias encontradas (si hay)
- Solicitudes de BD (si hay)
```
