# Commits y push automáticos en branch de desarrollo

Claude Code PUEDE hacer commits Y push automáticos en `jaime/dev` y `andy/dev`.
NUNCA hacer commits ni push directos a `main`.

## Después de cada paso completado:

1. Corre `npm run build` para verificar que compila.
2. Si el build falla, arreglar antes del siguiente paso.
3. `git add -A` + `git commit -m "mensaje"` + `git push origin jaime/dev`
4. Continuar al siguiente paso sin esperar aprobación.
5. Si el paso involucró cambios en la BD o lógica nueva, actualiza PROJECT_STATUS.md.

## Formato de commits:
- `fix: bug #X — descripción breve`
- `feat: paso X.Y — descripción breve`
- `docs: actualizar PROJECT_STATUS con estado de Fase X`

## Ejemplos:
- `feat: paso 4.1 — TripCard componente con timeline de eventos`
- `fix: bug #3 — tarifa auto-rellena campo costo al seleccionar`
- `docs: actualizar PROJECT_STATUS con estado de Fase 4`

## NUNCA:
- Hacer commits a `main`
- Hacer push a `main`
- Acumular múltiples pasos en un solo commit
