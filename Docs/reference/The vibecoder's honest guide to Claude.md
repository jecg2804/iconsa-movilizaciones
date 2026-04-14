# The vibecoder's honest guide to Claude tools

**Most of the 20 tools in the Claude Code ecosystem are noise — only 4-5 genuinely improve a solo Next.js + Supabase workflow, and the single highest-impact change costs nothing: stop splitting work between Claude Chat and Claude Code.** Your context continuity problem isn't a tooling gap — it's an architectural mistake. Claude Code's Plan Mode, native memory system, and persistent markdown files already solve the problem when used correctly. Below is a brutally honest assessment of every tool you asked about, plus the workflow changes that actually matter.

The Claude Code ecosystem has a serious **star inflation problem**. Multiple repos hit 50-120k stars in under three months, driven by viral hype cycles and possibly coordinated amplification. Stars ≠ quality. A 120k-star repo that's 2.5 months old is not the same signal as a 120k-star repo maintained for years by a credible open-source veteran. This report cuts through the noise.

---

## The 4 tools worth installing (and the 12 that aren't)

### ✅ YES — Install these

**Playwright MCP** is the single most useful browser tool for your workflow. Microsoft's official MCP server (`@playwright/mcp`) gives Claude direct browser control through the accessibility tree — navigating pages, clicking elements, filling forms, taking screenshots, and managing tabs. Setup is one command: `claude mcp add --scope user playwright npx @playwright/mcp@latest`. It opens a real Chrome window that Claude controls step by step. Tell Claude "open localhost:3000 and test the signup flow" and it clicks through your app. After code changes, say "verify the dashboard loads correctly" and Claude navigates and confirms. **27.1k stars**, actively maintained by Microsoft's Playwright team, Apache 2.0 license.

The real caveats: each tool schema costs **~13.7k tokens** even when unused, and complex pages can return 25-36k tokens in accessibility tree data, occasionally exceeding per-response limits. Shadow DOM components are invisible to accessibility snapshots. You must explicitly say "use Playwright MCP" the first time in a session, otherwise Claude may try running Playwright via bash instead. Despite these limitations, it's indispensable for a solo developer who needs visual QA without writing test code.

**Chrome DevTools MCP** complements Playwright as your debugging tool. Google's official server (`ChromeDevTools/chrome-devtools-mcp`) gives Claude full DevTools capabilities: performance profiling, network analysis, console log reading with source-mapped stack traces, and Lighthouse audits. **31.6k stars**, maintained by the Google Chrome team. Setup: `claude mcp add chrome-devtools --scope user npx chrome-devtools-mcp@latest`. The killer use cases are "check the console for errors when I load the dashboard," "record a performance trace and tell me what's slow," and "analyze network requests during the auth flow" — real debugging of Supabase API calls and Next.js rendering issues. Token cost is higher than Playwright (~18-19k for schemas), and it's Chrome-only, but the performance profiling and network analysis are capabilities Playwright doesn't have. Use Playwright for daily testing/QA and Chrome DevTools when you need to dig into why something is broken.

**Superpowers** is the most genuinely valuable repo in this entire list. Built by Jesse Vincent — creator of Keyboardio, Request Tracker, and decades of open-source work — it's an agentic skills framework that enforces structured development: Socratic brainstorming → design validation → planning → TDD (red-green-refactor) → subagent-driven implementation → two-stage code review → branch finishing. **~120k stars**, listed on the official Anthropic Plugin Marketplace, with a **94% PR rejection rate** (a positive signal — the maintainer reviews everything carefully and resists bloat). This isn't config templates — the skills are carefully tuned "behavior-shaping code." Vincent discovered that Anthropic's own published skill-writing guidelines don't produce optimal results, and he's done extensive behavioral tuning that's hard to replicate yourself. The SessionStart hook auto-injects the methodology.

The honest caveat: Superpowers enforces discipline that vibecoders often resist. It forces brainstorming before coding, planning before implementing, tests before code, and review before merging. If your instinct is "just build it," the friction will frustrate you. But if you want to level up from vibecoding to building reliable software — the kind that doesn't break every time you add a feature — this is exactly the methodology you need. Install: `/plugin marketplace add obra/superpowers-marketplace`.

