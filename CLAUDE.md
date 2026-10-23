# BE Blogging — Project Guidelines

## Tech Stack

- NestJS v10, Fastify adapter (not Express)
- TypeORM + MySQL 8.4, `synchronize: true` in non-production
- Redis via ioredis for caching and JWT session cache
- TypeScript 5.5, absolute imports via `src/` prefix
- bcrypt for passwords, @nestjs/jwt for tokens, @nestjs/throttler for rate limiting

## Project Structure

```
src/
├── config/            # Typed config services (app, sql, redis) + Joi validation
├── core/              # Cross-cutting: auth, database, logger, throttler, tasks
│   ├── auth/          # JwtAuthGuard, CurrentUser decorator
│   ├── database/      # Redis service (get/set/del/sadd/smembers), SQL module
│   ├── logger/        # LoggerService wrapper
│   ├── tasks/         # Cron jobs (cleanup soft-deleted records)
│   └── throttler/     # Fastify-compatible throttle guard (APP_GUARD)
├── modules/           # Feature modules — controllers + DTOs only
│   ├── users/         # Signup, login, get user
│   ├── posts/         # CRUD + offset/cursor pagination
│   ├── comments/      # CRUD + nested replies + pagination
│   └── votes/         # Upvote/downvote on posts and comments
└── sqlSchema/         # Data layer — entities, services, enums, base classes
    ├── interfaces/    # BaseEntity, IBaseResourceService<T>
    ├── utils/enums/   # Status and type enums (PostStatus, VoteType, etc.)
    ├── users/         # User entity + UsersService (signup, login, brute-force)
    ├── posts/         # Post entity + PostsService (CRUD, cache, pagination)
    ├── comments/      # Comment entity + CommentsService (CRUD, cache, replies)
    └── votes/         # Vote entity + VotesService (upsert, flip, counts)
```

## Architecture Principles

### SOLID

- **S — Single Responsibility**: Each class does one thing. Controllers handle HTTP. Services handle business logic + data. DTOs handle validation/transformation.
- **O — Open/Closed**: `BaseResourceService<T>` provides CRUD — extend it, don't modify it. Add domain methods in concrete services.
- **L — Liskov Substitution**: All services extending `BaseResourceService<T>` honor the base contract (`findAll`, `findById`, `create`, `update`, `delete`).
- **I — Interface Segregation**: `IBaseResourceService<T>` defines only the contract consumers need. Services add domain-specific methods separately.
- **D — Dependency Inversion**: Controllers depend on service abstractions, not implementations. Config is injected via typed services (`AppConfigService`, `SqlConfigService`), not raw `ConfigService.get()`.

### KISS (Keep It Simple)

- No premature abstractions. Three similar lines > one clever helper.
- Ternaries and inline logic only when they fit on one line.
- Enum-to-label mapping uses constant `Record` maps, not switch/if chains.
- One service per entity. Feature-level services only when cross-entity orchestration is needed.

### DRY (Don't Repeat Yourself)

- `BaseResourceService<T>` eliminates repeated CRUD boilerplate.
- Shared enums in `sqlSchema/utils/enums/` — used by entities, services, and DTOs.
- `RedisService` wraps ioredis — no module touches the raw client.
- Cache helpers (`cacheGet`, `cacheSet`, `purgeCache`) live in the service that owns the data, not duplicated across controllers.

### Karpathy Principles (applied to code)

- Make it work first, make it right second, make it fast third.
- Don't optimize what you haven't measured. The jittered cache TTL is enough until profiling says otherwise.
- Simple > clever. A `for` loop over 2 rows is clearer than a reduce.
- Delete code you don't need. Dead methods, unused imports, commented-out blocks — remove them.

## Controller Rules

Controllers handle ONLY:
- Route decorators (`@Get`, `@Post`, `@Patch`, `@Delete`, `@Version`)
- Guards (`@UseGuards`)
- Parameter extraction (`@Param`, `@Query`, `@Body`, `@CurrentUser`)
- Calling ONE service method
- Mapping response to DTO (`ResponseDto.fromEntity()`)
- Returning the response

