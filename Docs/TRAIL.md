# Trail activo — MovimientOS

> **Qué es este doc:** single-page view de dónde estamos en la jerarquía
> de tareas. Se actualiza cada vez que cambiamos de dirección. Lo
> autocargo al inicio de cada sesión para recuperar el hilo sin leer
> todo el plan file.

**Última actualización:** 2026-04-14

## Root task

Perfeccionar movilizaciones (Tier 1 — sistema core).

## Position actual

```
Perfeccionar movilizaciones
 └─ Sistema de eventos y sus registros
     ├─ [✅] Audit consolidado (código + BD)
     ├─ [✅] Parking git/github practices
     ├─ [✅] Higiene de docs + manejo de contexto
     └─ [▶] Perfeccionar event system con features nuevos (pre-prod)
         ├─ AD-5 — Fix createSolicitud/createTrip helpers (desbloquea tests)
         └─ Nuevas features de eventos (pickup cases, códigos opcionales,
            nuevos eventos — pendiente de diseño)
```

## Contexto mínimo

Audit cerrado. Docs y enforcement al día. Siguiente dirección aprobada:
seguir perfeccionando el sistema de eventos agregando features que NO
están en prod, antes de cortar un release.

Orden inmediato:

1. Naming cleanup BACKLOG (en progreso)
2. AD-5 — fix de `createSolicitud`/`createTrip` helpers — desbloquea tests
3. Discusión + diseño de nuevas features del event system:
   pickup cases, códigos de entrega opcionales, nuevos eventos

Parked deliberadamente por James:

- Primer `/release` a prod — esperando que las features nuevas estén
  completas antes de tocar el app en producción
- F5 Dashboards por rol, F2 Inspecciones — features grandes, no ahora
- F1.4 Retorno reconciliación per-line — esperando métricas de uso
- F1.6 Observaciones de entrega visibles — nice-to-have, baja prioridad

## Reglas de este doc

- Actualizarlo **cada vez que cambio de dirección** (ej. pasar de un
  track a otro, cerrar una fase, arrancar una nueva).
- Nunca más de 1 página — si crece, comprimir.
- Apunta al plan file activo vigente, no lo duplica.
- Si este doc y el plan file discrepan, este doc gana (es el resumen
  canónico).

## Links

- **Plan file activo:** `~/.claude/plans/linked-sleeping-lighthouse.md`
- **BACKLOG completo:** `Docs/BACKLOG.md`
- **CHANGELOG:** `Docs/CHANGELOG.md`
- **Regla de ciclo de vida de plans:** `.claude/rules/plan-lifecycle.md`
