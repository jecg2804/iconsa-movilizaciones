# Cola de rediseño — dudas de diseño capturadas (seed del intake system)

> **Qué es:** TODA duda/idea de diseño sale de la cabeza (y del chat) y entra
> aquí. Cada ítem se procesará por el pipeline del harness nuevo
> (discusión → spec/ADR → plan → ejecución), UNO a la vez, post-harness.
> **Nada de esto se decide ahora.** Capturado de James 2026-06-10.
>
> Estados: `cola` → `en-discusión` → `spec-draft` → `decidido (ADR-#)` → `planificado` → `shipped`

## Movilizaciones — rediseño del procedimiento (prioridad #1 declarada)

| # | Ítem | Notas de James / discovery | Estado |
|---|---|---|---|
| Q1 | Events: ¿editar date/time? | Hoy no editable (regla 16) pero timestamps = reloj del cliente y 69% corregido a mano. Tensión: inmutabilidad vs realidad. Conecta con Q14. | cola |
| Q2 | GPS auto-captura de Salidas/Llegadas | Matiz de James: no toda salida/llegada del geofence es de una movilización. Idea: geofence + ventana del trip PROGRAMADO = precisión alta. | cola |
| Q3 | UI/UX redesign general vs líderes | Incluye: líneas de solicitud expandibles (pain de Charris), cards info/space/mobile. UX audit dedicado post-harness. | cola |
| Q4 | Charris puede editar/solicitar cambios a solicitudes | Ej: no está el contenedor X pero sí el Y → Charris impulsa la edición. James ya reconsideraba el permiso. Diseñar flujo de "propuesta de cambio" vs edición directa. | cola |
| Q5 | Formularios desde/hasta simulan papel; multiruta mal soportada | El evento "Parada" (Events V2) fue el parche y "tampoco creo que está bien diseñado" (James). Rediseño del modelo de ruta/paradas. | cola |
| Q6 | Fulfillment types completos | 4 tipos (fleet/pickup/external/INTERNO — interno sin flujo ni en papel; $100/mov 2026 sin tabla). Cambio 6.6 cubre bugs; el diseño integral queda aquí. | cola |
| Q7 | Reportes auto-generados | F-06-05 (facturación de Charris, 10 cols + 14 códigos MV*) = spec de facto. + comparación vs bitácora manual para discrepancias + KPIs de adopción. Forcing function. | cola |
| Q8 | Tarifas | Flat por vehículo + grúas agrupan N viajes + internos sin tarifa + alquilados sin tarifa. Gerencia las define; rediseño = propuesta post-GPS/módulos. Por ahora: gestionarlas (vigencias, propuestas de edición). | cola |
| Q9 | Adjuntar documentos | Facturas, permisos ATTT, fotos, evidencias de entrega — sistema de attachments coherente cross-entidad. | cola |
| Q10 | Código de confirmación | Se mantiene (jefe). Tentativo: por-solicitud + validación server-side (hoy 100% client-side y viaja a todos los roles). Toggle como opción. | cola |
| Q11 | Sistema de priorización de solicitudes | No existe (columna priority con fuente de verdad ambigua). | cola |
| Q12 | Settings/admin page real | Hoy admin/masters con writes que ignoran errores + bug Extras. Para usuarios=toda la compañía se necesita administración real (roles, permisos, tarifas, notificaciones 18/18). | cola |
| Q13 | Dashboards por rol + KPIs | /pm /logistica /gerencia /taller. GPS trae reportes aprovechables (SkyData Latam: driver_behaviour, fuel, reports). DESPUÉS de captura disciplinada. | cola |
| Q14 | Skill/automatización de corrección de datos vía GPS | James se la pasa corrigiendo con Chat + GPS API como ground truth (MOV-047: Charris 6:50, sistema 9:07, GPS 8:31). Etapas: skill semi-auto (Code propone, James aprueba) → módulo de conciliación en el app. El Event_Correction_Prompt ya es el seed. | cola |
| Q15 | J6: ¿costo editable (dev) o read-only (prod/regla 9)? | Decisión pendiente detectada por merge-tree — el merge cambia comportamiento visible de Charris. | cola |

## Módulos futuros del taller (post-movilizaciones; conceptos en EQUIPO/LOGISTICA del SG)

| # | Módulo | Estado BD | Estado |
|---|---|---|---|
| M1 | Inspecciones (IC-EQ-F-01-02, 42 ítems) | tablas listas, 0 rows; formulario aún no incluido del todo en el app | cola |
| M2 | Work orders / mantenimiento en taller | tablas listas | cola |
| M3 | Solicitudes de mantenimiento desde proyectos | sin modelar | cola |
| M4 | Hojas de tiempo de empleados en taller | papel → Spectrum/Traqspera hoy; solapa HumanOS/planilla | cola |
| M5 | Purchase orders / requisiciones (RM→OC) | tablas listas; tarea nueva del jefe con inputs B2W/MS Project/Spectrum/inventario inexistente | cola |
| M6 | Despacho de combustible | fuel_logs lista; SOP camión surtidor | cola |
| M7 | Inventarios (10 contenedores, QR/BLE, Hilti-style) | custody_transfers lista; secuencia a→b→c acordada; contenedores físicos out of scope (jefe) | cola |

## Reglas de esta cola

1. Capturar aquí ANTES de discutir — el chat no es registro.
2. Un ítem sale de `cola` solo cuando entra al pipeline formal (sesión de discusión → spec/ADR).
3. El triage mantener/rediseñar/eliminar (post-harness, con D1) asigna orden — no este doc.
4. Si un ítem genera decisión → ADR numerado; si genera feature → spec con lifecycle.
