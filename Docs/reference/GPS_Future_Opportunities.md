# GPS Live Tracking — Future Opportunities & Improvement Backlog

**Status del MVP:** ✓ Cerrado (2026-04-20). 13 commits en `jaime/dev`. Feature funcional en staging: live tracking de vehículos en movilizaciones En Ruta, con stale detection (48h), polling hygiene (visibility-aware + auto-pause), auto-follow con opt-out, y desmontaje automático al completarse todas las entregas.

**Propósito de este documento:** Registrar todas las mejoras, ideas y features futuros identificados durante el desarrollo del MVP pero que quedaron fuera de scope intencionalmente. Se consulta cuando se vuelva a priorizar trabajo de GPS/telematics.

**Cuándo volver aquí:** Después de completar Events V2, reportes básicos, dashboards por rol, formulario de inspecciones, y admin page. GPS no es prioridad hasta que las funciones operativas core estén sólidas.

---

## 1. Mejoras UX/UI del MVP actual

### 1.1 — Reubicación del bloque "material en camino" en `/solicitudes/[id]`

**Problema observado:** En la vista actual, el banner "Material en camino" + botón "Registrar Entrega" + código de verificación están en la parte superior de la página, mientras que el mapa en vivo está embebido dentro de la card de Movilizaciones Programadas más abajo. El PM tiene que hacer scroll para correlacionar "qué pasa con mi material" con "dónde está ahora mismo".

**Propuesta:** Consolidar en un solo bloque visual dentro de la card del trip:
- Banner de estado ("en camino" / "entrega parcial" / "entregado")
- Código de verificación (si aplica)
- Mapa en vivo (como está hoy)
- Botón Registrar Entrega

Esto convierte la card de Movilizaciones Programadas en el centro de gravedad operativo cuando hay un trip En Ruta. Un solo bloque = toda la info + la acción.

**Effort:** ~1 commit, medio día. Solo UI, no requiere cambios de data ni API.

**Dependencia:** Ninguna. Se puede hacer en cualquier momento.

### 1.2 — Indicador visual cuando el vehículo está fuera del viewport

**Problema:** Cuando el usuario hace pan del mapa y el vehículo queda fuera del frame visible, el botón "Seguir vehículo" aparece pero no hay señal direccional de **dónde** está el vehículo relativo al viewport actual.

**Propuesta:** Flecha pequeña en el borde del mapa apuntando hacia la ubicación del pin cuando está fuera del viewport. Patrón común en apps de navegación (Uber, Waze).

**Effort:** ~50 líneas. Requiere cálculo de bearing entre centro del viewport y posición del pin + posicionamiento absolute.

**Dependencia:** Ninguna.

### 1.3 — Rotación del viewport según heading del vehículo

**Problema:** El mapa siempre está orientado al norte. Si el camión viaja hacia el sur, el pin parece moverse "hacia abajo" del mapa, lo cual es counterintuitive.

**Propuesta:** Modo opcional "orientar mapa según dirección del vehículo" — un toggle que hace que el mapa rote para que el heading del camión siempre apunte hacia arriba.

**Effort:** ~30 líneas + testing (rotación en MapLibre tiene edge cases).

**Dependencia:** Ninguna. Feature opcional, no reemplaza el comportamiento default.

### 1.4 — Zoom adaptativo según velocidad

**Problema:** Vehículo estacionado vs. en carretera necesita distinto nivel de zoom. Estacionado: zoom alto para ver la ubicación exacta (¿está adentro de la obra?). En carretera: zoom bajo para ver contexto de hacia dónde va.

**Propuesta:** Ajustar zoom automáticamente según `position.speed`. Ej.: <5 km/h → zoom 16 (calle específica). >50 km/h → zoom 12 (contexto amplio). Solo cuando auto-follow está activo.

**Effort:** ~20 líneas.

**Dependencia:** Ninguna. Calidad de vida pura.

### 1.5 — Botón de pantalla completa / expansión del mapa

**Problema:** El mapa `compact` en `/solicitudes/[id]` es chico. Si el PM necesita detalle, tiene que ir a `/programacion/viaje/[id]` (si tiene permisos) o abrir SkyData directamente.