**UI-UX-Pro-Max** directly solves the "all my AI-generated UIs look the same" problem. It's a Claude Code skill backed by a Python search engine querying local CSV databases: **50+ UI styles, 161 color palettes, 57 font pairings, 99 UX guidelines, and 25 chart types** across 10+ tech stacks including Next.js and ShadCN. When you request a UI task, it generates a complete design system (pattern, style, colors, typography, effects, anti-patterns to avoid), then Claude implements accordingly. **~55k stars**, featured by Snyk as the "most comprehensive design intelligence skill" in their top-8 roundup. Directly supports your stack. Where Anthropic's built-in frontend-design skill gives Claude aesthetic taste, UI-UX-Pro-Max gives it a searchable design database with specific hex colors, Google Fonts imports, and Tailwind classes. Install via `uipro init --ai claude` and use `--design-system` at project start for consistent, non-generic design decisions.

### 🤔 MAYBE — Situational value

**Google Workspace CLI** (`googleworkspace/cli`) is a Rust-built CLI with **~22.9k stars** that dynamically generates commands from Google's Discovery API, covering Gmail, Drive, Calendar, Sheets, Docs, and more. Ships with 100+ AI agent skill files and includes a CLAUDE.md for direct Claude Code integration. Multiple independent tutorials confirm real daily usage — one developer described processing 47 emails, drafting 6 replies, and routing action items in 10 minutes. Setup takes ~30 minutes (Google Cloud project, OAuth credentials). It's listed under Google's `googleworkspace` GitHub organization but explicitly states "not an officially supported Google product." **Install if you live in Google Workspace** for email triage, calendar management, and doc access. Skip if your Google usage is minimal.

**Everything-Claude-Code** has **~120k stars** gained in just 2.5 months, which should raise eyebrows. It's a massive bundle: 28+ agents, 119+ skills, 60+ slash commands, 34 rules, 20+ hooks. The kitchen-sink approach means you'd load enormous context into every session. **Cherry-pick the TypeScript rules** (`rules/typescript/`) and run `npx ecc-agentshield scan` for security scanning — skip the full install. The quantity-over-quality approach and extreme star velocity suggest hype rather than depth.

**Impeccable** has only **43 stars** but was created by Paul Bakaus — creator of jQuery UI, former Google Chrome DevRel lead, and AMP creator. It provides design-focused slash commands (`/audit`, `/normalize`, `/polish`, `/distill`) that guide Claude toward better UI output. Zero risk to try (copy files into `.claude/`, 5 minutes). Potentially the best ROI experiment on this list despite tiny adoption, precisely because the author has deep legitimate design expertise. Worth testing alongside UI-UX-Pro-Max.

**oh-my-claudecode** is the most ambitious plugin in the ecosystem — 32 specialized agents, 40+ skills, team orchestration, HUD, rate-limit auto-resume daemon. **~8.5-18.8k stars**, built by a Korean quant trader who "mass-vibe-codes by night." The "deep interview" and "plan" features are genuinely useful for solo devs who struggle with requirements gathering. But the complexity is massive, breaking changes are frequent (v3.0 broke backward compat with v2.x), and multi-agent orchestration multiplies token consumption. **Only consider if you're a power user with generous Claude Max subscription** hitting consistent limits with vanilla Claude Code.

**Agency Agents** at **~60.6k stars** is a collection of markdown agent definitions — frontend-developer, security-auditor, backend-architect personas. But these are just prompt templates. There's no code, no tests. You could write equivalent agents in 10 minutes each. Copy the security-auditor and frontend-developer `.md` files if curious, but don't expect transformative results. Claude already knows how to be a frontend developer.

### ❌ NO — Skip these

**Browser-use** (79k stars) is a Python library for autonomous web agents, not designed for Claude Code. Requires Python 3.11+, a separate LLM API key (you'd pay for two LLM calls), and complex setup. Every MCP wrapper is a community afterthought. Playwright MCP does everything you need with one command.

**Obsidian MCP** is unnecessary because Claude Code already reads local files natively. Since Obsidian vaults are just folders of markdown, `cd ~/vault && claude` works immediately. The MCP only helps Claude Desktop (which lacks filesystem access). If you want Obsidian integration, install kepano's obsidian-skills (**13.9k stars**, from Obsidian's CEO) — 5 markdown files that teach Claude proper Obsidian syntax. Skip the MCP server entirely.

