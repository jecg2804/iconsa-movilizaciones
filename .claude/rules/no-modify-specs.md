# Reglas de modificación de documentación (Sistema de Tiers)

## Tier 1 — SOLO Chat puede modificar (via James)
- Docs/ICONSA_Feature_Specification_v3.md
- Docs/BUILD_PLAN.md

Si encuentras una discrepancia con estos archivos, escríbela en `.claude/suggestions.md`
y notifica a James. NO modifiques estos archivos directamente.

## Tier 2 — Claude Code PUEDE actualizar
- Docs/PROJECT_STATUS.md — actualizar estado de fases, pantallas, bugs
- Docs/SYNC_LOG.md — escribir notas cuando descubras discrepancias o completes pasos
- Docs/BUGS.md — documentar bugs encontrados

Actualiza estos archivos como parte de tu flujo normal de trabajo.

## Tier 3 — Claude Code PUEDE sugerir cambios
- `.claude/suggestions.md` — escribe aquí cambios propuestos a Tier 1
- Formato: fecha, qué archivo, qué dice vs qué debería decir, razón

## Regla general
Cuando descubras que el código no coincide con un spec:
1. NO corrijas el spec (si es Tier 1)
2. Escribe la discrepancia en SYNC_LOG.md
3. Si es un patrón reutilizable, sugiere una nueva skill en `.claude/suggestions.md`
4. Continúa implementando según lo que dice el spec actual