**Propuesta:** Botón de "expandir" que abre el mapa en un modal overlay con mayor área, manteniendo el mismo componente y polling.

**Effort:** ~100 líneas (modal + shared state + cleanup).

**Dependencia:** Ninguna.

### 1.6 — ETA (tiempo estimado de llegada)

**Problema:** Hoy el PM ve dónde está el camión pero no cuánto tarda en llegar. Pregunta obvia ("¿cuánto falta?") que el mapa solo no responde.

**Reto conocido:** El cálculo simple ignora paradas en proveedores intermedios, tráfico variable, y detours. Un ETA que dice "llega en 40 min" y en realidad llega en 2 horas porque pasó por un proveedor es peor que no tener ETA.

**Propuesta de dos niveles:**

**Nivel 1 — ETA directo (factible a corto plazo):**
- Llamada a una routing API (Mapbox Directions, Google Maps Directions, o OSRM self-hosted) desde `position` actual del vehículo hasta `destino` del trip.
- La respuesta incluye duración estimada, opcionalmente con tráfico real (Google/Mapbox).
- UI muestra: "ETA: 15:32 (estimado, asume ruta directa)".
- Disclaimer visual obligatorio: el estimado NO contempla paradas no previstas.

**Costo:**
- Mapbox Directions: 100k requests/mes free, después $0.50/1000. Para tu escala (17 usuarios × viajes activos × polling cada 30s) queda dentro del free tier con holgura.
- Google Directions: $200 USD de credit free/mes (cubre ~40k requests con tráfico). Requiere billing setup.
- OSRM self-hosted: $0 pero requiere hosting y no tiene tráfico real.

**Recomendación:** Mapbox Directions para arrancar. Billing setup simple, free tier cómodo, calidad de tráfico razonable para Panamá.

**Nivel 2 — ETA con modelo de paradas (proyecto posterior):**
- Requiere data histórica (sección 5.1 breadcrumbs) + geofences de proveedores (sección 3).
- Modelo estadístico: "tiempo promedio de parada en proveedor X" derivado de meses de data.
- Decisiones de diseño: ¿ETA al próximo waypoint o al destino final? ¿Se actualiza con cada parada detectada?
- Effort: semanas, no días. Proyecto propio con spec dedicado.

**Prioridad:** Nivel 1 es media (útil pero no bloqueante). Nivel 2 es baja-posterior (requiere acumulación de data).

**Dependencia:** Nivel 1: ninguna técnica, decisión comercial de cuál routing API usar. Nivel 2: 5.1 breadcrumbs + 3 geofences.

---

## 2. POIs propios de ICONSA

### 2.1 — Conceptos distinguidos

**POI (Point of Interest):** Punto visible en el mapa con nombre, orientado al humano. "Metro Panamá" aparece como marcador con label cuando se zoomea cerca. No dispara ninguna lógica automática — solo contextualiza el mapa.

**Geofence:** Polígono geográfico que dispara eventos cuando un vehículo entra o sale. Orientado al sistema. "El camión entró a Metro Panamá" → genera notificación, log de evento, cálculo de tiempo-en-sitio.

**Los mismos lugares físicos** (obras, talleres, proveedores) pueden existir simultáneamente como POI en el mapa + geofence en SkyData, pero son tecnologías distintas y se implementan por separado.

### 2.2 — Arquitectura propuesta: los POIs NO son una tabla nueva

**Insight clave:** Los lugares relevantes ya viven en tu BD — solo les faltan coordenadas. Enfoque recomendado:

- **Proyectos** (`public.projects`): agregar columnas `lat NUMERIC`, `lon NUMERIC`. Cuando se crea un proyecto nuevo, el formulario pide las coordenadas del sitio. Se renderizan como POIs.
- **Talleres / bases fijas**: seed data estática o una fila especial con tipo "workshop" en projects. Chilibre es el obvio.
- **Proveedores** (tabla `suppliers` — cuando exista): mismo patrón.

**Por qué es superior a una tabla `points_of_interest` dedicada:** el mantenimiento se distribuye en los workflows existentes. Cuando Rocío da de alta un proyecto nuevo, pone la dirección y queda listo como POI. Nadie tiene que "mantener una tabla de POIs" dedicada.

