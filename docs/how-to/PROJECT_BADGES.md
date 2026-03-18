# Project Badge Routes

These routes provide repository-specific badges that display metrics about a GitHub project. Each badge can be customized with themes and colors for embedding in project READMEs or documentation.

## Overview

Project badges are lightweight SVG components showing specific metrics about a GitHub repository. They're ideal for:
- Project README files
- Repository documentation
- Dependency/contribution tracking
- Project showcases
- Portfolio sites

All project badges require a `repo` parameter in the format: `owner/repository`

---

## Table of Contents
- [GET /project/visitors](#get-projectvisitors---unique-visitors)
- [GET /project/stars](#get-projectstars---repository-stars)
- [GET /project/forks](#get-projectforks---repository-forks)
- [GET /project/watchers](#get-projectwatchers---watchers)
- [GET /project/issues](#get-projectissues---open-issues)
- [GET /project/prs](#get-projectprs---pull-requests)
- [GET /project/contributors](#get-projectcontributors---contributor-count)
- [GET /project/size](#get-projectsize---repository-size)

---

## Common Parameters

All project badge endpoints support these optional parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `theme` | string | `default` | Badge color theme |
| `customLabel` | string | - | Custom label text (replaces default) |
| `labelColor` | string | - | Background color for label (hex) |
| `labelBackground` | string | - | Alternative label background (hex) |
| `valueColor` | string | - | Value text color (hex) |
| `valueBackground` | string | - | Value background color (hex) |

---

## GET /project/visitors - Visitors

Counts visitors for a repository badge endpoint once per same IP every 5 minutes. Refreshes within the same 5-minute window from the same IP do not increment.

### Endpoint
```
GET /project/visitors
```

### Required Parameters

| Parameter | Type | Format | Description |
|-----------|------|--------|-------------|
| `repo` | string | `owner/repository` | Repository identifier |

### Response
**Content-Type:** `image/svg+xml`

Badge showing total unique visits recorded for this repository badge.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/project/visitors?repo=pphatdev/github-stats"
```

#### With Theme
```bash
curl "http://localhost:3000/project/visitors?repo=pphatdev/github-stats&theme=tokyo"
```

### Markdown Embedding
```markdown
![Visitors](https://stats.pphat.top/project/visitors?repo=pphatdev/github-stats)
```

---

## GET /project/stars - Repository Stars

Displays the total number of stars (favorites) the repository has received.

### Endpoint
```
GET /project/stars
```

### Required Parameters

| Parameter | Type | Format | Description |
|-----------|------|--------|-------------|
| `repo` | string | `owner/repository` | Repository identifier |

### Response
**Content-Type:** `image/svg+xml`

Badge showing the star count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/project/stars?repo=pphatdev/github-stats"
```

#### With Theme
```bash
curl "http://localhost:3000/project/stars?repo=pphatdev/github-stats&theme=tokyo"
```

#### Custom Styling
```bash
curl "http://localhost:3000/project/stars?repo=pphatdev/github-stats&customLabel=Favorites&valueColor=%23ffff00"
```

#### With All Custom Colors
```bash
curl "http://localhost:3000/project/stars?repo=pphatdev/github-stats&labelColor=%23000000&valueColor=%23ffffff&valueBackground=%231f2937"
```

### Markdown Embedding
```markdown
![Stars](https://stats.pphat.top/project/stars?repo=pphatdev/github-stats)
```

### HTML Embedding
```html
<img src="https://stats.pphat.top/project/stars?repo=pphatdev/github-stats" alt="Repository Stars">
```

### Caching
- **TTL:** 1 hour
- **Key:** `project:stars:{repo}`
- **Layer:** Redis persistent + In-Memory

---

## GET /project/forks - Repository Forks

Shows the total number of times the repository has been forked.

### Endpoint
```
GET /project/forks
```

### Required Parameters

| Parameter | Type | Format | Description |
|-----------|------|--------|-------------|
| `repo` | string | `owner/repository` | Repository identifier |

### Response
**Content-Type:** `image/svg+xml`

Badge displaying the fork count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/project/forks?repo=pphatdev/github-stats"
```

#### With Theme
```bash
curl "http://localhost:3000/project/forks?repo=pphatdev/github-stats&theme=dracula"
```

#### Custom Label
```bash
curl "http://localhost:3000/project/forks?repo=pphatdev/github-stats&customLabel=Copies"
```

### Markdown Embedding
```markdown
[![Forks](https://stats.pphat.top/project/forks?repo=pphatdev/github-stats)](https://github.com/pphatdev/github-stats/network/members)
```

---

## GET /project/watchers - Watchers

Displays the number of users watching the repository for updates.

### Endpoint
```
GET /project/watchers
```

### Required Parameters

| Parameter | Type | Format | Description |
|-----------|------|--------|-------------|
| `repo` | string | `owner/repository` | Repository identifier |

### Response
**Content-Type:** `image/svg+xml`

Badge showing watcher count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/project/watchers?repo=pphatdev/github-stats"
```

#### With Theme
```bash
curl "http://localhost:3000/project/watchers?repo=pphatdev/github-stats&theme=nord"
```

### Markdown Embedding
```markdown
![Watchers](https://stats.pphat.top/project/watchers?repo=pphatdev/github-stats)
```

---

## GET /project/issues - Open Issues

Shows the total number of open issues in the repository.

### Endpoint
```
GET /project/issues
```

### Required Parameters

| Parameter | Type | Format | Description |
|-----------|------|--------|-------------|
| `repo` | string | `owner/repository` | Repository identifier |

### Response
**Content-Type:** `image/svg+xml`

Badge displaying open issue count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/project/issues?repo=pphatdev/github-stats"
```

#### Custom Styling
```bash
curl "http://localhost:3000/project/issues?repo=pphatdev/github-stats&theme=tokyo&customLabel=Open%20Bugs"
```

#### Link to Issues
```bash
# Create a clickable badge in markdown
[![Issues](https://stats.pphat.top/project/issues?repo=pphatdev/github-stats)](https://github.com/pphatdev/github-stats/issues)
```

### Markdown Embedding
```markdown
![Open Issues](https://stats.pphat.top/project/issues?repo=pphatdev/github-stats&theme=tokyo)
```

---

## GET /project/prs - Pull Requests

Displays the total number of pull requests in the repository.

### Endpoint
```
GET /project/prs
```

### Required Parameters

| Parameter | Type | Format | Description |
|-----------|------|--------|-------------|
| `repo` | string | `owner/repository` | Repository identifier |

### Response
**Content-Type:** `image/svg+xml`

Badge showing pull request count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/project/prs?repo=pphatdev/github-stats"
```

#### With Theme
```bash
curl "http://localhost:3000/project/prs?repo=pphatdev/github-stats&theme=dracula"
```

#### Custom Label
```bash
curl "http://localhost:3000/project/prs?repo=pphatdev/github-stats&customLabel=Contributions"
```

### Markdown Embedding
```markdown
![Pull Requests](https://stats.pphat.top/project/prs?repo=pphatdev/github-stats&theme=tokyo)
```

---

## GET /project/contributors - Contributor Count

Shows the total number of people who have contributed to the repository.

### Endpoint
```
GET /project/contributors
```

### Required Parameters

| Parameter | Type | Format | Description |
|-----------|------|--------|-------------|
| `repo` | string | `owner/repository` | Repository identifier |

### Response
**Content-Type:** `image/svg+xml`

Badge displaying contributor count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/project/contributors?repo=pphatdev/github-stats"
```

#### With Theme and Colors
```bash
curl "http://localhost:3000/project/contributors?repo=pphatdev/github-stats&theme=tokyo&valueColor=%23ff0000"
```

### Markdown Embedding
```markdown
![Contributors](https://stats.pphat.top/project/contributors?repo=pphatdev/github-stats)
```

### Notes
- Counts all contributors including bots
- Includes contributors to all branches
- Updates with each new commit

---

## GET /project/size - Repository Size

Displays the size of the repository on disk.

### Endpoint
```
GET /project/size
```

### Required Parameters

| Parameter | Type | Format | Description |
|-----------|------|--------|-------------|
| `repo` | string | `owner/repository` | Repository identifier |

### Response
**Content-Type:** `image/svg+xml`

Badge showing repository size in KB/MB/GB.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/project/size?repo=pphatdev/github-stats"
```

#### With Theme
```bash
curl "http://localhost:3000/project/size?repo=pphatdev/github-stats&theme=dracula"
```

### Markdown Embedding
```markdown
![Size](https://stats.pphat.top/project/size?repo=pphatdev/github-stats)
```

### Notes
- Shows total size of repository including all history
- Larger repositories will show in MB or GB
- Updates after significant changes

---

## Theme Examples

### Available Themes
- `default` - Standard theme
- `tokyo` - Tokyo Night (dark, purple/pink)
- `dracula` - Dracula (dark, purple/red)
- `nord` - Nord (cool, blue-based)
- `solarized` - Solarized (warm, orange/red)
- And many more...

### Using Themes
```bash
# Tokyo theme
curl "http://localhost:3000/project/stars?repo=pphatdev/github-stats&theme=tokyo"

# Dracula theme
curl "http://localhost:3000/project/forks?repo=pphatdev/github-stats&theme=dracula"

# Nord theme
curl "http://localhost:3000/project/contributors?repo=pphatdev/github-stats&theme=nord"
```

---

## Complete Project README Example

Include multiple project badges in your README:

```markdown
# My Awesome Project

![Stars](https://stats.pphat.top/project/stars?repo=pphatdev/github-stats&theme=tokyo)
![Forks](https://stats.pphat.top/project/forks?repo=pphatdev/github-stats&theme=tokyo)
![Issues](https://stats.pphat.top/project/issues?repo=pphatdev/github-stats&theme=tokyo)
![PRs](https://stats.pphat.top/project/prs?repo=pphatdev/github-stats&theme=tokyo)

## About This Project

This is an amazing project that generates GitHub statistics.

### Statistics

| Metric | Count |
|--------|-------|
| ![Stars](https://stats.pphat.top/project/stars?repo=pphatdev/github-stats) | Stars |
| ![Contributors](https://stats.pphat.top/project/contributors?repo=pphatdev/github-stats) | Contributors |
| ![Size](https://stats.pphat.top/project/size?repo=pphatdev/github-stats) | Repository Size |

## Getting Started

See documentation for more details...
```

---

## Advanced Customization

### Color Hex Codes
Popular colors for badges:

| Color | Hex | Usage |
|-------|-----|-------|
| Black | `%23000000` | Labels, text |
| White | `%23ffffff` | Text, contrast |
| Blue | `%233b82f6` | Primary color |
| Green | `%2310b981` | Success, active |
| Red | `%23ef4444` | Warnings, errors |
| Purple | `%238b5cf6` | Accent, special |
| Yellow | `%23fbbf24` | Warnings, highlights |

### Custom Color Example
```bash
curl "http://localhost:3000/project/stars?repo=pphatdev/github-stats&labelColor=%23000000&valueColor=%23ffffff&valueBackground=%233b82f6"
```

URL-encoded color format: Use `%23` instead of `#`

---

## Caching

All project badge endpoints use intelligent caching:
- **Redis Persistent Cache:** Survives server restarts
- **In-Memory Cache:** Fast request deduplication
- **TTL:** 1 hour by default
- **Database:** SQLite for persistent stats

Check cache status:
```bash
curl "http://localhost:3000/cache/health"
```

---

## Error Handling

Project badge endpoints return:
- `200` - Success
- `400` - Missing or invalid repo parameter
- `404` - Repository not found on GitHub
- `500` - Server error

Error responses include descriptive error messages.

### Common Issues

#### "Repository not found"
- Verify the repo format: `owner/repository`
- Check that the repo is public
- Ensure the repository actually exists on GitHub

#### "Invalid parameter"
- Check your URL encoding
- Verify all required parameters are present
- Ensure hex colors start with `%23` in URLs

---

## Best Practices

### 1. Use Consistent Themes
Apply the same theme to all badges for visual consistency:
```bash
# All badges with Tokyo theme
curl "http://localhost:3000/project/stars?repo=owner/repo&theme=tokyo"
curl "http://localhost:3000/project/forks?repo=owner/repo&theme=tokyo"
```

### 2. Link Badges to Relevant Pages
Make badges clickable by wrapping in markdown links:
```markdown
[![Stars](URL)](https://github.com/owner/repo)
[![Issues](URL)](https://github.com/owner/repo/issues)
[![PRs](URL)](https://github.com/owner/repo/pulls)
```

### 3. Group Related Badges
Organize badges logically in your README:
```markdown
## Project Stats

![Stars](URL) ![Forks](URL) ![Contributors](URL)

## Community

![Issues](URL) ![PRs](URL)
```

### 4. Performance Considerations
- Badges are cached for 1 hour
- Use HTTPS for production deployments
- Consider CDN caching for high traffic

---

## See Also
- [Core Statistics Routes](./CORE_ROUTES.md) - Full stats cards
- [User Badge Routes](./USER_BADGES.md) - User profile badges
- [Cache Monitoring Guide](./CACHE_MONITORING.md) - Performance monitoring
