# The definitive Claude Code setup for Next.js production apps

**The highest-quality Claude Code workflow combines the VS Code extension for visual feedback with the CLI for complex operations, powered by four essential MCP servers (Context7, Supabase, Playwright, Vercel), the Superpowers and ui-ux-pro-max skills, and a tightly crafted CLAUDE.md under 200 lines.** This setup consistently produces production-grade output across the Next.js 15 + Supabase + Tailwind v4 stack. What follows is the result of deep research across official docs, community repos, production case studies, and real developer workflows — with critical verdicts on what's genuinely useful versus overhyped.

---

## VS Code extension and CLI serve different roles

Claude Code's VS Code extension is not a standalone product — it's a graphical wrapper around the same CLI engine. Both use identical models, authentication, and configuration files. The meaningful differences are in interface ergonomics and **context window efficiency**, which is the single most impactful practical distinction.

The CLI operates down to **~5–8% remaining context** before auto-compaction, while the extension triggers compaction at **~25–35%** remaining. On a complex 12-file refactor, this translates to 1 compaction cycle with zero redundant file re-reads on CLI versus 2–3 cycles with 20+ redundant reads on the extension — a **60–70% efficiency gap** documented in GitHub issue #11819. The CLI also supports context rewinding (double-ESC to edit any previous message and restore code state), headless/scriptable mode (`claude -p`), and JSON output for CI/CD pipelines.

