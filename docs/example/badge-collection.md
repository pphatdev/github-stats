# GET /badge/collection

Render multiple user badges into one SVG image.

## Route

- /badge/collection?username=pphatdev&type=visitors,total-stars,repositories

## Required Query Params

| Param | Description |
|---|---|
| username | GitHub username |
| type | Comma-separated user badge types |

Supported badge types:

- visitors
- repositories
- organization
- languages
- followers
- total-stars
- total-contributors
- total-commits
- total-code-reviews
- total-issues
- total-pull-requests
- total-joined-years

## Optional Query Params

| Param | Description |
|---|---|
| columns | Number of columns in the grid (default: 1, max: 10) |
| gap | Gap between badges in pixels (default: 8, range: 0-100) |
| theme | Badge theme |
| customLabel | Custom label text (applies to all badges in the collection) |
| labelColor | Label text color |
| labelBackground | Label background color |
| iconColor | Icon color |
| valueColor | Value text color |
| valueBackground | Value background color |

## Basic Examples

Two badges in one SVG:

![badge-collection-basic](https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,total-stars)

Multiple badges with 3 columns:

![badge-collection-columns](https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,repositories,followers,total-stars,total-issues,total-pull-requests&columns=3)

## Layout Examples

Custom columns and gap:

![badge-collection-layout](https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,repositories,followers,total-stars,total-issues,total-pull-requests&columns=2&gap=12)

Single-row layout:

![badge-collection-row](https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,repositories,followers,total-stars,total-issues,total-pull-requests&columns=6)

## Style Examples

Theme:

![badge-collection-theme](https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,total-stars,repositories&theme=ocean)

Custom colors:

![badge-collection-colors](https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,total-stars,repositories&labelBackground=0d1117&labelColor=ffffff&valueBackground=1f2937&valueColor=22c55e)

## Combined Example

Theme + colors + columns + gap:

![badge-collection-combined](https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,repositories,followers,total-stars,total-issues,total-pull-requests&theme=tokyonight&columns=3&gap=10&labelBackground=0d1117&valueBackground=111827)

## Curl Examples

```bash
curl "https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,total-stars"
curl "https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,repositories,followers,total-stars&columns=2"
curl "https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,total-stars,repositories&theme=ocean"
```

## Error Examples

Missing username:

```bash
curl "https://stats.pphat.top/badge/collection?type=visitors,total-stars"
```

Missing type:

```bash
curl "https://stats.pphat.top/badge/collection?username=pphatdev"
```

Invalid type:

```bash
curl "https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,unknown-badge"
```

Invalid columns:

```bash
curl "https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,total-stars&columns=0"
```
