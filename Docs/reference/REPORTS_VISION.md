# MovimientOS — Visión de Reportes

**Fecha:** 2026-04-21
**Estado:** Propuesta para discusión
**Autor:** Claude Chat + James Cucalón
**Ubicación target en repo:** `Docs/reference/REPORTS_VISION.md`

---

## 1. Contexto

ICONSA requiere reportes de movilizaciones con dos audiencias distintas:

1. **Contabilidad (Astrid)** necesita un input en formato Spectrum (Equip Revenue Transactions) para subir el costo de movilizaciones al ERP.
2. **Gerencia y logística (Rodrigo, Charris, PMs)** necesitan trazabilidad y visibilidad: qué se movilizó, cuándo, con qué recursos, cuánto costó, por proyecto.

Hoy (abril 2026) todo es manual:

- Charris mantiene un Excel personal con las movilizaciones de cada proyecto. No sigue los formularios oficiales IC-LOG-F-06-04 (Bitácora) ni IC-LOG-06-05 (Facturación) al pie de la letra. Le faltan campos clave como código de costo completo.
- Cada lunes Charris envía Excels por proyecto a Astrid por correo.
- Astrid manualmente los transforma al formato Spectrum y sube al ERP.
- Gerencia no tiene dashboards de movilizaciones — pregunta a Charris cuando quiere saber algo.

MovimientOS ya captura la data necesaria para ambas audiencias (solicitudes, viajes, rates, cost codes, eventos, conductores, vehículos) para los proyectos gestionados en el app. Falta exponerla como reportes.

**Este documento describe la visión completa del sistema de reportes**, encuadra el MVP dentro de ella, y delimita qué vive dentro del app vs fuera.

---

## 2. La visión en 5 capas

La arquitectura de reportes no es un feature monolítico — es un sistema en capas que se construye iterativamente. Cada capa entrega valor standalone y no bloquea a las siguientes.

### Capa 1: Reportes auto-generados del app (MVP — este chat)

**Qué hace:** MovimientOS genera semanalmente un reporte Clean de las movilizaciones de la semana pasada (bitácora + facturación unificadas), más una versión en formato Spectrum lista para subir al ERP. Mensualmente genera la misma data agregada del mes. Todo vía cron, entregado por correo.

**Qué resuelve:**

- Elimina compilación manual semanal de Charris para los trips que sí están en el app
- Da a Astrid un archivo Spectrum pre-formateado como input alternativo
- Establece auditabilidad: cada fila tiene MOV-ID, solicitud, eventos de proof, cost code completo

**Qué NO resuelve:**

- Trips que nunca fueron capturados en el app (mal uso, mala adopción) → visible como gap pero no corregible desde este reporte
- Configuración UI de destinatarios, filtros personalizados, reportes on-demand

**Spec detallada:** `Docs/superpowers/specs/2026-04-21-mobilization-reports-mvp-spec.md`

### Capa 2: Gap analysis Charris ↔ MovimientOS (manual-first)

**Qué hace:** Compara los Excels semanales de Charris contra los trips registrados en MovimientOS. Identifica:

- Movilizaciones reportadas por Charris que NO están en MovimientOS (Gap Tipo A — mal uso del app por solicitantes y Charris)
- Trips en MovimientOS que Charris no reportó (anomalías de captura o registros espurios)

**Dónde vive inicialmente:** Fuera del app. En Chat (Claude con acceso a ambas fuentes — DB via SQL, Excel de Charris pegado). James corre esto semanalmente como herramienta de supervisión y genera métricas de adopción.

**Cuándo migraría al app:** Cuando el patrón se estabilice y el gap analysis se ejecute varias veces al mes. La automatización llegaría como una página `/reportes/gap-analysis` con upload de Excel y diff automatizado. No está en scope inmediato porque: (1) el Excel de Charris aún cambia frecuentemente de formato, (2) construir un parser frágil para algo que se usa 4 veces al mes es prematuro, (3) la adopción del app es el problema de fondo — mejor atacar eso.

**Qué es distinto de Gap Tipo B:** Ghost trips reales (vehículos usando flota sin solicitud formal ni reporte) son un problema aparte que solo GPS puede detectar. Eso es Capa 5 territory.

### Capa 3: Asistencia a Astrid — Charris → Spectrum

**Qué hace:** Toma un Excel semanal de Charris (su formato actual) y produce un Excel en formato Spectrum ready-to-upload. Es la automatización del trabajo manual que hoy hace Astrid.

