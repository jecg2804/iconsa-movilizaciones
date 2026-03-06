# Skill: Página de Eventos / Mis Viajes (Fase 4)

Fase 4 implementa la pantalla de ejecución donde conductores, Charris, y almacenistas
registran eventos de viajes en tiempo real.

## Estructura de archivos
```
src/hooks/useMyTrips.ts                    — Viajes activos del usuario
src/hooks/useTripEvents.ts                 — CRUD de eventos por viaje
src/components/viajes/TripCard.tsx          — Card de viaje con info + barra progreso
src/components/viajes/EventTimeline.tsx     — Timeline visual de eventos
src/components/viajes/EventForm.tsx         — Formulario para registrar evento
src/components/viajes/CodeConfirmation.tsx  — Input del código de 4 dígitos
src/app/(app)/mis-viajes/page.tsx           — Lista de viajes activos
src/app/(app)/mis-viajes/[id]/page.tsx      — Detalle + registro de eventos
```

## Secuencia de eventos (Feature Spec 5.3.2)
```
1. SALIDA (obligatorio) → Viaje: En Ruta, Líneas: En Tránsito
2. LLEGADA (opcional) → Informativo, actualiza timeline
3. ENTREGA (obligatorio) → Código O nombre receptor. Líneas: Entregada
4. RETORNO (opcional) → Viaje: Completado. Calcula duración.
5. INCIDENCIA (cualquier momento) → No cambia estados
```

## Reglas críticas
- Eventos siguen secuencia: no se puede registrar Entrega sin Salida previa
- Botones se habilitan progresivamente
- Se puede saltar Llegada y Retorno (son informativos)
- CUALQUIER usuario con rol logistica, campo, o almacen puede registrar eventos
- Sin restricción por driver_id en MVP
- Evento de Entrega: acepta código de confirmación O nombre del receptor
- Código de confirmación: 4 dígitos, generado al crear viaje (trips.confirmation_code)
- Si código no coincide: warning pero permite continuar
- trip_events son INMUTABLES — una vez creados, no se editan ni eliminan

## Cascada de estados
Cuando se registra un evento, el trigger `cascade_request_status()` re-evalúa:
- Estado de líneas asignadas al viaje
- Estado de solicitudes padre de esas líneas
Ver Feature Spec sección 8.4 para reglas exactas.

## UX
- Mobile-first — conductores usan celulares
- Barra de progreso visual: Programado → 🚛 Salida → 📍 Llegada → ✅ Entrega → 🏠 Retorno
- Botón grande prominente para el siguiente evento en la secuencia
- Timeline muestra eventos ya registrados con timestamp y quién los registró