**Google Drive MCP** requires creating a Google Cloud project, enabling multiple APIs, configuring OAuth consent screens, downloading credentials, and re-authenticating weekly (refresh tokens expire in 7 days for apps in "Testing" status). For a solo dev whose code lives in a local repo that Claude Code already reads directly, this solves a problem you don't have.

**Apify** is a cloud web scraping platform with **~985 stars** on its MCP server. Well-maintained, easy setup, free tier. But web scraping is a different problem domain than building Next.js + Supabase apps. Unless you're building a data-ingestion feature, skip it.

**CLI-anything** (**~20.5k stars**) generates Python CLI interfaces for desktop GUI software — GIMP, Blender, OBS Studio. Academic project from Hong Kong University. **Zero relevance** to web development.

**Claude-mem** (**~41.5k stars**) hooks into Claude's lifecycle events, compresses observations, and stores them in SQLite. The problem: **Claude Code's native auto memory system (v2.1.59+) already does this** — auto-captures decisions, bugs, architecture notes as plain markdown, togglable via `/memory`, zero config. Claude-mem also has an associated **Solana token ($CMEM)** and is headed toward a paid license model. AGPL-3.0 license. The crypto association is a major red flag for any developer tool.

**n8n-MCP** is an MCP server giving Claude knowledge about n8n's 1,396 workflow automation nodes. But a solo vibecoder already has Vercel cron jobs, Supabase Edge Functions, and Next.js API routes. Adding n8n means another service to maintain, another hosting cost, another thing to learn — for automation you can already do in-stack.

---

## How skills actually work (and why yours might be ignored)

Claude Code skills use **pure LLM reasoning** for selection — no algorithmic routing, no embeddings, no intent classification. At session startup, Claude reads all `SKILL.md` frontmatter (name, description) but NOT the full instruction content. When Claude decides a skill matches the current task, it loads the full file via tool call. This means your `description` field is everything. A vague description like "Helps with database stuff" will never trigger. Write pushy, specific descriptions: *"Use when creating Supabase database tables, writing migrations, setting up Row Level Security policies, or when the user mentions RLS, migrations, or database schema."*

Three invocation modes exist: manual (`/skill-name`), automatic (Claude decides based on description), and **path-based** (`paths: "supabase/migrations/**"` in YAML frontmatter auto-loads when editing matching files). The path trigger is the most reliable for a vibecoder because it removes the probabilistic element. Start with **3-5 high-value skills** — a Next.js component skill, a Supabase migration skill, and a deploy-check skill — rather than creating dozens that crowd context.

Claude Chat's project files work differently. **Project Knowledge uses RAG** (Retrieval-Augmented Generation) on paid plans, meaning Claude searches and retrieves relevant chunks rather than loading everything into context. Project Instructions (the text box at the top) are always loaded. This is why uploaded repo files in Chat sometimes seem "ignored" — they're only retrieved when semantically relevant to the current question.

Install Supabase's official agent skills (`/plugin marketplace add supabase/agent-skills`) for postgres best practices that are already tuned and tested.

---

## Solving the context continuity problem for good

The core issue isn't missing tools — it's **workflow architecture**. Claude Chat and Claude Code share absolutely no context, memory, or state. There's an open feature request (GitHub issue #13843) but it hasn't been implemented. Every time you switch between Chat and Code, you're starting from zero.

**The fix: stop splitting.** Do everything in Claude Code. It has **Plan Mode** (Shift+Tab × 2) specifically designed for architecture and planning. In Plan Mode, Claude explores your codebase read-only, asks clarifying questions, and creates plan files — all while seeing your actual code. No context loss between planning and implementation. Use Claude Chat only for brainstorming product ideas, writing non-code content, or quick questions unrelated to the codebase.

