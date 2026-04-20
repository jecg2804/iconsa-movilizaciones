# Plan — Upgrade tooling: pcvelz Superpowers + Repomix + rules

## Contexto

James descubrió que Claude Code no usa Superpowers automáticamente.
Los skills (brainstorming, debugging) se invocan manualmente y yo los
ignoro por defecto. Investigación del ecosistema (Reddit, GitHub, Grok)
reveló que el fork pcvelz/superpowers tiene enforcement hooks que
fuerzan compliance, y Repomix resuelve el problema de compartir
contexto con Claude Chat.

## Cambios a ejecutar

### 1. Swap Superpowers: obra → pcvelz fork

Desinstalar plugin actual de obra, instalar fork pcvelz:
```
/plugin uninstall superpowers@claude-plugins-official
/plugin marketplace add pcvelz/superpowers
/plugin install superpowers-extended-cc@superpowers-extended-cc-marketplace
```
Verificar con `/help` que aparecen comandos `superpowers-extended-cc:*`.

### 2. Instalar y configurar Repomix

```bash
npm install -g repomix
```

Crear `repomix.config.ts` en root:

- Output: XML comprimido (Tree-sitter, signatures only)
- Ignore: node_modules, .next, test-results, Docs/archive
- Security check: habilitado

Agregar `repomix-output.*` a `.gitignore`.

Uso: `npx repomix --compress` antes de sesiones con Chat.

### 3. Actualizar `.claude/rules/tool-usage.md`

Agregar sección de enforcement obligatorio:

**Superpowers (USO OBLIGATORIO):**
- Feature nuevo/rediseño → SIEMPRE brainstorming primero
- Bug complejo (3+ archivos) → systematic-debugging
- Después de paso mayor → requesting-code-review
- Default = invocar. Skip = solo si trivial y explícito.

**Context7 (cuándo usar):**
- SIEMPRE antes de APIs que pueden cambiar entre versiones
- Next.js App Router, Supabase SSR, React hooks, Tailwind

**Repomix (cuándo usar):**
- Antes de sesiones con Chat → generar output comprimido
- Para repos externos → `repomix --remote user/repo`

### 4. Configurar hooks del fork pcvelz

Investigar después de instalar qué hooks ofrece:
- Pre-commit task gate (bloquea commits con tareas in_progress)
- Low-context stop blocker (< 50% contexto)

### 5. Desactivar plan mode nativo

Agregar `"EnterPlanMode"` al deny list en `.claude/settings.json`.
Todo planning pasa por Superpowers (brainstorming → writing-plans).
Decisión de James: confirmada 2026-04-17.

## Verificación

1. `/help` muestra comandos del fork
2. brainstorming skill se invoca correctamente
3. `npx repomix --compress` genera output
4. `repomix-output.*` en .gitignore
5. tool-usage.md tiene sección de enforcement
6. CHANGELOG entry del cambio

## Fuera de scope

- Hermes Agent / OpenClaw (no prioritarios)
- AgentOps (evaluar después)
- GSD (conflicta con CLAUDE.md)
- La discusión de diseño de Events V2/GPS/Fulfillment sigue pendiente
