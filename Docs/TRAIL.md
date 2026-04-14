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
     ├─ [✅] Audit consolidado (código + BD) — fases A, B, C, E cerradas
     ├─ [✅] Parking git/github practices (3 capas client-side + /release skill)
     ├─ [✅] Higiene de docs + mejora manejo de contexto (6ccd3fa, d2ae2d9, 792a8a7)
     └─ [⏸] Sin task activa — esperando próxima dirección
```

## Contexto mínimo

El audit consolidado de abril está cerrado. Todos los hallazgos críticos
del event system tienen fix o verificación. Git/GitHub practices cerradas
con 3 capas client-side. Docs vivos al día. Higiene de docs completa:
plan file stub, rule plan-lifecycle vigente, TRAIL.md como auto-load.

Sin task activa. Esperando dirección del usuario entre los candidatos ya
identificados en BACKLOG:

- Track A — Observaciones de entrega visibles (cerrar loop huérfano)
- F2 — Inspecciones de equipo (IC-EQ-F-01-02)
- F5 — Dashboards por rol
- AD-5 — Fix `createSolicitud`/`createTrip` E2E helper regression
- Primer `/release` a prod (lleva audit B.1 fixes a producción)

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
