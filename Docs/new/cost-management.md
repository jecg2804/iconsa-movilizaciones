# Gestión de costos y contexto

## Modelo
- Default: Sonnet 4.6 (`/model sonnet` al inicio de cada sesión)
- Opus: Solo para arquitectura compleja o debugging difícil (`/model opus`)

## Contexto
- `/compact` al llegar a 50% de uso de contexto
- `/clear` entre pasos no relacionados o entre fases
- NUNCA acumular múltiples fases en una sesión

## Eficiencia
- Prompts específicos con rutas de archivo: "Edita src/hooks/useTrips.ts" no "mejora los trips"
- Un archivo por prompt cuando sea posible
- Si la tarea necesita tocar 5+ archivos, planifica primero en Plan Mode
