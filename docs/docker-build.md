# Docker Build and Run Guide

The project ships with a production-ready multi-stage `Dockerfile` using `node:20-bookworm-slim`. It installs dependencies, compiles TypeScript, prunes devDependencies, then copies only the runtime artifacts into a clean final image.

## Prerequisites

- Docker installed (`docker --version`)
- Optional: a `.env` file in project root

## Build and Run

Build:

```bash
docker build -f Dockerfile -t github-stats:node .
```

Run:

```bash
docker run --rm -p 3000:3000 --env-file .env github-stats:node
```

Open:

- API root: `http://localhost:3000/`
- Health check: `http://localhost:3000/health`

> **Note:** `APP_ENV` must be exactly `development`, `production`, or `test`. Any other value (e.g. `prod`, `staging`, or extra whitespace) will fail startup validation. You can override a bad value in `.env` at runtime:
> ```bash
> docker run --rm -p 3000:3000 --env-file .env -e APP_ENV=production github-stats:node
> ```

## Detached Mode and Logs

Run in background:

```bash
docker run -d --name github-stats -p 3000:3000 --env-file .env github-stats:node
```

View logs:

```bash
docker logs -f github-stats
```

Stop and remove:

```bash
docker rm -f github-stats
```

## Important Environment Variables

Defaults are defined in `src/shared/config/env.ts`, so the app can run with minimal configuration. Recommended variables for production:

- `NODE_ENV=production`
- `APP_ENV=production`
- `PORT=3000`
- `HOST=0.0.0.0`
- `GITHUB_TOKEN` (recommended to avoid strict GitHub API rate limits)

Optional cache and storage variables:

- Redis: `REDIS_URL` (or `REDIS_HOST`/`REDIS_PORT`)
- Database provider: `DATABASE_PROVIDER`, `DATABASE_URL`

## Useful Commands

Rebuild without cache:

```bash
docker build --no-cache -f Dockerfile -t github-stats:node .
```

Check image size:

```bash
docker images github-stats
```

## Notes

- `.dockerignore` excludes common local artifacts (`node_modules`, `dist`, `.git`, `.env`, and more) to keep build context small.
- The multi-stage build uses three stages: `deps` (install), `build` (`npm ci` + `tsc` + `npm prune --omit=dev`), and `runtime` (lean final image).
- `APP_ENV`, `NODE_ENV` must each be one of `development`, `production`, or `test` — any other value fails startup validation.