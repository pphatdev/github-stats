# GitHub Stats API

Self-hosted API that renders GitHub stats cards, language charts,
contribution graphs, badges and icons as SVG, ready to embed in a README.

![stats](https://stats.pphat.top/stats?username=pphatdev&theme=tokyonight&avatar_mode=radar)

- **Source and full docs:** https://github.com/pphatdev/github-stats
- **Live instance:** https://stats.pphat.top
- **Also on GHCR:** `ghcr.io/pphatdev/github-stats`

## Tags

| Tag | Meaning |
|---|---|
| `latest` | Latest stable build of the `latest` branch or the newest release |
| `X.Y.Z` | A released version, e.g. `2.2.0`. Never changes once published. |
| `X.Y` | Newest patch release of that minor version |
| `sha-<commit>` | Exact build of one commit |

Pin `X.Y.Z` in production. Images are `linux/amd64`.

## Quick start

```bash
docker run -d --name github-stats \
  -p 127.0.0.1:3000:3000 \
  -e SERVER_SALT="$(openssl rand -hex 32)" \
  -e GITHUB_TOKEN="ghp_..." \
  -e REDIS_ENABLED=false \
  -v github-stats-data:/app/data \
  pphatdev/github-stats:latest

curl http://localhost:3000/health
```

Then open:

- `http://localhost:3000/stats?username=<github-user>`
- `http://localhost:3000/languages?username=<github-user>`
- `http://localhost:3000/graph?username=<github-user>`
- `http://localhost:3000/badges?username=<github-user>&repo=<repo>&name=visitors,forks`

## Docker Compose (with Redis)

Redis shares the cache and rate limits across all worker processes.

```yaml
services:
  app:
    image: pphatdev/github-stats:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      SERVER_SALT: ${SERVER_SALT}     # required, e.g. `openssl rand -hex 32`
      GITHUB_TOKEN: ${GITHUB_TOKEN}   # recommended
      REDIS_ENABLED: "true"
      REDIS_HOST: redis
      REDIS_PORT: 6379
    volumes:
      - app-data:/app/data
    depends_on:
      - redis
    cap_drop: [ALL]
    security_opt: ["no-new-privileges:true"]

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data

volumes:
  app-data:
  redis-data:
```

```bash
docker compose up -d
docker compose ps        # wait until app is "healthy"
```

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `SERVER_SALT` | **Yes** | – | At least 16 characters. The image runs in production mode and won't start without it. |
| `GITHUB_TOKEN` | Recommended | – | Without it GitHub allows only 60 API requests per hour. A token with no scopes is enough for public data. |
| `PORT` | No | `3000` | Port inside the container. |
| `WORKERS` | No | `0` | Cluster workers; `0` means one per CPU. |
| `REDIS_ENABLED` | No | `true` | Set `false` to run without Redis (cache and limits per worker, in memory). |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_URL` | When Redis is enabled | port `6379` | Redis connection. Also `REDIS_PASSWORD`, `REDIS_TLS`, `REDIS_DB`. |
| `RATE_LIMIT_MAX` | No | `1000` | Requests per IP per 15 minutes. |
| `RATE_LIMIT_STRICT_MAX` | No | `120` | Requests per IP per minute on card routes. README images come through GitHub's image proxy, so keep this generous. |
| `DATABASE_PROVIDER` | No | `sqlite` | `sqlite` (stored in `/app/data`) or `cloudflare` (D1, needs `CLOUDFLARE_*`). |
| `WARMUP_USERNAME` | No | – | GitHub user whose cards are pre-rendered at startup. |

## Volumes, ports and health

- **`/app/data`:** SQLite database. Mount a volume or the data is lost when
  the container is removed.
- **Port `3000`:** HTTP, no TLS. Put it behind a reverse proxy or Cloudflare
  Tunnel; don't expose it directly.
- **Health check:** built in, on `GET /health`.

## About the image

- Node 24 LTS on Alpine, running as the non-root `node` user (UID 1000).
- No package manager, compiler or system OpenSSL in the runtime image (Node
  bundles its own OpenSSL), which keeps the attack surface and CVE count low.
- To debug: `docker exec -it github-stats sh` (busybox) or `node`.

## Links

- Docker guide: https://github.com/pphatdev/github-stats/blob/latest/docs/docker-build.md
- Deployment guide: https://github.com/pphatdev/github-stats/blob/latest/docs/DEPLOYMENT.md
- Issues: https://github.com/pphatdev/github-stats/issues
- License: https://github.com/pphatdev/github-stats/blob/latest/LICENSE