### 2.3 — Rendering en el mapa

Una vez los proyectos tengan coords:

- El `<TripLiveMap>` recibe una lista de POIs como prop opcional (o los fetchea él mismo).
- Cada POI se renderiza como `<Marker>` con ícono distintivo + label al hacer hover/tap.
- El POI destino del trip se destaca visualmente (ej.: glow, color distinto) porque es el objetivo relevante para ESE trip.

**Effort estimate:** 
- Schema: 1 commit (ALTER TABLE projects + lat/lon)
- UI de alta/edición de proyecto con coordenadas: 1 commit (MapLibre en modo selección o input manual lat/lon)
- Integración de POIs en el mapa: 1 commit
- Total: ~2-3 días de trabajo

**Dependencia:** Ninguna técnica. Dependencia operativa: hay que geo-locar los ~5 proyectos activos (1 hora de trabajo con Google Maps + copy/paste de coords).

---

## 3. Geofences + Auto-registro de eventos

### 3.1 — Conceptos distinguidos

**POI (Point of Interest):** Punto visible en el mapa con nombre, orientado al humano. Ver sección 2.

**Geofence:** Polígono geográfico que dispara eventos cuando un vehículo entra o sale. Orientado al sistema. Los mismos lugares físicos pueden existir como POI visible + geofence detectora, pero son tecnologías distintas que se implementan por separado.

### 3.2 — Auto-registro de eventos (la feature que destrabea todo)

**Problema actual:** Cada evento (Salida, Llegada, Entrega, Retorno) requiere registro manual por parte de Charris o el conductor. Eventos olvidados = status del trip desactualizado = mapa que sigue polleando cuando no debería + reportes con data incompleta.

**Propuesta:** Geofences en SkyData disparan eventos en MovimientOS automáticamente.

**Casos de uso concretos:**

- **Auto-Salida:** geofence en taller Chilibre. Cuando un vehículo asignado a un trip En Ruta sale del perímetro, se registra evento `Salida` automáticamente (o se pre-populan los campos del modal para confirmación del conductor).
- **Auto-Llegada:** geofence en obra destino. Vehículo entra al perímetro → evento `Llegada a destino`. En combinación con (E), este puede directamente prompt al conductor para Entrega sin paso intermedio.
- **Auto-Entrega candidato:** geofence + tiempo-en-sitio > N min = alta probabilidad de que se esté entregando. Notificación push al conductor para confirmar.
- **Auto-Retorno:** geofence en taller. Vehículo vuelve → evento `Retorno` si el trip aún está En Ruta.
- **Parada en proveedor:** geofence en ubicaciones conocidas de proveedores. Evento `Parada en proveedor` con timestamp. Feed a ETA nivel 2 (sección 1.6).

**ROI operativo:**
- Elimina ~80% del trabajo manual de registro de eventos.
- Data más completa y temporalmente precisa.
- Habilita ETA realista (sección 1.6).
- Habilita KPIs de cumplimiento confiables (sección 4).
- Mitiga el problema de "trips que quedan En Ruta toda la noche" (el auto-Retorno los cierra solo).

**Cuidado con falsos positivos:**
- Vehículo entra/sale de geofence por reposicionamiento interno del taller.
- Geofence mal dibujado (muy ancho o muy estrecho).
- Orden incorrecto de eventos (Retorno antes que Entrega).

**Mitigación:** los eventos auto-registrados deben estar marcados como tal (`source = 'gps_geofence'`) para distinguirlos de los manuales. Charris puede revisar el feed diario y corregir falsos positivos. El sistema puede aprender — si un evento es rechazado, el geofence se ajusta.

### 3.3 — Reto de mantenimiento

El problema que James identificó: cuando hay un proyecto nuevo o un POI nuevo, alguien tiene que ir a SkyData y dibujar el geofence manualmente. Eso es fricción.

**Mitigación propuesta:** API de SkyData tiene endpoint para crear geofences programáticamente (verificar disponibilidad con Charris/Jorge). Si existe, MovimientOS puede:
- Cuando se crea un proyecto en el sistema con coords, automáticamente llamar a SkyData API y crear el geofence correspondiente.
- Cuando se actualizan las coords del proyecto, actualizar el geofence.
- Cuando se archiva el proyecto, desactivar el geofence.

