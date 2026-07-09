---
name: code-review
description: Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes — Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/PRD asked for?). Runs both reviews in parallel sub-agents and reports them side by side. Use when the user wants to review a branch, a PR, work-in-progress changes, or asks to "review since X".
---

# Code Review (Two-Axis)

Two-axis review of the diff between `HEAD` and a fixed point the user supplies:

- **Standards** — does the code conform to this repo's documented coding standards?
- **Spec** — does the code faithfully implement the originating issue / PRD / spec?

Both axes run as **parallel sub-agents**, then this skill aggregates their findings.

The issue tracker should have been provided to you — run `/setup-matt-pocock-skills` if `docs/agents/issue-tracker.md` is missing.

## Process

### 1. Pin the fixed point

Capture the diff command: `git diff <fixed-point>...HEAD` (three-dot). Also note the commit list via `git log <fixed-point>..HEAD --oneline`.

Confirm the fixed point resolves and the diff is non-empty.

### 2. Identify the spec source

Look for the originating spec, in this order:
1. Issue references in commit messages (`#123`, `Closes #45`)
2. A path the user passed as an argument
3. A PRD/spec file under `docs/`, `specs/`, or `.scratch/`
4. If nothing is found, ask the user. If no spec exists, the Spec sub-agent will report "no spec available"

### 3. Identify the standards sources

Anything in the repo that documents how code should be written (e.g., `CODING_STANDARDS.md`, `CONTRIBUTING.md`).

### 4. Spawn both sub-agents in parallel

**Standards sub-agent** — report per file/hunk: violations of documented standards (cite the standard) and baseline code smells (Fowler: Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, Refused Bequest).

**Spec sub-agent** — report: (a) missing requirements, (b) scope creep, (c) wrong implementations. Quote the spec line for each finding.

### 5. Aggregate

Present the two reports under `## Standards` and `## Spec` headings. End with a one-line summary: total findings per axis, and the worst issue within each axis.

## Why two axes

A change can pass one axis and fail the other. Reporting them separately stops one axis from masking the other.
