---
name: "playwright-pro"
description: "Production-grade Playwright testing toolkit. Use when the user mentions Playwright tests, end-to-end testing, browser automation, fixing flaky tests, test migration, CI/CD testing, or test suites. Generate tests, fix flaky failures, migrate from Cypress/Selenium, sync with TestRail, run on BrowserStack."
---

# Playwright Pro

Production-grade Playwright testing toolkit for AI coding agents.

## Available Commands

| Command | What it does |
|---|---|
| `/pw:init` | Set up Playwright — detects framework, generates config, CI, first test |
| `/pw:generate <spec>` | Generate tests from user story, URL, or component |
| `/pw:review` | Review tests for anti-patterns and coverage gaps |
| `/pw:fix <test>` | Diagnose and fix failing or flaky tests |
| `/pw:migrate` | Migrate from Cypress or Selenium to Playwright |
| `/pw:coverage` | Analyze what's tested vs. what's missing |
| `/pw:testrail` | Sync with TestRail — read cases, push results |
| `/pw:browserstack` | Run on BrowserStack, pull cross-browser reports |
| `/pw:report` | Generate test report in your preferred format |

## Quick Start Workflow

```
1. /pw:init          → scaffolds config, CI pipeline, first smoke test
2. /pw:generate      → generates tests from spec or URL
3. /pw:review        → validates quality, flags anti-patterns
4. /pw:fix <test>    → diagnoses and repairs failing/flaky tests
```

## Sub-skills

- `pw` — Main orchestration skill
- `generate` — Test generation from specs
- `fix` — Flaky test diagnosis and repair
- `review` — Anti-pattern detection
- `coverage` — Coverage gap analysis
- `migrate` — Cypress/Selenium migration
- `init` — Project scaffolding
- `report` — Report generation
- `testrail` — TestRail integration
- `browserstack` — Cross-browser testing