**Dónde vive:** NO dentro de MovimientOS. Es una herramienta puntual para una sola persona (Astrid) con flujo propio (Charris → Astrid → Spectrum). Meterla al app agrega complejidad sin beneficio para el resto de usuarios.

**Forma probable:** Script Python o micro-web-tool en Vercel separado, o un artifact de Claude que Astrid usa cada semana. Complejidad baja una vez validado el parser contra 3-4 Excels reales de Charris.

**Cuándo construirla:** Cuando James lo decida. No bloquea nada. Es valor agregado para Astrid, no un componente del sistema MovimientOS.

**Por qué vive afuera:** Principio de diseño — no todo lo útil vive dentro del app. Si un usuario concreto necesita una herramienta puntual y no agrega valor al resto, se construye aparte. Esto mantiene MovimientOS enfocado en su rol (operaciones de campo) y deja a Astrid con una tool que le sirve sin depender de nadie.

### Capa 4: Reports Hub in-app (on-demand, parametrizable)

**Qué hace:** Página admin `/reportes` con múltiples reportes pre-configurados. Cada reporte tiene filtros (proyecto, rango de fecha, estado, equipo), preview en tabla, y export Excel. Incluye entre otros:

- Reporte de movilizaciones (el mismo del cron, pero con parámetros custom)
- Informe Valderrama (qué equipos están en qué proyecto, semanal)
- Reporte de utilización de equipos (hours deployed vs available)
- Reporte de cumplimiento de eventos (% trips con proof completo, por proyecto/operador)
- Reporte de tarifas aplicadas (para validar metodología de pricing de Charris)

**Arquitectura deseada:** Un motor genérico de reportes que toma `{query_view, filters, format}` y retorna archivo. Los reportes específicos son thin wrappers sobre el motor. El mismo motor alimenta al cron semanal/mensual y al Hub on-demand — una fuente de verdad, dos superficies de entrega.

**Cuándo construirla:** v2. Depende de que Capa 1 esté estable y haya evidencia de demanda real (gerencia pidiendo reportes ad-hoc, James generando reportes manualmente que deberían ser self-service).

**Configuración de cron/destinatarios también vive aquí:** Tab admin para definir quién recibe cada reporte automatizado. Por ahora, hardcoded a James; tabla `report_subscriptions` para expansión futura sin refactor.

### Capa 5: Dashboards por rol + insights de GPS/analítica

**Qué hace:** Dashboards interactivos con KPIs tendencia, no archivos estáticos. Dashboards diferenciados por rol:

- `/dashboard/management` — KPIs de compañía, tendencias mensuales, utilización agregada
- `/dashboard/logistics` — Panel de Charris: dispatch board, backlog, vehicle availability
- `/dashboard/pm` — Vista por proyecto: equipos deployados, solicitudes activas, costos acumulados
- `/dashboard/workshop` — Work orders, equipos grounded, inspecciones pendientes

**Qué es nuevo aquí vs Capas 1-4:** Análisis derivado de múltiples fuentes:

- Ghost trips (Gap Tipo B) cruzando GPS vs trips de MovimientOS
- Cumplimiento de eventos como KPI operacional
- Análisis de tarifas (validar si las 14 tarifas siguen reflejando costo real)
- Time-on-site por equipo usando geocercas
- Utilización de flota vs depreciación

**Cuándo:** Chat separado. Fuera del scope de reportes. Queda mencionado aquí para completar el panorama — el sistema de reportes (Capas 1-4) alimenta los dashboards con data limpia, no compiten.

---

## 3. Alineación con VISION_ROADMAP

| Capa | Fase roadmap actual | Estado | Notas |
|------|-----|-----|-----|
| 1. Reportes auto-gen | Fase 1D (Reportes auto-generados) | **MVP arranca ahora** | Alineado directamente con sub-fase 1D |
| 2. Gap analysis | No asignada explícitamente | Manual-first en Chat | Herramienta de supervisión, no feature del app |
| 3. Charris→Spectrum | Fuera del scope del app | Externo | Script/tool externo cuando se necesite |
| 4. Reports Hub | Fase 4 (Dashboards avanzados) | v2 | Depende de Capa 1 estable + demanda |
| 5. Dashboards + Insights | Fase 4-6 | Futuro | GPS ya implementado (jaime/dev), analítica pendiente |

