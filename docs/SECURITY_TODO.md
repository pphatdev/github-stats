# Security TODO

Actionable follow-ups from the security audit (2026-08-24). Each item is scoped as a GitHub-issue-ready task with file references. Tackle top-to-bottom — order reflects both severity and dependency (fix H1/H5 first because it unlocks several others).

Legend: `[C]` Critical · `[H]` High · `[M]` Medium · `[L]` Low · `[I]` Info

**Last refresh: 2026-09-19 (all-clear).** Every audit item is now closed — see the "Done:" note under each for what shipped. Follow-ups worth watching (not audit findings):
- Helmet CSP stays off; revisit when HTML routes appear.
- `stats.service.pngCache` is still an unbounded `Map` (H6 handled the shared LRU only).
- `strictRateLimiter` is only on `/stats` and `/badges`; `/graph` and `/languages` also fan out to GitHub and could benefit.
- `/public/…` static alias was dropped (I1). External consumers must use root-mounted paths; restore the alias temporarily if that breaks callers.

---

## Critical

- [x] **[C1] Escape user input in SVG badge output (reflected XSS)** — done 2026-09-19
  - Files: `src/shared/components/badge-renderer.ts` (lines 231, 300-301); input flow `src/modules/badges/badges.controller.ts:215-239`
  - Add `svgEscape(v)` helper (`& < > " '` → entities). Apply to every `${...}` in SVG text nodes and attribute values.
  - Add `hexColorOrReject(v)` (`/^#[0-9a-fA-F]{3,8}$/`) at the controller; reject on failure with 400.
  - Repro: `GET /badges?username=x&name=visitors&customLabel=</text><script>alert(1)</script>`
  - **Done:** helpers landed in `src/shared/utils/svg-safe.ts` (`svgEscape` + `normalizeHexColor` — accepts `#?[0-9a-fA-F]{3,4,6,8}` and returns canonical `#…`). `labelText` in badge-renderer is now escaped after uppercasing; width is measured on raw glyphs. Controller-level hex validation was folded into the Zod schemas in H1, so bad colors are rejected at the route boundary.

---

## High

- [x] **[H1] Wire up the existing Zod validation middleware** — done 2026-09-19
  - File: `src/shared/validations/validation.ts` (defined, unused) · middleware at `src/shared/middlewares/error.middleware.ts:163`
  - Mount `validate(schema, 'query')` on every route in `stats.routes.ts`, `badges.routes.ts`, `graphs.routes.ts`, `languages.routes.ts`.
  - Switch controllers to read from `req.validated` instead of `req.query`.
  - Tighten `themeSchema` to `z.enum([...knownThemes])`. Add hex-color validation for badge color params.
  - **Done:** schemas rewritten to match each endpoint's real query surface (statsQuerySchema/graphQuerySchema/badgeQuerySchema/languagesQuerySchema). `colorHex` now matches `normalizeHexColor` semantics and normalizes to `#…`. `themeSchema` uses `.refine(isKnownTheme)` against a new registry helper in `themes.ts`; a separate `badgeThemeCsvSchema` per-item-validates the CSV theme param on `/badges`. `validate(...)` is mounted on all four routes. Controllers read `req.validated` and the ad-hoc color gates from C1/H2/H3 are gone. ZodError → shared `errorHandler` → JSON 400 with `error.details.fields`.

- [x] **[H2] Escape/validate `custom_title` + colors in stats card (reflected XSS)** — done 2026-09-19
  - File: `src/shared/components/card-renderer.ts` (lines 146-148, 171, 175-178, 197-198, 207-210, 277, 297-303, 390)
  - Same fix as C1 (`svgEscape` + `hexColorOrReject`).
  - **Done:** `customTitle` (and its `stats.name` fallback) is passed through `svgEscape` before it hits the `<text>` node. Color params flow through the Zod `colorHex` schema (H1) — invalid colors 400 at the route.

