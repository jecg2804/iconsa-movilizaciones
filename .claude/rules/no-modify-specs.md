# Reglas de modificación de documentación

## NO modificar directamente
- `Docs/FEATURE_SPEC.md` — solo actualizar cuando James lo autorice explícitamente

## Claude Code PUEDE actualizar
- `Docs/CHANGELOG.md` — agregar entry con cada commit
- `Docs/BACKLOG.md` — marcar items completados, agregar nuevos pendientes
- `CLAUDE.md` — actualizar cuando James lo autorice

## Regla general
Cuando descubras que el código no coincide con un spec:
1. NO corrijas el spec sin autorización
2. Agrega `[discrepancia]` entry en CHANGELOG.md
3. Continúa implementando según lo que dice el spec actual
