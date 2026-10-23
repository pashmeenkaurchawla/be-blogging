# Project Requirements Prompt Template

Use this template when starting a new backend project with Claude. Fill in each section, delete what doesn't apply, and feed the whole thing as your opening prompt.

---

## 1. Project Overview

```
Project: [name]
Purpose: [one-sentence description of what the app does]
Target users: [who uses this and how]
Stage: [greenfield / MVP / production rewrite / interview prep]
```

## 2. Tech Stack & Constraints

```
Runtime:        [Node.js 20 / Python 3.12 / etc.]
Framework:      [NestJS + Fastify / Express / FastAPI / etc.]
Database:       [MySQL 8.4 / PostgreSQL 16 / MongoDB / etc.]
ORM:            [TypeORM / Prisma / Drizzle / SQLAlchemy / etc.]
Cache:          [Redis / Memcached / none]
Auth:           [JWT / OAuth2 / session-based / none]
API style:      [REST / GraphQL / gRPC]
Versioning:     [URI-based (v1/v2) / header-based / none]
Rate limiting:  [yes — X req/Y sec / no]
Deployment:     [Docker / AWS / Vercel / local only]
```

## 3. Data Schema

Define each entity with fields, types, constraints, and relationships.

```
Entity: User
Fields:
  - id: int, PK, auto-increment
  - userName: varchar(50), unique, not null
  - email: varchar(100), unique, not null
  - passwordHash: varchar(255), not null
  - status: enum(ACTIVE=1, SUSPENDED=0, REMOVED=-1), default ACTIVE
  - createdAt: datetime, auto
  - updatedAt: datetime, auto
Indexes: [userName, email, status]
Constraints:
  - @Check: status IN (-1, 0, 1)
  - Password stored as bcrypt hash, never plain text

Entity: Post
Fields:
  - id: int, PK, auto-increment
  - authorId: int, FK → User.id, not null, indexed
  - title: varchar(255), not null
  - content: text, not null
  - status: enum(ACTIVE=1, ARCHIVED=0, REMOVED=-1), default ACTIVE
  - createdAt, updatedAt: datetime
Indexes: [authorId, status]
Relationships: belongs to User (many-to-one)
```

## 4. API Design

List every endpoint with method, path, auth requirement, and behavior.

```
Resource: Posts
Base path: /v1/posts (authenticated)

POST   /              → Create post (body: title, content)
GET    /:id           → Get single post (returns 404 if removed)
GET    /              → List posts, offset pagination (query: page, limit, status)
GET    /  [v2]        → List posts, cursor pagination (query: cursor, limit, status)
PATCH  /:id           → Update own post (body: title?, content?)
DELETE /:id           → Soft-delete own post

Error responses:
  - 400: validation failure (class-validator)
  - 401: missing/invalid JWT
  - 403: updating/deleting someone else's resource
  - 404: resource not found or soft-deleted
  - 409: duplicate (e.g., duplicate username on signup)
  - 429: rate limit exceeded
```

## 5. Architecture Decisions

Spell out decisions so Claude doesn't have to guess or ask.

```
Controller responsibility:
  - ONLY: route decorators, guards, param extraction, call one service method, map to response DTO
  - NEVER: business logic, Redis calls, existence checks, ownership checks

Service responsibility:
  - ALL business logic, validation, caching, cross-service coordination
  - Throw typed NestJS exceptions (NotFoundException, ForbiddenException, etc.)
  - Feature-wise services: if a module grows, split into PostsService + PostsCacheService rather than one mega-service

Soft delete:
  - Use status enum (REMOVED = -1), not @DeleteDateColumn
  - Hard-delete removed records older than 30 days via daily cron

Pagination:
  - v1: offset (page + limit), v2: cursor/keyset (cursor + limit)
  - Cursor pagination uses DESC ordering (newest first), LessThan(cursor) for next page

Module organization:
  - modules/ = controllers + DTOs (presentation layer)
  - sqlSchema/ = entities + services + enums (data + business layer)
  - core/ = cross-cutting (auth, database, logger, throttler, tasks)
  - config/ = typed config services with Joi validation
```

## 6. Caching Strategy

```
Cache layer:    Redis via ioredis
Where:          Inside services (not controllers)
Key pattern:    {resource}:{version}:{userId}:{filters}:{page}
TTL:            Configurable per module, base + random jitter (0-10s)
Invalidation:   SADD-based key tracking per resource scope, SMEMBERS + DEL on writes
What to cache:  First page of paginated results only
What NOT to:    Single resource GETs, write operations
```

