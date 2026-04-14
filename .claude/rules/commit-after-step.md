# Commits y push automáticos en branch de desarrollo

Claude Code PUEDE hacer commits Y push automáticos en `jaime/dev`.
NUNCA hacer commits ni push directos a `main`. Para la política completa
de git (branches, releases, tags, enforcement layers), ver
`.claude/rules/git-workflow.md`.

## Después de cada paso completado

1. El hook `post-commit` de Husky lanza `npm run build` en background
   automáticamente — no hace falta correrlo a mano salvo que quieras
   ver el resultado inmediato. Si el background build falla, la siguiente
   operación git te lo va a mostrar.
2. `git add <archivos>` + `git commit -m "mensaje"` + `git push origin jaime/dev`.
3. Continuar al siguiente paso sin esperar aprobación.
4. Si el paso involucró cambios significativos, actualizar `Docs/CHANGELOG.md`
   en el mismo commit (política de docs vivos).

## Formato de commits

- `fix: bug #X — descripción breve`
- `feat: descripción breve`
- `docs: descripción breve`
- `refactor: descripción breve`
- `chore: descripción breve`
- `test: descripción breve`

## Ejemplos

- `feat: TripCard componente con timeline de eventos`
- `fix: bug #3 — tarifa auto-rellena campo costo al seleccionar`
- `docs: actualizar CHANGELOG con cambios de sesión`

## Releases (jaime/dev → main)

Usar el skill `/release` (ver `.claude/skills/git-release.md`). Nunca
hacer merge manual a `main` — el skill valida Vercel, crea PR, squash-
mergea, taggea con `v{YYYY}.{MM}.{DD}-{N}`, y pushea el tag.

## NUNCA

- Hacer commits a `main`
- Hacer push a `main` (incluso con `--force-with-lease`)
- Acumular múltiples pasos en un solo commit
- Usar `--no-verify` para bypass de hooks
- Usar `--amend` en commits ya pusheados
