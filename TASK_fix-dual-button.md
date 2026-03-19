# Task: Fix botón dual en /programacion (backlog → crear movilización)

**Prioridad:** Alta — Charris cayó en la trampa y perdió su selección
**Complejidad:** Baja — 1 archivo, cambios de UI solamente
**Prerequisito de BD:** Ninguno

---

## Contexto

En `/programacion`, hay DOS formas de crear una movilización:
1. Botón "Nueva Movilización" en el toolbar de arriba (siempre visible)
2. FAB (floating action button) en la parte inferior derecha cuando hay líneas seleccionadas

Charris seleccionó líneas del backlog, clickeó el botón de ARRIBA (no el FAB), y las líneas no se adjuntaron. Es un anti-patrón UX — dos botones que parecen hacer lo mismo pero no lo hacen.

## Solución: Toolbar contextual (patrón Gmail/Linear)

### Estado: Sin selección
```
┌─────────────────────────────────────────────┐
│ [Filtros] [Search]    [+ Nueva Movilización]│  ← Toolbar normal
├─────────────────────────────────────────────┤
│  ☐  Línea 1                                │
│  ☐  Línea 2                                │
└─────────────────────────────────────────────┘
```

### Estado: Con selección
```
┌─────────────────────────────────────────────┐
│ ✕  3 líneas seleccionadas                  │  ← Toolbar TRANSFORMADO
├─────────────────────────────────────────────┤
│  ☑  Línea 1                                │
│  ☐  Línea 2                                │
│  ☑  Línea 3                                │
├─────────────────────────────────────────────┤
│  ███ Crear Movilización (3 líneas)  █████  │  ← Barra sticky ancho completo
└─────────────────────────────────────────────┘
```

---

## Implementación

**Archivo:** `src/app/(app)/programacion/page.tsx`

### Cambio 1: El toolbar del backlog cambia según selección

Cuando `selectedLineIds.size > 0`:
- El botón "Nueva Movilización" de arriba DESAPARECE
- En su lugar aparece: `✕ {N} líneas seleccionadas` con botón ✕ para deseleccionar todo
- El ✕ llama `setSelectedLineIds(new Set())`

Cuando `selectedLineIds.size === 0`:
- Se muestra el toolbar normal con "Nueva Movilización"

### Cambio 2: Reemplazar el FAB circular con barra sticky de ancho completo

El FAB actual (botón circular flotante) se reemplaza por una barra sticky en la parte inferior:
- Ancho completo del viewport
- Altura: `h-14` (56px — target de toque grande para trabajadores con guantes)
- Background: `bg-navy` con text white
- Texto: `Crear Movilización ({N} líneas)` con ícono Truck
- Click: navega a `/programacion/viaje/nuevo` pasando las líneas seleccionadas (mismo comportamiento que el FAB actual)
- Solo visible cuando `selectedLineIds.size > 0`

### Cambio 3: "Nueva Movilización" sin selección

El botón de arriba (visible solo sin selección) navega a `/programacion/viaje/nuevo` SIN líneas pre-seleccionadas. Esto es para el caso donde Charris quiere crear un viaje vacío y agregar líneas después.

### Cambio 4: Padding bottom cuando hay barra sticky

Agregar `pb-20` al contenedor cuando la barra sticky está visible, para que el contenido no quede tapado.

---

## Verificación

- [ ] Sin selección: botón "Nueva Movilización" visible arriba, NO hay barra abajo
- [ ] Seleccionar líneas: botón arriba desaparece, barra "Crear Movilización (N líneas)" aparece abajo
- [ ] Click en barra abajo: navega a viaje nuevo CON las líneas seleccionadas
- [ ] Click en ✕: deselecciona todo, vuelve al toolbar normal
- [ ] Mobile: la barra abajo es fácil de tocar (h-14, ancho completo)
- [ ] `npm run build` sin errores
