# MovimientOS — Visión del Sistema Final y Roadmap Secuencial

**Fecha:** 20 de marzo de 2026  
**Autor:** Claude Chat (Arquitecto de sistema) + James Cucalón  
**Estado:** Propuesta para discusión  
**Versión:** 1.0

---

## 1. La Visión: De app de movilizaciones a plataforma de operaciones de ICONSA

### 1.1 — Qué es MovimientOS hoy

Un sistema funcional con 17 usuarios activos que digitaliza UN procedimiento: IC-LOG-PO-06 (Movilizaciones). Cubre el flujo Solicitud → Programación → Ejecución → Entrega con 44 tablas, notificaciones por email, file attachments, y entregas parciales. El sistema maneja aproximadamente el 20% de los casos operativos reales de ICONSA.

### 1.2 — Qué será MovimientOS en su estado final

La plataforma central de operaciones de campo de ICONSA. Un sistema que:

1. **Controla todo lo que se mueve** — Equipos pesados, materiales, herramientas menores, combustible. Por flota propia, por retiro del PM, o por terceros. Cada movimiento tiene cadena de custodia digital.
2. **Verifica antes de despachar** — Ningún equipo sale de Chilibre sin inspección vigente. Defectos críticos generan orden de trabajo automática y sacan el equipo del pool disponible.
3. **Mantiene lo que tiene** — Órdenes de trabajo, historial de mantenimiento por equipo, costo acumulado de vida útil. El taller de Chilibre opera digitalmente.
4. **Sabe dónde está todo** — Ubicación actualizada de cada activo, QR para escanear en campo, historial de transferencias. GPS cuando esté disponible.
5. **Genera sus propios reportes** — Facturación mensual, informe semanal Valderrama, dashboards por rol. Sin compilación manual.
6. **Se conecta con lo que existe** — Spectrum para cost codes y equipos, Skydata para GPS, WhatsApp para conductores.

### 1.3 — Los 13 SOPs de ICONSA que MovimientOS tocará

| # | Código | Nombre | Fase | Estado actual |
|---|--------|--------|------|--------------|
| 1 | IC-LOG-PO-06 | Movilización de Equipos y Materiales | 1 (actual) | ✅ Digitalizado ~80% |
| 2 | IC-EQ-F-01-02 | Inspección Entrada/Salida de Equipos | 1 | ❌ Tablas creadas, falta UI |
| 3 | IC-EQ-F-00-02 | Control de Logística (bitácora) | 1 | ❌ Datos existen, falta vista |
| 4 | IC-EQ-PO-02 | Gestión de Equipos (ciclo de vida) | 2 | ❌ Parcialmente en admin |
| 5 | IC-LOG-PO-05 | Equipos Menores | 2 | ❌ Estructura de tracking_tier lista |
| 6 | IC-EQ-F-01-03 | Inspección de Rodajes/Orugas | 2 | ❌ Segundo template de inspección |
| 7 | IC-EQ-PO-01 | Mantenimiento y Reparación de Equipos | 3 | ❌ Tabla work_orders existe |
| 8 | IC-EQ-PO-06 | Suministro de Combustible | 3 | ❌ Tabla fuel_logs existe |
| 9 | IC-EQ-PO-04 | Control de Herramientas | 3 | ❌ |
| 10 | IC-EQ-PO-05 | Almacén de Taller | 3 | ❌ Tablas warehouse_* existen |
| 11 | IC-LOG-PO-07 | Equipos de Seguridad (EPP) | 3 | ❌ |
| 12 | IC-LOG-PO-01 | Compras | 4 | ❌ Tablas purchase_orders existen |
| 13 | IC-LOG-PO-09 | Flota de Vehículos Livianos | 5 | ❌ |

### 1.4 — Lo que NO es MovimientOS

- **No reemplaza Spectrum/Sage** — Spectrum sigue siendo el ERP contable. MovimientOS es operaciones de campo.
- **No reemplaza Basecamp** — Basecamp sigue para comunicación de proyectos. MovimientOS es para equipos y logística.
- **No es un ERP** — No maneja nómina, contabilidad, contratos. Es la capa operacional que alimenta datos al ERP.

---

## 2. Arquitectura del Sistema Final

### 2.1 — Modelo conceptual: Los 7 dominios

