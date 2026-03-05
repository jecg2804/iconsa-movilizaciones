# Commit después de cada paso

Después de completar cada paso del BUILD_PLAN (ej: 4.1, 4.2, 4.3):

1. Corre `npm run build` para verificar que compila.
2. Sugiere un commit message con formato: `feat: paso X.Y — descripción breve`
3. Espera confirmación de James antes de continuar al siguiente paso.
4. Si el paso involucró cambios en la BD o lógica nueva, actualiza PROJECT_STATUS.md.

Ejemplos de buenos commits:
- `feat: paso 4.1 — TripCard componente con timeline de eventos`
- `fix: paso 3.4 — tarifa auto-rellena campo costo al seleccionar`
- `docs: actualizar PROJECT_STATUS con estado de Fase 4`

NUNCA acumular múltiples pasos en un solo commit.
NUNCA hacer commit automático sin aprobación.
