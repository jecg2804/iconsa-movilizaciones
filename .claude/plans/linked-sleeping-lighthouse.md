# Plan — Docs update: códigos de entrega siempre obligatorios

## Contexto

Decisión confirmada por James + su jefe: los códigos de confirmación de
entrega son **siempre obligatorios**. El feature de `requires_code`
per-line (que hacía los códigos opcionales) se elimina como concepto.

Esta es la primera decisión firme de una sesión de diseño más amplia
(GPS, fulfillment methods, dual confirmation) que sigue en discusión.

## Cambios a documentos vivos (solo docs, no código)

### 1. BACKLOG.md
- **Cerrar J2** como design discussion — decisión tomada
- Eliminar las 3 preguntas de J2 (default, visibilidad, PickupModal)
- Agregar nota: "Decisión 2026-04-16: códigos siempre obligatorios"
- Agregar nuevo item de implementación: eliminar `requires_code`
  del código (checkboxes, lógica condicional, tests)

### 2. TRAIL.md
- Marcar J2 como decidido (no implementado aún)
- Actualizar G7 (badge 🔑) como obsoleto — se elimina con requires_code

### 3. EVENTS_V2.md
- Sección 3.5 "Código condicional": reescribir → código siempre aparece
- Quitar menciones de "solo si alguna línea lo requiere"
- Quitar referencia a `requires_code` column
- PickupModal: quitar nota de "siempre obligatorio independiente de
  requires_code" — ya no hay distinción

### 4. CLAUDE.md
- Regla #15: simplificar — código siempre obligatorio para todos los
  métodos de entrega, quitar mención de `requires_code`

### 5. CHANGELOG.md
- Entry: `[docs] Decisión: códigos de entrega siempre obligatorios —
  eliminar feature requires_code opcional`

## Archivos a leer antes de editar

- `Docs/BACKLOG.md` (ya leído en contexto)
- `Docs/TRAIL.md` (ya leído en contexto)
- `Docs/reference/EVENTS_V2.md` (leer secciones de código condicional)
- `CLAUDE.md` regla #15 (leer línea exacta)

## Fuera de scope (sigue en discusión)

- Cambios de código (eliminar checkboxes, simplificar DeliveryModal)
- Dual confirmation (conductor + receptor)
- transport_method enum (fleet/pickup/third_party)
- GPS Skydata integration
- BD changes (DROP column requires_code)

## Verificación

- Grep `requires_code` en docs después de editar — no debe aparecer
  como feature activo (puede aparecer como "eliminado" o "legacy")
- BACKLOG J2 no debe aparecer como pendiente
- TRAIL J2 debe estar marcado como decidido