```
┌─────────────────────────────────────────────────────────┐
│                    MovimientOS                          │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │SOLICITUD │→ │PROGRAMAR │→ │ EJECUTAR │  ← Hoy      │
│  │(Pedido)  │  │(Viaje)   │  │(Eventos) │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│       ↑              ↑             ↓                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ EQUIPOS  │  │INSPECCIÓN│  │ CUSTODIA │  ← Próximo  │
│  │(Registro)│  │(Gate)    │  │(Transfer)│             │
│  └──────────┘  └──────────┘  └──────────┘             │
│       ↑              ↓             ↓                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  TALLER  │  │REPORTES  │  │DASHBOARD │  ← Futuro   │
│  │(WO/Fuel) │  │(Auto-PDF)│  │(Por Rol) │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

### 2.2 — La primitiva fundamental: Transferencia de Custodia

El insight arquitectónico más importante: **todo es transferencia de custodia**. No importa si el equipo llega por flota, lo recoge el PM, o lo trae un tercero. Lo que importa es: quién tenía el activo → quién lo tiene ahora → prueba de que ocurrió.

La tabla `custody_transfers` es el punto de convergencia donde:
- Fleet delivery (Trip.Entrega) → INSERT custody_transfer
- Self-pickup (PickupOrder.Retiro) → INSERT custody_transfer  
- Tercero (futuro) → INSERT custody_transfer

Un solo trigger en esa tabla actualiza `equipment.current_location` y `current_project_id`. Esto desacopla el tracking de ubicación del método de transporte.

### 2.3 — Stack técnico final

| Capa | Actual | Estado final |
|------|--------|-------------|
| Frontend | Next.js 16 + Tailwind + shadcn/ui | Sin cambio. PWA para offline. |
| Base de datos | Supabase PostgreSQL + Auth + RLS + Storage | Sin cambio. ~60 tablas proyectadas. |
| Notificaciones | Resend (email) | Resend + WhatsApp Business API |
| Reportes | — | @react-pdf/renderer + SheetJS |
| Scheduling | — | pg_cron + Edge Functions |
| Dashboards | Dashboard global básico | Tremor/Recharts, 4 dashboards por rol |
| Backend | — | NestJS (cron, integraciones) cuando se necesite |
| Integraciones | — | Spectrum API, Skydata GPS |
| Analytics | — | Dashboards custom primero; Metabase si gerencia lo pide |

---

## 3. Roadmap Secuencial — 6 Fases con Prerequisites

### Principio rector: Cada fase entrega valor standalone y no requiere rehacer trabajo previo.

---

### FASE 0: Estabilización (AHORA — Semanas 1-2)

**Prerequisito:** Nada — es la base para todo lo demás.

**Por qué primero:** No se puede construir sobre cimientos inestables. Hay deuda técnica acumulada que genera fricción para los 17 usuarios actuales y para el desarrollo.

**Entregables:**

| # | Item | Detalle | Blocker para |
|---|------|---------|-------------|
| 0.1 | **RLS: sm_requests UPDATE para logistica** | Charris no puede cancelar solicitudes con su rol real. Pendiente desde el 14 de marzo. | Todo lo que toca status de solicitudes |
| 0.2 | **Resend: verificar dominio iconsanet.com** | Requiere DNS records del admin de IT de ICONSA. Sin esto, emails van desde dominio de prueba. | Notificaciones en producción |
| 0.3 | **Forgot-password SMTP** | El flujo está construido pero no funciona porque Supabase Auth necesita SMTP configurado. | Onboarding de nuevos usuarios |
| 0.4 | **Testing completo adjuntos + notificaciones** | Cada flujo × cada rol. Verificar que todo funciona end-to-end. | Confianza de usuarios |
| 0.5 | **User guide con Scribe** | 4 flujos por rol: crear solicitud, programar viaje, mis viajes, admin. PDF distribuible. | Adopción |
| 0.6 | **Feedback forms** | Google Form por pantalla por rol. Link incrustado en cada sección de la app. | Retroalimentación estructurada |
| 0.7 | **Andrés Solís y Lourdes sin email** | 2 PMs se skipean en notificaciones. Resolver con ICONSA. | Cobertura completa |

**Decisiones pendientes que deben resolverse aquí:**
- Definición oficial de "equipo menor" (¿<$5K? ¿<$10K? ¿tipo EQA?)
- Las 10 categorías de Spectrum, ¿son correctas para operaciones o necesitan ajuste?

**Duración estimada:** 2 semanas  
**Usuarios impactados:** Todos los 17

---

### FASE 1: Perfeccionar Movilizaciones (Semanas 3-10)

**Prerequisito:** Fase 0 completada. RLS funcional, usuarios estables.

**Por qué antes de equipos o taller:** Los usuarios actuales necesitan que el sistema core sea impecable antes de confiar en expansiones. Charris y los PMs deben sentir que movilizaciones es "completo".

**Sub-fase 1A: Sistema de eventos rediseñado (Sem 3-5)**

El gap más grande del MVP actual. El sistema de eventos necesita:

| Cambio | Qué resuelve |
|--------|-------------|
| Todo editable en Salida | Conductor, vehículo, líneas, cantidades — Charris/Joseph confirman realidad vs plan |
| Entrega por receptor en proyecto | Hoy el conductor registra la entrega, pero en realidad es el receptor quien confirma |
| Retorno por almacenista/Charris | Hoy cualquiera puede registrar retorno — debe ser almacén o logística |
| Popups mejorados | Los modals actuales son básicos — necesitan más contexto y validación |
| Fecha de creación visible | Charris pidió columna de creation date en lista de solicitudes |

**Prerequisitos de 1A:**
- `custody_transfers` table (nueva) — la primitiva fundamental
- Trigger refactorizado: location update se mueve de trip_events a custody_transfers
- Decidir: ¿eventos siguen inmutables o se permite corrección dentro de ventana temporal?

**Sub-fase 1B: Self-pickup (Sem 5-7)**

No es un nice-to-have — los PMs YA van a buscar material personalmente y el sistema no lo captura.

| Componente | Detalle |
|-----------|---------|
| `fulfillment_type` en sm_requests | 'fleet', 'pickup', 'hybrid' |
| `is_self_pickup` en trips O `pickup_orders` nueva entidad | Decisión pendiente: ¿simplificar usando Trip con flag, o entidad separada? |
| Confirmación invertida | Almacén tiene el código, PM lo ingresa |
| Vehículos de proyecto | Dropdown incluye VHL del proyecto (no solo flota) + fallback texto libre |
| $0 tarifa explícita | Nunca null — $0 significa "no hubo costo de transporte" |
| Líneas mixtas | Una solicitud puede tener líneas fleet + líneas pickup |

**Mi recomendación vs lo investigado:** El doc de Self-Pickup propone una entidad `PickupOrder` separada. Es arquitecturalmente elegante pero añade complejidad para un equipo de vibecoding. **Propongo empezar con Trip + `is_self_pickup` flag** que salta los eventos irrelevantes (solo Entrega), y migrar a entidad separada solo si la complejidad lo justifica después de 3+ meses de uso real.

**Sub-fase 1C: Inspecciones como gate (Sem 7-9)**

La feature más pedida y el puente natural hacia equipos.

| Componente | Detalle |
|-----------|---------|
| Cargar template IC-EQ-F-01-02 | 42 items en 6 secciones. Las 6 tablas de inspección ya existen. |
| UI walkthrough móvil | Accordion por sección, progress bar, pass/fail grande (guantes), foto en fail |
| Firma digital | react-signature-canvas → PNG → Supabase Storage |
| `is_blocking = false` al inicio | Solo warning: "Este equipo no tiene inspección vigente." Charris puede continuar. |
| Auto-PDF de inspección | @react-pdf/renderer genera PDF almacenado en Storage |

**Prerequisitos de 1C:**
- `equipment_categories` debe tener 10 rows seeded (ya hecho ✅)
- Template data: transcribir los 42 items del formulario IC-EQ-F-01-02 en JSON
- Storage bucket `inspections/` creado
- Decidir validez: ¿24 horas? ¿48 horas? ¿Configurable por categoría?

**Sub-fase 1D: Reportes auto-generados (Sem 8-10)**

En paralelo con inspecciones — no tienen dependencia entre sí.

| Reporte | Cadencia | Formato | Destinatario |
|---------|----------|---------|-------------|
| **Facturación mensual** | 1ro de cada mes, 6AM | PDF con branding ICONSA | Astrid, Gerencia |
| **Informe Valderrama** | Lunes 7AM | PDF (formato del Equipos_4ta_Sem PDF) | VP Proyectos, Gerentes |
| **Bitácora de movilizaciones** | On-demand (pantalla /bitacora) | Vista web + Export Excel | Charris, Auditoría |

**Caveats de facturación:**
- No todas las tarifas son viaje × tarifa. Algunas son tarifa del equipo movilizado (ej: grúa) agrupando múltiples viajes.
- Tabla `mobilization_campaigns` ya existe para agrupar viajes por equipo.
- Human-in-the-loop: Charris revisa → Astrid aprueba → sistema genera PDF final.
- Prorrateo multi-proyecto (viaje sirve a 2 proyectos) queda como decisión manual de Charris.

**Prerequisitos de 1D:**
- Discusión con Charris sobre lógica exacta de agrupamiento de tarifas
- Acceso al formato actual del reporte de Astrid para replicar layout
- pg_cron habilitado en Supabase (Pro plan ✅)

**Entregable de Fase 1:** Sistema de movilizaciones cubriendo ~80% de casos reales (vs 20% hoy). Inspecciones como warning, bitácora digital, facturación semi-automática.

**Duración estimada:** 8 semanas  
**Tablas nuevas:** 1 (custody_transfers). RLS updates en 2-3 tablas.

---

### FASE 2: Gestión de Equipos (Semanas 11-18)

**Prerequisito:** Fase 1C completada (inspecciones funcionales). La inspección es el puente — sin ella, gestión de equipos es solo un catálogo estático.

**Por qué aquí:** "El jefe está pidiendo esto" — visibilidad de qué equipo está dónde, en qué condición, y quién puede operarlo. Es lo que gerencia necesita para tomar decisiones de flota.

**Sub-fase 2A: Registry y catálogo visual (Sem 11-13)**

| Componente | Detalle |
|-----------|---------|
| Equipment detail page | `/equipment/[id]` — foto, specs, historial completo de movilizaciones, inspecciones, ubicación actual |
| Catálogo con fotos | photo_url ya existe. Onboarding de fotos: cada equipo que sale de Chilibre se fotografía |
| Vista por tier | Major / Minor / Consumable como tabs o filtros |
| Historial de ubicación | Timeline de cada custody_transfer del equipo |
| Estado expandido | "Activo", "Fuera de servicio", "En mantenimiento", "Para disposición" — con `equipment_status_log` |

**Sub-fase 2B: Equipos menores y QR (Sem 13-15)**

| Componente | Detalle |
|-----------|---------|
| Auto-tags IC-#### | Ya funciona ✅ (trigger genera EQP-0001 etc.) |
| Onboarding masivo | Jornada de campo: importar bulk, pegar QR, fotografiar |
| QR → scan → app | `rein-eisenwerk.com/equipment/{tag}` abre detalle |
| Categorización | Definición de "equipo menor" debe estar resuelta (Fase 0) |

**Sub-fase 2C: Assemblies y accesorios (Sem 15-16)**

| Componente | Detalle |
|-----------|---------|
| Configurar sets | Grúa + Boom + Contrapesos como assembly |
| Sugerir al movilizar | Al programar equipo principal, popup: "¿Incluir accesorios?" |
| Many-to-many | Un accesorio puede estar en múltiples sets |

**Prerequisitos de 2C:**
- Colaboración con personal de Chilibre para definir qué es accesorio de qué
- Datos maestros: cuáles grúas tienen cuáles booms

**Sub-fase 2D: Calificaciones de operadores (Sem 16-18)**

| Componente | Detalle |
|-----------|---------|
| Matriz operador-categoría | Quién puede operar qué tipo de equipo |
| Licencias con vencimiento | Alertas de expiración |
| Compliance dashboard | % de operadores con calificación vigente |

**Prerequisitos de 2D:**
- IC-EQ-PO-02 requiere que el Gerente de Equipo valide calificaciones
- Datos: lista de operadores con sus licencias actuales (manual, no existe digitalmente)

**Entregable de Fase 2:** Catálogo completo de 377+ equipos con fotos, QR, historial, y calificaciones. Equipos menores rastreados por primera vez.

**Duración estimada:** 8 semanas  
**Tablas activadas:** equipment_assemblies, equipment_assembly_members, operator_qualifications, meter_readings (4 de las 22 vacías)

---

### FASE 3: Taller y Workshop (Semanas 19-28)

**Prerequisito:** Fase 1C (inspecciones) + Fase 2A (equipment detail page). Las work orders necesitan la inspección como trigger y la página de equipo como contexto.

**Por qué aquí y no antes:** El taller de Chilibre es el corazón operativo, pero sin equipos registrados correctamente y sin inspecciones, las work orders no tienen referencia. Además, el volumen de uso requiere datos reales acumulados de Fases 1-2.

**Sub-fase 3A: Work Orders (Sem 19-22)**

| Componente | Detalle |
|-----------|---------|
| Ciclo completo | draft → open → in_progress → waiting_parts → completed → closed |
| Auto-creación desde inspección | Trigger: fail + critical → WO automática + equipo = grounded |
| Asignación de mecánico | Dropdown de personal de taller |
| Tracking de partes | work_order_parts con costo unitario × cantidad |
| Costo por equipo | labor + parts + external = total (generated column) |

**Sub-fase 3B: Combustible (Sem 22-24)**

| Componente | Detalle |
|-----------|---------|
| Registro diario | IC-EQ-PO-06 digital. Litros, costo, horómetro, fuente (tanque/gasolinera/cisterna) |
| Costo por proyecto | Cada carga se atribuye a un proyecto |
| Anomalías | Alerta si consumo > 2× promedio histórico |
| Cross-reference | Cada fuel_log crea un meter_reading automático |

**Prerequisitos de 3B:**
- IC-EQ-PO-06 define que los choferes de vehículos de combustible deben tener licencia tipo H
- El Almacenista registra inventario diario en IC-LOG-F-09-07 (Consumo Diario de Combustible)
- El Ingeniero de Proyecto coordina frecuencia y fechas de despacho con Charris

**Sub-fase 3C: Control de herramientas + Almacén (Sem 24-27)**

| Componente | Detalle |
|-----------|---------|
| Check-in/check-out | QR scan → asignar a persona → deadline → alerta overdue |
| Inventario de taller | warehouse_items con stock mínimo → alerta → solicitud de compra |
| Movimientos | warehouse_transactions: in/out/adjustment/transfer |

**Sub-fase 3D: EPP y Seguridad (Sem 27-28)**

| Componente | Detalle |
|-----------|---------|
| IC-LOG-PO-07 | Tracking de EPP por persona: casco, arnés, guantes, etc. |
| Vencimiento | Alertas de expiración de equipo de seguridad |
| Registro de entrega | Firma digital de recepción |

**Entregable de Fase 3:** Taller de Chilibre completamente digitalizado. Work orders con costo real, combustible rastreado, herramientas controladas.

**Duración estimada:** 10 semanas  
**Tablas activadas:** work_orders, work_order_parts, fuel_logs, warehouse_items, warehouse_transactions (5 de las 22 vacías)

---

### FASE 4: Dashboards y Reportes Avanzados (Semanas 29-34)

**Prerequisito:** Fases 1-3 generando datos reales. Sin datos acumulados, los dashboards muestran números vacíos y nadie los adopta.

**Por qué aquí:** Este es el punto donde gerencia empieza a obtener ROI visible. Los datos de 6+ meses de operación alimentan análisis reales.

| Dashboard | Audiencia | Componentes clave |
|-----------|-----------|------------------|
| `/dashboard/pm` | Ingenieros de Proyecto | Costo por proyecto, status de solicitudes, equipos asignados, próximas entregas |
| `/dashboard/logistics` | Charris | Dispatch board en tiempo real, cola de pendientes, disponibilidad de flota, calendario |
| `/dashboard/management` | Gerencia / Astrid | KPIs empresa (gasto mensual, utilización flota, tendencias), drill-down por proyecto |
| `/dashboard/workshop` | Jefe de Taller | Cola de WO, equipos grounded, partes en pedido, consumo de combustible |

**Reportes adicionales:**

| Reporte | Detalle |
|---------|---------|
| Equipment TCO | Costo de vida útil: compra + mantenimiento + combustible + transporte |
| Fleet availability | % disponible vs desplegado vs grounded vs en-mantenimiento |
| SOP compliance | ¿Inspecciones al día? ¿WO cerradas en SLA? ¿Combustible registrado? |
| Equipment utilization | Horas desplegado vs disponible por equipo por proyecto |

**Herramientas:** Tremor (React) para dashboards custom. @react-pdf/renderer para PDFs auto-generados. SheetJS para exports Excel. Metabase SOLO si gerencia pide exploración ad-hoc (defer).

**Duración estimada:** 6 semanas  
**Tablas nuevas:** 0 (materialized views para performance)

---

### FASE 5: Compras y OC Digitales (Semanas 35-40)

**Prerequisito:** Fase 3C (almacén funcional) — las OC alimentan el inventario de taller.

**Por qué aquí:** IC-LOG-PO-01 es el procedimiento de compras más largo y complejo. Las tablas `purchase_orders` y `purchase_order_lines` ya existen. El vínculo OC → Solicitud de Movilización es de alto valor: saber que el material que se está moviendo tiene OC atrás.

| Componente | Detalle |
|-----------|---------|
| Upload de OC como PDF | `document_url` en purchase_orders |
| Digitalizar líneas | Extraer items del PDF → crear purchase_order_lines |
| Vincular a solicitudes | `sm_request_lines.purchase_order_line_id` → link directo |
| Cantidades vivas | `qty_received` acumula, `qty_pending` es generated — mismo patrón que entregas parciales |
| Proveedores normalizados | Tabla `vendors` evita "MECO S.A." vs "Meco" vs "MECO" |
| Rental agreements | Tracking de contratos de alquiler con tarifas y fechas |

**Duración estimada:** 6 semanas  
**Tablas activadas:** purchase_orders, purchase_order_lines, vendors, rental_agreements (4)

---

### FASE 6: Integraciones y Automatización (Semanas 41-52+)

**Prerequisito:** Sistema operativo estable con datos reales de 6+ meses.

**Por qué al final:** Las integraciones dependen de APIs externas, coordinación con IT de ICONSA, y hardware. Son las de mayor incertidumbre y las que menos controla James.

**Sub-fase 6A: Spectrum API (Sem 41-44)**

| Componente | Detalle |
|-----------|---------|
| Read-only primero | Sync equipos, cost codes, proyectos desde Spectrum |
| Write-back después | Push costos de movilización a Spectrum cost codes |
| Scheduler | Edge Function + pg_cron para sync diario |

**Prerequisito:** Acceso a API de Spectrum. Coordinación con IT/ERP de ICONSA.

**Sub-fase 6B: GPS / Skydata (Sem 44-47)**

| Componente | Detalle |
|-----------|---------|
| AEMP/ISO 15143-3 | Parser para endpoints estándar de telemáticos |
| Geofencing | Auto-detectar equipo entrando/saliendo de proyecto |
| Location update | `equipment.current_location` desde GPS, no solo desde eventos manuales |

**Sub-fase 6C: WhatsApp Business API (Sem 47-49)**

| Componente | Detalle |
|-----------|---------|
| Notificaciones a conductores | Despacho, recordatorios, confirmaciones |
| Confirmación de entrega | Conductor responde "OK" por WhatsApp |
| Más efectivo que email | En campo panameño, WhatsApp tiene 10× más apertura que email |

**Sub-fase 6D: PWA Offline (Sem 49-52)**

| Componente | Detalle |
|-----------|---------|
| Service Worker | Cache de la app para uso sin conexión |
| IndexedDB | Inspecciones completadas offline → sync al reconectar |
| Background sync | Queue de eventos creados sin conexión |

**Duración estimada:** 12+ semanas  
**Tablas nuevas:** gps_telemetry_raw, spectrum_sync_log (2)

---

## 4. Diagrama de Dependencias

```
FASE 0: Estabilización
  └── FASE 1: Perfeccionar Movilizaciones
       ├── 1A: Eventos rediseñado ← custody_transfers
       │    └── 1B: Self-pickup ← custody_transfers
       ├── 1C: Inspecciones ← equipment_categories (ya seeded)
       │    └── FASE 2: Gestión de Equipos
       │         ├── 2A: Registry + Detail page
       │         │    └── FASE 3: Taller
       │         │         ├── 3A: Work Orders ← inspecciones + equipment
       │         │         ├── 3B: Combustible
       │         │         │    └── FASE 5: Compras/OC ← almacén
       │         │         ├── 3C: Herramientas + Almacén
       │         │         └── 3D: EPP
       │         ├── 2B: Equipos Menores + QR
       │         ├── 2C: Assemblies
       │         └── 2D: Calificaciones
       └── 1D: Reportes (paralelo con 1C)
            └── FASE 4: Dashboards avanzados ← datos de Fases 1-3

