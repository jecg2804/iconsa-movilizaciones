---
name: deploy-check
description: Verificar que el proyecto está listo para deploy a producción.
---

## Checks

1. `npm run build` — debe pasar sin errores
2. `npx tsc --noEmit` — TypeScript sin errores
3. Buscar console.log en código fuente (excluir notifications que ya tienen dev-guard)
4. Buscar secrets hardcoded: `sbp_`, `sk-`, `password=`
5. `git status` — reportar archivos sin commit
6. Verificar que el branch es `jaime/dev` (no main)
7. Verificar que CHANGELOG.md está actualizado (último entry < 7 días)

## Output

Reportar: **READY** o **BLOCKED** con razones específicas para cada check que falle.