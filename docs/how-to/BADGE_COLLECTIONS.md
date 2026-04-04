# Badge Collections

This guide explains how to combine multiple user badges into a single SVG using the badge collection endpoint.

## Overview

Badge collections are useful when you want one compact image instead of many separate badge URLs.

Use cases:
- GitHub profile README blocks
- Documentation hero sections
- Project landing pages
- Release notes snapshots

---

## Endpoint

```http
GET /badge/collection
```

Base demo URL:

```text
https://stats.pphat.top/badge/collection
```

---

## Required Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `username` | string | GitHub username |
| `type` | string | Comma-separated user badge types |

Supported badge types:
- `visitors`
- `repositories`
- `organization`
- `languages`
- `followers`
- `total-stars`
- `total-contributors`
- `total-commits`
- `total-code-reviews`
- `total-issues`
- `total-pull-requests`
- `total-joined-years`

---

## Optional Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `columns` | integer | `50` | Grid column count (`1` to `50`) |
| `gap` | integer | `5` | Space between badges in pixels (`0` to `100`) |
| `theme` | string | `default` | Theme name |
| `customLabel` | string | - | Override label text for all badges in the collection |
| `labelColor` | string | - | Label text color |
| `labelBackground` | string | - | Label background color |
| `iconColor` | string | - | Icon color |
| `valueColor` | string | - | Value text color |
| `valueBackground` | string | - | Value background color |

---

## Basic Usage

### 1) Minimal request

```bash
curl "https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,total-stars"
```

Preview:

![badge-collection-basic](https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,total-stars)

### 2) Set explicit columns

```bash
curl "https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,repositories,followers,total-stars&columns=2"
```

Preview:

![badge-collection-columns](https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,repositories,followers,total-stars&columns=2)

### 3) Add spacing with gap

```bash
curl "https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,repositories,followers,total-stars&columns=2&gap=12"
```

Preview:

![badge-collection-gap](https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,repositories,followers,total-stars&columns=2&gap=12)

---

## Styling Examples

### Theme

![badge-collection-theme](https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,total-stars,repositories&theme=ocean)

### Custom colors

![badge-collection-colors](https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,total-stars,repositories&labelBackground=0d1117&labelColor=ffffff&valueBackground=1f2937&valueColor=22c55e)

### Custom label applied to all badges

![badge-collection-custom-label](https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,total-stars,repositories&customLabel=My%20Stats)

---

## Embedding

### Markdown

```markdown
![My Badge Collection](https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,repositories,followers,total-stars&columns=2)
```

### HTML

```html
<img src="https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,repositories,followers,total-stars&columns=2" alt="My Badge Collection" />
```

---

## Error Cases

### Missing `username`

```bash
curl "https://stats.pphat.top/badge/collection?type=visitors,total-stars"
```

### Missing `type`

```bash
curl "https://stats.pphat.top/badge/collection?username=pphatdev"
```

### Invalid `type`

```bash
curl "https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,unknown"
```

### Invalid `columns`

```bash
curl "https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,total-stars&columns=0"
```

### Invalid `gap`

```bash
curl "https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,total-stars&gap=500"
```

---

## Notes

- The `visitors` badge in collection mode is read-only and does not increment visitor count.
- Collection responses are served as `image/svg+xml` with ETag and cache headers.
- Badge IDs are scoped internally to prevent SVG filter/clip-path collisions.
