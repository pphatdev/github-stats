# Docker Guide

How to build, run and deploy the GitHub Stats API with Docker.

- [Quick start (Compose)](#quick-start-compose)
- [Configuration](#configuration)
- [Running the image without Compose](#running-the-image-without-compose)
- [Production deployment (GitHub Actions + Cloudflare Tunnel)](#production-deployment-github-actions--cloudflare-tunnel)
- [Manual image release](#manual-image-release)
- [How the image is built](#how-the-image-is-built)
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

## Production deployment (GitHub Actions + Cloudflare Tunnel)

> The complete step-by-step guide (server setup, tunnel, CI secrets,
> operations, rollback, troubleshooting) is in **[DEPLOYMENT.md](DEPLOYMENT.md)**.
> This section is a summary.

`.github/workflows/deploy.yml` runs on every push to `latest` (except changes
to docs only) and can also be started manually:

1. **Build:** builds the image and pushes
   `ghcr.io/pphatdev/github-stats:latest` and `:sha-<commit>`.
2. **Deploy:** connects to the server over SSH (checking its host key) and runs
   `git pull --ff-only`. It then runs `docker compose pull app` and
   `docker compose up -d --no-build` with `APP_IMAGE` set to the new
   `sha-` tag.
3. **Verify:** waits up to 2.5 minutes for the `app` healthcheck and fails
   the job if the app never becomes healthy.

Traffic path: `Cloudflare edge → cloudflared → app`. The server needs no open
inbound ports.

### One-time setup

**Server**

1. Install Docker and give the deploy user permission to run it.
2. Clone this repository to the path you will use as `DEPLOY_PATH`.
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

**GitHub → Settings → Secrets and variables → Actions**

| Secret            | Required | Value |
|-------------------|----------|-------|
| `SSH_HOST`        | Yes      | Server hostname or IP |
| `SSH_USER`        | Yes      | User that can run `docker compose` |
| `SSH_KEY`         | Yes      | Private key for that user |
| `DEPLOY_PATH`     | Yes      | Absolute path of the repo checkout on the server |
| `SSH_FINGERPRINT` | Strongly recommended | Output of `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`, run on the server (the `SHA256:...` part). Without it the deploy doesn't verify the host key, so a man-in-the-middle could capture the registry token. |
| `SSH_PORT`        | No       | Defaults to `22` |

The deploy job uses the `production` environment, so you can require a
reviewer before each deploy under **Settings → Environments**.

### Rolling back

Pin a previous image on the server:

```bash
cd "$DEPLOY_PATH"
export APP_IMAGE=ghcr.io/pphatdev/github-stats:sha-<old-commit>
docker compose pull app
docker compose up -d --no-build app
```

Or revert the commit on `latest`, and the workflow redeploys automatically.

### Optional: host nginx

`nginx/default.conf` is an alternative or extra front door. It terminates TLS
and proxies to `127.0.0.1:3102`, falling back to the mirror deployments if the
local app fails.

## Manual image release

CI publishes images automatically. To build and push one by hand:

```bash
# 1. Bump "version" in package.json.
# 2. Build for the server's architecture (needed when building on Apple Silicon).
VERSION=$(node -p "require('./package.json').version")
docker build --platform linux/amd64 \
  -t ghcr.io/pphatdev/github-stats:$VERSION \
  -t ghcr.io/pphatdev/github-stats:latest .

# 3. Push (needs a token with write:packages).
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-user> --password-stdin
docker push ghcr.io/pphatdev/github-stats:$VERSION
docker push ghcr.io/pphatdev/github-stats:latest
```

## How the image is built

`Dockerfile` is a three-stage build on `node:20-bookworm-slim`:

| Stage     | Does |
|-----------|------|
| `deps`    | Installs build tools (only used if a native module has no prebuilt binary) and runs `npm ci`. |
| `build`   | Compiles TypeScript (`npm run build`), then `npm prune --omit=dev`. |
| `runtime` | Copies `node_modules`, `dist` and `public` only. Runs `node dist/server-cluster.js` as the `node` user. |

`.dockerignore` keeps `.env`, `.git`, `node_modules`, `data`, tests and docs
out of the build context.

Useful commands:

```bash
docker build --no-cache -t github-stats:local .   # clean rebuild
docker images github-stats                        # image size
docker inspect --format '{{.State.Health.Status}}' github-stats-app
```

## Security notes

- The app runs as the unprivileged `node` user, with all Linux capabilities
  dropped and `no-new-privileges` set (see `compose.yaml`).
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
| Deploy fails at `git pull --ff-only` | The server checkout has local edits. Commit or discard them on the server. |