Esto mueve la fuente de verdad a MovimientOS y SkyData se vuelve un "consumer". Elimina el mantenimiento manual dual.

### 3.4 — Effort y dependencias

**Effort:** Significativo. Varios componentes:
- Discovery del endpoint de geofences de SkyData (no documentado en el MVP actual — requiere exploración)
- Integración write-side con SkyData API (autenticación, error handling, idempotency)
- UI para asociar geofence ↔ proyecto en MovimientOS
- Webhook o polling de eventos entrada/salida
- Logging en `geofence_events` (tabla nueva)
- Lógica de mapeo `geofence_event` → `trip_event` (con validación de secuencia esperada)
- UI de revisión/corrección de falsos positivos

**Dependencia fuerte:** POIs propios (sección 2) deben existir primero. Geofences sin POIs no tienen sentido operativo.

**Prioridad:** Alta para el negocio (auto-registro es la killer feature del GPS), media en términos de orden (requiere POIs primero).

---

## 4. KPIs de cumplimiento

Con GPS data acumulándose, se pueden calcular indicadores operativos que hoy no se miden.

### 4.1 — KPIs propuestos

| KPI | Definición | Data necesaria | Valor operativo |
|---|---|---|---|
| **Tiempo real vs. estimado de movilización** | Duración desde Salida hasta Entrega vs. el tiempo estándar para esa ruta | `trip_events` + breadcrumb GPS | Detectar viajes atípicamente largos, entender variabilidad de rutas |
| **% llegadas a tiempo** | Eventos "Llegada" automáticos (vía geofence) dentro de la ventana esperada | Geofences + evento esperado vs. real | Cumplimiento SLA de movilizaciones |
| **Tiempo de permanencia en obra** | Duración desde entrada geofence hasta salida | Geofences entrada/salida | Optimizar planificación: cuánto realmente toma cada entrega |
| **Utilización de flota** | % de tiempo cada vehículo está en movimiento vs. estacionado durante horario laboral | Epoch + speed + timestamps | Decisiones de compra/alquiler de flota |
| **Distancia total recorrida por vehículo** | Suma de odómetros en período | Odómetro GPS | Base para costos de mantenimiento prorrateados |
| **Ruta planeada vs. ejecutada** | Desviación del camino óptimo | Breadcrumb + ruta teórica | Detectar rutas ineficientes, paradas no registradas |
| **% entregas sin evento registrado** | Trips donde GPS muestra llegada a destino pero no hay evento "Entrega" | Geofences + trip_events | Identificar subregistro de eventos |

### 4.2 — Data necesaria que hoy NO existe

- **Breadcrumb histórico**: tabla `gps_telemetry_raw` con particionamiento mensual. Insertar cada position fetch en paralelo al return del API route.
- **Geofences**: sección 3.
- **Rutas estándar** (tiempo esperado origen → destino): tabla o función que dado A y B, estime duración. Puede ser simple inicialmente (Google Maps Directions API una vez, cacheado) o matricial (cada par de proyectos tiene tiempo esperado).

### 4.3 — Effort

Feature grande. Spec propio cuando llegue el momento. **6-10 semanas** si se hace completo. Pero puede arrancar por pedazos: primero persistir breadcrumbs (1 semana), luego calcular 2-3 KPIs básicos (1 semana), luego agregar dashboard (2 semanas).

**Prioridad:** Media. Útil cuando gerencia empiece a pedir métricas. Lo que James anotó: "ML/predictive models require 3-12 months of accumulated data before becoming viable". Este es el trabajo de preparación de esa data.

---

## 5. Rutas y breadcrumbs

### 5.1 — Ruta histórica en vivo (breadcrumb)

**Qué:** Durante un trip En Ruta, el mapa muestra no solo el pin del vehículo sino también una línea con el trayecto recorrido desde la Salida.

**Por qué:** Contexto visual fuerte. El PM o Charris ve de un vistazo por dónde pasó el camión, si hubo desvíos, si está volviendo sobre sus pasos.