## 7. Auth & Security

```
Auth flow:
  - Signup: hash password with bcrypt, store user, return user DTO
  - Login: verify credentials, check brute-force lockout, issue JWT, cache in Redis
  - Protected routes: JwtAuthGuard validates token, checks Redis cache

Brute-force protection:
  - Track failed attempts per user (failedLoginAttempts, firstFailedLoginAt)
  - 5 failures within 5 minutes → 30-minute lockout
  - Successful login resets counter and updates lastLoginAt in single query

Rate limiting:
  - Global: 10 requests per 60 seconds via @nestjs/throttler
  - Applied as APP_GUARD with Fastify adapter

JWT:
  - Stored in Redis on login (5-min TTL cache for validation)
  - Secret and expiry from config service
```

## 8. Error Handling Guidelines

```
Where to handle:
  - Services: throw typed exceptions at point of violation
  - DTOs: class-validator decorators for input validation (auto 400)
  - Guards: throw UnauthorizedException for auth failures
  - Controllers: DON'T handle — let NestJS propagate

What NOT to do:
  - No catch-all try/catch that swallows typed exceptions
  - No error handling for things that can't fail
  - No redundant null checks after findByIdOrFail
```

## 9. Logging Guidelines

```
Log at:
  - Service lifecycle events (connection up/down)
  - Auth events (login success/fail, account blocked)
  - Write operations (create/update/delete with entity type + ID)
  - Cron jobs (start, finish, affected count)
  - Unexpected errors (with stack trace)

Don't log:
  - Read operations (too noisy)
  - Cache hits/misses (use metrics)
  - Validation failures (NestJS handles 400 response)
```

## 10. Code Style & Conventions

```
Formatting:     Single quotes, 2-space indent, trailing commas, semicolons
Imports:        Absolute paths via src/ prefix (tsconfig paths)
Comments:       None unless WHY is non-obvious
Enum mapping:   Constant Record maps, not switch/if/ternary chains
Response DTOs:  Static fromEntity() factory, never expose passwords or internals
```

## 11. Guardrails

```
Things to AVOID:
  - Business logic in controllers
  - Raw Redis client access (use typed RedisService methods)
  - Catching exceptions just to re-throw as 500
  - console.log (use injected LoggerService)
  - Relative imports (use src/ prefix)
  - Express-specific APIs (this is Fastify)
  - Premature abstractions or unused helpers
  - Comments explaining WHAT code does

Things to ALWAYS do:
  - Validate at system boundaries (DTOs for input, guards for auth)
  - Use forwardRef for circular module dependencies
  - Soft-delete instead of hard-delete for user-facing resources
  - Return response DTOs, never raw entities
  - Add @Index on FK and status columns
  - Add @Check constraints for enum validation at DB level
```

---

## Sample: Filled Prompt for be-blogging

> Build a NestJS + Fastify backend blogging platform with MySQL 8.4 and Redis.
>
> **Entities**: User (id, userName, email, passwordHash, status, failedLoginAttempts, firstFailedLoginAt, lastLoginAt), Post (id, authorId FK→User, title, content, status), Comment (id, authorId FK→User, postId FK→Post, parentCommentId nullable FK→Comment for single-level nesting, content, status), Vote (id, authorId FK→User, postId FK→Post, commentId nullable FK→Comment, vote enum 1/-1, status). All entities have createdAt/updatedAt. Status enums: ACTIVE=1, ARCHIVED=0, REMOVED=-1.
>
> **API**: REST, URI-versioned (v1 offset pagination, v2 cursor pagination). Resources: users (signup/login/get), posts (CRUD), comments nested under posts (CRUD + reply), votes on posts and comments (upsert with flip logic). All routes except signup/login require JWT auth. Rate limit: 10 req/60s globally.
>
> **Architecture**: Controllers handle only HTTP concerns → services handle all business logic + caching + validation. TypeORM entities + services in sqlSchema/, controllers + DTOs in modules/, cross-cutting in core/. Redis caching with jittered TTL in services, not controllers. Soft delete with daily cron cleanup. bcrypt passwords, brute-force lockout (5 failures/5min → 30min block).
>
> **Follow the CLAUDE.md in this project for all code patterns, error handling, and logging guidelines.**