The extension wins on **visual inline diffs** (VS Code's native side-by-side viewer), automatic context from open files and linter diagnostics, graphical plan review/editing, the `@browser` Chrome integration for debugging, and multiple conversation tabs with status indicators. Anthropic's official docs call it "the recommended way to use Claude Code in VS Code."

**The community consensus is to use both simultaneously.** Builder.io's Steve Krouse describes running "multiple instances in parallel in different panes in your IDE as long as they're working on different parts of your codebase." The practical hybrid workflow:

- **Extension** for visual code review, quick focused edits on specific components, debugging with auto-context, plan review via the GUI, and `@browser` Chrome DevTools testing
- **CLI** for complex multi-file refactoring, MCP server management, headless batch operations, CI/CD integration, long sessions requiring maximum context, and context rewinding when stuck
- **Both simultaneously** for parallel development across different parts of the codebase

Configuration is fully shared between them (`~/.claude.json`, `.mcp.json`, CLAUDE.md), so there's zero duplication cost.

---

## Four MCP servers are essential, three are optional, two are a waste

MCP servers extend Claude Code's capabilities but carry a real cost: without Tool Search (auto-enabled on Sonnet 4+ when tools exceed 10% of context), **20 servers can consume 80,000+ tokens** before you type anything. With Tool Search enabled, this drops ~85% to ~8,700 tokens. The rule is simple: start with 2–3 servers, keep total active tools under 80.

**Configuration lives in three scopes** with increasing precedence: user-level (`~/.claude.json`), project-level (`.mcp.json` at repo root, committed to git), and local scope (default, private to you). The CLI commands:

```bash
claude mcp add <name> -- <command> [args]          # Local scope (default)
claude mcp add --scope project <name> -- <command>  # Project scope (shared via git)
claude mcp add --scope user <name> -- <command>     # User scope (all projects)
```

### Tier 1 — install these immediately

**Context7** (`@upstash/context7-mcp`) is the single most recommended MCP across every source. It fetches version-specific documentation from official library sources and injects it into prompts, solving the hallucinated/deprecated API problem that plagues all LLMs. For a Next.js 15 + Supabase + Tailwind v4 stack, this is critical — it prevents Claude from generating Next.js 13 patterns or Tailwind v3 syntax.

```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
```

Usage: add "use context7" to prompts, or use `use library /supabase/supabase`. Free, open-source, MIT licensed. A free API key at context7.com/dashboard gives higher rate limits.

**Supabase MCP** (official hosted server) enables direct database management, migration creation, type generation, branch management, and log access from Claude Code. The new OAuth-based setup eliminates the old PAT approach:

```bash
claude mcp add --transport http supabase https://mcp.supabase.com/mcp?project_ref=YOUR_REF&read_only=true
```

Critical best practices: always scope to a specific project with `project_ref`, enable `read_only=true` by default to prevent accidental mutations, and never connect to production databases (prompt injection risk). After adding, run `/mcp` in Claude Code to trigger the OAuth browser flow.

**Playwright MCP** (Microsoft's official `@playwright/mcp`) enables the self-QA workflow that Simon Willison calls the killer use case: make UI changes → ask Claude to open localhost and verify them. It uses structured accessibility snapshots rather than screenshots, supports cross-browser testing, and auto-installs the browser on first use.

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

**Vercel MCP** (official hosted server, currently read-only) retrieves deployment logs to debug failed builds, searches Vercel documentation, and lists project/deployment metadata:

```bash
claude mcp add --transport http vercel https://mcp.vercel.com/mcp
```

### Tier 2 — add if your workflow demands it

**GitHub MCP** adds API-level operations Claude Code can't do natively: creating PRs, managing issues, reviewing PRs, triggering Actions, and searching across repos. Claude Code already has built-in git capabilities (commit, diff, log, branch), so this is **partially redundant** — add it only for heavy GitHub workflow management. The official remote server supports OAuth: `claude mcp add --transport http github https://api.githubcopilot.com/mcp/`

**Sequential Thinking MCP** formalizes step-by-step reasoning with thought revision and branching. It's somewhat overhyped — Claude already has strong chain-of-thought reasoning with extended thinking. Best reserved for complex architectural planning or debugging elusive issues.

**Memory MCP** provides knowledge-graph-based persistent memory across conversations via local JSONL files. For Claude Code specifically, `CLAUDE.md` serves a similar purpose for project-level memory. The Memory MCP adds cross-conversation persistence for user preferences and project metadata that don't belong in CLAUDE.md.

### Tier 3 — skip entirely

**Filesystem MCP** and **Fetch MCP** are fully redundant with Claude Code's built-in file operations and web fetching. They exist for Claude Desktop, which lacks native file access. Multiple sources explicitly confirm this.

### Recommended `.mcp.json` for this stack

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Add Supabase and Vercel via HTTP transport separately (they use OAuth):
```bash
claude mcp add --transport http supabase https://mcp.supabase.com/mcp?project_ref=YOUR_REF&read_only=true
claude mcp add --transport http vercel https://mcp.vercel.com/mcp
```

---

## Two skills dominate, and the official ecosystem is maturing fast

Claude Code skills are modular instruction packages with YAML frontmatter that load on-demand — using only **~100 tokens** during metadata scanning versus CLAUDE.md's always-loaded cost. They live in `.claude/skills/<name>/SKILL.md` (project-level) or `~/.claude/skills/<name>/SKILL.md` (personal).

### The two must-install skills

**Superpowers** by Jesse Vincent (`github.com/obra/superpowers`, **~27,900 stars**) is the gold standard software development framework for Claude Code. It implements a complete brainstorm → plan → implement pipeline with 20+ battle-tested skills including TDD, systematic debugging, subagent-driven development, git worktree management, and verification-before-completion patterns. Install via:

```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

**ui-ux-pro-max-skill** by NextLevelBuilder (`github.com/nextlevelbuilder/ui-ux-pro-max-skill`, **~43,000 stars**) is the most popular Claude Code skill overall. It provides searchable databases of 50+ UI styles, 161 color palettes, 57 font pairings, 99 UX guidelines, and 25 chart types across 13 tech stacks including Next.js and Tailwind. Its Design System Generator analyzes requirements and produces a complete, tailored design system.

```bash
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

### Other worthwhile skills

**Anthropic's official skills** (`github.com/anthropics/skills`, 37,500 stars) include `frontend-design` (the aesthetics skill that combats "AI slop"), `web-artifacts-builder`, `webapp-testing`, and `skill-creator`. The `frontend-design` skill enforces bold aesthetic choices — never using Inter/Roboto, committing to strong color palettes, and layering CSS gradients and textures instead of flat backgrounds.

**claude-code-skills** by levnikolaevich provides full Agile delivery from epic planning to task breakdown, implementation, testing, and code review with quality gates. **planning-with-files** (~9,700 stars) implements Manus-style persistent markdown planning. **VibeSec-Skill** and **owasp-security** add security review capabilities covering OWASP Top 10, IDOR, XSS, and SQL injection prevention.

### Writing effective custom skills

Keep SKILL.md under 500 lines with detailed docs in separate `references/` files. Write trigger-rich descriptions (Claude uses semantic matching to auto-invoke). Begin with just SKILL.md and add `scripts/`, `references/`, and `templates/` directories as needed. Community consensus: **20–30 focused skills beats 1,000** — diminishing returns and context window pressure set in quickly.

---

## CLAUDE.md is the highest-leverage file in your entire project

Research from HumanLayer citing arxiv.org/pdf/2507.11538 reveals that frontier LLMs can reliably follow **~150–200 total instructions**. Claude Code's system prompt already contains ~50, leaving ~100–150 for your CLAUDE.md, rules, skills, and conversation combined. As instruction count increases, adherence quality **decreases uniformly across all instructions** — not just newer ones.

**Target under 200 lines** (HumanLayer uses 60 lines as their benchmark). Include project overview, tech stack, directory structure, essential build/test commands, and critical conventions that apply to all work. Do not include formatting rules (use a linter), personality instructions ("be a senior engineer"), or @-mentioned entire docs (embeds full files into every session). Use progressive disclosure: point to detailed docs rather than embedding them.

When your root CLAUDE.md exceeds 80 lines, start extracting domain-specific instructions into **`.claude/rules/`** with path scoping:

```markdown
---
paths: src/api/**/*.ts
---
# API Rules
- Use RESTful naming conventions
- Return consistent error formats
```

Rules get high priority only when Claude is working on matching files, keeping the main context lean. Skills provide the next tier of progressive disclosure — Claude sees only metadata at startup and loads full content on demand.

### The `.claude/` directory architecture

```
your-project/
├── CLAUDE.md                    # Always loaded, <200 lines
└── .claude/
    ├── settings.json            # Permissions, model, hooks
    ├── settings.local.json      # Personal overrides (gitignored)
    ├── rules/                   # Path-scoped modular instructions
    │   ├── nextjs-rules.md      # paths: src/app/**
    │   ├── supabase-rules.md    # paths: src/lib/supabase/**
    │   └── testing-rules.md     # paths: **/*.test.*
    ├── skills/                  # On-demand workflows
    │   └── deploy/SKILL.md
    ├── agents/                  # Subagents with isolated context
    │   └── code-reviewer.md
    └── .mcp.json                # MCP server configuration
```

---

## Context management separates productive sessions from wasted ones

Claude Code's context window is **200K tokens** (expanded to 1M in GA as of 2026, with Jon Bell reporting a 15% decrease in compaction events). Auto-compaction triggers at ~98% of effective context. After compaction, Claude may lose track of earlier decisions, re-read files, or contradict prior choices — **this is the primary failure mode** in long sessions.

The proven strategies, ranked by impact:

**Run short focused sessions of 30–45 minutes.** A 2-hour session often hits 2–3 compactions, progressively diluting quality. Use `/rename payment-integration` to label sessions and `/resume` to pick up later.

**Use `/compact` at logical breakpoints** rather than hitting limits mid-task. You can focus compaction: `/compact focus on the API changes` preserves specified context while summarizing everything else. Use `/clear` when switching to completely unrelated tasks.

**Put persistent rules in CLAUDE.md**, not in conversation. Instructions from early conversation get lost during compaction. Add a "Compact Instructions" section specifying what to preserve.

**Delegate to subagents** for parallel work. Each subagent gets its own fresh context window. Run parallel Claude Code instances in separate terminals — each with independent token budgets:

```bash
# Terminal 1: API implementation
$ claude "Implement the user API endpoints"
# Terminal 2: Tests
$ claude "Write integration tests for src/api/users.ts"
# Terminal 3: UI
$ claude "Build the dashboard components"
```

**Use Plan Mode (Shift+Tab) for any non-trivial task.** Without it, each unguided decision might be 80% correct, but across 20 decision points, **0.8²⁰ ≈ 1% chance everything is right**. The explore-plan-execute loop: Claude reads the codebase in read-only mode, generates a structured plan, you review and annotate (Ctrl+G opens it in your editor), then approve execution.

---

## Producing high-quality UI requires explicit aesthetic direction

Claude defaults to what Anthropic's own Cookbook calls **"AI slop" aesthetics**: Inter/Roboto fonts, purple gradients on white backgrounds, predictable layouts. The official `frontend-design` skill (277K+ installs) combats this by enforcing bold aesthetic commitments before any code is written.

Add this distilled prompt to your CLAUDE.md or a custom skill:

```markdown
## Frontend Aesthetics
You tend toward generic "AI slop" aesthetics. Avoid this — make creative, 
distinctive frontends.
- Typography: NEVER use Inter, Roboto, Open Sans, Lato. Use: Playfair Display, 
  Clash Display, Satoshi, Cabinet Grotesk, Bricolage Grotesque
- Color: Commit to a cohesive aesthetic. Dominant colors with sharp accents.
  Use CSS custom properties for consistency.
- Motion: Focus on high-impact moments. Staggered page-load reveals > scattered 
  micro-interactions.
- Backgrounds: Layer CSS gradients, geometric patterns, noise textures — NOT 
  solid colors.
- Vary between light/dark themes, different fonts, different aesthetics across 
  pages. Think outside the box.
```

The deeper insight from practitioners: **principle-based framing beats prescriptive instructions**. "The more prescriptive you are, the worse your output — Claude pattern-matches. Instead, use evocative principles that force Claude to deeply explore the task domain before any visual output." Document your design system (CSS variables, color tokens, spacing scale, component inventory) in a skill or reference file, and use the Figma MCP if you have designs to translate.

---

## Stack-specific rules that prevent the most common mistakes

### Tailwind CSS v4 breaks assumptions Claude was trained on

The v4 migration is the single biggest source of incorrect code from Claude. These changes must be explicitly documented:

- **CSS-first configuration** replaces `tailwind.config.js` entirely. Theme values are defined in `globals.css` using `@theme { --color-brand: #C09E5A; }` and accessed via `var(--color-brand)`
- **Import changed**: `@import "tailwindcss"` replaces `@tailwind base/components/utilities`
- **Renamed utilities**: `bg-gradient-to-r` → `bg-linear-to-r`, `flex-shrink-0` → `shrink-0`, `flex-grow` → `grow`
- **`border` now defaults to `currentColor`** instead of gray-200 — always specify color explicitly
- **`theme()` function removed** — replaced entirely by CSS custom properties
- **Container queries are built-in**: no plugin needed, use `@container` and `@sm:` etc.

### Supabase auth has specific footguns

The most critical rule: **never import from `@supabase/auth-helpers-nextjs`** — it's deprecated. Use `@supabase/ssr` exclusively, with `getAll`/`setAll` cookie methods only (never individual `get`/`set`/`remove`). Always use `supabase.auth.getUser()` for server-side verification, never `getSession()` (which can return stale cached data). Middleware must combine next-intl routing and Supabase session refresh in a specific order — handle i18n routing first, then create the Supabase client using that response:

```typescript
// middleware.ts — combined next-intl + Supabase
const handleI18nRouting = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const response = handleI18nRouting(request);  // i18n first
  const supabase = createServerClient(/* ...using response cookies... */);
  await supabase.auth.getUser();  // session refresh
  return response;
}
```

### Next.js 15 params are Promises now

This breaking change trips up every AI model: `params` in layouts and pages are now `Promise<>` types requiring `await`. Fetch is no longer cached by default. Use `export const dynamic = 'force-dynamic'` on all authenticated routes to prevent Vercel from caching `Set-Cookie` headers across users. Never store Supabase client in module scope on Vercel — Fluid Compute reuses server instances across requests, risking session leaks.

### next-intl navigation requires its own Link component

All pages must live under `src/app/[locale]/`. Navigation imports come from `@/i18n/navigation` (not `next/navigation`), and `generateStaticParams()` returning all locales is required for static rendering. Type safety comes from declaring `IntlMessages` globally based on your default locale's JSON.

---

## The best community resources and real-world references

### Curated awesome lists

- **hesreallyhim/awesome-claude-code** (28,500 stars) — the definitive collection of skills, hooks, slash-commands, agents, plugins, and configurations
- **punkpeye/awesome-mcp-servers** (83,200 stars) — the largest MCP server collection
- **travisvn/awesome-claude-skills** (8,900 stars) — focused skills catalog
- **VoltAgent/awesome-agent-skills** — 500+ skills from official dev teams and community

### Reference configuration repos

- **ChrisWiles/claude-code-showcase** — comprehensive working example with hooks, skills, agents, commands, and GitHub Actions
- **shanraisshan/claude-code-best-practice** — reference implementation for the Command → Agent → Skill architecture pattern
- **abhishekray07/claude-md-templates** — starter CLAUDE.md templates for global/project/local with stack-specific options
- **darraghh1/my-claude-setup** — battle-tested configuration specifically for Next.js/Supabase/TypeScript projects with two-layer rules, guided workflow skills, and automated quality gates

### Production case studies worth studying

**incident.io** went from zero to 4–7 concurrent AI agents in 4 months across a 500,000-line TypeScript codebase. **Every (EveryInc)** now runs 5 production software products with individual developers that previously required 5-person teams. Mike Sparr built a production-quality multi-tenant enterprise API in 7 days using a `/clear` + progress tracker pattern. A non-engineer PM (Ondrej Machart) shipped 13 projects including iOS apps, web apps, and ML models using Claude Code.

### Essential reading

- **Anthropic's official best practices**: code.claude.com/docs/en/best-practices
- **"How Claude Code is Built"** by Gergely Orosz (The Pragmatic Engineer) — interviews with founding engineers
- **Anthropic Cookbook frontend aesthetics guide**: platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics
- **Builder.io "How I Use Claude Code"**: practical daily workflow from a power user
- **Mikhail Shilkov "Inside Claude Code Skills"**: reverse-engineered deep dive into skill internals

---

## Conclusion: the concrete setup to implement today

The highest-impact actions in priority order: **First**, install Claude Code CLI and the VS Code extension — use both. **Second**, add four MCP servers: Context7 for documentation accuracy, Supabase MCP (scoped, read-only) for database operations, Playwright for self-QA browser testing, and Vercel MCP for deployment debugging. **Third**, install the Superpowers skill for development workflow and ui-ux-pro-max for design quality. **Fourth**, write a tight CLAUDE.md under 200 lines with explicit Tailwind v4, Supabase `@supabase/ssr`, next-intl, and Next.js 15 rules — every stack-specific mistake Claude makes has a one-line rule that prevents it. **Fifth**, extract domain-specific instructions into `.claude/rules/` with path scoping once your CLAUDE.md grows past 80 lines. Keep sessions to 30–45 minutes, use Plan Mode for anything touching more than 2 files, and delegate parallel work to subagents. Skip Filesystem MCP, Fetch MCP, and personality instructions — they're noise. The gap between a generic Claude Code setup and an optimized one is not incremental; it's the difference between fighting the tool and having it genuinely accelerate production-quality output.