Claude Code has three complementary memory systems. **CLAUDE.md files** (you write these) load at the start of every session — keep them under **200 lines** with `@path/to/file` imports for longer docs. **Auto Memory** (Claude writes) saves patterns, debugging insights, and project behaviors to `~/.claude/projects/<project-hash>/` — browse via `/memory`. **Session Memory** (background system) runs during every session, saving structured summaries that make `/compact` instant and are automatically recalled in future sessions.

The battle-tested pattern for long feature work is **"Document & Clear"**: before ending a heavy session, tell Claude "Write current progress, decisions made, and next steps to `plans/session-notes.md`." Then `/clear` context. Start the next session with "Read `plans/session-notes.md` and continue where we left off." This bridges sessions through persistent files rather than relying on memory systems alone. Use `claude --continue` for resuming within the same day, and the Document & Clear pattern across days.

---

## Custom commands and hooks that actually earn their keep

Skip agents and focus on **3 commands + 2 hooks** as your starting kit.

Create `.claude/commands/plan.md` for feature planning ("Research codebase for patterns related to: $ARGUMENTS, create plan.md with approach and Supabase schema changes, wait for approval before implementing"). Create `.claude/commands/catchup.md` for session resumption ("Read all changed files in current branch and summarize what's in progress"). Create `.claude/commands/deploy-check.md` for pre-deployment verification (build, lint, console.log audit, migration status, git changelog).

For hooks, add a **PostToolUse auto-formatter** that runs Prettier on any `.ts/.tsx` file after Claude edits it — this catches formatting drift silently. Add a **PreToolUse safety guard** that blocks `rm -rf`, `DROP TABLE`, `TRUNCATE`, and `supabase db reset` with exit code 2. These are deterministic (fire every time) unlike CLAUDE.md rules (probabilistic), making them reliable safety nets.

Custom agents (`.claude/agents/`) are **overkill for solo development**. The one exception: a security-focused code reviewer agent scoped to Read/Grep/Glob that checks for missing RLS policies, service-role key exposure, and auth gaps in server actions. Run it before deploying.

---

## Repo access: what actually gives Claude the best view

**Claude Code with a local repo is the gold standard** — full filesystem access via Read, Grep, Glob, and LS tools, no file count limits, no API rate limits, instant response. Claude doesn't index your codebase upfront; it navigates on-demand, which Anthropic says is "more effective and flexible than full codebase indexing." The practical constraint is the **200k token context window**, and individual file reads are capped at ~25k tokens per tool call.

Claude Chat with uploaded project files uses RAG to retrieve relevant chunks — it does not see all files simultaneously. Upload limits are 20 files per chat (unlimited to Project Knowledge), 30MB each. The GitHub connector for Claude Chat is reportedly buggy, with files sometimes inaccessible despite "Connected" status. Project files are **read-only** — Claude can't update them.

The GitHub MCP server (`github/github-mcp-server`) connects Claude Code to GitHub's API for PR management, issue tracking, and CI monitoring. It's useful for workflow automation but **not necessary for code access** — local file access is always faster than API calls. Install it only if you want Claude to create PRs or manage issues directly.

Your optimal setup: Claude Code as primary (full filesystem access to local repo), Claude Chat as secondary with a lightweight Project containing only README.md, architecture docs, and schema files for high-level brainstorming. Don't try to replicate the full codebase in Chat.

---

## Conclusion: the minimum viable Claude stack

The highest-ROI actions require no new tools. Write a **100-150 line CLAUDE.md**, create **3 slash commands** (plan, catchup, deploy-check), add **2 hooks** (auto-format, safety guard), and **stop using Claude Chat for anything code-related**. This alone will do more for context continuity than any tool on this list.

Then install four things: **Playwright MCP** for visual QA, **Chrome DevTools MCP** for debugging, **Superpowers** for development methodology, and **UI-UX-Pro-Max** for design quality. Everything else is either solving problems you don't have, adding complexity that costs more than it saves, or riding a hype cycle that confuses GitHub stars with genuine utility. The Claude Code ecosystem is young and noisy — the signal is in the tools backed by credible maintainers (Microsoft, Google, Jesse Vincent, Anthropic) solving problems you actually encounter daily.