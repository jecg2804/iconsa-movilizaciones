# MovimientOS — Documentation Restructure & Environment Setup

## Who I Am

I'm James. Industrial engineer at ICONSA (heavy construction, Panama). Non-programmer. I built this app through vibecoding in 3 weeks using a single Claude chat that understood ICONSA's operations deeply. The Feature Spec v3 was the most important document — everything derived from it. But docs drifted from reality during development and now need to be rebuilt from the ground up.

## What I Need From You

I need you to be a COLLABORATOR, not a document generator. Work WITH me:

1. **Audit first** — Read everything (repo code, Supabase schema, existing docs, Project Files with ICONSA SOPs). Understand what the app actually does TODAY.
2. **Show me what you found** — Present discrepancies between docs and reality. Tell me what you understand and what you don't.
3. **Ask me questions** — If you need business context, operational details, or priorities that the code can't tell you, ASK. Don't guess. Don't assume.
4. **Generate incrementally** — One document at a time. Get my approval before moving to the next.
5. **Challenge me** — If something doesn't make sense, say so. If you see a better approach, propose it.

## The End Goal

When we finish this process, I will have:

### For the Repo (Claude Code reads these):
- [ ] `Docs/FEATURE_SPEC.md` (v4) — THE source of truth, built from actual code
- [ ] `Docs/SPEC.md` — Technical schema, triggers, RLS, decisions
- [ ] `Docs/ROADMAP.md` — Prioritized backlog of what's next
- [ ] `CLAUDE.md` (root) — 50-80 line lean index for Claude Code
- [ ] `.claude/rules/` — 3 updated rule files
- [ ] `.claude/skills/` — 6 skill files (4 updated + 2 new)
- [ ] Obsolete files deleted (BUILD_PLAN, SPRINT_TODAY, MVP_Sprint_Brief, PROJECT_STATUS, supabase_schema_verified.sql, demo_v8.jsx)

### For the Claude.ai Project (Chat reads these):
- [ ] Updated Project Instructions (if changes needed after Feature Spec is done)
- [ ] Updated memories (if changes needed)
- [ ] Cleaned up Project Files (remove any that are now redundant with BD data)

### Ready to work:
- [ ] I can open a new chat for any feature and it has full context without hours of setup
- [ ] Claude Code has accurate instructions and skills
- [ ] All docs are synchronized with the actual app and database

## The Audit — Start Here

You have access to everything:
- **Repo** (jecg2804/iconsa-movilizaciones, branch jaime/dev) — the actual source code
- **Supabase** (project bzeoszympkkicwlfdtcn) — the actual database
- **Feature Spec v3** (Docs/ICONSA_Feature_Specification_v3.md) — 1249 lines, PARTIALLY OBSOLETE
- **Project Files** — ICONSA SOPs, Spectrum exports, historical data

Start by:
1. Read the source code in `src/app/(app)/` — every screen
2. Read every hook in `src/hooks/`
3. Read `src/lib/utils/` — constants, statuses, roles
4. Query Supabase for real schema, triggers, functions, RLS policies
5. Read Feature Spec v3 to understand original intent
6. Compare code reality vs docs

Then present me:
- Here's what the app does screen by screen (brief summary)
- Here's what doesn't match between Feature Spec v3 and reality
- Here's what exists in code that v3 doesn't mention
- Here's what v3 planned but isn't built yet
- Here are my questions

## Document Generation Order

After the audit, we generate documents ONE AT A TIME in this order:

### 1. FEATURE_SPEC.md (v4) — Most important, everything derives from this
Structure:
- Sections 1-4: Context, company, scope, roles (update from v3, mostly correct)
- Section 5: Modules — screen by screen FROM THE CODE (most important section)
- Section 6: Data model — FROM SUPABASE (20 tables, 27 triggers, 14 functions)
- Section 7: Business rules — verify which from v3 still apply
- Section 8: States and transitions — THE REAL ONES (no Parcial in solicitudes, En Transito without accent)
- Section 9: Notifications — what's implemented vs planned
- Section 10: Non-functional requirements (from v3, still valid)
- Section 11: What's built, what's next (split by: working, needs improvement, planned, future)
- Section 12: Open design questions
- Section 13: Glossary

### 2. SPEC.md — Technical schema (derived from Feature Spec section 6, expanded)

### 3. ROADMAP.md — What's next (derived from Feature Spec section 11, expanded)

### 4. CLAUDE.md — Lean 50-80 line index for Claude Code (derived from all above)

### 5. Rules and Skills — Update existing, create new ones

### 6. Cleanup — Delete obsolete files, update Project settings if needed

## Final File Structure

```
CLAUDE.md                          # 50-80 lines
.claude/
├── rules/
│   ├── commit-after-step.md
│   ├── supabase-readonly.md
│   └── doc-tiers.md
├── skills/
│   ├── crud-page.md
│   ├── events-page.md
│   ├── supabase-queries.md
│   ├── self-update.md
│   ├── partial-delivery.md        # NEW
│   └── seed-data.md               # NEW
└── suggestions.md
Docs/
├── FEATURE_SPEC.md                # v4
├── SPEC.md
├── ROADMAP.md
├── SYNC_LOG.md                    # Keep existing
└── BUGS.md                        # Keep existing
```

## How to Work With Me

- Take your time reading the code. Don't rush.
- Show me what you found before generating anything.
- Ask me questions — I'd rather answer 20 questions than review a bad document.
- Generate one document at a time, get my OK, then move to the next.
- If something from Feature Spec v3 doesn't make sense vs the code, ask me — maybe the code is wrong, maybe the spec is wrong, maybe things changed intentionally.
- Be a thinking partner, not a task executor.