Controllers must NOT:
- Import or use `RedisService`
- Throw exceptions (services throw, controllers propagate)
- Contain `if/else` business logic, ownership checks, existence checks
- Build cache keys, map status strings to enums, or construct queries
- Have private helper methods (move them to the service)

## Error Handling

### Where to handle

- **Services**: throw `NotFoundException`, `ForbiddenException`, `ConflictException`, `UnauthorizedException` at the point of violation. Don't catch-and-rethrow as generic 500s.
- **DTOs**: use class-validator decorators for input validation — NestJS auto-returns 400 on failure.
- **Guards**: throw `UnauthorizedException` for auth failures.
- **Controllers**: don't handle errors — let NestJS exception filters propagate service exceptions to HTTP responses automatically.

### What NOT to do

- No catch-all `try/catch` that swallows typed exceptions into `InternalServerErrorException`.
- No error handling for things that can't fail (internal method calls, enum lookups).
- No redundant null checks after `findByIdOrFail` — it throws if null.

### Pattern

```typescript
// Service — throw at the point of violation
async updateOwned(id: number, authorId: number, data): Promise<Post> {
  const post = await this.findByIdOrFail(id);        // throws 404
  if (post.authorId !== authorId) {
    throw new ForbiddenException('You can only update your own posts');
  }
  return this.update(id, data);
}

// Controller — just call and map
async update(@Param('id') id, @Body() dto, @CurrentUser() user) {
  const updated = await this.postsService.updateOwned(id, user.id, dto);
  return PostResponseDto.fromEntity(updated);
}
```

## Logging

- Log at **entry and exit points** of critical operations, not every function.
- Use `LoggerService` (injected), not `console.log`.

### Where to log

- **Service lifecycle**: connection established/closed (Redis, SQL)
- **Auth events**: login success, login failure, account blocked, account unblocked
- **Write operations**: create, update, delete (entity type + ID)
- **Cron jobs**: start, completion, count of affected rows
- **Errors**: unexpected failures with stack trace via `logger.error()`

### Where NOT to log

- Read operations (GET endpoints) — too noisy
- Cache hits/misses — use metrics instead if needed
- DTO validation failures — NestJS handles the 400 response

### Pattern

```typescript
async signup(dto): Promise<User> {
  this.logger.log(`Signup attempt: ${dto.userName}`, 'UsersService');
  // ... logic ...
  this.logger.log(`User created: ${user.id}`, 'UsersService');
  return user;
}
```

## Caching Strategy

- Cache lives in the **service that owns the data**, not in controllers.
- Cache key pattern: `{resource}:{version}:{userId}:{filters}:{page}`
- TTL: configurable base (default 60s) + random jitter (0-10s) to prevent stampede.
- Invalidation: SADD-based key tracking per user/post, SMEMBERS + DEL on writes.
- Only cache first pages / first cursor results — subsequent pages hit DB directly.

## Database Conventions

- Soft delete via `status` enum (`REMOVED = -1`), not TypeORM's `@DeleteDateColumn`.
- `@Check` constraints for enum validation at DB level.
- `@Index` on FK columns and status columns for query performance.
- `@Unique` constraints for business rules (unique username, unique vote per user+post+comment).
- Hard delete of soft-deleted rows via daily cron (30-day retention).

## DTO Conventions

- Input DTOs: class-validator decorators, class-transformer for type coercion.
- Response DTOs: static `fromEntity()` factory, constant maps for enum→label, never expose passwords or internal fields.
- Pagination DTOs: shared per resource, support offset (v1) and cursor (v2).

## API Versioning

- URI-based: `/v1/...` (offset pagination), `/v2/...` (cursor pagination).
- Default version is `'1'` — routes without `@Version()` serve v1.

## Code Style

- Single quotes, 2-space indent, trailing commas, semicolons.
- Absolute imports starting with `src/` — no relative paths.
- No comments unless the WHY is non-obvious.
- No emojis in code or commit messages.
