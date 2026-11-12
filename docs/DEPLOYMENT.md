# Deployment Guide

How `stats.pphat.top` is deployed and operated: first-time server setup,
Cloudflare Tunnel, automatic deploys from GitHub, everyday operations,
rollback and troubleshooting.

For image internals and the full list of environment variables, see
[docker-build.md](docker-build.md).

**Contents**

1. [Architecture](#1-architecture)
2. [Prerequisites](#2-prerequisites)
3. [First-time server setup](#3-first-time-server-setup)
4. [Cloudflare Tunnel setup](#4-cloudflare-tunnel-setup)
5. [Automatic deploys (GitHub Actions)](#5-automatic-deploys-github-actions)
6. [Day-to-day operations](#6-day-to-day-operations)
7. [Rollback](#7-rollback)
8. [Secondary deployments](#8-secondary-deployments)
9. [Troubleshooting](#9-troubleshooting)
10. [Security checklist](#10-security-checklist)

---

## 1. Architecture

```
                      ┌──────────────────────── server (Docker Compose) ────────────────────────┐
Visitor / GitHub camo │                                                                          │
        │             │   ┌─────────────┐  localhost:${PORT}  ┌──────────┐      ┌─────────┐      │
        ▼             │   │ cloudflared │ ──────────────────▶ │   app    │ ───▶ │  redis  │      │
  Cloudflare edge ◀───┼── │ (outbound   │   shares app's      │ Node.js  │      │ cache + │      │
  stats.pphat.top     │   │  only)      │   network           │ cluster  │      │ limits  │      │
                      │   └─────────────┘                     └────┬─────┘      └─────────┘      │
                      │                                            │ 127.0.0.1:3102 (host only)  │
                      └────────────────────────────────────────────┼─────────────────────────────┘
                                                                   ▼
                                                     optional host nginx / local curl
```

| Piece | Role |
|---|---|
| **Cloudflare edge** | Terminates TLS for `stats.pphat.top` and sends requests into the tunnel. |
| **`cloudflared`** | Opens an **outbound** connection to Cloudflare, so the server needs no open inbound ports. It forwards requests to the app over the app container's own network. |
| **`app`** | The API (`node dist/server-cluster.js`, one worker per CPU). It listens on `PORT` inside the container. |
| **`redis`** | Response cache and rate-limit counters shared by all workers. Not reachable from outside. |
| **Database** | Either SQLite in the `app-data` volume or Cloudflare D1, set by `DATABASE_PROVIDER`. |
| **GitHub Actions** | Builds the image, pushes it to GHCR and redeploys the server over SSH on every push to `latest`. |

There are two separate ports:

- **`PORT`** (from `.env`) is what the app listens on **inside** the container,
  and what `cloudflared` forwards to. `.env.example` sets `3102`; if `PORT` is
  unset it defaults to `3000`.
- **`3102` on `127.0.0.1`** is the host-side port, always 3102. Use it for
  `curl` on the server or the host nginx. It is never exposed publicly.

### Domains

| Domain | Runs on | Role |
|---|---|---|
| `stats.pphat.top` | This Docker deployment (Cloudflare Tunnel) | Primary |
| `stats1.pphat.top`, `stats.pphat.me` | Other self-hosted instances | Fallbacks used by `nginx/default.conf` |
| `github-stats-3hu8.onrender.com` | Render (`render.yaml`) | Fallback |
| `githubstats.up.railway.app` | Railway | Fallback |
| `stats.pphatdev.workers.dev` | Cloudflare Workers (`wrangler.toml`) | Edge worker |

---

## 2. Prerequisites

- A Linux server (x86_64) with at least 1 GB RAM and outbound internet access.
  No inbound ports are needed.
- Docker Engine 24+ with the Compose plugin (`docker compose version`).
- Git, plus read access to this repository.
- A Cloudflare account with `pphat.top` on Cloudflare DNS, and access to
  **Zero Trust**. The Free plan is enough.
- A GitHub personal access token for the app (`GITHUB_TOKEN`). A classic token
  with **no scopes** is enough for public data. Without one, GitHub allows only
  60 API requests per hour.

---

## 3. First-time server setup

### 3.1 Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"    # log out and back in afterwards
docker compose version
```

### 3.2 Clone the repository

```bash
sudo mkdir -p /var/www && sudo chown "$USER" /var/www
cd /var/www
git clone https://github.com/pphatdev/github-stats.git
cd github-stats
git switch latest            # the branch the deploy workflow pulls
```

> The server must stay on `latest`. The deploy workflow runs
> `git pull --ff-only origin latest`, which fails on any other branch or if
> files were edited on the server.

### 3.3 Create `.env`

```bash
cp .env.example .env
sed -i "s/^SERVER_SALT=.*/SERVER_SALT=$(openssl rand -hex 32)/" .env
nano .env
```

Set at least:

| Variable | Value |
|---|---|
| `GITHUB_TOKEN` | Your GitHub token |
| `SERVER_SALT` | Filled in by the `sed` above. **Keep it stable.** Changing it resets visitor de-duplication. |
| `CLOUDFLARED_TUNNEL_TOKEN` | Leave the placeholder for now. You'll paste the real token in [section 4](#4-cloudflare-tunnel-setup). |
| `DATABASE_PROVIDER` | `sqlite` (local file in a Docker volume) or `cloudflare` (D1, which needs the `CLOUDFLARE_*` values) |

`CLOUDFLARED_TUNNEL_TOKEN` must never be **empty**. Compose refuses to run
**any** command, even ones that don't start `cloudflared`, if it is.

### 3.4 Start the app and check it locally

```bash
docker compose up -d --build app redis
docker compose ps                          # app should become "healthy" within ~30 s
curl http://localhost:3102/health          # {"status":"healthy", ...}
```

If `curl` fails, see [Troubleshooting](#9-troubleshooting) before going on.

---

## 4. Cloudflare Tunnel setup

### 4.1 Create the tunnel

1. Go to **dash.cloudflare.com → Zero Trust → Networks → Tunnels**. Some
   dashboards call it **Networks → Connectors → Cloudflare Tunnels**.
2. **Create a tunnel → Cloudflared**, name it `github-stats`, then **Save**.
3. On the install screen, choose **Docker** and copy **only the token**, the
   long `eyJ…` string after `--token`. Don't run the command it shows.

### 4.2 Give the token to the server

```bash
cd /var/www/github-stats
nano .env                  # CLOUDFLARED_TUNNEL_TOKEN=eyJ...   (no quotes, no spaces)
docker compose up -d --force-recreate cloudflared
docker compose logs --tail=20 cloudflared
```

You should see four `Registered tunnel connection connIndex=0..3` lines, and the
tunnel shows **HEALTHY** in the dashboard.

### 4.3 Route `stats.pphat.top` to the tunnel

`cloudflared` already forwards every request to the app
(`--url http://localhost:${PORT}` in `compose.yaml`). Cloudflare still needs a
DNS record that sends `stats.pphat.top` to **this** tunnel:

1. In the tunnel, open **Public Hostname** (on some dashboards: **Routes** /
   **Published application routes**) → **Add a public hostname**:

   | Field | Value |
   |---|---|
   | Subdomain | `stats` |
   | Domain | `pphat.top` |
   | Path | *(empty)* |
   | Type | `HTTP` |
   | URL | `localhost:<PORT from .env>`, for example `localhost:3102` |

2. **Save.** Cloudflare creates the DNS record (a proxied CNAME to
   `<tunnel-id>.cfargotunnel.com`).
   - If it says *"A record with that host already exists"*, go to
     **pphat.top → DNS → Records**, delete the `stats` record, and save again.

A hostname route set in the dashboard replaces the `--url` fallback for that
hostname, so its URL **must** use the same port as `PORT` in `.env`.

### 4.4 Verify from outside

```bash
curl -sI https://stats.pphat.top/health | head -1     # HTTP/2 200
```

---

## 5. Automatic deploys (GitHub Actions)

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

**Triggers:** every push to `latest`, except commits that only change `*.md`,
`docs/**` or issue templates. You can also run it by hand from **Actions →
Deploy → Run workflow**.

**What it does:**

1. **build:** builds the image for `linux/amd64` and pushes
   `ghcr.io/pphatdev/github-stats:latest` and `:sha-<7-char-commit>`.
2. **deploy** (GitHub environment `production`), over SSH:
   ```bash
   cd $DEPLOY_PATH
   git pull --ff-only origin latest
   docker login ghcr.io …
   APP_IMAGE=ghcr.io/pphatdev/github-stats:sha-<commit> docker compose pull app
   docker compose up -d --no-build --remove-orphans
   # waits up to 150 s for the app healthcheck; the job fails if it isn't healthy
   docker logout ghcr.io && docker image prune -f
   ```

### 5.1 One-time GitHub setup

**Repository → Settings → Secrets and variables → Actions → New repository secret:**

| Secret | Required | Value |
|---|---|---|
| `SSH_HOST` | Yes | Server IP or hostname |
| `SSH_USER` | Yes | Deploy user. Must be in the `docker` group. |
| `SSH_KEY` | Yes | Private key, see below |
| `DEPLOY_PATH` | Yes | `/var/www/github-stats` |
| `SSH_FINGERPRINT` | Strongly recommended | Server host key fingerprint, see below. Without it the deploy can't detect a man-in-the-middle. |
| `SSH_PORT` | No | Defaults to `22` |

Create a dedicated deploy key, run **on the server** as the deploy user:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "github-actions-deploy"
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy                                   # → secret SSH_KEY (whole file)
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub           # → secret SSH_FINGERPRINT (the SHA256:… part)
rm ~/.ssh/github_deploy                                    # the private key now lives only in GitHub
```

**Optional:** under **Settings → Environments → New environment →
`production`**, add *Required reviewers* so every deploy waits for your
approval.

**Image visibility:** if the GHCR package `github-stats` is private, the
workflow's built-in `GITHUB_TOKEN` can still pull it during deploy. To pull it
by hand, `docker login ghcr.io` with a token that has `read:packages`.

### 5.2 Deploying

```bash
git switch latest
git merge <your-branch>
git push origin latest           # triggers the deploy
```

Follow the run under **Actions**. If it fails, the job log shows the last
`docker compose ps` output and the app's health status.

### 5.3 Deploying by hand (without CI)

On the server:

```bash
cd /var/www/github-stats
git pull --ff-only origin latest
docker compose up -d --build     # builds from source instead of pulling from GHCR
```

---

## 6. Day-to-day operations

All commands run in `/var/www/github-stats`.

| Task | Command |
|---|---|
| Status and health | `docker compose ps` |
| App logs | `docker compose logs -f --tail=100 app` |
| Tunnel logs | `docker compose logs -f --tail=50 cloudflared` |
| Local health check | `curl http://localhost:3102/health` |
| Public health check | `curl -sI https://stats.pphat.top/health` |
| Restart the app | `docker compose restart app` |
| Apply `.env` changes | `docker compose up -d --force-recreate` |
| Recreate the tunnel only | `docker compose up -d --force-recreate cloudflared` |
| Clear the response cache | `docker compose exec redis redis-cli FLUSHDB` (also resets rate-limit counters) |
| Resource usage | `docker stats --no-stream` |
| Disk cleanup | `docker image prune -f` |

**Changing `.env`:** Compose only reads `.env` when it **creates** a container,
so `restart` is not enough. Use `--force-recreate`.

**After recreating `app`:** `cloudflared` shares the app container's network.
If `app` is recreated on its own (`up -d app`), recreate `cloudflared` too, or
the tunnel stops working (error 1033 or 502). A plain `docker compose up -d`
handles this automatically.

### Backups

- **SQLite** (`DATABASE_PROVIDER=sqlite`):
  ```bash
  docker compose cp app:/app/data/stats.db ./backup-stats-$(date +%F).db
  ```
  Restore by stopping `app`, copying the file back with `docker compose cp`,
  then starting `app`.
- **Cloudflare D1** (`DATABASE_PROVIDER=cloudflare`): `npx wrangler d1 export stats --remote --output=backup.sql`.
- **`.env`:** keep a copy in your password manager. It holds every secret for
  the deployment.

Redis only holds cache and rate-limit counters, so it doesn't need a backup.

---

## 7. Rollback

**Fastest:** pin the previous image on the server. Every deploy is tagged
`sha-<commit>`, and `git log --oneline` gives you the commit.

```bash
cd /var/www/github-stats
export APP_IMAGE=ghcr.io/pphatdev/github-stats:sha-<previous-commit>
docker compose pull app
docker compose up -d --no-build
```

That pin lasts only until the next deploy. To make the rollback permanent,
revert the bad commit on `latest` and push, and CI redeploys automatically:

```bash
git revert <bad-commit> && git push origin latest
```

---

## 8. Secondary deployments

These run independently of the Docker deployment and act as fallbacks.

### Host nginx with fallback chain — `nginx/default.conf`

An alternative front door that doesn't use the tunnel. nginx terminates TLS
and proxies to `127.0.0.1:3102`. If the local app returns 429/5xx or is down,
it tries `stats1.pphat.top`, then `stats.pphat.me`, Render, Railway, and
finally returns 503.

Using it requires:
- a DNS **A record** for the domain pointing at the server (instead of the tunnel CNAME);
- ports 80/443 open;
- a Let's Encrypt certificate at the path in the config. It currently
  references `/etc/letsencrypt/live/stats.sophat.top/`; adjust it per server.

```bash
sudo cp nginx/default.conf /etc/nginx/sites-available/github-stats
sudo ln -s /etc/nginx/sites-available/github-stats /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Render — `render.yaml`

Blueprint deploy: **Render → New → Blueprint**, then choose this repo. It runs
`node dist/index.js` (single process). In the Render dashboard, set:
`GITHUB_TOKEN`, `SERVER_SALT`, `APP_ENV=production`, plus either `REDIS_URL`
or `REDIS_ENABLED=false`. Free instances sleep when idle, so the first request
is slow.

### Railway

Connect the repo in Railway. It detects the `Dockerfile` automatically. Set the
same variables as for Render.

### Cloudflare Workers — `wrangler.toml`

```bash
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler deploy                 # production (name: stats)
npx wrangler deploy --env development
```

The worker uses D1 (`stats`) and two KV namespaces, which are already bound in
`wrangler.toml`.

---

## 9. Troubleshooting

Start with these three checks. They tell you which layer is broken:

```bash
docker compose ps                                   # 1. are containers up and healthy?
curl -s http://localhost:3102/health                # 2. does the app answer locally?
curl -sI https://stats.pphat.top/health | head -1   # 3. does it answer publicly?
```

| Symptom | Cause | Fix |
|---|---|---|
| `curl: (7) Failed to connect to localhost port 3102` | No container running, or `app` is crash-looping. | `docker compose ps`, then `docker compose logs --tail=50 app`. |
| App logs: `SERVER_SALT must be at least 16 chars` / `SERVER_SALT is required when APP_ENV=production` | Salt missing or too short. | Set it in `.env` (`openssl rand -hex 32`), then `docker compose up -d --force-recreate app`. |
| App logs: `Invalid environment variables` (another field) | Bad value, e.g. `APP_ENV=prod`. | Fix the named variable. `APP_ENV`/`NODE_ENV` must be `development`, `production` or `test`. |
| `required variable CLOUDFLARED_TUNNEL_TOKEN is missing a value` | Token is empty in `.env`. | Put the real token, or any placeholder, in `.env`. |
| `.env` change has no effect | The container wasn't recreated. | `docker compose up -d --force-recreate`. |
| Public: **Error 1033** (HTTP 530) | DNS points to a tunnel with **no connected `cloudflared`**. | Check `docker compose logs cloudflared`, then use the rows below. |
| `cloudflared`: `Unauthorized: Tunnel not found` | The token belongs to a tunnel that was deleted or recreated. | Get the token of an existing tunnel (Zero Trust → Tunnels → Configure), put it in `.env`, recreate `cloudflared`, and make sure the `stats` DNS record points at **that** tunnel ([4.3](#43-route-statspphattop-to-the-tunnel)). |
| `cloudflared`: `Provided Tunnel token is not valid` | Placeholder or mangled token. | Paste the token again, with no quotes, spaces or line breaks. |
| Public: **empty HTTP 503**; `cloudflared`: `No ingress rules were defined` | Tunnel connected but has no route, and `compose.yaml` lacks the `--url` fallback. | Update `compose.yaml` (`git pull`) and recreate `cloudflared`, or add the Public Hostname in the dashboard ([4.3](#43-route-statspphattop-to-the-tunnel)). |
| Public: **HTTP 502** / Cloudflare "Bad gateway" | Tunnel reaches the container but nothing answers on the target port. | The dashboard route URL must be `localhost:<PORT>`, matching `.env`. Also check `app` is healthy. If `app` was recreated alone, recreate `cloudflared` too. |
| Public: **HTTP 429** | Per-IP rate limit hit. GitHub's image proxy shares a few IPs across all README viewers. | Raise `RATE_LIMIT_STRICT_MAX` / `RATE_LIMIT_MAX` in `.env` and recreate `app`. |
| Deploy job fails at `git pull --ff-only` | The server isn't on `latest`, or tracked files were edited there. | On the server: `git status`; `git checkout -- .` to drop local edits; `git switch latest`. |
| Deploy job: `Host key verification failed` / fingerprint mismatch | `SSH_FINGERPRINT` is wrong, or the server was rebuilt. | Re-run `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` on the server and update the secret. |
| Deploy job: app never healthy | The new version fails to start. | `docker compose logs app` on the server; [roll back](#7-rollback). |
| `unable to open database file` | The `app-data` volume is owned by root, from an older image. | `docker compose down`, then `docker run --rm -v github-stats_app-data:/d alpine chown -R 1000:1000 /d`, then `docker compose up -d`. |
| Badges/cards show stale numbers | Response cache. | Wait for the TTL or clear it: `docker compose exec redis redis-cli FLUSHDB`. |

---

## 10. Security checklist

- [ ] `.env` exists only on the server (it is git-ignored and excluded from the
      image), with permissions `chmod 600 .env`.
- [ ] `SERVER_SALT` is random, at least 32 hex characters, and backed up.
- [ ] No inbound ports open except SSH (`sudo ufw allow OpenSSH && sudo ufw enable`).
      Ports 80/443 are only needed if you use the host nginx.
- [ ] SSH: key-only login (`PasswordAuthentication no`), and the deploy user is
      not root.
- [ ] `SSH_FINGERPRINT` secret set, so deploys verify the host key.
- [ ] The `production` environment has required reviewers if more people can
      push to `latest`.
- [ ] `GITHUB_TOKEN` (the app's) has no scopes beyond what public data needs.
- [ ] The Cloudflare tunnel token has only been shared with this server. If it
      leaks, rotate it in Zero Trust → Tunnels → Configure.

Built into the setup, so nothing to do: the app runs as a non-root user with
all Linux capabilities dropped; port 3102 is bound to loopback only; Redis has
no published port; rate limits are shared across workers; and SVG responses
carry a sandboxing Content-Security-Policy.
