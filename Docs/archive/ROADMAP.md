# ROADMAP.md — Qué falta por hacer

**Última actualización:** 2026-03-14

---

## Estado actual

MVP funcional. Flujo principal operativo: solicitudes → programación → ejecución → dashboard. Bugs 1-30 resueltos. Entregas parciales implementadas. Equipment location tracking automatizado. Cost codes importados de Spectrum (138 fases, 656 combos). Admin mode implementado (editar cualquier status, fecha pasada, solicitante). Deployed en rein-eisenwerk.com.

**Blocker de producción:** RLS permissions broken — Charris (logistica) y Jacome (pm) tuvieron que ser puestos como admin para poder usar el sistema. sm_requests UPDATE solo permite pm/admin.

---

## Prioridad 1 — Para el lunes (pre-producción)

### 1.1 Fix RLS permissions
- **Qué:** sm_requests UPDATE debe permitir logistica (Charris necesita poder operar). Verificar todas las políticas por rol.
- **Impacto:** Sin esto, nadie puede usar el sistema con su rol real.

### 1.2 Notificaciones email
- **Estado:** En progreso (chat separado)
- **Qué:** Email al enviar solicitud (→ Charris), al programar (→ PM), al completar (→ PM)
- **Stack:** NestJS backend en Railway/Fly.io

### 1.3 File attachments (adjuntos)
- **Qué:** Supabase Storage. Adjuntar archivos en:
  - Solicitudes: órdenes de compra (PDF)
  - Eventos de entrega: fotos
  - Viajes: permisos ATT
- **Nota:** La columna `attachments JSONB` ya existe en sm_requests.

### 1.4 User guide
- **Qué:** Documento de guía de uso del sistema para cada rol

### 1.5 Feedback form
- **Qué:** Formulario para recibir feedback por pantalla por rol. ¿Qué quiere ver cada usuario en su dashboard?

---

## Prioridad 2 — Post-lanzamiento (feedback de Charris/PMs)

### 2.1 Movilizaciones externas
- **Feedback Charris:** Checkbox "externa" → popup formulario para servicio externo
- **Qué:** Nuevo flujo cuando el transporte no es flota propia

### 2.2 Permisos ATT y escolta
- **Feedback Charris:** ATT permits necesitan adjunto. Escolta necesita tracking.
- **Qué:** Expandir campos de viaje, adjuntar permiso ATT

### 2.3 Conductores/vehículos de proyecto
- **Feedback Charris:** A veces la movilización la hace personal de proyecto, no flota. Ej: Jacome viene en su carro a buscar material.
- **Qué:** Dropdowns de conductor/vehículo deben incluir personal de proyecto, no solo flota

### 2.4 Todo editable al momento de Salida
- **Feedback Charris:** Cantidad, conductor, vehículo — todo puede cambiar last-minute al salir
- **Qué:** En evento Salida, todos los campos del viaje deben ser editables

### 2.5 Entrega por personal de proyecto (no conductores)
- **Feedback Charris:** Conductores no son tech-savvy. La entrega debería ser registrada por personal de proyecto que recibe.
- **Qué:** Rediseñar quién registra eventos de Entrega vs Salida/Retorno

### 2.6 Salida/Retorno por Charris/almacén
- **Feedback Charris:** Salida y Retorno los registra Charris o Joseph (almacenista), no conductores
- **Qué:** Ajustar permisos y flujo de eventos

### 2.7 Admin mejorada
- **Qué:** PMs manejan su personal de proyecto y conductores. Charris maneja flota y conductores. Asignación de roles por gerentes, no solo admin.
- **Incluye:** Driver-vehicle qualification matrix (no todos los conductores pueden conducir todos los vehículos)

### 2.8 Asignar personas a person_projects
- **Qué:** 10+ ingenieros de proyecto necesitan ser asignados a sus proyectos
- **Blocker:** Necesita info de oficina

### 2.9 Pagination
- **Qué:** Todas las tablas de lista necesitan paginación para volumen real

### 2.10 /solicitudes/[id] — más contexto de líneas
- **Qué:** Página de detalle debe exponer líneas con todo su contexto (origen, destino, equipo, cantidad, status)

---

## Prioridad 3 — Medio plazo

### 3.1 Dashboards personalizados
- **Qué:** Gerente ve métricas diferentes a Charris, diferente a PM. Cada rol tiene su dashboard.
- **Incluye:** Personalización por usuario de qué ver

### 3.2 Sistema de entrega avanzado
- **Qué:** Mover input de cantidad de Entrega a Salida (qty_dispatched vs qty_delivered). Receptor calificado (no todos pueden recibir).

### 3.3 Reportes avanzados
- **Stack:** Metabase conectado a Supabase
- **Qué:** Costo por proyecto, costo por mes, utilización de equipos, tiempos de entrega

### 3.4 Datos históricos 2024-2025
- **Qué:** Importar solicitudes de Solicitudes_Master.xlsb, notas de entrega de Excel
- **Desafío:** Fuzzy matching — datos tardíos son handwritten

### 3.5 NestJS Backend completo
- **Qué:** Backend en Railway/Fly.io para notificaciones, automaciones, integraciones

---

## Prioridad 4 — Futuro

### 4.1 GPS data integration
### 4.2 Spectrum API connection (data directa, no exports)
### 4.3 QR operations (campo)
### 4.4 PWA offline (service worker para campo sin conexión)
### 4.5 Inventario (módulo nuevo)
### 4.6 Reportes financieros automatizados
### 4.7 Otros SOPs de ICONSA (más allá de movilizaciones)
### 4.8 Python ETL/AI pipeline
### 4.9 KoboToolbox field inspections

---

## Bugs abiertos

Ninguno conocido al 2026-03-14. Bugs 1-30 resueltos. Ver `Docs/BUGS.md`.
