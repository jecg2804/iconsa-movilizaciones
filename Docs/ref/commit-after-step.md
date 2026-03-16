# Rule: Commit After Step

Después de completar cada paso de implementación:

1. `npm run build` — verificar que compila sin errores
2. `git add -A`
3. `git commit -m "feat: {descripción}" ` (o `fix:`, `docs:`, `refactor:`, `chore:`)
4. `git push origin jaime/dev`
5. Actualizar `Docs/SYNC_LOG.md` con lo implementado
6. Si encontraste un bug → `Docs/BUGS.md`
7. Continuar al siguiente paso sin esperar aprobación

## Formato de commits
- `feat: {descripción}` — Nueva funcionalidad
- `fix: bug #{N} — {descripción}` — Corrección de bug
- `docs: {descripción}` — Solo documentación
- `refactor: {descripción}` — Reestructuración sin cambio funcional
- `chore: {descripción}` — Mantenimiento (deps, config)

Mensaje en español. Branch: solo `jaime/dev` o `andy/dev`. Nunca `main`.
