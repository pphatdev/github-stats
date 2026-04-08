# Badges Features

Generate customizable GitHub badges for users and repositories with real-time data, caching, and visual effects.

## Route Pattern

`/badges?username={username}&repo={repo}&name={visitors,total-stars,...}&theme={theme1,theme2,...}&effect={wave|glow}&column={1-50}&size={small|medium|large}&p={0-100}`

## Parameters

### Required

| Parameter | Default | Description |
|-----------|---------|-------------|
| `username` | — | The GitHub username for which to generate badges. |

### Optional

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `repo` | — | — | The repository name for which to generate badges. Format: `repo-name` or `owner/repo-name`. |
| `name` | — | — | Comma-separated badge names to generate (e.g., `visitors,total-stars,repositories`). |
| `theme` | `default` | — | Comma-separated theme(s) to apply to badges (e.g., `default,ocean,galaxy`). |
| `effect` | — | `wave`, `glow` | Animation effect applied to all badges. |
| `column` | `50` | 1-50 | Number of columns for badge grid layout. |
| `size` | `small` | `small`, `medium`, `large` | Badge size multiplier. |
| `p` | `0` | 0-100 | Container padding in pixels around the badge grid. |
| `realtime` | `false` | — | Bypass cache and fetch fresh data (30s cooldown). |

## Supported Badge Types

### User Badges

Fetch GitHub user statistics:

- `visitors` — Unique visitor count (persisted per user)
- `repositories` — Total repositories count
- `followers` — Follower count
- `organization` — Organizations count
- `languages` — Programming languages count
- `total-stars` — Stars received across all repos
- `total-contributors` — Contributors count across all repos
- `total-commits` — Total commits count
- `total-code-reviews` — Code reviews count
- `total-issues` — Issues count
- `total-pull-requests` — Pull requests count
- `total-joined-years` — Years since account creation

### Repository Badges

Fetch GitHub repository statistics:

- `stars` — Repository stars count
- `forks` — Repository forks count
- `contributors` — Repository contributors count
- `issues` — Open issues count
- `pull-requests` — Pull requests count
- `watchers` — Repository watchers count
- `size` — Repository size

## Usage Examples

### Basic User Badge

```
/badges?username=pphatdev&name=visitors
```

### Multiple badges with custom theme

```
/badges?username=pphatdev&name=visitors,total-stars,followers&theme=ocean&column=3&size=medium
```

### Repository badges

```
/badges?username=pphatdev&repo=github-stats&name=stars,forks,contributors&theme=galaxy&effect=wave
```

### With padding and sizing

```
/badges?username=pphatdev&name=visitors,repositories,followers&p=15&size=large&column=2
```

### Multiple themes (one per badge)

```
/badges?username=pphatdev&name=visitors,total-stars,repositories&theme=default,ocean,galaxy&column=1
```

### Fresh data with realtime flag

```
/badges?username=pphatdev&name=total-stars&realtime=true
```

## Response

The API returns an SVG image with combined badges arranged in a grid layout. The response includes appropriate cache headers:

- Default cache: 10 minutes (`max-age=600`)
- Visitor badges: Updated on every request (counter incremented)
- Background refresh: Triggers after 15 seconds of staleness
- Rate-limit protection: 2-minute cooldown per cache key, 30-second cooldown per realtime request

## Performance Notes

- Badges are cached in-memory with 10-minute TTL
- Stale-While-Revalidate (SWR) pattern ensures fast responses with background refresh
- GitHub API calls are deduplicated to prevent rate-limit exhaustion
- Visitor counter increments on every request (database-backed, no API calls)
- Use `realtime=true` to bypass cache (subject to 30s cooldown per cache key)

