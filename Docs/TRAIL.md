# Trail activo — MovimientOS

> **Qué es este doc:** single-page view de dónde estamos en la jerarquía
> de tareas. Se actualiza cada vez que cambiamos de dirección. Lo
> autocargo al inicio de cada sesión para recuperar el hilo sin leer
> todo el plan file.

**Última actualización:** 2026-04-15

## Root task

Perfeccionar movilizaciones (Tier 1 — sistema core).

## Position actual

```
Perfeccionar movilizaciones
 └─ Sistema de eventos y sus registros
     ├─ [✅] Audit consolidado (código + BD)
     ├─ [✅] Parking git/github practices
     ├─ [✅] Higiene de docs + manejo de contexto
     ├─ [✅] Consolidar EVENTS V2 master + issues → reference/EVENTS_V2.md
     ├─ [▶] Sprint prod cherry-pick (Abril 15)
     │   ├─ [✅] J3 RBAC conductores (security) — test manual ✅
     │   ├─ [✅] J4 Calendarios y filtros unificados (rediseño)
     │   ├─ [✅] J6 Tarifa no editable
     │   ├─ [✅] J7 Código costos requerido
     │   ├─ [✅] J8a Scroll/zoom modales en mobile
     │   ├─ [✅] J8b Duplicar líneas
     │   └─ [⏸] Push a main + tag release (manual por James)
     └─ [⏳] Sprint staging-track Events V2 polish (siguiente plan)
         ├─ J1 Pickup bloqueado + design AD-1
         ├─ J2 Códigos entrega opcionales (default + PickupModal)
         ├─ J5 Seguir diseñando eventos
         ├─ J9 Cost code a nivel solicitud (refactor grande)
         ├─ G-items sobrevivientes (G1, G4, G5, G10, G11)
         └─ G17-G20 doc cleanup EVENTS_V2.md
```

## Contexto mínimo

Sprint prod cherry-pick ejecutado single-shot: 5 fixes commiteados en
jaime/dev y aplicados en el worktree `../mo-main` (J3 literal cherry-
pick, J6/J7/J8a/J8b commits paralelos adaptados a main). J4 pausado
esperando respuesta de James a 4 preguntas de reproducción (el código
de calendarItems usa query separada sin paginación — el síntoma que ve
James no es reproducible por grep, necesita debug runtime).

Pendiente de James:
1. Test manual J3 con user real de rol `campo` antes del push
2. Push + tag release v2026.04.15-N (comandos en reporte final)
3. Reproducción de J4 en dev server (4 preguntas pendientes)

Siguiente dirección (tras cerrar prod track): **staging-track Events V2
polish**. Plan file nuevo tras este sprint — incluye design discussions
de J1-arch/AD-1, J2 requires_code default, J9 cost code refactor.

Parked deliberadamente por James:

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

- **Plan file activo:** `~/.claude/plans/linked-sleeping-lighthouse.md` (stub tras cierre)
- **BACKLOG completo:** `Docs/BACKLOG.md`
- **CHANGELOG:** `Docs/CHANGELOG.md`
- **Regla de ciclo de vida de plans:** `.claude/rules/plan-lifecycle.md`
