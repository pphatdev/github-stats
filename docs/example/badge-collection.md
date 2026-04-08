# GET /badges

Render one or more badges into a single SVG image.

## Route

- `/badges?username=pphatdev&name=visitors,total-stars,repositories`

## Required Query Params

| Param | Description |
|---|---|
| `username` | GitHub username |

## Optional Query Params

| Param | Description |
|---|---|
| `repo` | Repository name for repo-level badges |
| `name` | Comma-separated badge names |
| `theme` | One or more comma-separated themes, cycled across badges |
| `effect` | `wave` or `glow` |
| `column` | Number of columns in the grid (`1-50`) |
| `size` | `small`, `medium`, or `large` |
| `customLabel` | Custom label text applied to all badges |
| `labelColor` | Label text color |
| `labelBackground` | Label background color |
| `iconColor` | Icon color |
| `valueColor` | Value text color |
| `valueBackground` | Value background color |

## Basic Examples

Two badges in one SVG:

![badge-collection-basic](https://stats.pphat.top/badges?username=pphatdev&name=visitors,total-stars)

Multiple badges with 3 columns:

![badge-collection-columns](https://stats.pphat.top/badges?username=pphatdev&name=visitors,repositories,followers,total-stars,total-issues,total-pull-requests&column=3)

## Layout Examples

Custom columns:

![badge-collection-layout](https://stats.pphat.top/badges?username=pphatdev&name=visitors,repositories,followers,total-stars,total-issues,total-pull-requests&column=2)

Single-row layout:

![badge-collection-row](https://stats.pphat.top/badges?username=pphatdev&name=visitors,repositories,followers,total-stars,total-issues,total-pull-requests&column=6)

Large size preset:

![badge-collection-large](https://stats.pphat.top/badges?username=pphatdev&name=visitors,total-stars,repositories&size=large)

## Style Examples

Theme cycling:

![badge-collection-theme](https://stats.pphat.top/badges?username=pphatdev&name=visitors,total-stars,repositories&theme=ocean,aurora)

Glow effect:

![badge-collection-glow](https://stats.pphat.top/badges?username=pphatdev&name=visitors,total-stars,repositories&effect=glow)

Wave effect:

![badge-collection-wave](https://stats.pphat.top/badges?username=pphatdev&name=visitors,total-stars,repositories&effect=wave)

Custom colors:

![badge-collection-colors](https://stats.pphat.top/badges?username=pphatdev&name=visitors,total-stars,repositories&labelBackground=0d1117&labelColor=ffffff&valueBackground=1f2937&valueColor=22c55e)

## Mixed User + Repo Example

![badge-collection-mixed](https://stats.pphat.top/badges?username=pphatdev&repo=github-stats&name=visitors,total-stars,stars,forks&column=2&theme=galaxy,ocean)

## Curl Examples

```bash
curl "https://stats.pphat.top/badges?username=pphatdev&name=visitors,total-stars"
curl "https://stats.pphat.top/badges?username=pphatdev&name=visitors,repositories,followers,total-stars&column=2"
curl "https://stats.pphat.top/badges?username=pphatdev&repo=github-stats&name=visitors,stars,forks&theme=ocean,aurora&effect=glow"
```

## Error Examples

Missing username:

```bash
curl "https://stats.pphat.top/badges?name=visitors,total-stars"
```

Missing repo for repo badge:

```bash
curl "https://stats.pphat.top/badges?username=pphatdev&name=stars,forks"
```

Invalid name:

```bash
curl "https://stats.pphat.top/badges?username=pphatdev&name=visitors,unknown-badge"
```
