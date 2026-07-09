---
name: setup-matt-pocock-skills
description: Configure this repo for the engineering skills — set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first use of the other engineering skills.
disable-model-invocation: true
---

# Setup Matt Pocock's Skills

Scaffold the per-repo configuration that the engineering skills assume:

- **Issue tracker** — where issues live (GitHub by default; local markdown also supported)
- **Triage labels** — strings for the five canonical triage roles
- **Domain docs** — where CONTEXT.md and ADRs live

## Process

### 1. Explore current repo state
- `git remote -v` — GitHub/GitLab?
- `CLAUDE.md` / `AGENTS.md` at root
- `CONTEXT.md` / `CONTEXT-MAP.md`
- `docs/adr/` directories
- `docs/agents/` — prior output?
- `.scratch/` — local markdown convention?

### 2. Configure Section A: Issue Tracker
Default: GitHub (if git remote points there). Options: GitHub, GitLab, Local markdown, Other.

### 3. Configure Section B: Triage Labels
Five canonical roles: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix.

### 4. Configure Section C: Domain Docs
Single-context (CONTEXT.md + docs/adr/) or Multi-context (CONTEXT-MAP.md).

### 5. Write configuration
Edit CLAUDE.md / AGENTS.md with `## Agent skills` block and write docs/agents/ files.
