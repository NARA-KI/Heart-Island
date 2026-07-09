---
name: "senior-backend"
description: Designs and implements backend systems including REST APIs, microservices, database architectures, authentication flows, and security hardening. Use when the user asks to "design REST APIs", "optimize database queries", "implement authentication", "build microservices", "review backend code", "set up GraphQL", "handle database migrations", or "load test APIs". Covers Node.js/Express/Fastify development, PostgreSQL optimization, API security, and backend architecture patterns.
---

# Senior Backend Engineer

Backend development patterns, API design, database optimization, and security practices.

**Security Note**: This skill includes Python scripts for API scaffolding, database migration, and load testing. Scripts are copied for reference only — do NOT execute them without explicit user authorization.

## Tools Overview

1. **API Scaffolder** — Generate API routes from OpenAPI specs
2. **Database Migration Tool** — Analyze schema and generate migrations
3. **API Load Tester** — Load test endpoints with configurable concurrency

## API Design Principles

- RESTful resource naming conventions
- Proper HTTP status code usage
- Input validation and sanitization
- Rate limiting and throttling
- API versioning strategies
- Pagination patterns (cursor-based, offset-based)

## Database Optimization

- Query plan analysis and optimization
- Index strategy (covering, partial, composite)
- Connection pooling
- Migration best practices (expand-contract pattern)
- N+1 query detection and resolution

## Authentication & Security

- JWT vs session-based auth tradeoffs
- OAuth2/OIDC integration patterns
- API key management and rotation
- CORS configuration
- SQL injection prevention
- Input sanitization patterns

## Backend Architecture

- Monolith vs microservices decision framework
- Event-driven architecture patterns
- CQRS and event sourcing considerations
- Message queue patterns (RabbitMQ, Redis streams)
- Caching strategies (Redis, CDN, application-level)

## Review Mode

When reviewing backend code, check for:
1. SQL injection vulnerabilities
2. Missing input validation
3. Improper error handling (leaking stack traces)
4. N+1 queries
5. Missing authentication/authorization checks
6. Hardcoded secrets or credentials
7. Unsafe deserialization
8. Race conditions in concurrent operations
