# Docker Guide

How to build, run and deploy the GitHub Stats API with Docker.

- [Quick start (Compose)](#quick-start-compose)
- [Configuration](#configuration)
- [Running the image without Compose](#running-the-image-without-compose)
- [Production deployment (GHCR + Cloudflare Tunnel)](#production-deployment-ghcr--cloudflare-tunnel)
- [Published images](#published-images)
- [Manual image release](#manual-image-release)
- [How the image is built](#how-the-image-is-built)
- [Vulnerability scanning](#vulnerability-scanning)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)

## Quick start (Compose)

Requirements: Docker with the Compose plugin (`docker compose version`).

```bash
cp .env.example .env
# Required: the image runs with APP_ENV=production, which refuses to start without it.
sed -i "s/^SERVER_SALT=.*/SERVER_SALT=$(openssl rand -hex 32)/" .env
# Recommended: set GITHUB_TOKEN in .env to avoid GitHub's anonymous rate limit.

docker compose up -d --build app redis
curl http://localhost:3102/health
```

Start only `app` and `redis` locally. The third service, `cloudflared`,
publishes the app to the internet and needs a real tunnel token. Leave the
placeholder `CLOUDFLARED_TUNNEL_TOKEN` from `.env.example` in place. If the
variable is empty, **every** `docker compose` command fails, even ones that
don't start `cloudflared`.

| Service       | What it does                                                        |
|---------------|---------------------------------------------------------------------|
| `app`         | The API, built from `Dockerfile`. Listens on `127.0.0.1:3102`.        |
| `redis`       | Redis 7 for caching and shared rate-limit counters. Not exposed.     |
| `cloudflared` | Cloudflare Tunnel. Starts only after `app` is healthy.               |

Day-to-day commands:

```bash
docker compose logs -f app            # follow app logs
docker compose ps                     # status and health
docker compose up -d --force-recreate app   # apply .env changes
docker compose down                   # stop (data volumes are kept)
docker compose down -v                # stop and delete SQLite + Redis data
```

Data lives in two named volumes: `app-data` (SQLite at `/app/data/stats.db`)
and `redis-data`.

## Configuration

Compose reads `.env` from the project root. All variables and their defaults
are defined and validated in `src/shared/config/env.ts`. An invalid value stops
the app at startup with an `Invalid environment variables` message in the logs.

| Variable                   | Required | Default (Compose) | Notes |
|----------------------------|----------|-------------------|-------|
| `SERVER_SALT`              | Yes      | –                 | At least 16 characters. Salts hashed visitor IPs. Generate with `openssl rand -hex 32`. Changing it resets visitor de-duplication. |
| `GITHUB_TOKEN`             | Recommended | –              | Without it, GitHub allows only 60 API requests per hour. |
| `PORT`                     | No       | `3000` (`.env.example`: `3102`) | Port inside the container; `cloudflared` forwards here. The host port is always `127.0.0.1:3102`. |
| `WORKERS`                  | No       | `0` (one per CPU) | Number of cluster workers. |
| `RATE_LIMIT_MAX`           | No       | `1000`            | Requests per IP per 15 minutes, all routes. |
| `RATE_LIMIT_STRICT_MAX`    | No       | `120`             | Requests per IP per minute on `/stats`, `/badges`, `/languages` and `/graph`. README images are fetched through GitHub's camo proxy, so many viewers share a few IPs. Don't set this too low. |
| `DATABASE_PROVIDER`        | No       | `sqlite`          | `sqlite` or `cloudflare` (D1). The SQLite path is fixed to the `app-data` volume. |
| `CLOUDFLARE_*`             | Only for D1 | –              | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_D1_TOKEN`. |
| `CLOUDFLARED_TUNNEL_TOKEN` | Only for `cloudflared` | –   | From Cloudflare Zero Trust → Networks → Tunnels. |
| `CLOUDFLARED_TUNNEL_NAME`  | No       | `github-stats`    | Prefix for container names. |
| `WARMUP_USERNAME`          | No       | –                 | GitHub user whose cards are pre-rendered at startup. |

Compose always sets `NODE_ENV`/`APP_ENV` to `production` and points the app at
its own Redis (`REDIS_HOST=redis`). The `REDIS_*` and `DATABASE_URL` values in
`.env` are ignored there. They only apply when you run the app outside Compose.

`APP_ENV` and `NODE_ENV` must be exactly `development`, `production` or
`test`. Values such as `prod` or `staging` fail validation.

## Running the image without Compose

```bash
docker build -t github-stats:local .

docker run -d --name github-stats \
  -p 127.0.0.1:3000:3000 \
  -e SERVER_SALT="$(openssl rand -hex 32)" \
  -e GITHUB_TOKEN="ghp_..." \
  -e REDIS_ENABLED=false \
  -v github-stats-data:/app/data \
  github-stats:local
```

- Without the `-v` volume, the SQLite database is lost when the container is
  removed.
- With `REDIS_ENABLED=false`, caching and rate limits are kept per worker in
  memory. With several workers, a client can make up to N× the configured
  number of requests. To share limits across workers, point `REDIS_URL` (or
  `REDIS_HOST`/`REDIS_PORT`) at a Redis instance instead.
- `--env-file .env` also works. Make sure the Redis and database settings in it
  are reachable from inside the container. `localhost` there means the
  container itself, not your machine.

## Production deployment (GHCR + Cloudflare Tunnel)

> The complete step-by-step guide (server setup, tunnel, image builds,
> operations, rollback, troubleshooting) is in **[DEPLOYMENT.md](DEPLOYMENT.md)**.
> This section is a summary.

GitHub Actions builds and publishes the image (see
[Published images](#published-images)). It does **not** touch the server:
deploying is a manual pull and restart there.

```bash
cd /var/www/github-stats
git pull --ff-only origin latest
export APP_IMAGE=ghcr.io/pphatdev/github-stats:<version>
docker compose pull app
docker compose up -d --no-build --remove-orphans
docker compose ps                  # wait until app shows "healthy"
```

Without `APP_IMAGE`, Compose uses `github-stats:local` and `--build` builds it
from source on the server.

Traffic path: `Cloudflare edge → cloudflared → app`. The server needs no open
inbound ports.

### One-time setup

**Server**

1. Install Docker and give the deploy user permission to run it.
2. Clone this repository on the server (e.g. `/var/www/github-stats`).
3. Create `.env` from `.env.example` and set `SERVER_SALT`, `GITHUB_TOKEN`
   and `CLOUDFLARED_TUNNEL_TOKEN`.
4. Don't edit tracked files on the server. `git pull --ff-only` fails if the
   checkout has diverged.

**Cloudflare Zero Trust → Networks → Tunnels**

`cloudflared` forwards to `http://localhost:${PORT}` by itself (`--url` in
`compose.yaml`). You only need a public hostname such as `stats.pphat.top` on
the tunnel so Cloudflare creates the DNS record. If you set a URL there, use
`localhost:<PORT from .env>`: `3102` when copied from `.env.example`, `3000`
if `PORT` is unset. `cloudflared` shares the app container's network, so this
is the container port, not the host mapping.

### Rolling back

Pin a previous image on the server:

```bash
cd /var/www/github-stats
export APP_IMAGE=ghcr.io/pphatdev/github-stats:sha-<old-commit>
docker compose pull app
docker compose up -d --no-build app
```

Version tags (`:2.2.0`) work the same way. Or revert the commit on `latest`,
let the workflow build a new image, and deploy that.

### Optional: host nginx

`nginx/default.conf` is an alternative or extra front door. It terminates TLS
and proxies to `127.0.0.1:3102`, falling back to the mirror deployments if the
local app fails.

## Published images

Workflow: `.github/workflows/docker-publish.yml`. Images are `linux/amd64`.

| Registry | Image |
|---|---|
| GitHub Container Registry | `ghcr.io/pphatdev/github-stats` |
| Docker Hub (optional) | `docker.io/<DOCKERHUB_USERNAME>/github-stats` |

| Trigger | Tags |
|---|---|
| Push to `latest` (not docs-only) | `latest`, `<package.json version>`, `sha-<7-char-commit>` |
| GitHub release `vX.Y.Z` | `X.Y.Z`, `X.Y`, `latest`, `sha-<7-char-commit>` |
| Pre-release `vX.Y.Z-rc.N` | `X.Y.Z-rc.N`, `sha-<7-char-commit>` (never `latest`) |
| Actions → Docker Publish → Run workflow | same as a push to the selected branch |

- A release fails if its tag without the `v` differs from `version` in
  `package.json` at that commit, so a version tag always means one image.
- GHCR needs no setup; the workflow uses its built-in `GITHUB_TOKEN`.
- Docker Hub is used only when both of these exist under **Settings → Secrets
  and variables → Actions**. Without them the run pushes to GHCR only and shows
  a warning.

  | Name | Tab | Value |
  |---|---|---|
  | `DOCKERHUB_USERNAME` | Variables | Docker Hub user or organization |
  | `DOCKERHUB_TOKEN` | Secrets | Docker Hub personal access token with *Read, Write & Delete* (Read & Write is enough for pushing, but not for the Overview sync below) |

- The Docker Hub **Overview** tab is generated from
  [`DOCKERHUB.md`](DOCKERHUB.md) on every push to `latest` and every release.
  Edit that file, not the Docker Hub page; manual edits there are overwritten.
  Docs-only commits don't trigger a build, so the Overview updates with the
  next code change or release (or run the workflow by hand).

**Releasing a version:**

```bash
npm version <patch|minor|major> --no-git-tag-version
git commit -am "chore(release): bump version to X.Y.Z"
# merge into latest and push, then publish the release:
gh release create vX.Y.Z --target latest --generate-notes
```

A published tag is never rebuilt with new content. To ship a fix (including a
base-image security update), release a new version.

## Manual image release

CI publishes images automatically. To build and push one by hand:

```bash
IMAGE=ghcr.io/pphatdev/github-stats          # or docker.io/<user>/github-stats
VERSION=$(node -p "require('./package.json').version")
SHA=$(git rev-parse --short=7 HEAD)

# Log in (GHCR: a token with write:packages; Docker Hub: `docker login -u <user>`).
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-user> --password-stdin

# Build for the server's architecture (needed on Apple Silicon) and push.
docker buildx build --platform linux/amd64 \
  -t $IMAGE:$VERSION -t $IMAGE:sha-$SHA -t $IMAGE:latest \
  --push .
```

Leave out `-t $IMAGE:latest` to publish a version without changing what
`latest` points to.

## How the image is built

`Dockerfile` is a three-stage build on `node:24-alpine` (Node 24 LTS, musl).
All stages use the same base, set by the `NODE_IMAGE` build arg, so native
modules compiled in `deps` match the runtime's Node ABI and libc.

| Stage     | Does |
|-----------|------|
| `deps`    | Installs `python3 make g++` (only used if a native module has no prebuilt binary) and runs `npm ci`. |
| `build`   | Compiles TypeScript (`npm run build`), then `npm prune --omit=dev`. |
| `runtime` | Applies Alpine security updates, then removes npm, npx, yarn, corepack, apk and the system OpenSSL. Copies `package*.json`, `node_modules`, `dist` and `public` only. Runs `node dist/server-cluster.js` as the `node` user (UID 1000). |

**What the runtime image contains:** Node 24 (with its own bundled OpenSSL),
musl, busybox (`sh`, `ls`, `cat`, ...) and about 14 Alpine packages. Native
modules: `better-sqlite3`, `sharp`, `@resvg/resvg-js`. Roughly 520 MB, mostly
`node_modules`.

**What it does not contain:** a package manager (`apk`, `npm`), `curl`/`wget`
with TLS, or a compiler. To debug, use `docker compose exec app sh` and `node`.
To add a tool, install it in the `runtime` stage **before** the cleanup step.

Overriding the base (for example to test a newer Node):

```bash
docker build --build-arg NODE_IMAGE=node:24-alpine -t github-stats:local .
```

A Debian base (e.g. `node:24-trixie-slim`) needs the `apk` commands in the
`Dockerfile` switched back to `apt-get`.

`.dockerignore` keeps `.env`, `.git`, `node_modules`, `data`, tests and docs
out of the build context.

Useful commands:

```bash
docker build --no-cache -t github-stats:local .   # clean rebuild
docker images github-stats                        # image size
docker inspect --format '{{.State.Health.Status}}' github-stats-app
docker run --rm --entrypoint node github-stats:local -p process.versions   # Node/OpenSSL versions
```

## Vulnerability scanning

Docker Hub (Docker Scout) and GHCR show scan results for published images. To
scan a local build:

```bash
# Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:0.58.1 image --scanners vuln github-stats:local

# Docker Scout (Docker Desktop, or the scout CLI plugin)
docker scout cves github-stats:local

# App dependencies only
npm audit --omit=dev
```

Where findings usually come from, and the fix:

| Source | Fix |
|---|---|
| Alpine packages | Rebuild; the `runtime` stage runs `apk upgrade`. Release a new version so the fixed image gets a new tag. |
| Alpine package fixed only in edge (scanner's fix version is an edge revision) | Check Alpine's secdb (`https://secdb.alpinelinux.org/v3.24/main.json`): if stable already lists the CVE as fixed it is a scanner mismatch. To clear it anyway, upgrade just that package from edge, as the `Dockerfile` does for `musl`, and remove that once stable catches up. |
| Node itself | Bump the Node base (stay on a supported LTS line). |
| npm dependencies | `npm audit fix` or upgrade the package; check `npm ls <pkg> --omit=dev` to see what pulls it in. |

Scanners sometimes flag a package version that the upstream advisory lists as
patched (a backported fix). Compare with `npm audit`, which uses the GitHub
advisory database, before changing code.

## Security notes

- The app runs as the unprivileged `node` user, with all Linux capabilities
  dropped and `no-new-privileges` set (see `compose.yaml`).
- The runtime image ships no package manager, compiler or system OpenSSL,
  which keeps both the attack surface and scanner findings small.
- Port `3102` is bound to `127.0.0.1` only. Public traffic should arrive
  through the tunnel or nginx, never directly.
- Redis has no password and no published port. It is reachable only from the
  Compose network.
- Secrets live only in the server's `.env`, which is git-ignored and excluded
  from the image. Never put secrets in build args.
- Rate-limit counters are stored in Redis, so limits apply across all cluster
  workers.

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `curl: (7) Failed to connect to localhost port 3102` | Nothing is running. Check `docker compose ps`; if the app is restarting, check `docker compose logs app`. |
| Logs show `SERVER_SALT must be at least 16 chars` or `SERVER_SALT is required` | Set `SERVER_SALT` in `.env`, then `docker compose up -d --force-recreate app`. |
| `.env` change has no effect | Compose only reads `.env` when it creates a container. Use `--force-recreate`. |
| `required variable CLOUDFLARED_TUNNEL_TOKEN is missing a value` | The variable is empty in `.env`. Set any placeholder (or the real token). Compose checks it even for `up app redis`. |
| `cloudflared` keeps restarting locally | It has a placeholder token. Stop it with `docker compose stop cloudflared`, and next time start only `app redis`. |
| Cards return `429` | The per-IP limit was hit. Raise `RATE_LIMIT_STRICT_MAX` / `RATE_LIMIT_MAX`. |
| `unable to open database file` | The `app-data` volume is owned by root (created by an old image). Rebuild, then `docker compose down -v` (this deletes data) or `chown` the volume to UID 1000. |
| Tunnel returns 502 | The dashboard public hostname URL doesn't match the app's `PORT`. Set it to `localhost:<PORT from .env>`. |
| Tunnel returns an empty 503 (`No ingress rules were defined` in the logs) | The tunnel has no route. Pull the current `compose.yaml` (it adds `--url`) and recreate `cloudflared`. |
| Error 1033 / `Tunnel not found` | See [DEPLOYMENT.md → Troubleshooting](DEPLOYMENT.md#9-troubleshooting). |
| `git pull --ff-only` fails on the server | The server checkout has local edits or isn't on `latest`. Discard them (`git checkout -- .`) and `git switch latest`. |
| `docker compose pull app`: `denied` / `unauthorized` | The GHCR package is private. `docker login ghcr.io` with a token that has `read:packages`. |
| `sh: npm: not found` / `apk: not found` in the container | Expected: the runtime image has no package managers. Use `node`, or add the tool in the `Dockerfile` before the cleanup step. |
| Native module error (`Error loading shared library`, `invalid ELF header`) | `node_modules` was built for a different libc/Node. Don't mount a host `node_modules` into the container; rebuild with `docker compose build --no-cache app`. |
| Docker Publish run fails at "Check release tag matches package.json" | The release tag differs from `version` in `package.json`. Bump `package.json` on `latest`, then delete and recreate the release. |
