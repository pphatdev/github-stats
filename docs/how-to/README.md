# GitHub Stats API Documentation

This folder contains comprehensive guides on how to use each API route available in the GitHub Stats application.

## Quick Navigation

### 📊 Core Routes
- **[Core Statistics Routes](./CORE_ROUTES.md)** - Main stats, languages, and graph visualization endpoints

### 👤 User Badges
- **[User Badge Routes](./USER_BADGES.md)** - Personal GitHub statistics badges (visitors, repos, followers, etc.)

### 🧩 Badge Collections
- **[Badge Collections](./BADGE_COLLECTIONS.md)** - Compose multiple user badges into one SVG image

### 📁 Project Badges
- **[Project Badge Routes](./PROJECT_BADGES.md)** - Repository-specific badges (stars, forks, issues, etc.)

### 🎨 Icons & Visual Assets
- **[Release Icons Documentation](../RELEASE/RELEASE_ICONS.md)** - Using icons in releases, changelogs, and READMEs

### 🔧 Monitoring & Health
- **[Cache Monitoring Guide](./CACHE_MONITORING.md)** - Health checks and cache statistics endpoints

### 🛠 Development
- **[Development Guide](./DEVELOPMENT.md)** - Local setup, environment variables, database, and run scripts

### 🧪 Route-by-Route Demos
- **[Route Demo Index](../example/README.md)** - One file per route with demo examples for each option

## Overview

The GitHub Stats API provides multiple endpoints for:

1. **Statistics Rendering** - Generate detailed stats cards and visualizations
2. **Icon Delivery** - List and serve reusable SVG icons with optional recoloring
3. **User Badges** - Create individual badge components for specific metrics
4. **Project Badges** - Repository-specific metric badges
5. **Cache Management** - Monitor cache health and performance

## Base URL

```
http://localhost:3000  (default development)
```

## Common Query Parameters

All endpoints support optional styling parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `theme` | string | `default` | Badge color theme (tokyo, dracula, nord, etc.) |
| `customLabel` | string | - | Custom label text for badges |
| `labelColor` | string | - | Custom color for label background |
| `iconColor` | string | - | Custom color for icons |
| `valueColor` | string | - | Custom color for values |

## Response Formats

Most endpoints return SVG by default. Some support format conversion:

- **SVG** (default) - `?format=svg`
- **WebP** - `?format=webp`
- **PNG** - `?format=png` (some routes only)

## Caching

All endpoints include intelligent caching:

- **Redis Persistent Cache** - Survives server restarts (1min - 2hrs TTL)
- **In-Memory Cache** - Fast local caching layer (600-3600s TTL)
- **Database Cache** - SQLite persistence (2hr max)

## Rate Limiting

- Requests are deduplicated at the service level
- Cache middleware handles request coalescing
- GitHub API calls are optimized to minimize quota usage

## Authentication

Most endpoints use the configured GitHub token for API calls. Some public endpoints may work without authentication with reduced rate limits.

## Examples

### Get User Statistics
```bash
curl "http://localhost:3000/stats?username=pphatdev&theme=tokyo"
```

### Get User Badge
```bash
curl "http://localhost:3000/badge/followers?username=pphatdev&theme=dracula"
```

### Get Project Statistics
```bash
curl "http://localhost:3000/project/stars?repo=pphatdev/github-stats"
```

### Check Cache Health
```bash
curl "http://localhost:3000/cache/health"
```

## Embedded Usage

All SVG responses can be embedded in:

- **Markdown** - `![Stats](https://stats.pphat.top/stats?username=pphatdev)`
- **HTML** - `<img src="https://stats.pphat.top/stats?username=pphatdev" />`
- **README badges** - Works great in GitHub profiles and project READMEs

## Troubleshooting

If an endpoint returns an error:

1. Check cache status: `/cache/health`
2. Verify correct required parameters
3. View cache statistics: `/cache/stats`
4. Check that GitHub token is configured
5. Ensure username/repo format is correct (owner/repo for projects)

## Support

For issues or feature requests, refer to the main project repository documentation.