**Data necesaria:** Breadcrumb requiere persistencia. Cada vez que el API route devuelve una nueva position, se inserta en `gps_telemetry_raw`. El mapa del lado cliente consulta el historial acumulado para el trip activo y lo dibuja como `<Layer type="line">`.

**Effort:**
- Tabla `gps_telemetry_raw` (particionada por mes): ~1 día
- INSERT paralelo en el API route: ~4 horas
- UI de la capa de línea en `<TripLiveMap>`: ~1 día
- Limpieza de trails viejos (cron o trigger): ~4 horas
- Total: ~3 días

**Dependencia:** Ninguna. Puede ser el primer feature post-MVP.

### 5.2 — Ruta histórica post-trip

**Qué:** Después de que un trip se completa, mantener el breadcrumb consultable como registro histórico. Útil para auditoría, investigación de incidencias, análisis de rutas reales vs. planificadas.

**Effort:** Incremental sobre 5.1. Solo cambiar el query de "ruta del trip activo" a "ruta de trip X cerrado".

**Dependencia:** 5.1.

### 5.3 — Análisis de desviación de ruta

**Qué:** Dada la ruta planeada (ej.: Chilibre → Metro Panamá via Transístmica), calcular la desviación de la ruta real. Destacar paradas no planificadas, detours largos.

**Effort:** Significativo. Requiere integrar una routing API (OSRM, Mapbox Directions, o Google Maps Directions) para obtener la ruta teórica.

**Dependencia:** 5.1 (breadcrumb) + una routing API.

**Prioridad:** Baja. Feature de análisis post-hoc, no operacional inmediato.

---

## 6. Detección de movilizaciones fuera del app (ghost trips)

### 6.1 — Problema

James identificó: hay uso de flota que **no se gestiona a través de MovimientOS**. Alguien usa un camión para algo que no está registrado como un trip en el sistema. Data real de GPS puede detectar esto automáticamente.

### 6.2 — Enfoque

Un cron job diario o evento-driven:
1. Por cada vehículo, identificar períodos de movimiento significativo (>X km, >Y minutos, >Z km/h promedio).
2. Cruzar esos períodos con los trips registrados en MovimientOS (`trips` donde `Salida` y `Retorno` abarcan ese período).
3. Períodos de movimiento sin trip asociado = ghost trip.
4. Reporte diario/semanal para Charris: "estos movimientos no están registrados en el app".

### 6.3 — Retos

- **Falsos positivos:** reposicionamiento interno del taller, prueba mecánica, desplazamiento a gasolinera. No todo movimiento es un "trip".
- **Umbrales de decisión:** ¿Cuánto movimiento es "significativo"? Calibrar con data real.
- **Acción del reporte:** ¿Qué hace Charris con el reporte? ¿Se crea un trip retroactivo? ¿Solo auditoría?

### 6.4 — Effort

- Lógica de detección: ~3 días (dependiendo de complejidad de umbrales)
- Reporte/dashboard: ~2 días
- Integración con workflow de Charris (opcional: botón "crear trip retroactivo"): ~2 días

**Dependencia:** Breadcrumb persistido (sección 5.1). Sin historial no se pueden detectar movimientos pasados.

**Prioridad:** Media-alta para negocio. Esta feature tiene ROI claro (identifica uso de flota no cobrado a proyectos).

---

## 7. Validación de tarifas reales

### 7.1 — Contexto (procedimiento IC-EQ-PO-02)

El procedimiento de ICONSA para cálculo de tarifas de equipos incluye dos componentes:

- **Base Fija:** Costo de mantener el equipo sin uso (depreciación, seguro, tasa de interés, valor residual).
- **Base Operativa:** Costo incremental al operar (combustible, filtros, lubricantes, llantas, Basic Repair Factor, accesorios).

Variables en la fórmula de ajuste (IC-EQ-F-02-03):
- Tasa de Interés
- Tasa de Seguro
- Clase de Equipo
- Período estimado de vida útil (años)
- Estimado de uso (horas por año)
- Uso en el período estimado (total de horas)
- Precio de compra incluyendo accesorios, llantas, etc.
- Valor Residual
- Consumo de Combustible (galones/hora, galones/km)
- Costo del Combustible
- etc.

