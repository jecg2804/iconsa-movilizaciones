# Reglas de modificación de documentación (Sistema de Tiers)

## Tier 1 — SOLO Chat puede modificar (via James)
- `CLAUDE.md`
- `Docs/FEATURE_SPEC.md`

Si encuentras una discrepancia con estos archivos, escríbela en `Docs/SYNC_LOG.md`
y notifica a James. NO modifiques estos archivos directamente.

## Tier 2 — Claude Code PUEDE actualizar
- `Docs/SYNC_LOG.md` — escribir notas cuando descubras discrepancias o completes pasos
- `Docs/BUGS.md` — documentar bugs encontrados y resueltos

Actualiza estos archivos como parte de tu flujo normal de trabajo.

## Regla general
Cuando descubras que el código no coincide con un spec:
1. NO corrijas el spec (si es Tier 1)
2. Escribe la discrepancia en SYNC_LOG.md
3. Continúa implementando según lo que dice el spec actual
