# ICONSA — Feature Specification Document
## Sistema Digital de Movilizaciones (IC-LOG-PO-06)

**Versión:** 3
**Fecha:** 06 de marzo de 2026  
**Autor:** James Cucalón — Ingeniero Industrial  
**Empresa:** Ingeniería Continental, S.A. (ICONSA)  
**Departamento:** Taller Chilibre / Logística  
**Estado:** Aprobado para desarrollo MVP

---

## Tabla de Contenido

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Contexto y Problema](#2-contexto-y-problema)
3. [Alcance del Sistema](#3-alcance-del-sistema)
4. [Usuarios y Roles](#4-usuarios-y-roles)
5. [Módulos del Sistema](#5-módulos-del-sistema)
   - 5.1 [Solicitud de Movilización](#51--módulo-solicitud-de-movilización)
   - 5.2 [Programación de Viajes](#52--módulo-programación-de-viajes)
   - 5.3 [Ejecución y Registro de Eventos](#53--módulo-ejecución-y-registro-de-eventos)
   - 5.4 [Dashboard y Reportes](#54--módulo-dashboard-y-reportes)
   - 5.5 [Administración](#55--módulo-administración)
6. [Modelo de Datos](#6-modelo-de-datos)
7. [Reglas de Negocio](#7-reglas-de-negocio)
8. [Estados y Transiciones](#8-estados-y-transiciones)
9. [Notificaciones y Automatizaciones](#9-notificaciones-y-automatizaciones)
10. [Requisitos No Funcionales](#10-requisitos-no-funcionales)
11. [Alcance del MVP vs Futuro](#11-alcance-del-mvp-vs-futuro)
12. [Preguntas Abiertas](#12-preguntas-abiertas)
13. [Glosario](#13-glosario)

---

## 1. Resumen Ejecutivo

### 1.1 — Qué es este documento

Este documento define con precisión qué debe hacer el Sistema Digital de Movilizaciones de ICONSA. Es la referencia única para cualquier persona (developer, consultor, IA, o futuro empleado) que necesite entender, construir, modificar o mantener el sistema.

Este documento NO define con qué herramientas se construye el sistema. El toolstack se decide por separado, basándose en los requisitos aquí definidos.

### 1.2 — Qué hace el sistema

Digitaliza el procedimiento IC-LOG-PO-06 (Movilización de Equipos y Materiales) de ICONSA, reemplazando un flujo basado en papel, WhatsApp, llamadas telefónicas y Excel con un sistema digital integrado que provee:

- Creación y seguimiento digital de solicitudes de movilización
- Herramienta de planificación operacional para el coordinador de logística
- Registro de eventos de ejecución en campo
- Visibilidad en tiempo real para todos los actores (proyectos, taller, gerencia)
- Trazabilidad completa de cada equipo y material desde la solicitud hasta la entrega
- Prioridad auto-calculada por cercanía de fecha requerida
- Dashboard con métricas operativas globales

### 1.3 — Volumen estimado de operación

| Métrica | Estimado |
|---------|----------|
| Solicitudes por semana | 5–15 |
| Líneas por solicitud (promedio) | 2–4 |
| Viajes programados por semana | 8–20 |
| Proyectos activos simultáneos | 3–5 |
| Usuarios concurrentes (pico) | 8–12 |
| Usuarios totales del sistema | ~20–30 |
| Crecimiento esperado de registros/año | ~2,000–4,000 solicitudes |

### 1.4 — Valor esperado

| Para quién | Problema actual | Solución |
|-----------|----------------|----------|
| Gerencia / VP Proyectos | No saben qué está pasando. Dependen de llamadas y reportes manuales atrasados. | Dashboard en tiempo real. Backlogs vivos. Reportes auto-generados. |
| Ingenieros de Proyecto | No saben si su solicitud fue recibida, programada, o cuándo llegará. | Estados en vivo. Notificaciones. Visibilidad de la programación. |
| Charris (Logística) | Planifica mentalmente de inputs dispersos (WhatsApp, llamadas, papeles). Sin backlog formal. | Backlog digital de todas las solicitudes pendientes. Herramienta de programación. |
| Taller Chilibre / Almacén | Formularios en papel incompletos. Sin trazabilidad de qué salió y qué llegó. | Registro de eventos digitales vinculados a solicitudes. |
| Finanzas | Facturación mensual armada a mano en Excel. | Facturación semi-automática con revisión humana (Fase 2). |

---

## 2. Contexto y Problema

### 2.1 — La empresa

ICONSA (Ingeniería Continental, S.A.) es una constructora mediana en Panamá (~160 empleados), especializada en construcción pesada: muelles, puentes, infraestructura marítima. Opera 3–5 proyectos simultáneos en diferentes ubicaciones geográficas.

El **Taller de Chilibre** es el centro operativo de equipos y logística. Aquí se almacenan equipos y materiales, se hace mantenimiento, y se coordinan todas las movilizaciones hacia los proyectos.

### 2.2 — El proceso actual (IC-LOG-PO-06)

El procedimiento de movilizaciones maneja el movimiento de equipos (grúas, excavadoras, generadores, barcazas, vehículos) y materiales (cemento, tubería, madera, EPP, repuestos) entre ubicaciones: desde el taller, proveedores externos, o entre proyectos.

**Flujo teórico según el SOP:**
1. Ingeniero de proyecto identifica necesidad → Llena solicitud (IC-LOG-F-06-03) con mínimo 1 semana de anticipación
2. Gerente de proyecto aprueba
3. Coordinador de logística (Charris) recibe, planifica, programa recursos
4. Se ejecuta la movilización con inspección de equipos y nota de entrega
5. A fin de mes se genera facturación por proyecto

**Flujo real actual:**
1. Ingeniero llama/envía WhatsApp a Charris directamente, normalmente con ~3 días de anticipación
2. Se formaliza la solicitud en papel después del hecho (si se hace del todo)
3. Charris planifica mentalmente con la información que tiene en la cabeza
4. Las notas de entrega se llenan a mano con datos incompletos
5. La facturación mensual se arma manualmente en Excel, siempre atrasada
6. Nadie más tiene visibilidad de lo que está pasando

### 2.3 — Formularios existentes del SOP

| Código | Nombre | Propósito | Estado actual |
|--------|--------|-----------|--------------|
| IC-LOG-F-06-02 | Two Week Look-Ahead Schedule | Planificación visual de 2 semanas | No se usa |
| IC-LOG-F-06-03 | Solicitud de Movilización | Ingeniero pide mover equipo/material | Se usa retroactivamente, post-facto |
| IC-LOG-F-06-04 | Bitácora de Movilizaciones | Registro histórico de toda la actividad | Se llena a mano, siempre atrasada |
| IC-LOG-04-04 | Nota de Entrega de Material | Documento de entrega firmado | Se usa en papel, sin vínculos |
| IC-LOG-06-05 | Facturación de Movilizaciones | Resumen mensual de costos por proyecto | Manual en Excel |
| IC-EQ-F-01-02 | Reporte Entrada/Salida de Equipo | Inspección de 42 ítems | En papel, no siempre se hace |

### 2.4 — Datos existentes

| Fuente | Datos | Cantidad | Calidad |
|--------|-------|----------|---------|
| Spectrum (ERP) | Equipos + Vehículos (tabla unificada) | 377 | Media — limpiada e importada |
| Spectrum | Empleados | 160 | Importada — pendiente asignar roles y departamentos |
| Spectrum | Códigos de costo por proyecto | ~124 | Buena — pendiente importar |
| Reconstrucción manual (PDFs) | Solicitudes históricas | 501 líneas / 174 solicitudes | Media — campos limitados |
| Papel | Notas de entrega | 61 | Mala — sin vínculos a solicitudes |
| Papel | Movilizaciones | 13 | Muy mala — mayoría de campos vacíos |
| Definición interna | Tarifas de movilización | 14 códigos | Importada |
| Definición interna | Proyectos activos | 4 | Importada |

### 2.5 — Sistemas existentes (que NO se reemplazan)

| Sistema | Uso | Relevancia |
|---------|-----|------------|
| Spectrum (Viewpoint/Trimble) | ERP de construcción — contabilidad, job costing, payroll, equipos (parcial) | Fuente maestra de equipos, empleados, códigos de costo. Integración futura (no en MVP). |
| Fleetwise | Gestión de flota, integrado con Spectrum | José Miguel lo opera. Complementario, no se reemplaza. |
| Sage | Contabilidad / facturación | Downstream — recibe datos de facturación. |
| Basecamp | Comunicación entre equipos de proyecto | Se quiere reemplazar con Teams eventualmente. |

---

## 3. Alcance del Sistema

### 3.1 — Dentro del alcance (MVP)

- Autenticación con roles y permisos (RLS en base de datos)
- Creación, edición, envío y seguimiento de solicitudes de movilización con líneas
- Backlog operativo de líneas pendientes para Charris
- Programación de viajes: agrupar líneas, asignar conductor/vehículo/remolque/fecha
- Clasificación automática del tipo de movilización (movilización / desmovilización / movimiento interno)
- Registro de eventos de ejecución (salida, llegada, entrega con código de confirmación, retorno)
- Dashboard con métricas operativas globales (todos los roles ven las mismas métricas)
- Prioridad auto-calculada por cercanía de fecha requerida
- Notificaciones básicas (email vía NestJS)
- Gestión de tablas maestras (CRUD de proyectos, equipos, ubicaciones, personas, tarifas)
- Fallback universal en dropdowns (texto libre + sugerencia a admin)
- Warning visual de líneas duplicadas (no bloqueante)
- Auto-IDs para solicitudes, viajes

### 3.2 — Dentro del alcance (Fase 2 — post-MVP)

- Facturación mensual semi-automática con revisión humana
- Nota de Entrega como documento formal exportable a PDF
- Bitácora de Movilizaciones (vista tabular filtrable con exportación — versión digital de IC-LOG-F-06-04)
- Inspección de equipos (IC-EQ-F-01-02) — formulario digital de 42 ítems
- Two-Week Look-Ahead — vista de calendario
- Integración con Órdenes de Compra (vincular línea de solicitud a línea de OC)
- Categorías CSI de materiales
- Accesorios de equipos como entidad separada
- Exportación a PDF de notas de entrega y facturación
- GPS de flota

### 3.3 — Dentro del alcance (Fase 3)

- Rol del conductor con registro de eventos desde móvil (PWA)
- Notificaciones por WhatsApp (WhatsApp Business API)
- Módulo de Inventario/Almacén (IC-LOG-PO-04)
- Dashboards avanzados (Metabase)
- Integración con Spectrum (lectura)
- Códigos QR para equipos

### 3.4 — Fuera del alcance (módulos futuros, otros procedimientos)

- Equipos menores (IC-LOG-PO-05)
- Compras completas (IC-LOG-PO-01)
- Mantenimiento de equipos (IC-EQ-PO-01)
- Gestión de equipos (IC-EQ-PO-02)
- Control de herramientas (IC-EQ-PO-04)
- Almacén de taller (IC-EQ-PO-05)
- Suministro de combustible (IC-EQ-PO-06)
- Vehículos livianos (IC-LOG-PO-09)
- Integración bidireccional con Spectrum
- App nativa (iOS/Android)

NOTA: Aunque estos módulos están fuera del alcance, el modelo de datos DEBE diseñarse para soportarlos sin reestructuración.

---

## 4. Usuarios y Roles

### 4.1 — Roles del sistema

| Rol | Nombre interno | Usuarios típicos | Cantidad estimada |
|-----|---------------|-------------------|-------------------|
| Ingeniero de Proyecto | `pm` | Edward Rodríguez, Jenniffer Troetsch, Hector Pino, Juan Jácome, David Ríos, Madeleine Lange, Yanelys Sánchez, Lourdes Domingo, César Caballero | ~10 |
| Coordinador de Logística | `logistica` | Carlos Charris | 1 (crítico) |
| Conductor | `campo` | Coco, Bonilla, Monchi, Rafael, + 1–2 más | ~5 |
| Almacenista | `almacen` | Yoseph Caballero | 1 |
| Administrador | `admin` | James Cucalón (temporal), futuro IT | 1 |

NOTA: Los roles `equipos` (José Miguel) y `gerencia` (Valderrama, gerentes de proyecto) no están definidos para el MVP. Se incorporarán cuando se definan sus necesidades específicas.

### 4.2 — Matriz de permisos (MVP)

| Funcionalidad | pm | logistica | campo | almacen | admin |
|--------------|:---:|:---------:|:-----:|:-------:|:-----:|
| **Ver TODAS las solicitudes** | ✅ (default: su proyecto) | ✅ | ❌ | ❌ | ✅ |
| **Crear solicitud** | ✅ (solo sus proyectos) | ❌ | ❌ | ❌ | ✅ |
| **Editar solicitud** | ✅ (solo sus proyectos) | ✅ | ❌ | ❌ | ✅ |
| **Cancelar solicitud** | ✅ (solo sus proyectos) | ✅ | ❌ | ❌ | ✅ |
| **Ver backlog de líneas** | ✅ (solo lectura) | ✅ | ❌ | ❌ | ✅ |
| **Crear/editar viaje** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Ver viajes programados** | ✅ (solo lectura) | ✅ | ✅ (asignados) | ❌ | ✅ |
| **Registrar eventos de viaje** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Ver dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Gestionar tablas maestras** | ❌ | ❌ | ❌ | ❌ | ✅ |

**Regla clave sobre PM:**
- PM puede **VER** solicitudes de TODOS los proyectos (filtro default = su proyecto asignado, pero puede cambiar para ver otros). Esto permite coordinación cross-proyecto (ej: si otro proyecto ya pidió el mismo equipo, el PM puede anticipar conflictos).
- PM solo puede **CREAR** solicitudes para los proyectos donde está asignado (via `person_projects`).
- PM solo puede **EDITAR** solicitudes de los proyectos donde está asignado.

**Regla clave sobre eventos:**
- Para el MVP, cualquier usuario con rol `logistica`, `campo`, o `almacen` puede registrar eventos de cualquier viaje. No se restringe por `driver_id` todavía. Esto refleja la realidad operativa donde Charris y el almacenista frecuentemente registran eventos como respaldo.

### 4.3 — Nota sobre licenciamiento

A diferencia de Power Apps (donde cada usuario necesita licencia), este sistema es una aplicación web propia. **Todos los empleados de ICONSA pueden acceder sin costo adicional por usuario.**

---

## 5. Módulos del Sistema

---

### 5.1 — Módulo: Solicitud de Movilización

**Formulario base:** IC-LOG-F-06-03  
**Usuarios principales:** Ingenieros de Proyecto (rol `pm`)  
**Propósito:** Permitir a los ingenieros de proyecto solicitar digitalmente el movimiento de equipos y/o materiales.

#### 5.1.1 — Pantalla: Mis Solicitudes (Landing Page)

**URL:** `/solicitudes`  
**Acceso:** `pm`, `logistica`, `admin`

**Comportamiento:**
- Al abrir, muestra una lista de TODAS las solicitudes del sistema.
- Para `pm`, el filtro de proyecto viene pre-seleccionado con su proyecto asignado, pero el PM puede cambiar el filtro para ver solicitudes de otros proyectos. Esto permite coordinación cross-proyecto.
- Para `logistica` y `admin`, no hay filtro pre-seleccionado — ven todas.
- Cada fila muestra: ID de solicitud, proyecto (código + nombre), solicitante, fecha creada, fecha requerida, número de líneas, estado, prioridad.
- El estado se muestra como badge con color (ver sección 8).
- La prioridad se muestra como badge con color (Vencida=rojo, Urgente=naranja, Próxima=azul, Normal=verde).

**Filtros disponibles:**
- Proyecto (dropdown de proyectos activos)
- Estado (multi-select: Borrador, Enviada, En Proceso, Completada, Parcial, Cancelada)
- Rango de fechas (fecha creada o fecha requerida)
- Búsqueda por ID de solicitud (texto libre)
- Solicitante (dropdown — visible para todos pero relevante para `logistica`/`admin`)

**Ordenamiento predeterminado:** Por prioridad descendente (Vencida primero), luego por fecha requerida ascendente (más urgente primero).

**Acciones:**
- Click en una solicitud → navega a pantalla de detalle/edición.
  - Si la solicitud pertenece a un proyecto del PM y está en Borrador o Enviada → modo edición.
  - Si la solicitud pertenece a otro proyecto O está en estados avanzados → modo lectura.
- Botón "+ Nueva Solicitud" → navega a pantalla de formulario en blanco. Solo visible para roles `pm` y `admin`. PM solo puede crear para sus proyectos asignados.

#### 5.1.2 — Pantalla: Formulario de Solicitud (Crear / Editar / Ver)

**URL:** `/solicitudes/nueva` o `/solicitudes/{id}`  
**Acceso:** `pm` (crear/editar solo sus proyectos), `logistica` (editar cualquiera), `admin` (editar cualquiera)

**Concepto de diseño:** Formulario de documento único ("documento vivo"). Una sola pantalla que contiene toda la información de la solicitud. No es un wizard de pasos — es un formulario tipo factura: cabecera arriba, líneas en el medio, acciones abajo.

**Modos del formulario:**
- **Modo creación:** Formulario en blanco, todos los campos editables, se pueden agregar líneas.
- **Modo edición (Borrador):** Solicitud existente en estado Borrador. Header y líneas editables. Se pueden agregar y eliminar líneas.
- **Modo edición (Enviada):** Solicitud en estado Enviada. Header y líneas existentes editables. **NO se pueden agregar líneas nuevas.** NO se pueden eliminar líneas ya programadas sin warning.
- **Modo lectura:** Solicitud en estado En Proceso, Parcial, Completada, o Cancelada. Campos no editables. Se muestra información adicional (programación, eventos).

**NOTA SOBRE EDICIÓN EN ESTADOS En Proceso / Parcial:** La regla exacta para estos estados se definirá con feedback de usuarios durante el MVP. Por ahora se considera solo lectura, pero esto puede cambiar.

##### Sección A: Barra de Identificación

| Elemento | Comportamiento |
|----------|---------------|
| ID de Solicitud | Auto-generado al primer guardado. Formato: `{CódigoProyecto}-SM-{###}` donde ### es secuencial por proyecto. Ejemplo: `25-506-SM-024`. Mostrado en formato monoespaciado prominente. En modo creación dice "Se generará al guardar". |
| Badge de Estado | Color según estado actual. Solo lectura. |
| Badge de Prioridad | Color según cálculo automático. Solo lectura. |

##### Sección B: Datos de Cabecera (Header)

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| Proyecto | Dropdown (lookup) | ✅ | Lista de proyectos activos. Para `pm`, solo muestra proyectos asignados al usuario. Al seleccionar, filtra los códigos de costo disponibles en las líneas. |
| Solicitante | Dropdown (lookup) | ✅ | Lista de personas. Auto-rellena con el usuario actual, pero se puede cambiar (ej: un asistente crea la solicitud a nombre de otro). |
| Aprobado por | Dropdown (lookup) | ❌ | Lista de personas (típicamente gerentes de proyecto). No es bloqueante. |
| Fecha Requerida | Selector de fecha | ✅ | Fecha en que se necesita el material/equipo en destino. El sistema calcula prioridad automáticamente. |
| Fecha Creada | Texto (solo lectura) | — | Se auto-llena con la fecha y hora de creación. No editable. |
| Notas generales | Texto largo | ❌ | Observaciones libres sobre la solicitud completa. |
| Adjuntos | Carga de archivos (JSONB) | ❌ | PDF, imágenes, Word, Excel. Máximo 10MB por archivo. |

##### Sección C: Líneas de Solicitud

La tabla de líneas es el corazón del formulario. Cada línea representa un ítem (equipo o material) que necesita ser movilizado.

**Vista de la tabla:**

| # | Tipo | Descripción | Desde | Hasta | Cant. | Und. | Código Costo | Estado | Acciones |
|---|------|-------------|-------|-------|-------|------|-------------|--------|----------|
| 1 | 🔧 | Grúa 318 – Liebherr LTM 1060 | Taller Chilibre | Muelle 14 | 1 | und | 25-506-01.7113-EQI | Pendiente | ✏️ 🗑️ |
| 2 | 📦 | Boom 40ft para Grúa 318 | Taller Chilibre | Muelle 14 | 1 | und | 25-506-01.7113-EQI | Pendiente | ✏️ 🗑️ |

- Acciones (editar/eliminar) solo visibles en modo edición.
- Badge de tipo: 🔧 Equipo (azul) / 📦 Material (dorado).
- Badge de estado por línea con color.

**Botón "+ Agregar Línea":** Solo visible en estado **Borrador**. Una vez la solicitud ha sido enviada, no se pueden agregar nuevas líneas. Abre un panel/overlay dentro de la misma pantalla.

**Warning de líneas duplicadas:** Al agregar una línea, el sistema verifica si ya existe una línea pendiente o programada con el mismo equipo o descripción similar para la misma ruta en cualquier solicitud activa. Si existe, muestra un aviso visual (⚠️) con la referencia a la solicitud existente. El warning NO bloquea — el PM decide si continuar o cancelar. Esto previene pedidos duplicados entre proyectos.

##### Sección C.1: Panel "Agregar / Editar Línea"

Se abre como panel expandible debajo del botón (o como overlay lateral). No navega a otra pantalla.

**Toggle Tipo de Línea:** Dos opciones visualmente prominentes — "🔧 Equipo" o "📦 Material". Determina qué campos se muestran:

**Si Tipo = Equipo:**

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| Equipo | Dropdown con búsqueda (lookup) | ✅ | Busca en tabla de equipos (377+ registros). Filtro: `type_code NOT IN ('ING')`. Muestra: Código – Descripción. Incluye Fallback. |
| Descripción | Texto (auto-rellenado) | ✅ | Se llena automáticamente al seleccionar equipo. Editable si se usa fallback. |

**Si Tipo = Material:**

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| Descripción del material | Texto libre | ✅ | El usuario describe el material. Sin dropdown (no existe catálogo de materiales aún). |
| Categoría de material | Texto libre / Dropdown futuro | ❌ | Disponible en MVP como texto libre. Cuando se definan las categorías CSI, se conectará a una tabla maestra con dropdown. No requerido. |

**Campos comunes a ambos tipos:**

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| Desde | Dropdown con búsqueda + texto libre | ✅ | Ubicaciones conocidas + proveedores. Permite texto libre (fallback). |
| Hasta | Dropdown con búsqueda + texto libre | ✅ | Mismo comportamiento que "Desde". |
| Cantidad | Número positivo | ✅ | Cantidad a movilizar. |
| Unidad | Dropdown | ✅ | Opciones: und, ml, m², m³, kg, ton, gal, ft, juegos, pzas, qq. Incluye Fallback. |
| Fase / Código de Costo | Dropdown filtrado | ✅ | Filtrado por el proyecto seleccionado en la cabecera. Muestra: Código – Descripción. |
| Categoría de Costo | Dropdown | ❌ | Opciones: ICS, EQI, EQA, MAT, SAL, OTR, CON, SUB. Complementa el código de costo. |
| Nota de línea | Texto | ❌ | Nota específica para esta línea. |
| Orden de Compra | Texto libre | ❌ | MVP: campo de texto. Fase 2: dropdown que busca OC. |

##### Sección D: Acciones

| Botón | Condición | Comportamiento |
|-------|-----------|---------------|
| Guardar Borrador | Modo creación o edición (Borrador) | Guarda la solicitud y todas sus líneas con estado "Borrador". Genera ID si es la primera vez. No notifica a nadie. **Si es creación nueva: redirige a `/solicitudes`. Si es edición: se queda en `/solicitudes/[id]` mostrando estado actualizado.** |
| Enviar Solicitud | Modo creación o edición, mínimo 1 línea | Guarda todo + cambia estado a "Enviada". Activa notificación email a Charris. Calcula prioridad. A partir de aquí no se pueden agregar líneas nuevas. **Redirige a `/solicitudes` (lista).** |
| Cancelar Solicitud | Solicitud en estado Borrador, Enviada, o En Proceso | Cambia estado a "Cancelada". Pide confirmación. Cancela todas las líneas pendientes. Líneas ya programadas se liberan de vuelta al backlog. |
| Eliminar Línea | Línea visible en modo edición | Si la línea está Pendiente: se elimina directamente. Si la línea está Programada: warning "Esta línea está asignada al viaje MOV-2026-003. ¿Eliminar?" → si confirma, se remueve la asignación del viaje y se elimina la línea. |
| Volver a Mis Solicitudes | Siempre | Navega de vuelta a `/solicitudes`. |

##### Sección E: Información adicional (solo modo lectura)

Cuando la solicitud está en estados avanzados (En Proceso, Completada, Parcial), se muestran secciones adicionales debajo de las líneas:

- **Programación:** Qué viajes se asignaron, con qué vehículo/conductor, para qué fecha.
- **Eventos:** Timeline de eventos de ejecución (salida, llegada, entrega, retorno).

Esto permite que el ingeniero de proyecto vea todo el ciclo de vida de su solicitud desde una sola pantalla.

---

### 5.2 — Módulo: Programación de Viajes

**Formularios base:** IC-LOG-F-06-02 (Two Week Look-Ahead), IC-LOG-F-06-04 (Bitácora)  
**Usuario principal:** Carlos Charris (rol `logistica`)  
**Propósito:** Dar a Charris una herramienta de planificación operacional donde pueda ver todas las solicitudes pendientes, agrupar líneas en viajes eficientes, y asignar recursos.

#### 5.2.1 — Pantalla: Programación (Backlog + Viajes)

**URL:** `/programacion`  
**Acceso:** `logistica`, `admin` (lectura/escritura); `pm` (solo lectura)

La pantalla tiene dos secciones principales:

##### Sección 1: Backlog de Líneas

**Concepto:** Esta es la vista más importante de Charris. Muestra TODAS las líneas de TODAS las solicitudes que necesitan ser atendidas, aplanadas en una lista única, independiente de qué solicitud las generó.

**Contenido:** Cada fila es una LÍNEA de solicitud (no una solicitud completa), mostrando:
- Ícono de tipo (🔧 Equipo / 📦 Material)
- Descripción del ítem
- Badge de prioridad (Vencida / Urgente / Próxima / Normal)
- ID de solicitud de origen (clickeable para ver la solicitud)
- Proyecto (código + nombre)
- Solicitante
- Cantidad y unidad
- Ruta (Desde → Hasta)
- Fecha requerida
- Estado de la línea (Pendiente / Programada)

**Dos secciones:**
1. **"⚠️ Sin Programar"** — líneas con estado "Pendiente", ordenadas por prioridad.
2. **"📅 Programadas"** — líneas ya asignadas a un viaje, mostrando a qué viaje fueron asignadas.

**Filtros:**
- Proyecto (dropdown, opción "Todos")
- Tipo (Equipo / Material / Todos)
- Ruta (Desde y/o Hasta)
- Rango de fecha requerida

**Acción principal:** Botón "📅 Asignar" en cada línea pendiente → abre la pantalla de creación de viaje.

##### Sección 2: Viajes Programados

**Concepto:** Lista de todos los viajes que Charris ha creado, con su estado.

**Cada viaje muestra:**
- ID de viaje (formato: `MOV-{YYYY}-{###}`, secuencial por año)
- Fecha programada
- Conductor asignado
- Vehículo (cabezal)
- Remolque (si aplica)
- Tarifa asignada (código + monto)
- Número de líneas y de solicitudes distintas que transporta
- Ruta principal o "Multi-ruta"
- Badges: Permiso ATT (🔒), Escolta (🚨)
- Estado del viaje (Programado / En Ruta / Completado / Cancelado)

**Filtros de viajes recientes:**
- Estado (Programado / En Ruta / Completado / Cancelado)
- Rango de fechas
- Conductor

**Acciones:**
- Click en viaje → ver/editar detalle del viaje.
- Botón "+ Crear Nuevo Viaje" → pantalla de creación de viaje.

#### 5.2.2 — Pantalla: Crear / Editar Viaje

**URL:** `/programacion/viaje/nuevo` o `/programacion/viaje/{id}`  
**Acceso:** `logistica`, `admin`

**Concepto:** Charris crea un viaje seleccionando líneas del backlog y asignando recursos. Un viaje puede incluir líneas de MÚLTIPLES solicitudes (relación many-to-many).

##### Sección A: Datos del Viaje

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| ID Viaje | Auto-generado | — | `MOV-{YYYY}-{###}`, secuencial por año. |
| Fecha Programada | Selector de fecha | ✅ | Fecha en que se ejecutará el viaje. |
| Conductor | Dropdown (lookup) | ✅ | Lista de personas filtrada por `app_role = 'campo'`. Muestra: Nombre. Incluye Fallback para conductores no registrados. |
| Vehículo (Cabezal) | Dropdown (lookup) | ✅ | Lista de equipos con `type_code IN ('VHL','VHP')`. Muestra: Código – Descripción. |
| Remolque | Dropdown (lookup) | Condicional | Filtrar por descripción CAMA/PLATAFORMA/REMOLQUE. **REQUERIDO cuando el vehículo seleccionado es un cabezal** (spectrum_code comienza con 'CAB' o description contiene 'CABEZAL'). Si el vehículo NO es cabezal (pick-up, volquete, camión grúa), se deja vacío. |
| Tarifa de Movilización | Dropdown (lookup) | ❌ | Lista de 14 tarifas. Muestra: Código – Descripción – Monto. Auto-rellena el costo. Opcional — no toda movilización tiene tarifa formal. |
| Costo | Número / Moneda | ❌ | Auto-rellenado por tarifa cuando se selecciona. Editable manualmente. Opcional — se llena automáticamente si hay tarifa, o manualmente para casos especiales. |
| Requiere Permiso ATT | Toggle (Sí/No) | ✅ | Default: No. Si Sí, se muestra badge 🔒. |
| Requiere Escolta | Toggle (Sí/No) | ✅ | Default: No. Si Sí, se muestra badge 🚨. |
| Notas del viaje | Texto largo | ❌ | Observaciones operativas. |

##### Sección B: Líneas Asignadas al Viaje

**Tabla de asignaciones** — cada fila es una línea de solicitud asignada a este viaje:

| Solicitud | Línea # | Descripción | Cantidad Asignada | Unidad | Desde | Hasta | Fecha Req. |
|-----------|---------|-------------|-------------------|--------|-------|-------|------------|
| 25-506-SM-023 | 1 | Grúa 318 – Liebherr | 1 | und | Taller Chilibre | Muelle 14 | 10/03/2026 |
| 25-506-SM-023 | 2 | Boom 40ft para Grúa 318 | 1 | und | Taller Chilibre | Muelle 14 | 10/03/2026 |

**Acción "Agregar Líneas":** Abre un selector que muestra todas las líneas pendientes del backlog. Charris puede seleccionar múltiples líneas. Para cada línea, puede ajustar la "Cantidad Asignada" (que puede ser menor que la cantidad solicitada — esto habilita viajes parciales).

**Regla:** Si Cantidad Asignada < Cantidad Solicitada, la línea queda en estado "Parcial" y el remanente sigue visible en el backlog como pendiente.

##### Sección C: Tipo de Movilización (auto-calculado)

El sistema determina automáticamente el tipo basándose en las rutas de las líneas asignadas:

| Lógica | Clasificación |
|--------|--------------|
| Hasta = "Chilibre" o "Taller Chilibre" | **Desmovilización** |
| Desde = "Chilibre" y Hasta = un proyecto | **Movilización** |
| Desde = un proyecto y Hasta = otro proyecto | **Movimiento Interno** |
| Desde = proveedor externo y Hasta = proyecto | **Movilización (desde proveedor)** |
| Desde = proveedor externo y Hasta = Chilibre | **Recepción en Taller** |

##### Sección D: Acciones

| Botón | Condición | Comportamiento |
|-------|-----------|---------------|
| Guardar Viaje | Siempre en edición | Guarda el viaje y sus asignaciones. Las líneas asignadas cambian a estado "Programada". Las solicitudes de origen actualizan su estado según cascada (ver sección 8). Notifica a los solicitantes por email. **Si es creación nueva: redirige a `/programacion`. Si es edición: se queda en `/programacion/viaje/[id]`.** |
| Cancelar Viaje | Viaje en estado Programado o En Ruta | Cambia estado a "Cancelado". Libera las líneas de vuelta al backlog (estado → "Pendiente"). Requiere confirmación. **Redirige a `/programacion`.** |

**Regla de auto-relleno de tarifa→costo:** Al seleccionar una tarifa de movilización, el campo "Costo" se pre-rellena automáticamente con el valor `rate` de la tarifa seleccionada. El campo sigue siendo editable — Charris puede modificar el costo y documentar la razón en el campo de Notas (ej: agrupación de viajes de grúa, descuento, etc.).

**Reglas de edición de viaje:**
- **Programado:** Edición completa (conductor, vehículo, fecha, agregar/remover líneas).
- **En Ruta:** Solo edición de notas.
- **Completado / Cancelado:** Solo lectura.

#### 5.2.3 — Pantalla: Two-Week Look-Ahead (Fase 2)

**URL:** `/programacion/calendario`  
**Concepto:** Vista de calendario de 2 semanas con viajes programados por día. MVP: Estructura de ruta creada pero contenido pendiente.

---

### 5.3 — Módulo: Ejecución y Registro de Eventos

**Formularios base:** IC-LOG-04-04 (Nota de Entrega — Fase 2), parte de IC-LOG-F-06-04 (Bitácora)  
**Usuarios:** `logistica` (Charris), `campo` (conductores), `almacen` (Yoseph)  
**Propósito:** Registrar los eventos reales de cada viaje.

#### 5.3.1 — Pantalla: Mis Viajes

**URL:** `/mis-viajes`  
**Acceso:** `logistica`, `almacen`, `campo`, `admin`

**Contenido:** Lista de viajes programados para hoy o en estado activo ("En Ruta").

**Para cada viaje muestra:**
- ID, fecha, conductor, vehículo/remolque
- Líneas que transporta (resumen)
- Estado actual con barra de progreso: Programado → 🚛 Salida → 📍 Llegada → ✅ Entrega → 🏠 Retorno
- Último evento registrado

**Nota MVP:** Para el MVP, la lista no se filtra por `driver_id`. Cualquier usuario con acceso a esta pantalla ve todos los viajes activos y puede registrar eventos. Esto refleja la operación real donde Charris y el almacenista frecuentemente actúan como respaldo.

#### 5.3.2 — Pantalla: Detalle de Viaje / Registro de Eventos

**URL:** `/mis-viajes/{id}`  
**Acceso:** `logistica`, `almacen`, `campo`, `admin`

**Concepto:** Muestra el viaje completo con su información, carga asignada, y una timeline de eventos. Los eventos se registran secuencialmente.

##### Información del viaje (solo lectura)
Misma información que en la pantalla de edición de viaje (conductor, vehículo, remolque, tarifa, permisos).

##### Carga asignada
Tabla de líneas asignadas, agrupadas por solicitud de origen.

##### Timeline de eventos
Cada evento tiene:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Tipo de evento | Predefinido | Salida, Llegada, Entrega, Retorno, Incidencia |
| Fecha y hora | Auto (Now) + editable | Se pre-llena con la fecha/hora actual. Editable para correcciones. |
| Registrado por | Auto (usuario actual) | Persona que registra el evento. |
| Ubicación | Texto | Donde ocurre el evento. |
| Notas | Texto libre | Observaciones sobre el evento. |

**Secuencia de eventos:**

```
1. 🚛 SALIDA — Registrado al partir del origen
   → Viaje cambia de "Programado" a "En Ruta"
   → Líneas asignadas cambian a "En Tránsito"

2. 📍 LLEGADA — Registrado al llegar al destino
   → Informativo, actualiza timeline

3. ✅ ENTREGA — Registrado cuando el receptor confirma
   → Requiere código de confirmación de 4 dígitos (tipo Uber)
   → Actualiza estado de líneas a "Entregada"
   → Actualiza estado de solicitudes según cascada

4. 🏠 RETORNO — Registrado cuando el conductor regresa al origen
   → Viaje cambia a "Completado"
   → Registra hora de retorno para cálculo de duración total

5. ⚠️ INCIDENCIA (opcional) — Registrado en cualquier momento
   → Documenta problemas: avería, accidente, material dañado, retraso
   → No cambia estados automáticamente
```

**Regla:** Los eventos deben seguir la secuencia. No se puede registrar Entrega sin Salida previa. El sistema habilita los botones progresivamente. Se puede saltar Llegada y Retorno (son informativos).

#### 5.3.3 — Código de Confirmación de Entrega (tipo Uber)

- Se genera automáticamente al crear el viaje (4 dígitos random).
- Solo visible para: el solicitante original y Charris.
- Al registrar el evento de Entrega, quien registra el evento ingresa el código que le da el receptor en el proyecto. **Cualquier usuario con rol logistica, campo, o almacen puede registrar este evento** (no solo el conductor asignado).
- Si el código coincide → entrega confirmada, queda registro auditable.
- Si no coincide → warning, pero permite continuar (para casos donde receptor no tiene el código).
- **PENDIENTE:** Definir si el código de confirmación es obligatorio para todas las entregas o si es un toggle que el solicitante activa según el tipo de carga (ej: equipo pesado requiere persona autorizada vs material genérico que cualquiera puede recibir).

#### 5.3.4 — Nota de Entrega Formal (Fase 2)

La Nota de Entrega como documento formal exportable a PDF (IC-LOG-04-04) es Fase 2. En el MVP, los registros de entrega están capturados via los eventos de ejecución.

---

### 5.4 — Módulo: Dashboard y Reportes

**URL:** `/dashboard`  
**Acceso:** Todos los roles — métricas globales, sin restricción por rol

#### 5.4.1 — KPIs principales (tarjetas)

| KPI | Descripción |
|-----|-------------|
| Solicitudes Pendientes | Solicitudes en estado Enviada + En Proceso |
| Líneas Sin Programar | Total de líneas en estado Pendiente |
| Viajes Programados | Viajes para hoy y los próximos 3 días |
| Completadas Este Mes | Solicitudes completadas en el mes actual |

**Nota:** Todos los usuarios ven las mismas métricas globales. No hay restricción por rol en el dashboard para el MVP.

#### 5.4.2 — Vistas adicionales

- **Solicitudes recientes:** Últimas 10 solicitudes con estado y prioridad.
- **Viajes del día:** Viajes programados para hoy con estado.
- **Actividad reciente:** Timeline de los últimos eventos del sistema.

#### 5.4.3 — Bitácora de Movilizaciones (Fase 2)

**URL:** `/bitacora` (Fase 2)

Vista tabular de TODOS los viajes con todos sus datos, filtrable por rango de fechas, proyecto, conductor, estado, tipo de movilización. Exportable a Excel y PDF. Es la versión digital viva del IC-LOG-F-06-04. Esta pantalla NO está en el MVP.

---

### 5.5 — Módulo: Administración

**URL:** `/admin`  
**Acceso:** `admin`

#### 5.5.1 — Gestión de Tablas Maestras

CRUD (Crear, Leer, Actualizar, Desactivar) para:

| Tabla Maestra | Campos principales | Registros actuales |
|--------------|-------------------|-------------------|
| Proyectos | Código, Nombre, Gerente, Estado | 4 |
| Equipos + Vehículos (tabla unificada) | Código Spectrum, Tipo, Descripción, Marca, Modelo, type_code, Placa, Estado | 377 |
| Personas | Código, Nombre, Departamento, Cargo, Teléfono, Email, Rol del sistema, Estado | 160 |
| Ubicaciones | Nombre, Tipo, Proyecto asociado, Activo | 9 |
| Tarifas de Movilización | Código, Descripción, Tarifa (B/.) | 14 |
| Códigos de Costo | Código, Fase, Descripción, Proyecto, Activo | Pendiente |
| Unidades de Medida | Código, Descripción | 11 |

NOTA: Los registros no se eliminan — se desactivan. Esto preserva integridad referencial con datos históricos.

#### 5.5.2 — Gestión de Sugerencias de Fallback

Cuando un usuario usa el fallback universal (escribe texto libre en un dropdown), se crea una sugerencia en la tabla `suggestions`.

**Vista de sugerencias pendientes:**
- Tabla: qué sugirió, quién lo sugirió, cuándo, para qué tabla maestra.
- Acciones: Aprobar (crea el registro en la tabla maestra) / Rechazar / Editar y Aprobar.

#### 5.5.3 — Gestión de Usuarios y Roles

- Asignar `app_role` a personas existentes.
- Asignar proyectos a usuarios con rol `pm` (tabla `person_projects`).
- Activar/desactivar acceso.

---

## 6. Modelo de Datos

### 6.1 — Tablas y Relaciones

**Referencia completa:** El schema verificado está en `supabase_schema_verified.sql` y `PROJECT_STATUS.md`. Aquí se documenta la estructura lógica.

```
TABLAS MAESTRAS (11 tablas)
═══════════════════════════

projects ─── id, code, name, manager, status, location, start_date, end_date,
             notes, billing_code, budget, client

people ───── id, auth_id→auth.users, code, name, department, position,
             phone, email, app_role (nullable), status, city, supervisor_id→people,
             cedula, license_type, license_expiry, hire_date,
             emergency_contact_name, emergency_contact_phone

person_projects ─── id, person_id→people, project_id→projects, role, is_active
                    (UNIQUE person_id + project_id)

equipment ── id, spectrum_code, description, equipment_type, type_code,
(UNIFICADA)  brand, model, serial_number, year, status, current_location,
             plate, capacity, inspection_type, current_project_id→projects,
             weight_class, acquisition_type, last_inspection_date,
             next_inspection_due, meter_reading, insurance_expiry, notes
             → Vehículos = type_code IN ('VHL','VHP')

locations ── id, name, location_type, address, project_id→projects,
             is_active, contact_name, contact_phone, notes

mobilization_rates ── id, code, description, rate, is_active

units ────── id, code, description

cost_codes ─ id, project_id→projects, phase_code, phase_description, full_code

sequences ── id, seq_type, project_id→projects, next_number

suggestions ─ id, table_name, suggested_value, suggested_by→people, status,
              reviewed_by→people

user_app_roles ─ id, person_id→people, app_code, role_code, is_active,
                 granted_by→people, granted_at, notes
                 (UNIQUE person_id + app_code + role_code)
                 → Fundación multi-app RBAC. MVP: app_code='movilizaciones'.
                 → Roles movilizaciones: solicitante, coordinador, operador, receptor, visor, admin
                 → people.app_role se mantiene como shortcut para MVP; se depreca post-MVP.


TABLAS TRANSACCIONALES (5 tablas)
═════════════════════════════════

sm_requests ──── id, request_id, project_id→projects, requester_id→people,
(solicitudes)    approved_by→people, date_required, date_created, status, priority,
                 notes, attachments(JSONB)
                 │
                 │ 1:N
                 ▼
sm_request_lines ── id, request_id→sm_requests, line_number, line_type,
(líneas)            equipment_id→equipment, description, equipment_text,
                    from_location_id→locations, from_text,
                    to_location_id→locations, to_text,
                    quantity, unit_id→units, unit_text,
                    cost_code_id→cost_codes,
                    category, po_reference, notes, status,
                    qty_scheduled, qty_delivered
                    │
                    │ N:M (via trip_line_assignments)
                    ▼
trips ────────── id, trip_id, scheduled_date, driver_id→people,
(viajes)         vehicle_id→equipment, trailer_id→equipment,
                 rate_id→mobilization_rates, cost, att_permit,
                 escort, confirmation_code, status, notes,
                 actual_departure, actual_arrival,
                 route_summary, is_external
                 │
                 │ 1:N
                 ▼
trip_line_assignments ── id, trip_id→trips, request_line_id→sm_request_lines,
(tabla puente)           quantity_assigned
                 │
trips ───────────│
                 │ 1:N
                 ▼
trip_events ──── id, trip_id→trips, event_type, event_timestamp,
(INMUTABLES)     location, registered_by→people, confirmation_code_used,
                 received_by_name, notes
```

### 6.2 — Relaciones clave

| Relación | Tipo | Descripción |
|----------|------|-------------|
| Solicitud → Líneas | 1:N | Una solicitud tiene 1 o más líneas |
| Línea → Viaje | N:M | Una línea puede estar en múltiples viajes (entregas parciales). Un viaje puede llevar líneas de múltiples solicitudes. La tabla `trip_line_assignments` es el puente, con `quantity_assigned` por asignación. |
| Viaje → Eventos | 1:N | Un viaje tiene múltiples eventos secuenciales |
| Persona → Proyectos | N:M | Via `person_projects`. Determina qué proyectos puede crear/editar un PM. |

### 6.3 — Índices

- `sm_requests`: project_id, status, requester_id
- `sm_request_lines`: request_id, status, equipment_id
- `trips`: scheduled_date, driver_id, status
- `trip_line_assignments`: trip_id

---

## 7. Reglas de Negocio

### 7.1 — Auto-generación de IDs

| Entidad | Formato | Ejemplo | Lógica |
|---------|---------|---------|--------|
| Solicitud | `{CódigoProyecto}-SM-{###}` | `25-506-SM-024` | Secuencial por proyecto. Se genera al primer guardado. Trigger `generate_request_id()`. |
| Viaje | `MOV-{YYYY}-{###}` | `MOV-2026-042` | Secuencial por año. Global. Trigger `generate_trip_id()`. |

### 7.2 — Cálculo automático de prioridad

Se calcula comparando la fecha requerida de la solicitud con la fecha actual:

| Condición | Prioridad | Color |
|-----------|-----------|-------|
| Fecha requerida ya pasó | **Vencida** | 🔴 Rojo |
| Faltan 0–3 días | **Urgente** | 🟠 Naranja |
| Faltan 4–7 días | **Próxima** | 🔵 Azul |
| Faltan 8+ días | **Normal** | 🟢 Verde |

Se recalcula automáticamente. Trigger `calculate_priority()`.

### 7.3 — Clasificación automática de tipo de movilización

Basado en las ubicaciones "Desde" y "Hasta" y el campo `location_type` de la tabla `locations`:

| Desde | Hasta | Tipo |
|-------|-------|------|
| Taller (`location_type = 'Taller'`) | Proyecto | Movilización |
| Proveedor (`location_type = 'Proveedor'`) | Proyecto | Movilización (desde proveedor) |
| Proveedor | Taller | Recepción en Taller |
| Proyecto | Taller | Desmovilización |
| Proyecto A | Proyecto B | Movimiento Interno |

### 7.4 — Reglas de edición de solicitudes

| Estado | Header | Líneas existentes | Agregar líneas | Eliminar líneas |
|--------|--------|-------------------|----------------|-----------------|
| **Borrador** | ✅ Editable | ✅ Editable | ✅ Sí | ✅ Sí |
| **Enviada** | ✅ Editable | ✅ Editable | ❌ No | ⚠️ Con warning si programada |
| **En Proceso** | Por definir | Por definir | ❌ No | Por definir |
| **Parcial** | Por definir | Por definir | ❌ No | Por definir |
| **Completada** | ❌ Solo lectura | ❌ Solo lectura | ❌ No | ❌ No |
| **Cancelada** | ❌ Solo lectura | ❌ Solo lectura | ❌ No | ❌ No |

**Regla definitiva:** Una vez la solicitud ha sido enviada (estado ≠ Borrador), NO se pueden agregar líneas nuevas. El contenido existente (header y líneas) SÍ se puede editar en estado Enviada. Las reglas para En Proceso y Parcial se definirán con feedback de usuarios.

**Quién puede editar:** Solo el PM del proyecto asignado, Charris (logistica), o admin.

### 7.5 — Reglas de edición de viajes

| Estado | Campos editables |
|--------|-----------------|
| **Programado** | Todo: conductor, vehículo, fecha, líneas, tarifa, notas |
| **En Ruta** | Solo notas |
| **Completado** | Solo lectura |
| **Cancelado** | Solo lectura |

### 7.6 — Cancelación

**Cancelar Solicitud:**
- Disponible en estado Borrador, Enviada, En Proceso.
- Cancela todas las líneas pendientes de la solicitud.
- Líneas ya programadas se liberan (regresan a estado "Pendiente" en el backlog — o se cancelan según decisión del usuario).
- Requiere confirmación.

**Cancelar Viaje:**
- Disponible en estado Programado (o En Ruta en casos excepcionales).
- Libera todas las líneas asignadas de vuelta al backlog (estado → "Pendiente").
- Requiere confirmación.

### 7.7 — Warning de líneas duplicadas

Al agregar una línea a una solicitud (solo en estado Borrador), el sistema busca:
- Líneas pendientes o programadas con el mismo `equipment_id` (si tipo = Equipo)
- O con descripción similar (si tipo = Material) para la misma ruta (desde/hasta)
- En cualquier solicitud activa (no cancelada ni completada) de cualquier proyecto

Si encuentra coincidencia, muestra un aviso visual: "⚠️ Ya existe una solicitud pendiente para [descripción] hacia [destino] (ID-solicitud, línea #, estado). ¿Desea continuar?"

El warning es **informativo, no bloqueante**. El PM decide si es un duplicado real o una necesidad legítima.

### 7.8 — Validaciones del formulario de solicitud

| Validación | Momento | Mensaje |
|-----------|---------|---------|
| Proyecto es requerido | Al enviar | "Seleccione un proyecto" |
| Solicitante es requerido | Al enviar | "Seleccione el solicitante" |
| Fecha requerida es requerida | Al enviar | "Ingrese la fecha requerida" |
| Fecha requerida ≥ hoy | Al enviar | "La fecha requerida no puede ser en el pasado" |
| Mínimo 1 línea | Al enviar | "Agregue al menos una línea a la solicitud" |
| Cada línea tiene descripción | Al agregar línea | "La descripción es requerida" |
| Cada línea tiene cantidad > 0 | Al agregar línea | "La cantidad debe ser mayor a cero" |
| Cada línea tiene Desde y Hasta | Al agregar línea | "Indique origen y destino" |
| Desde ≠ Hasta | Al agregar línea | "El origen y destino no pueden ser iguales" |

### 7.9 — Fallback Universal en Dropdowns

**Problema:** Las tablas maestras están incompletas. Si un usuario no encuentra un equipo, ubicación, o persona en el dropdown, no debe quedarse bloqueado.

**Solución:** Cada dropdown que hace lookup a una tabla maestra tiene una opción "No está en la lista" o un campo de texto libre alternativo.

**Flujo:**
1. Usuario busca en el dropdown → no encuentra el valor
2. Activa el modo fallback (checkbox o botón "No está en lista")
3. Escribe el valor en texto libre
4. Al guardar, el sistema crea un registro en `suggestions`
5. Un admin revisa las sugerencias y las aprueba o rechaza
6. Mientras tanto, la solicitud/línea funciona con el texto libre

**Campos con fallback:** Equipo, Ubicación (Desde/Hasta), Persona, Unidad de medida.

---

## 8. Estados y Transiciones

### 8.1 — Estados de Solicitud (sm_requests)

```
                                    ┌─────────────┐
                              ┌────→│  Cancelada   │
                              │     └─────────────┘
                              │
┌──────────┐    ┌──────────┐  │   ┌─────────────┐    ┌─────────────┐
│ Borrador │───→│ Enviada  │──┼──→│ En Proceso  │───→│ Completada  │
└──────────┘    └──────────┘  │   └─────────────┘    └─────────────┘
     │               │        │         │                    ▲
     │               │        │         │             ┌──────┤
     └──(cancelar)───┘        │         └────────────→│  Parcial   │
                              │                       └────────────┘
                              └─────────(cancelar por logística)
```

| Transición | Trigger | Quién |
|-----------|---------|-------|
| → Borrador | Se crea la solicitud | Sistema (auto) |
| Borrador → Enviada | Usuario hace click en "Enviar" | `pm`, `admin` |
| Borrador → Cancelada | Usuario cancela | `pm`, `admin` |
| Enviada → En Proceso | AL MENOS una línea cambia a "Programada" | Sistema (auto, cascada) |
| Enviada → Cancelada | Solicitante o Charris cancela | `pm`, `logistica`, `admin` |
| En Proceso → Completada | TODAS las líneas están en "Entregada" | Sistema (auto, cascada) |
| En Proceso → Parcial | ALGUNAS líneas "Entregada" y resto "Cancelada" | Sistema (auto, cascada) |
| En Proceso → Cancelada | Charris cancela toda la solicitud | `logistica`, `admin` |

### 8.2 — Estados de Línea (sm_request_lines)

```
┌───────────┐    ┌─────────────┐    ┌──────────────┐    ┌───────────┐
│ Pendiente │───→│ Programada  │───→│ En Tránsito  │───→│ Entregada │
└───────────┘    └─────────────┘    └──────────────┘    └───────────┘
     │                │                    │                   ▲
     │                │                    │            ┌──────┤
     └──(cancelar)────┴────(cancelar)──────┘           │ Parcial  │
                                                       └──────────┘
```

| Transición | Trigger |
|-----------|---------|
| → Pendiente | Se crea la línea |
| Pendiente → Programada | Charris asigna la línea a un viaje |
| Programada → Pendiente | Charris cancela el viaje (líneas se liberan) |
| Programada → En Tránsito | Se registra evento de Salida en el viaje |
| En Tránsito → Entregada | Se registra evento de Entrega y cantidad_entregada = cantidad_solicitada |
| En Tránsito → Parcial | Se registra Entrega pero cantidad_entregada < cantidad_solicitada |
| Cualquiera → Cancelada | Cancelación manual |

### 8.3 — Estados de Viaje (trips)

```
┌─────────────┐    ┌──────────┐    ┌─────────────┐
│ Programado  │───→│ En Ruta  │───→│ Completado  │
└─────────────┘    └──────────┘    └─────────────┘
      │
      └──(cancelar)
      ↓
┌─────────────┐
│  Cancelado  │
└─────────────┘
```

| Transición | Trigger |
|-----------|---------|
| → Programado | Charris crea el viaje |
| Programado → En Ruta | Se registra evento de Salida |
| En Ruta → Completado | Se registra evento de Retorno |
| Programado → Cancelado | Charris cancela el viaje |

### 8.4 — Regla de cascada de estados

Cuando el estado de una línea cambia, el trigger `cascade_request_status()` re-evalúa el estado de la solicitud padre:

```
Si TODAS las líneas = Entregada → Solicitud = Completada
Si TODAS las líneas = Cancelada → Solicitud = Cancelada
Si ALGUNA línea = Entregada Y resto = Cancelada → Solicitud = Parcial
Si ALGUNA línea = Programada o En Tránsito → Solicitud = En Proceso
Si ninguna de las anteriores → Solicitud = Enviada
```

El trigger NO modifica solicitudes en estado Borrador o Cancelada.

---

## 9. Notificaciones y Automatizaciones

### 9.1 — Notificaciones (MVP: email vía NestJS; Fase 3: WhatsApp)

| Evento | Destinatario | Contenido |
|--------|-------------|-----------|
| Solicitud enviada | Charris (`logistica`) | "Nueva solicitud {ID} de {Solicitante} para {Proyecto}. {N} líneas. Fecha requerida: {Fecha}." |
| Solicitud programada | Solicitante (`pm`) | "Tu solicitud {ID} ha sido programada. Viaje {ViajeID} para el {Fecha}." |
| Solicitud completada | Solicitante (`pm`) | "Tu solicitud {ID} ha sido completada." |
| Solicitud vencida | Charris + Solicitante | "⚠️ La solicitud {ID} tiene fecha requerida {Fecha} y no ha sido programada." |
| Sugerencia de fallback | Admin | "El usuario {Nombre} sugirió agregar '{Valor}' a la tabla {Tabla}." |

### 9.2 — Automatizaciones

| Automatización | Trigger | Acción |
|---------------|---------|--------|
| Auto-ID solicitud | Primer guardado de solicitud | Genera ID secuencial por proyecto |
| Auto-ID viaje | Creación de viaje | Genera ID secuencial por año + código 4 dígitos |
| Cálculo de prioridad | BEFORE INSERT/UPDATE en sm_requests | Recalcula prioridad basada en fecha requerida |
| Cascada de estados | AFTER UPDATE en sm_request_lines | Re-evalúa estado de solicitud padre |
| Clasificación de tipo | Al crear línea / asignar a viaje | Determina movilización/desmovilización/movimiento interno |
| Auditoría | Trigger updated_at en todas las tablas | Registra timestamp de modificación |
| Alerta de vencimiento | Diariamente (NestJS cron) | Identifica solicitudes próximas a vencer sin programar |

---

## 10. Requisitos No Funcionales

### 10.1 — Rendimiento
- Tiempo de carga de cualquier pantalla: < 3 segundos
- Tiempo de guardado de solicitud con líneas: < 2 segundos
- El backlog debe poder mostrar 500+ líneas sin degradación

### 10.2 — Disponibilidad
- El sistema debe estar disponible 24/7 (cloud hosting — Vercel + Supabase + Railway/Fly.io)
- Downtime aceptable: < 4 horas/mes para mantenimiento
- Los datos deben tener backup diario automático (Supabase incluido)

### 10.3 — Seguridad
- Autenticación por email + contraseña (Supabase Auth)
- Cada usuario tiene un rol asignado en `people.app_role`
- Los permisos se aplican a nivel de base de datos (RLS en Supabase), no solo en el frontend
- HTTPS obligatorio (Vercel default)

### 10.4 — Usabilidad
- Diseñado para usuarios no técnicos (ingenieros de campo, almacenistas)
- Mobile-first — debe funcionar en celulares
- Los formularios deben ser simples — máximo 2 clicks para llegar a cualquier acción
- Idioma: 100% español
- Los dropdowns deben tener búsqueda (no scroll infinito para 377 equipos)

### 10.5 — Compatibilidad
- Navegadores: Chrome, Edge, Safari (últimas 2 versiones)
- Dispositivos: Desktop (1280px+), Tablet (768px+), Mobile (360px+)
- No requiere instalación de app nativa (web app)

### 10.6 — Escalabilidad
- El esquema de datos debe soportar futuros módulos sin reestructuración
- El sistema debe manejar 10,000+ registros por tabla transaccional

### 10.7 — Mantenibilidad
- El código debe ser entendible por un developer de nivel medio con ayuda de IA
- Un ingeniero no-developer (como James) debe poder administrar el sistema sin tocar código

---

## 11. Alcance del MVP vs Futuro

### 11.1 — MVP

| Incluido | No incluido |
|----------|------------|
| Autenticación con roles y RLS | Facturación mensual |
| Crear/editar/enviar solicitudes con líneas | Nota de Entrega PDF formal |
| Warning de líneas duplicadas (visual, no bloqueante) | Bitácora de Movilizaciones (vista filtrable) |
| Backlog de líneas para Charris | Inspecciones de equipo |
| Programación de viajes (crear, asignar líneas) | Two-Week Look-Ahead (calendario) |
| Registro de eventos (salida, llegada, entrega con código, retorno) | Integración OC (lookup a OC/líneas) |
| Dashboard con KPIs globales | Categorías CSI de materiales |
| Gestión de tablas maestras | Exportación a PDF |
| Fallback universal | WhatsApp notifications |
| Notificaciones por email (NestJS) | Offline / PWA |
| Auto-IDs, prioridad auto-calculada | Códigos QR |
| Clasificación automática tipo movilización | GPS de flota |
| Código de confirmación tipo Uber | Accesorios de equipos |

### 11.2 — Fase 2

- Facturación mensual semi-automática
- Nota de Entrega como documento PDF formal
- Bitácora de Movilizaciones (vista tabular filtrable con exportación)
- Inspección de equipos (42 ítems)
- Two-Week Look-Ahead (calendario)
- Integración OC (lookup a OC y selección de línea)
- Categorías CSI de materiales
- Accesorios de equipos
- Exportación a PDF
- GPS de flota

### 11.3 — Fase 3

- Módulo de Inventario/Almacén (IC-LOG-PO-04)
- WhatsApp Business API
- Dashboards avanzados (Metabase)
- Integración con Spectrum (lectura)
- Códigos QR para equipos
- PWA para uso offline en campo

### 11.4 — Futuro (6+ meses)

- Módulos adicionales: Compras, Mantenimiento, Herramientas, Combustible, Equipos Menores
- Integración bidireccional con Spectrum
- App nativa (si se justifica)
- Analítica predictiva

---

## 12. Preguntas Abiertas

| # | Pregunta | Impacta | Estado |
|---|---------|---------|--------|
| 1 | ¿Cómo se proratea el costo cuando un viaje sirve a múltiples proyectos? | Facturación (Fase 2) | Pendiente |
| 2 | ¿Cuántos viajes típicamente se necesitan para mover una grúa completa? | Facturación (Fase 2) | Pendiente |
| 3 | ¿Las categorías de materiales: quién las define? | Modelo de datos (Fase 2) | Pendiente |
| 4 | ¿Reglas exactas de edición en estados En Proceso y Parcial? | UX solicitudes | Se define con feedback de usuarios |
| 5 | ¿Hay movilizaciones que ejecutan terceros (subcontratistas)? | Modelo de datos | Pendiente |
| 6 | ¿Los reportes de Valderrama se digitalizan en este sistema? | Alcance futuro | Pendiente |
| 7 | ¿Qué pasa si Charris necesita movilización urgente sin solicitud? | Flujo, excepciones | Decisión MVP: forzar solicitud retroactiva. Fase 2: "Solicitud Express" |
| 8 | ¿El código de confirmación es obligatorio para todas las entregas o toggle por solicitud según tipo de carga? | UX eventos | Pendiente — MVP: acepta código O nombre receptor |
| 9 | Settings por proyecto: ¿gerentes definen receptores autorizados, personas que crean solicitudes? | Arquitectura, permisos | Post-MVP |
| 10 | Onboarding descentralizado: ¿líderes de área registran su gente e invitan al sistema? | Arquitectura, usuarios | Post-MVP |
| 11 | ¿Cuándo migrar de `people.app_role` a `user_app_roles` como fuente primaria de permisos? | Arquitectura multi-app | Cuando se construya la segunda app |
| 12 | ¿Cómo se registran movilizaciones con personal/servicio externo? | Modelo de datos | MVP: `is_external=true` + costo manual + notas |
| 13 | Integración GPS Skydata (https://app.skydatapa.com/) — ¿API disponible? ¿Métodos de conexión? | Fase 2 | Pendiente investigar |
| 14 | Categorías CSI de materiales — ¿quién las define? ¿Cuáles son? | Modelo de datos, Fase 2 | Pendiente — James con oficina |

---

## 13. Glosario

| Término | Definición |
|---------|-----------|
| **Solicitud de Movilización** | Pedido formal de un ingeniero de proyecto para mover equipo o material. Identificada con ID único (ej: 25-506-SM-024). |
| **Línea de Solicitud** | Un ítem individual dentro de una solicitud. Cada línea describe un equipo o material con su origen, destino, cantidad y código de costo. |
| **Viaje (Trip)** | Una salida física de un vehículo de transporte. Puede llevar líneas de múltiples solicitudes. Tiene conductor, vehículo, remolque, fecha, y tarifa asignados. |
| **Backlog** | Lista de todas las líneas pendientes que esperan ser programadas. Vista principal de Charris. |
| **Programar** | Acción de Charris de tomar líneas del backlog y asignarlas a un viaje con recursos específicos. |
| **Bitácora de Movilizaciones** | Registro histórico de todos los viajes. Versión digital del IC-LOG-F-06-04. Fase 2. |
| **Tarifa de Movilización** | Costo fijo asociado a un tipo de vehículo o equipo movilizado. 14 códigos predefinidos. |
| **Permiso ATT** | Permiso de la Autoridad de Tránsito y Transporte Terrestre para cargas sobre-dimensionadas. |
| **Escolta** | Acompañamiento policial o de tránsito para cargas sobre-dimensionadas. |
| **Fallback Universal** | Mecanismo que permite texto libre cuando no se encuentra un valor en un dropdown, creando una sugerencia para admin. |
| **Cascada de Estados** | Lógica automática que actualiza el estado de una solicitud basándose en el estado combinado de todas sus líneas. |
| **Código de Costo** | Clasificación contable de Spectrum. Formato: {Proyecto}-{Fase}-{TipoCosto}. |
| **Spectrum** | ERP de construcción (Viewpoint/Trimble) usado por ICONSA. |
| **Chilibre** | Ubicación del taller central de ICONSA. |
| **Charris** | Carlos Charris — Coordinador de Logística en Chilibre. Usuario principal del módulo de programación. |
| **MVP** | Minimum Viable Product — la versión más pequeña del sistema que entrega valor real. |
| **RLS** | Row Level Security — seguridad a nivel de fila en Supabase. |
| **NestJS** | Framework backend enterprise en TypeScript para APIs, lógica de negocio, y automatizaciones. |

---

## Stack Tecnológico

| Componente | Tecnología | Propósito |
|-----------|------------|-----------|
| Base de datos | Supabase (PostgreSQL) | Datos, Auth, RLS, Storage, Realtime |
| Frontend | Next.js (App Router) + TypeScript + Tailwind | UI web (PWA-ready, offline Fase 3) |
| Backend | NestJS (TypeScript) | API REST, lógica de negocio, integraciones |
| Automatización | NestJS (cron, events, webhooks) | Notificaciones email, workflows scheduled |
| Reporting | Metabase | Dashboards avanzados |
| Data/ETL/AI | Python (scripts) | Análisis, OCR, ML futuro |
| Deployment (frontend) | Vercel | Hosting Next.js, CI/CD |
| Deployment (backend) | Railway / Fly.io / VPS | Hosting NestJS |
| Campo (futuro) | KoboToolbox | Inspecciones y formularios offline en campo |

---

## Control de Versiones de Este Documento

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-02-24 | Creación inicial. Cubre el sistema completo de movilizaciones. |
| 2.0 | 2026-03-04 | Reestructuración completa. Corrección de reglas de visibilidad PM (ve TODAS las solicitudes, crea/edita solo sus proyectos). Corrección de reglas de edición (NO agregar líneas después de Borrador). Bitácora movida a Fase 2. Eliminación de líneas programadas permitida con warning. Métricas de dashboard globales (sin restricción por rol). Eventos registrables por cualquier usuario logistica/campo/almacen. Warning de líneas duplicadas agregado. Notificaciones email vía NestJS incluidas en MVP. Fases futuras completadas. Schema unificado (equipment = equipos + vehículos). |
| 2.1 | 2026-03-04 | Cambio de toolstack: NestJS reemplaza ASP.NET Core como backend. n8n eliminado — automatizaciones viven en NestJS. Next.js PWA-ready (offline Fase 3). Python queda para data/ETL/AI. |
| 2.1.1 | 2026-03-04 | Auditoría cross-doc: corregido acceso /mis-viajes (logistica, campo, almacen, admin). PWA aclarado (ready en toolstack, offline en Fase 3). Conteo tablas corregido (15, no 16). |
| 2.2 | 2026-03-04 | Sincronización schema con Supabase live. 13 columnas corregidas: request_number→request_id, item_type→line_type, cost_category→category, oc_reference→po_reference, from_location_text→from_text, to_location_text→to_text, sequence_type→seq_type, current_value→next_number, trip_number→trip_id, requires_att_permit→att_permit, requires_escort→escort, line_id→request_line_id, qty_assigned→quantity_assigned. Eliminadas: trips.created_by, cost_codes.cost_type/description/is_active. Agregadas: sm_requests.date_created, sm_request_lines.unit_text, cost_codes.phase_description/full_code. |
| 3.0 | 2026-03-05 | Correcciones post-testing Fases 0-3. Filtro equipos en solicitud corregido: solo `NOT IN ('ING')`. Remolque condicional con cabezal. Tarifa auto-rellena costo. Redirect después de guardar/enviar. Líneas de viaje muestran fecha requerida. Filtros en viajes recientes. Código de confirmación por cualquier rol autorizado. |
| 3.1 | 2026-03-06 | Tarifa y Costo cambiados a opcionales (no toda movilización tiene tarifa formal). Categoría de material disponible en MVP como texto libre (CSI pendiente). Tabla `user_app_roles` agregada como fundación multi-app RBAC (User→Role→Scope). `parent_equipment_id` agregado a equipment para relación accesorio→equipo padre. 7 nuevas preguntas abiertas documentadas. Decisiones: eventos Salida+Entrega obligatorios, código acepta código O nombre receptor, forzar solicitud retroactiva en MVP, servicios externos con is_external+costo manual. BD limpieza: 177 personas (13 del organigrama), 58 teléfonos, 23 placas, ciudades normalizadas, 4 conductores con role. |

---

*Este documento es la fuente de verdad para el Sistema Digital de Movilizaciones de ICONSA. Cualquier decisión de implementación que contradiga lo aquí especificado debe ser discutida y este documento debe actualizarse antes de proceder.*