**Revisión:** cada 6 meses, o al ingreso de equipo nuevo.

### 7.2 — Lo que mencionó Valderrama (a investigar)

> "las tarifas en realidad tienen multipliers/variables que hacen que cambie el costo solo que no esta en practica"

Interpretación: la fórmula del procedimiento contempla variables que en la práctica no se están ajustando dinámicamente. Ej.: si un camión efectivamente corre 3000 horas/año pero la tarifa se calculó sobre 2000 horas/año, la recuperación está mal calibrada. Hay **brechas entre fórmula teórica y aplicación real**.

**Acción:** Conversación dedicada con Valderrama para mapear exactamente qué variables tienen multipliers y cuáles no se están moviendo en la práctica.

### 7.3 — Contexto adicional: workaround de Spectrum

Nota importante que James mencionó: las tarifas de movilización están registradas en Spectrum como "Equipos" — es un workaround para poder cobrar a través del ERP, no el modelo correcto. Implicaciones:

- La reconciliación "tarifa teórica vs. data GPS real" tiene que lidiar con que en Spectrum el modelo está forzado.
- Cualquier feature que compute tarifas desde GPS y las sincronice de vuelta a Spectrum requiere entender primero cómo funciona el workaround actual (qué campo representa qué, qué validaciones hay).
- Objetivo largo plazo de ICONSA: eliminar estos workarounds. Eso es un rediseño en Spectrum que probablemente excede el scope de MovimientOS pero condiciona cómo se modela la integración.

Anotar para la conversación con Valderrama + Gerencia de Equipo: entender el workaround completo antes de proponer automatización de cálculo de tarifas.

### 7.4 — Cómo GPS ayuda

Data GPS real valida (o desafía) los estimados de la fórmula:

- **Horas de uso real por año** (vs. estimado): GPS dice exactamente cuántas horas cada vehículo está en movimiento. Se compara con el estimado usado en la fórmula.
- **Distancia anual real** (vs. estimado): odómetro acumulado.
- **Consumo de combustible** real (si hay sensor): validación directa del galones/hora.
- **Utilización** (horas activas / horas calendario): si un equipo está 80% inactivo, la Base Fija domina la recuperación; si está 95% activo, la Base Operativa.

### 7.5 — Entregables posibles

1. **Reporte semestral de reconciliación**: dado el histórico GPS del último semestre, calcula qué valores "reales" tendrían las variables de la fórmula. Se entrega a Gerencia de Equipo para la revisión estándar de tarifas.
2. **Alerta de outliers**: vehículo con uso muy fuera del esperado (ej.: 5000 horas/año vs. estimado 2500). Flag para revisión individual.
3. **Dashboard de utilización por equipo**: visual para Gerencia.

### 7.6 — Effort

**Alto.** Este no es un feature, es un proyecto. Requiere:
- Entendimiento profundo de la fórmula actual (reunión con Valderrama + Gerencia de Equipo)
- **Entendimiento del workaround de Spectrum** (ver 7.3) — condiciona el modelo de integración
- Data GPS acumulada (mínimo 3-6 meses)
- Modelo de cálculo en código (validado manualmente primero)
- UI de reportes
- Workflow de revisión con stakeholders

**Prioridad:** Estratégica pero diferida. James ya anotó la línea correcta: "demostrar valor antes de escalar a management sobre methodology de tarifas". Este es exactamente ese caso — primero demostrar que el sistema puede producir data confiable, después proponer que se use para ajustar tarifas.

**Dependencia:** 3+ meses de breadcrumb histórico acumulado (sección 5.1).

---

## 8. Integración con WhatsApp (notificaciones de eventos GPS)

### 8.1 — Contexto

Twilio ya está en el stack de MovimientOS (para HumanOS se planea WhatsApp). WhatsApp tiene tasas de apertura dramáticamente más altas que email en el contexto de construcción en Panamá. Los eventos GPS son candidatos naturales para notificar por WhatsApp.

### 8.2 — Eventos candidatos

