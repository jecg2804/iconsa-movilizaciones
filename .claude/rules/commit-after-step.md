# Commits y push automáticos en branch de desarrollo

Claude Code PUEDE hacer commits Y push automáticos en `jaime/dev` y `andy/dev`.
NUNCA hacer commits ni push directos a `main`.

## Después de cada paso completado:

1. Corre `npm run build` para verificar que compila.
2. Si el build falla, arreglar antes del siguiente paso.
3. `git add -A` + `git commit -m "mensaje"` + `git push origin jaime/dev`
4. Continuar al siguiente paso sin esperar aprobación.
5. Si el paso involucró cambios significativos, actualiza `Docs/SYNC_LOG.md`.

## Formato de commits:
- `fix: bug #X — descripción breve`
- `feat: descripción breve`
- `docs: descripción breve`
- `refactor: descripción breve`

## Ejemplos:
- `feat: TripCard componente con timeline de eventos`
- `fix: bug #3 — tarifa auto-rellena campo costo al seleccionar`
- `docs: actualizar SYNC_LOG con cambios de sesión`

## NUNCA:
- Hacer commits a `main`
- Hacer push a `main`
- Acumular múltiples pasos en un solo commit