- [x] **[H3] Escape/validate colors in graph card (reflected XSS)** — done 2026-09-19
  - File: `src/shared/components/graph-renderer.ts` (lines 294, 315, 322, 325, 352, 361-364, 374-378, 381-385, 391-392)
  - Same fix as C1.
  - **Done:** `titleText` (composed from `data.username + " 's Activity " + data.year`) is escaped before render; width is measured on the raw string so `&<>"'` don't inflate padding. Color params validated by the shared Zod `colorHex`.

- [x] **[H4] Implement real visitor dedup (stop counter inflation)** — done 2026-09-19
  - Files: `src/modules/badges/badges.service.ts:50-52, 356-376` · schema `src/db/schema.ts:20-38` (`visitor_logs` table already defined, never written)
  - `INSERT OR IGNORE INTO visitor_logs (username, ip_hash, visit_date)` first; only bump `badges.visitors` when the insert succeeded (unique index didn't reject).
  - `ip_hash = sha256(ip + SERVER_SALT)` — add `SERVER_SALT` to env schema.
  - Validate `username` against `USERNAME_PATTERN` from `src/modules/users/users.controller.ts:15` before write.
  - Depends on L1 (`trust proxy`) for correct client IP.
  - **Done:** new `src/shared/utils/visitor.ts` exposes `hashClientIp` (SHA-256 over `salt:ip`) and `currentVisitDateUtc`. `SERVER_SALT` added to env schema (optional, min 16 chars) with a boot warning and a marker dev fallback. `getVisitorCount` now runs `INSERT ... ON CONFLICT DO NOTHING` against `visitor_logs`; a suppressed insert returns the current total without touching `badges.visitors`. Malformed usernames are rejected up front against the shared `GITHUB_USERNAME_RE` from `src/shared/utils/username.ts` (this is the H4 use of USERNAME_PATTERN + closes I2 for badges/tracker; `users.controller.ts:15` still has its local copy). Missing `req.ip` also refuses the bump (belt-and-braces after L1).

- [x] **[H5] Mount helmet + rate limiter (they exist, aren't wired)** — done 2026-09-19
  - Files: `src/shared/middlewares/performance.middleware.ts:38-66` (defined) · `src/app.ts:37` (missing usage)
  - Add:
    ```ts
    import { rateLimiter, securityMiddleware } from './shared/middlewares/performance.middleware.js';
    app.use(securityMiddleware);
    app.use(rateLimiter);
    ```
  - Add stricter `strictRateLimiter` on `/badges` and `/stats` (each request may hit GitHub API).
  - Configure helmet CSP; allow SVG endpoints to override.
  - **Done:** `app.set('trust proxy', 1)` set before any per-IP middleware (also closes L1). The manual 3-header block was replaced by `securityMiddleware` (helmet with `crossOriginResourcePolicy: 'cross-origin'` so badges still embed in GitHub READMEs; CSP stays off because there's no HTML surface). Global `rateLimiter` mounted on the app; `strictRateLimiter` layered on `/stats` and `/badges`. CSP tightening deferred — not needed for API/SVG surface but should revisit if HTML routes appear. `/graph` and `/languages` also hit GitHub and could benefit from `strictRateLimiter`; leaving as a follow-up.

- [x] **[H6] Bound the in-memory cache (memory DoS)** — done 2026-09-19
  - Files: `src/server.ts:22` (shared `Map`) · key at `src/modules/badges/badges.service.ts:389-397`
  - Replace `Map` with `lru-cache` (cap ~10k, TTL matching current `cacheDuration`).
  - Drop user-controlled `options` from cache key — hash a normalized subset only. Mirror `src/modules/icons/icons.service.ts:395-410`.
  - **Done:** installed `lru-cache@11`. New factory `src/shared/utils/response-cache.ts` returns an LRU capped at 10k with TTL = `env.CACHE_DURATION`. All four service constructors and route factories now take a structural `ResponseCache<V>` (both `LRUCache` and plain `Map` satisfy it — Worker entrypoint keeps its Map unchanged). Badge cache key is now a fixed-shape array of only render-affecting options (theme, customLabel, customType, five color fields, hideFrame, padding); `realtime` is deliberately excluded so freshness-mode toggling can't churn cache entries. Stats' `pngCache` still uses an unbounded `Map` — flag for follow-up.

- [x] **[H7] Bound `stats_requests` growth** — done 2026-09-19
  - File: `src/shared/middlewares/track-request.middleware.ts:36-61`
  - Validate `username` against `USERNAME_PATTERN` before insert; reject bad values (don't 500).
  - Add periodic cleanup job (prune rows older than N days).
  - Consider hourly-bucket dedup via `INSERT OR IGNORE` on `(username, url, ua, hour_bucket)`.
  - **Done:** shared `isValidGithubUsername` gates every insert. In-memory hourly dedup implemented via an LRU-capped Set (20k entries, 90 min TTL) keyed on `username|url|ua|hour_bucket` — kept in memory rather than adding a DB unique index so no migration was needed; the trade-off is that dedup doesn't survive restart. New `src/shared/utils/stats-cleanup.ts` runs an immediate prune on boot and a repeating `setInterval(…).unref()` afterward; retention (default 30d) and cadence (default 6h) come from env. `stopServer` clears the timer.

---

## Medium

- [x] **[M1] Normalize `theme` before it enters the cache key** — done 2026-09-19
  - Files: `src/shared/utils/themes.ts:34-40` (`resolveThemeName`) · `src/modules/badges/badges.service.ts:389-397` · `src/modules/graphs/graphs.service.ts:168-184`
  - Call `resolveThemeName(rawTheme)` in the controller; use the normalized value in both render and cache key. Or reject unknown themes with 400.
  - **Done:** exported `normalizeThemeName` and `normalizeBadgeThemeName` from `themes.ts`. Zod `themeSchema` now `.transform`s to the canonical key so `/stats`, `/graph`, `/languages` see the normalized string in `req.validated.theme` and their cache keys. Badges controller normalizes each CSV entry via `normalizeBadgeThemeName` before storing, so the H6 cache-key fingerprint uses canonical values. `?theme=Ocean` and `?theme=ocean` collapse to one cache entry.

- [x] **[M2] Tighten `COLOR_REGEX`** — done 2026-09-19
  - File: `src/modules/icons/icons.service.ts:25` · also `src/modules/icons/icons-collection.controller.ts:21-22`
  - Replace `[a-zA-Z]+` branch with an explicit CSS-named-color allowlist.
  - Replace `rgb\([^)]+\)` etc. with structured parsers: `^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\)$`.
  - **Done:** new `src/shared/utils/css-color.ts` with `isValidCssColor(v)` — 148-entry CSS3 named-color allowlist plus structured hex/rgb/rgba/hsl/hsla parsers using the audit's regex shape. Both `icons.service` and `icons-collection.controller` deleted their local regex and now call the shared validator.

- [x] **[M3] Stop leaking error internals to clients** — done 2026-09-19
  - Files: `src/modules/languages/languages.controller.ts:63` (returns `` `Error: ${error.message}` ``) · `src/shared/middlewares/error.middleware.ts:87-89` (`NODE_ENV !== 'production'` leaks) · `src/worker.ts:208-211` (always leaks)
  - Return generic message to client; log full error server-side. Confirm `NODE_ENV=production` on all Node deploys.
  - **Done:** all three sites return a generic string (`"Failed to generate language visualization"`, `"An unexpected error occurred"`, `"Internal Server Error"`). Full errors are logged server-side. `errorHandler` still puts a `requestId` in the JSON body so operators can correlate the client-facing response to a log line.

- [x] **[M4] Fix CORS in non-production** — done 2026-09-19
  - File: `src/app.ts:55-61` (`origin:'*'` + `credentials:true`)
  - In dev, drop `credentials: true` OR use an explicit dev-origin list (e.g. `http://localhost:*`).
  - **Done:** the dev branch now sets `credentials: false` while keeping `origin: '*'`; prod continues to use the explicit origin allowlist with credentials.

- [x] **[M5] Remove `rejectUnauthorized: false` from Redis TLS** — done 2026-09-19
  - File: `src/shared/utils/redis-client.ts:115-116, 128`
  - Remove the flag. If the provider needs a custom CA, load it with `ca: fs.readFileSync(...)` and keep validation on.
  - **Done:** flag deleted from both the Redis Cloud URL-config path and the socket-config path. SNI (`servername: host`) retained. If a managed provider ships a custom CA, load it via `ca: fs.readFileSync(...)` in the socket config — validation now stays on.

---

## Low

- [x] **[L1] `app.set('trust proxy', 1)`** — done 2026-09-19 (as part of H5)
  - File: `src/app.ts` (missing)
  - Without this, `req.ip` is the CF/nginx IP → per-IP rate limits (H5) and IP-hash dedup (H4) bucket everyone into one entry.
  - Alternative: use `req.headers['cf-connecting-ip']` when Cloudflare is in front.
  - **Done:** `app.set('trust proxy', 1)` in `createApp()` right before the header middleware stack.

- [x] **[L2] Redact PII from debug logs** — done 2026-09-19
  - Files: `src/app.ts:72-86` · `src/shared/middlewares/error.middleware.ts:49-51, 134-141`
  - Hash `req.ip`, drop raw `req.query` from prod logs, gate on `env.APP_ENV !== 'production'`.
  - **Done:** `errorHandler` and `requestLogger` log `ipHash: hashClientIp(req.ip)` instead of the raw IP; `query: req.query` is only included when `APP_ENV !== 'production'`. `app.ts:72-86` never logged query params or IPs in the first place — left as-is.

- [x] **[L3] Drop `express.json` body limit** — done 2026-09-19
  - File: `src/app.ts:64-65`
  - All routes are GET. Reduce to `100kb` or remove body parsers entirely.
  - **Done:** limits reduced from `10mb` to `100kb` for both `express.json` and `express.urlencoded`. Body parsers kept for future POST endpoints; drop them entirely if the app stays GET-only.

- [x] **[L4] Non-root container user** — done 2026-09-19
  - File: `Dockerfile` (lines 11-22)
  - Add `USER node` (and `chown -R node:node /app` earlier).
  - **Done:** each runtime-stage `COPY` now uses `--chown=node:node`, and `USER node` is set before `CMD`. The `node` user (uid 1000) ships with the official Node image so no groupadd/useradd steps are needed.

- [x] **[L5] Distinguish ENOENT from other fs errors in icons controller** — done 2026-09-19
  - File: `src/modules/icons/icons.controller.ts:58-63`
  - Return 500 for non-ENOENT errors instead of misleading 404.
  - **Done:** the catch now branches: `Invalid…` message → 400, `err.code === 'ENOENT'` → 404, everything else → 500 with a generic body. Server-side log still captures the full error.

---

## Info / cleanup

- [x] **[I1] Deduplicate static-file mounts** — done 2026-09-19. The `/public` alias was removed from `app.ts`; root `/` is the single mount. Any external caller still hitting `/public/…` will 404 and needs to update to root-relative paths.
- [x] **[I2] Adopt the users/icons validation pattern project-wide** — done 2026-09-19
  - `src/modules/users/users.controller.ts:15` (`USERNAME_PATTERN`) and `src/modules/icons/icons.service.ts:337-347` (path-traversal check) are correct; reuse them in badges/stats/graphs/languages controllers.
  - **Done:** canonical GitHub-username regex lives in `src/shared/utils/username.ts` and is used by `badges.service` (H4), `track-request.middleware` (H7), and `users.controller` (this cleanup). Stats/graphs/languages controllers validate username via the shared Zod `githubUsername` schema (H1). No local `USERNAME_PATTERN` copies remain.

---

## Verified clean (do NOT re-audit)

- SQL injection — Drizzle used correctly, no string concat found.
- SSRF — `github-client.ts` uses Octokit only, no user-controlled URL reaches `fetch`.
- Path traversal in icons — resolved-path prefix check plus `ICON_NAME_REGEX` is solid.
- Dependencies — `npm audit` clean as of 2026-08-24; recent overrides current.
- Secrets — `.env` gitignored; no secret values logged.
- Visitor cache-control — correctly `no-store` at `src/modules/badges/badges.controller.ts:139-144`.
