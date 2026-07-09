---
name: diagnosing-bugs
description: Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow.
---

# Diagnosing Bugs

A discipline for hard bugs. Skip phases only when explicitly justified.

When exploring the codebase, read `CONTEXT.md` (if it exists) to get a clear mental model of the relevant modules, and check ADRs in the area you're touching.

## Phase 1 — Build a feedback loop

**This is the skill.** Everything else is mechanical. If you have a **tight** pass/fail signal for the bug — one that goes red on _this_ bug — you will find the cause.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**

### Ways to construct one — try them in roughly this order

1. **Failing test** at whatever seam reaches the bug.
2. **Curl / HTTP script** against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** (Playwright / Puppeteer) — drives the UI, asserts on DOM/console/network.
5. **Replay a captured trace.** Save a real network request / payload / event log to disk; replay it through the code path in isolation.
6. **Throwaway harness.** Spin up a minimal subset of the system with mocked deps.
7. **Property / fuzz loop.** Run 1000 random inputs and look for the failure mode.
8. **Bisection harness.** Automate "boot at state X, check, repeat" so you can `git bisect run` it.

Build the right feedback loop, and the bug is 90% fixed.

### Tighten the loop

- Can I make it faster?
- Can I make the signal sharper?
- Can I make it more deterministic?

### Completion criterion — a tight loop that goes red

Phase 1 is done when the loop is **tight** and **red-capable**: you can name **one command** that you have **already run at least once**, and that is:
- [ ] **Red-capable** — drives the actual bug code path
- [ ] **Deterministic** — same verdict every run
- [ ] **Fast** — seconds, not minutes
- [ ] **Agent-runnable** — unattended

If you catch yourself reading code to build a theory before this command exists, **stop.** No red-capable command, no Phase 2.

## Phase 2 — Reproduce + minimise

Run the loop. Watch it go red. Confirm the failure mode matches what the user described.

Once red, shrink the repro to the **smallest scenario that still goes red**. Done when **every remaining element is load-bearing**.

## Phase 3 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them. Each hypothesis must be **falsifiable**:

> "If <X> is the cause, then <changing Y> will make the bug disappear."

**Show the ranked list to the user before testing.**

## Phase 4 — Instrument

Each probe must map to a specific prediction. **Change one variable at a time.**

Tool preference: Debugger > Targeted logs > Never "log everything and grep".

**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`.

## Phase 5 — Fix + regression test

Write the regression test **before the fix** — but only if there is a **correct seam** for it. If no correct seam exists, that itself is the finding.

## Phase 6 — Cleanup + post-mortem

- [ ] Original repro no longer reproduces
- [ ] Regression test passes
- [ ] All `[DEBUG-...]` instrumentation removed
- [ ] The correct hypothesis stated in the commit message

**Then ask: what would have prevented this bug?**
