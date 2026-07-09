---
name: insecure-defaults
description: "Detects fail-open insecure defaults (hardcoded secrets, weak auth, permissive security) that allow apps to run insecurely in production. Use when auditing security, reviewing config management, or analyzing environment variable handling."
allowed-tools: Read Grep Glob Bash
---

# Insecure Defaults Detection

Finds **fail-open** vulnerabilities where apps run insecurely with missing configuration. Distinguishes exploitable defaults from fail-secure patterns that crash safely.

- **Fail-open (CRITICAL):** `SECRET = env.get('KEY') or 'default'` → App runs with weak secret
- **Fail-secure (SAFE):** `SECRET = env['KEY']` → App crashes if missing

## When to Use

- Security audits of production applications
- Configuration review of deployment files, IaC templates, Docker configs
- Code review of environment variable handling and secrets management
- Pre-deployment checks for hardcoded credentials or weak defaults

## When NOT to Use

- Test fixtures in test/ spec/ __tests__/
- Example/template files (.example, .template, .sample)
- Development-only tools (local Docker Compose, debug scripts)
- Documentation examples in README.md or docs/
- Build-time configuration replaced during deployment
- Crash-on-missing behavior (fail-secure)

## Rationalizations to Reject

- "It's just a development default" → If it reaches production code, it's a finding
- "The production config overrides it" → Verify prod config exists
- "This would never run without proper config" → Prove it with code trace
- "It's behind authentication" → Defense in depth
- "We'll fix it before release" → Document now; "later" rarely comes

## Workflow

### 1. SEARCH: Project Discovery
Determine language, framework, project conventions. Discover secret storage, credentialed integrations, cryptography config.

### 2. DETECT: Pattern Scanning
- Hardcoded credentials: passwords, API keys, tokens in source
- Weak authentication defaults: `admin/admin`, `test/test`
- Permissive CORS: `Access-Control-Allow-Origin: *`
- Debug mode enabled: `DEBUG=true` in production
- Insecure cookie settings: `secure: false`, `httpOnly: false`

### 3. VERIFY: Impact Analysis
For each finding: can the app run with the insecure default? Trace the code path.

### 4. REPORT: Structured Output
Report format: severity, file:line, pattern, impact, remediation.