El VISION_ROADMAP actual lista GPS en Fase 6B pero en realidad el MVP de live tracking ya está implementado en jaime/dev (cerrado 2026-04-20, pendiente merge a prod). Cuando se actualice el VISION_ROADMAP, esta sección debe reflejar el estado real.

---

## 4. Principios guía

**No todo vive dentro del app.** Capa 3 es el ejemplo canónico: un tool para una sola persona con flujo externo no pertenece al core del app. Meter complejidad que no beneficia al usuario general es deuda técnica disfrazada de ambición.

**El backend y la data son la fuente de verdad, no el UI.** El cron del MVP y el Hub de v2 consultan la misma tabla `trips` con las mismas reglas. Si la lógica de "qué cuenta como movilización facturable" cambia, se cambia una vez en una view/función, no en N lugares.

**Proof como primera clase, no como afterthought.** MovimientOS es una bitácora digital, no solo un CRUD. Los eventos (Salida/Entrega/Retorno) son el mecanismo que separa lo declarativo ("se programó") de lo real ("ocurrió"). Todo reporte debe exponer esta distinción — en el MVP como columna Proof, en v2 como KPIs, en v3 como alertas en dashboard.

**Demostrar valor antes de escalar con gerencia.** El MVP se valida con James recibiendo los reportes 2-3 semanas antes de incluir a Astrid. Capa 2 (gap analysis) produce métricas de adopción que justifican inversión antes de pedir más disciplina a Charris/solicitantes. Capa 4 (Hub) no se construye hasta que Capa 1 demuestre demanda de reportes ad-hoc.

**El source of truth durante la transición NO es MovimientOS.** Hasta que la adopción sea suficiente, los Excels de Charris siguen siendo la referencia contable. MovimientOS complementa, no reemplaza. La visión a largo plazo sí es que MovimientOS sea la fuente única — pero ese es un destino, no un requisito para empezar.

---

## 5. Dependencias y secuencia

```
Capa 1 (MVP) — standalone, no depende de otras capas
    │
    ├── habilita → Capa 2 (gap analysis manual)
    │   │
    │   └── evidencia de demanda → Capa 4 (Hub) — si se valida utilidad
    │
    └── complementa → Capa 3 (tool externo Astrid)
                      independiente, puede construirse en paralelo

Capa 5 (Dashboards) — depende de data acumulada + analítica GPS
                      no depende directamente de Capas 1-4, consume los mismos datos
```

**Camino crítico:** 1 → 2 (manual) → 4. Capas 3 y 5 son paralelas y opcionales en timing.

**Prerequisitos técnicos del MVP (Capa 1):** Ninguno más allá del stack actual (Supabase, Next.js, Resend). Las librerías de generación (ExcelJS) y scheduling (pg_cron + pg_net) son features nativas de Supabase. No requiere Edge Functions, no requiere Storage bucket, no requiere nuevas integraciones.

---

## 6. Fuera del scope de este chat

- Dashboards por rol (Capa 5) — chat separado
- GPS analytics (ghost trips, rate validation, time-on-site) — depende de data acumulada
- Página `/reportes` admin on-demand (Capa 4) — v2, después de estabilizar cron
- Configuración UI de destinatarios — v1.1
- Tool externo Charris→Spectrum (Capa 3) — cuando James lo decida construir

---

## 7. Glosario

| Término | Significado |
|---------|-------------|
| **Reporte Clean** | Bitácora digital unificada: columnas operativas (IC-LOG-F-06-04) + facturación (IC-LOG-06-05) + trazabilidad (MOV-ID, solicitud) en una sola tabla. Reemplaza los formularios manuales de ICONSA. |
| **Reporte Spectrum** | Export en formato Equip Revenue Transactions para upload directo al ERP Trimble Spectrum. Derivado del Clean. |
| **Proof** | Indicador por trip de confiabilidad: Completo (2+ eventos), Parcial (1 evento), Sin proof (0 eventos). Basado en eventos Salida/Entrega/Retorno registrados. |
| **Gap Tipo A** | Movilizaciones que Charris reporta pero no están en MovimientOS. Indica mal uso del app. |
| **Gap Tipo B** | Uso de vehículos no reportado en ningún flujo (ni por Charris ni por el app). Detectable solo con GPS. "Ghost trips reales". |
| **Batch_ID** | Identificador de lote para upload a Spectrum. Convención: `MV{DDMMAA}` del día que el cron corre. También se usa como estampa en `trips.spectrum_batch_id` para garantizar no-duplicación. |