- **"Tu camión llegó a obra"** (PM) — trigger: geofence de entrada al proyecto destino.
- **"Camión X lleva Y minutos parado en Z"** (Charris) — trigger: speed=0 por N minutos fuera de ubicaciones conocidas.
- **"Viaje excedió el tiempo esperado"** (Charris + PM) — trigger: duración > 1.5x el estándar.
- **"Dispositivo GPS desconectado"** (Charris, IT) — trigger: >6h sin reportar para un vehículo En Ruta.

### 8.3 — Effort

Por notificación individual, ~1 día cada una (template WhatsApp + trigger + Twilio integration + testing). El conjunto completo con 4-5 notificaciones: ~1-2 semanas.

**Dependencia:** Geofences (sección 3) para las notificaciones basadas en entrada/salida. El resto solo requiere el polling actual.

**Prioridad:** Media. Valor operativo alto pero no bloquea nada. Es mejor después de que el stack WhatsApp esté maduro para HumanOS.

---

## 9. Migración a webhooks (eventual)

### 9.1 — Motivación

Polling actual funciona bien para la escala de ICONSA (17 usuarios, 13 vehículos), pero estructuralmente webhooks son superiores para casos donde importa latencia o eventos discretos:

- Notificaciones en tiempo real (ver sección 8) sin polling constante.
- Eventos de geofence con latencia de 1-2s vs. hasta 30s con polling.
- Reducción de llamadas al API cuando la flota está idle (camiones estacionados en Chilibre todo el día no generan tráfico).

### 9.2 — Por qué se difirió para el MVP

- El payload de SkyData webhooks no está documentado (endpoint `/api/data-forwarding-rules`).
- Requiere URL pública receptora (Vercel lo provee, pero dev local necesita tunnel como ngrok).
- Debugging más complejo (eventos perdidos silenciosamente vs. polling reintenta automáticamente).
- Desconocemos si el contrato con SkyData incluye webhooks o si son un addon comercial.

### 9.3 — Cuándo atacarlo

Cuando 2 de 3 se cumplan:
1. El volumen de llamadas al API empieza a ser incómodo (ej.: >10k/día consistentemente).
2. Los usuarios se quejan de la latencia de 30s (especialmente Charris en dispatch activo).
3. Hay un feature que requiere baja latencia (ej.: alerta de "camión llegó" en <5s).

### 9.4 — Estrategia de migración

**Patrón híbrido recomendado:** webhooks como path optimista + polling como fallback de baja frecuencia (cada 5 min en vez de 30s).

- Webhook llega → actualiza cache server-side → próximo polling del cliente recibe data fresca.
- Webhook se pierde → polling de 5 min eventualmente captura el estado correcto.
- Nunca se pierde un evento definitivamente.

### 9.5 — Effort

- Discovery del payload de SkyData: 1 día (crear un data-forwarding-rule apuntando a requestbin.com para ver qué JSON manda).
- Endpoint receptor + auth validation: 2 días.
- Migración del caché a Redis (Upstash): 2 días (porque webhooks desde múltiples instancias serverless necesitan caché compartido).
- Refactor del componente para usar polling de baja frecuencia: 1 día.
- Testing + rollback strategy: 2 días.
- Total: ~1.5-2 semanas.

**Prioridad:** Baja hasta que uno de los triggers de 9.3 se active.

---

## 10. Fleet overview dashboard

### 10.1 — Qué

Una pantalla nueva (`/fleet` o similar) con un mapa que muestra **todos los vehículos de la flota simultáneamente**, con código de color por estado.

### 10.2 — Casos de uso

- **Charris en dispatch**: ve de un vistazo qué vehículos están En Ruta, cuáles disponibles en taller, cuáles stale/sin señal. Decisiones de asignación más informadas.
- **Astrid/Gerencia**: visibilidad de utilización de flota en tiempo real, sin tener que entrar a trip por trip.

### 10.3 — Effort

Aprovecha casi todo el trabajo del MVP:
- Mismo skydata-client, mismo caché, mismo polling.
- Fetch single call al `getFleetStatus()` devuelve los 13 vehículos.
- Renderizar 13 markers en vez de 1.
- Lógica de color por status: verde (En Ruta con trip asociado), amarillo (stale), gris (parado en taller), rojo (stale >48h sin trip, investigar).