FASE 6: Integraciones ← sistema estable + datos acumulados
```

**Camino crítico:** 0 → 1A → 1C → 2A → 3A → 4

---

## 5. Estimaciones y Proyección

| Fase | Duración | Tablas nuevas/activadas | Usuarios impactados |
|------|----------|------------------------|-------------------|
| 0: Estabilización | 2 sem | 0 | 17 actuales |
| 1: Perfeccionar Mov. | 8 sem | 1 nueva + activar 6 | 17 + ~5 almacén/campo |
| 2: Gestión Equipos | 8 sem | Activar 4 | + Gerente de Equipo, mecánicos |
| 3: Taller | 10 sem | Activar 5 | + personal de taller (~8) |
| 4: Dashboards | 6 sem | 0 (views) | Gerencia, todos |
| 5: Compras/OC | 6 sem | Activar 4 | + Logística compras |
| 6: Integraciones | 12+ sem | 2 nuevas | Todos |
| **TOTAL** | **~52 sem** | **~22 tablas** | **~35-40 usuarios** |

**Realidad del vibecoding:** Estas semanas son de esfuerzo neto. Con un solo developer + AI, los tiempos reales podrían ser 1.5-2× más largos considerando: testing, bugs inesperados, cambios de prioridad de ICONSA, y la curva de aprendizaje de cada nuevo dominio.

---

## 6. Preguntas Abiertas que Bloquean Decisiones

Estas necesitan resolverse ANTES de empezar la fase correspondiente:

### Para Fase 0 (resolver YA)
1. **¿Qué es "equipo menor"?** — <$5K, <$10K, tipo EQA, o criterio del Gerente de Equipo?
2. **¿Las 10 categorías de Spectrum son correctas para operaciones?** — EQA, EQL, EQP, FND, GRU, ING, MAR, TEC, VHL, VHP

### Para Fase 1B (resolver antes de self-pickup)
3. **¿Self-pickup usa Trip con flag o entidad separada?** — Mi recomendación: Trip + flag. Revisitar después.
4. **¿Cost code requerido en self-pickup?** — Mi recomendación: sí, con tarifa = $0 explícito.
5. **¿Quién puede hacer self-pickup?** — ¿Solo PMs? ¿Cualquier persona autorizada del proyecto?

### Para Fase 1C (resolver antes de inspecciones)
6. **¿Validez de inspección?** — 24h default, ¿configurable por categoría?
7. **¿`is_blocking` empieza en false o true?** — Recomendación: false 3 meses, luego true.

### Para Fase 1D (resolver antes de facturación)
8. **¿Cómo agrupa Charris las tarifas de grúa?** — Múltiples viajes → 1 tarifa. ¿Lógica exacta?
9. **¿Prorrateo multi-proyecto?** — Viaje sirve 2 proyectos → ¿% manual? ¿50/50? ¿Charris decide?

### Para Fase 3 (resolver antes de taller)
10. **¿Los 10 contenedores de Chilibre?** — Inventario no existe. ¿Alguien va a hacer la jornada de clasificación?

---

## 7. Principios de Desarrollo

1. **Perfeccionar antes de expandir.** No empezar Fase N+1 hasta que los usuarios de Fase N estén satisfechos.
2. **Spec primero, código después.** Cada sub-fase actualiza FEATURE_SPEC.md antes de implementar.
3. **Approval antes de escribir a BD.** Claude Chat propone → James aprueba → ejecuta → verifica.
4. **Un chat por tema.** Contexto fresco > mega-chat agotado.
5. **Datos reales desde día 1.** No construir features sin usuarios reales probándolas semanalmente.
6. **80% > 100%.** Cubrir el caso común primero. Edge cases documentados para iteración.
7. **La línea es la unidad operacional.** Siempre surfear datos a nivel de `sm_request_lines`, no solo conteos.

---

## 8. Métricas de Éxito por Fase

| Fase | Métrica | Target |
|------|---------|--------|
| 0 | Bugs reportados por usuarios / semana | < 2 |
| 1 | % de movilizaciones registradas en sistema vs Excel de Charris | > 90% |
| 1 | Tiempo de compilación de reporte mensual | < 1 hora (vs días hoy) |
| 2 | Equipos con foto + QR en sistema | > 80% de flota activa |
| 3 | Work orders creadas por inspección vs manuales | > 50% auto-creadas |
| 4 | Gerencia consulta dashboards sin pedir reportes a Charris | Sí/No |
| 5 | OC vinculadas a solicitudes de movilización | > 70% |
| 6 | Ubicación de equipo actualizada automáticamente vs manual | > 80% |

---

*Este documento es una propuesta viva. James tiene la última palabra en priorización, alcance, y timing. Las fases pueden reordenarse basado en prioridades de ICONSA, disponibilidad de datos, y feedback de usuarios reales.*