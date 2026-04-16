# Rule: Uso de Herramientas — Cuándo y Cómo

Claude Code sigue estas reglas automáticamente sin que James lo pida.

## Modelo de 3 actores (recordatorio)
- **Claude Chat**: arquitecto, planifica, escribe a Supabase (con aprobación de James), genera prompts goal-oriented
- **Claude Code (tú)**: implementa frontend, lee codebase completo, verifica su propio trabajo. NUNCA escribe a BD.
- **James**: todas las decisiones, aprobaciones, testing, contexto de negocio

## MCPs — Cuándo usar cada uno

### Supabase MCP (read-only)
- **SIEMPRE** antes de escribir queries: verificar que las tablas/columnas existen
- **SIEMPRE** antes de implementar un feature que toca BD: verificar schema actual
- **NUNCA** para escribir datos. Si necesitas un cambio de BD → STOP → escribir en SYNC_LOG → James consulta con Chat
- Queries útiles: `SELECT column_name FROM information_schema.columns WHERE table_name = 'X'`

### Playwright MCP
- **Después de implementar** cambios visuales: abrir localhost:3000 y verificar que funciona
- **Para debugging visual**: navegar paso a paso cuando un flujo de usuario no funciona
- **Para verificar** que la app carga sin errores después de refactors
- Invocar: "Usa Playwright para abrir localhost:3000/[ruta] y verificar [qué]"
- **NUNCA** usar en producción (rein-eisenwerk.com) sin permiso explícito de James

### Chrome DevTools MCP
- **Cuando hay errores** que no son obvios en el código: revisar consola del browser
- **Para debugging de API**: ver network requests fallidas a Supabase
- **Para performance**: correr Lighthouse audit si la página carga lento
- Invocar: "Usa Chrome DevTools para revisar la consola de localhost:3000/[ruta]"

### Context7
- **Cuando necesites** docs actualizados de Next.js, Supabase, React, o Tailwind
- **Especialmente útil** para APIs que cambian entre versiones (App Router patterns, @supabase/ssr)
- Invocar: agregar "use context7" al prompt o "use library /supabase/supabase"

## Plugins — Cuándo se activan

### Superpowers
- Se activa automáticamente al inicio de sesión
- Para **features nuevos**: seguir su flujo completo (brainstorm → plan → implement → review)
- Para **fixes rápidos**: decir "skip brainstorming, just fix this"

### UI-UX-Pro-Max + frontend-design
- Se activan automáticamente cuando la tarea involucra crear UI
- Dejar que generen el design system antes de codear
- No resistir sus sugerencias estéticas — producen UI no genérica

### typescript-lsp
- Siempre activo, mejora el entendimiento de TypeScript automáticamente

## Skills — Cuándo se cargan

Los skills se cargan automáticamente cuando la tarea matchea su descripción. También se pueden invocar explícitamente.

| Skill | Cuándo se activa |
|-------|-----------------|
| crud-page | Crear página nueva con lista/tabla + formulario |
| events-page | Trabajar en Mis Viajes, eventos, timeline |
| supabase-queries | Cualquier query de Supabase: filtros, joins, cost codes |
| partial-delivery | Lógica de cantidades: qty_assigned, qty_delivered, qty_pending |
| seed-data | Crear datos de prueba, orden de FK para deletes |
| technical-decisions | Consultar funciones, triggers, RLS, arquitectura |
| self-update | Actualizar SYNC_LOG y BUGS al final de sesión |
| form-submit-guard | Prevenir doble-submit en formularios async |

## Flujo por tipo de tarea

### Feature nuevo (viene de Chat como prompt goal-oriented)
1. Leer el prompt completo — entender PROBLEMA, no solo la instrucción
2. Usar **Plan Mode** para analizar impacto en el codebase
3. Verificar schema via **Supabase MCP**
4. Presentar plan a James — NO implementar hasta aprobación
5. Implementar paso a paso con `npm run build` después de cada paso
6. Verificar visualmente con **Playwright MCP**
7. Si hay errores, debuggear con **Chrome DevTools MCP**
8. Usar **code-reviewer agent** si tocaste 3+ archivos
9. Commit siguiendo rules de commit-after-step
10. Actualizar SYNC_LOG via skill self-update

### Bug fix
1. Entender el bug — leer descripción, buscar en codebase
2. Verificar schema con **Supabase MCP** si involucra BD
3. Implementar fix mínimo — no refactors oportunísticos
4. Verificar con **Playwright MCP** que el fix funciona
5. Si hay errores raros, usar **Chrome DevTools MCP** para consola/network
6. Commit y actualizar BUGS.md

### Tarea de UI/diseño
1. **UI-UX-Pro-Max** genera design system automáticamente
2. **frontend-design** sugiere estética
3. Seguir skill **crud-page** para páginas con tabla + formulario
4. Verificar visualmente con **Playwright MCP**
5. Mobile-first: verificar responsive

## Al cerrar sesión pesada
1. Actualizar `Docs/SYNC_LOG.md` si hubo cambios significativos
2. `npm run build` debe pasar antes de cerrar

## Screenshots y archivos temporales de tests
- Screenshots de E2E tests (`Docs/test-screenshots/`, `test-results/`,
  `playwright-report/`) son **temporales** — usarlos para análisis
  durante la sesión y **borrarlos antes de cerrar la sesión**.
- **NUNCA commitear imágenes al repo.** Ocupan espacio y no aportan
  valor a Claude Chat ni a la historia de git. `.gitignore` los excluye
  pero verificar antes de `git add`.
- Si un screenshot es relevante para documentación permanente,
  describirlo en texto (en CHANGELOG o BACKLOG) en vez de incluir la
  imagen.

## NUNCA
- No escribir a Supabase — NUNCA, bajo ninguna circunstancia
- No instalar dependencias npm sin preguntar a James
- No hacer refactors oportunísticos durante un fix
- No modificar CLAUDE.md ni FEATURE_SPEC.md (Tier 1 — solo Chat)
- No usar Playwright/DevTools en producción sin permiso
- No hacer commits a main — solo jaime/dev
- No commitear imágenes (PNG, JPG, screenshots) al repo