**Estimación:** 1-2 semanas (pantalla nueva, filtros, drill-down a trip, etc.).

**Dependencia:** Ninguna técnica. Dependencia operacional: RLS — ¿quién puede ver esta vista? Default probable: admin + logistica. PMs ven solo sus vehículos asignados.

**Prioridad:** Media. Es la feature más "demostrable" hacia gerencia — impacto visual alto.

---

## 11. Fuel scorecard (dependiente de sensores)

### 11.1 — Estado actual

Ningún vehículo de ICONSA tiene sensor de combustible activo en SkyData según el discovery del MVP. Este feature requiere hardware primero.

### 11.2 — Cuando haya sensores

- Consumo por vehículo por período (galones/hora real, galones/km real).
- Comparativa vs. especificación de fábrica → scoring de conductor o equipo.
- Detección de anomalías (llenados no registrados = posible robo, consumos fuera de rango = posible fuga o problema mecánico).
- Alimenta validación de tarifas (sección 7).

**Effort post-sensores:** ~2 semanas (queries + dashboard + alertas).

**Prioridad:** Depende de decisión de ICONSA de instalar sensores. Inversión hardware significativa.

---

## 12. Resumen: priorización sugerida

Cuando se vuelva a abrir el tema GPS, orden recomendado.

**Los 3 features que James identificó como más valiosos para el negocio y que el jefe apreciará más:**
- **Auto-registro de eventos** (sección 3.2) — elimina trabajo manual + mejora calidad de data
- **KPIs de cumplimiento** (sección 4) — métricas operativas confiables
- **Ghost trip detection** (sección 6) — identifica uso de flota no registrado
- **Validación de tarifas reales** (sección 7) — el de mayor ROI estratégico pero más complejo

**Primera iteración (alto valor, bajo esfuerzo, habilita todo lo demás):**
1. Sección 1.1 — Reubicación del bloque en `/solicitudes/[id]` (0.5 días) ← ya decidido, se hace ya
2. Sección 5.1 — Breadcrumb persistido (3 días) ← **unlocks everything else analítico**

**Segunda iteración (POIs + geofences habilitan auto-registro):**
3. Sección 2 — POIs propios + coords en proyectos (2-3 días)
4. Sección 3 — Geofences + auto-registro de eventos (2-3 semanas) ← **killer feature**

**Tercera iteración (aprovechando la data + geofences):**
5. Sección 10 — Fleet overview dashboard (1-2 semanas)
6. Sección 6 — Detección de ghost trips (1 semana, después de ~1 mes de data) ← favorito jefe
7. Sección 4 — KPIs de cumplimiento básicos (2-3 semanas) ← favorito jefe

**Cuarta iteración (alto impacto, mucha preparación):**
8. Sección 1.6 — ETA Nivel 1 (1 semana con routing API)
9. Sección 8 — Notificaciones WhatsApp (1-2 semanas)
10. Sección 7 — Validación de tarifas con GPS data (proyecto estratégico, 2-3 meses) ← favorito jefe

**Oportunista (cuando triggers se cumplan):**
- Sección 9 — Migración a webhooks
- Sección 1.6 Nivel 2 — ETA con modelo de paradas (post data histórica)
- Sección 11 — Fuel scorecard (post-sensores)

---

## 13. Deuda del MVP actual

Pendientes técnicos menores identificados durante el desarrollo:

- **Usuario dedicado SkyData:** el MVP usa las credenciales de `mcalderon` (comercial). Debería crearse un usuario `api-movimientos` con permisos read-only. Acción: Charris/Jorge.
- **Confirmación de modelo comercial de SkyData:** el rate limit (240 req/2min por IP) es técnico. No está confirmado si hay cap mensual de requests o límites comerciales distintos. Acción: Jorge.
- **SQL en prod:** el bootstrap de `gps_vehicle_id` está en staging. Se aplicará cuando staging se merge a main (estrategia v2 completa, no feature-by-feature).

---

**Última actualización:** 2026-04-20  
**Contexto de cierre:** GPS MVP shippeado en `jaime/dev`. Siguiente prioridad: Events V2. Este documento se consulta cuando se retome trabajo de GPS/telematics.
