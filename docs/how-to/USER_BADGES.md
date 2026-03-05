# User Badge Routes

These routes provide individual badge components that display specific user metrics. Each badge can be customized with different themes and colors for embedding in profiles, READMEs, or documentation.

## Overview

User badges are lightweight SVG components that show a single metric about a GitHub user. They're perfect for:
- GitHub profile README sections
- Portfolio websites
- Documentation
- Personal project pages

All user badges require a `username` parameter.

---

## Table of Contents
- [GET /badge/visitors](#get-badgevisitors---visitor-count)
- [GET /badge/repositories](#get-badgerepositories---public-repositories)
- [GET /badge/organization](#get-badgeorganization---organization)
- [GET /badge/languages](#get-badgelanguages---language-count)
- [GET /badge/followers](#get-badgefollowers---follower-count)
- [GET /badge/total-stars](#get-badgetotal-stars---total-stars-earned)
- [GET /badge/total-contributors](#get-badgetotal-contributors---total-contributors)
- [GET /badge/total-commits](#get-badgetotal-commits---total-commits)
- [GET /badge/total-code-reviews](#get-badgetotal-code-reviews---code-reviews)
- [GET /badge/total-issues](#get-badgetotal-issues---github-issues)
- [GET /badge/total-pull-requests](#get-badgetotal-pull-requests---pull-requests)
- [GET /badge/total-joined-years](#get-badgetotal-joined-years---years-on-github)

---

## Common Parameters

All badge endpoints support these optional parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `theme` | string | `default` | Badge color theme |
| `customLabel` | string | - | Custom label text (replaces default) |
| `labelColor` | string | - | Background color for label (hex) |
| `labelBackground` | string | - | Alternative label background (hex) |
| `iconColor` | string | - | Icon color (hex) |
| `valueColor` | string | - | Value text color (hex) |
| `valueBackground` | string | - | Value background color (hex) |
| `hideFrame` | boolean | `false` | Hide the frame/container |
| `hideIcon` | boolean | `true` | Hide the badge icon |

---

## GET /badge/visitors - Visitor Count

Displays the total number of unique visitors to the user's stats badge.

### Endpoint
```
GET /badge/visitors
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username |

### Response
**Content-Type:** `image/svg+xml`

Badge showing visitor count to this specific badge endpoint.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/badge/visitors?username=pphatdev"
```

#### With Theme
```bash
curl "http://localhost:3000/badge/visitors?username=pphatdev&theme=tokyo"
```

#### Custom Styling
```bash
curl "http://localhost:3000/badge/visitors?username=pphatdev&customLabel=Profile%20Visits&iconColor=%23ff0000"
```

### Markdown Embedding
```markdown
![Visitors](https://stats.pphat.top/badge/visitors?username=pphatdev&theme=tokyo)
```

### Caching
- **TTL:** Varies by request frequency
- **Key:** `badge:visitors:{username}`
- **Tracked:** In database for analytics

---

## GET /badge/repositories - Public Repositories

Shows the total number of public repositories owned by the user.

### Endpoint
```
GET /badge/repositories
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username |

### Response
**Content-Type:** `image/svg+xml`

Badge displaying total public repository count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/badge/repositories?username=pphatdev"
```

#### With Custom Colors
```bash
curl "http://localhost:3000/badge/repositories?username=pphatdev&labelColor=%23000000&valueColor=%23ffffff"
```

#### With Theme and Icon Visible
```bash
curl "http://localhost:3000/badge/repositories?username=pphatdev&theme=dracula&hideIcon=false"
```

### Markdown Embedding
```markdown
![Public Repos](https://stats.pphat.top/badge/repositories?username=pphatdev)
```

---

## GET /badge/organization - Organization

Displays the user's primary organization affiliation.

### Endpoint
```
GET /badge/organization
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username |

### Response
**Content-Type:** `image/svg+xml`

Badge showing the user's organization name (if available).

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/badge/organization?username=pphatdev"
```

#### With Theme
```bash
curl "http://localhost:3000/badge/organization?username=pphatdev&theme=nord"
```

### Notes
- Returns the primary organization the user is a member of
- If no organization, displays "None" or similar
- Organization must be public to appear

---

## GET /badge/languages - Language Count

Shows the number of unique programming languages used in the user's repositories.

### Endpoint
```
GET /badge/languages
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username |

### Response
**Content-Type:** `image/svg+xml`

Badge displaying unique language count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/badge/languages?username=pphatdev"
```

#### Custom Label
```bash
curl "http://localhost:3000/badge/languages?username=pphatdev&customLabel=Familiar%20Languages"
```

### Markdown Embedding
```markdown
![Languages](https://stats.pphat.top/badge/languages?username=pphatdev)
```

---

## GET /badge/followers - Follower Count

Displays the user's current follower count.

### Endpoint
```
GET /badge/followers
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username |

### Response
**Content-Type:** `image/svg+xml`

Badge showing follower count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/badge/followers?username=pphatdev"
```

#### With Theme
```bash
curl "http://localhost:3000/badge/followers?username=pphatdev&theme=tokyo"
```

#### Custom Styling
```bash
curl "http://localhost:3000/badge/followers?username=pphatdev&customLabel=GitHub%20Followers&valueColor=%23ffffff"
```

### Markdown Embedding
```markdown
![Followers](https://stats.pphat.top/badge/followers?username=pphatdev&theme=tokyo)
```

---

## GET /badge/total-stars - Total Stars Earned

Shows the total number of stars earned across all user repositories.

### Endpoint
```
GET /badge/total-stars
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username |

### Response
**Content-Type:** `image/svg+xml`

Badge displaying cumulative star count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/badge/total-stars?username=pphatdev"
```

#### With Theme and Colors
```bash
curl "http://localhost:3000/badge/total-stars?username=pphatdev&theme=dracula&valueColor=%23ffff00"
```

### Markdown Embedding
```markdown
![Total Stars](https://stats.pphat.top/badge/total-stars?username=pphatdev&theme=tokyo)
```

---

## GET /badge/total-contributors - Total Contributors

Shows the total number of people who have contributed to the user's repositories.

### Endpoint
```
GET /badge/total-contributors
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username |

### Response
**Content-Type:** `image/svg+xml`

Badge displaying total contributor count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/badge/total-contributors?username=pphatdev"
```

#### With Theme
```bash
curl "http://localhost:3000/badge/total-contributors?username=pphatdev&theme=nord"
```

---

## GET /badge/total-commits - Total Commits

Displays the user's total commits across all repositories.

### Endpoint
```
GET /badge/total-commits
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username |

### Response
**Content-Type:** `image/svg+xml`

Badge showing cumulative commit count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/badge/total-commits?username=pphatdev"
```

#### Custom Label
```bash
curl "http://localhost:3000/badge/total-commits?username=pphatdev&customLabel=My%20Commits"
```

### Markdown Embedding
```markdown
![Total Commits](https://stats.pphat.top/badge/total-commits?username=pphatdev)
```

---

## GET /badge/total-code-reviews - Code Reviews

Shows the total number of code review comments made by the user.

### Endpoint
```
GET /badge/total-code-reviews
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username |

### Response
**Content-Type:** `image/svg+xml`

Badge displaying code review count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/badge/total-code-reviews?username=pphatdev"
```

#### With Theme
```bash
curl "http://localhost:3000/badge/total-code-reviews?username=pphatdev&theme=tokyo"
```

---

## GET /badge/total-issues - GitHub Issues

Displays the total number of issues created by the user.

### Endpoint
```
GET /badge/total-issues
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username |

### Response
**Content-Type:** `image/svg+xml`

Badge showing issue count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/badge/total-issues?username=pphatdev"
```

---

## GET /badge/total-pull-requests - Pull Requests

Shows the total number of pull requests created by the user.

### Endpoint
```
GET /badge/total-pull-requests
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username |

### Response
**Content-Type:** `image/svg+xml`

Badge displaying pull request count.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/badge/total-pull-requests?username=pphatdev"
```

#### With Theme
```bash
curl "http://localhost:3000/badge/total-pull-requests?username=pphatdev&theme=dracula&hideIcon=false"
```

### Markdown Embedding
```markdown
![Pull Requests](https://stats.pphat.top/badge/total-pull-requests?username=pphatdev&theme=tokyo)
```

---

## GET /badge/total-joined-years - Years on GitHub

Displays how many years the user has been active on GitHub.

### Endpoint
```
GET /badge/total-joined-years
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username |

### Response
**Content-Type:** `image/svg+xml`

Badge showing years since account creation.

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/badge/total-joined-years?username=pphatdev"
```

#### Custom Label
```bash
curl "http://localhost:3000/badge/total-joined-years?username=pphatdev&customLabel=GitHub%20Member%20For"
```

---

## Theme Examples

### Available Themes
All badges support multiple themes. Common themes include:
- `default` - Standard theme
- `tokyo` - Tokyo Night (dark, purple/pink)
- `dracula` - Dracula (dark, purple/red)
- `nord` - Nord (cool, blue-based)
- `solarized` - Solarized (warm, orange/red)
- And more...

### Theme Usage
```bash
# Tokyo theme
curl "http://localhost:3000/badge/followers?username=pphatdev&theme=tokyo"

# Dracula theme
curl "http://localhost:3000/badge/total-stars?username=pphatdev&theme=dracula"
```

---

## Complete Profile Example

Create a profile with multiple badges:

```markdown
# Welcome to My Profile! 👋

![Visitors](https://stats.pphat.top/badge/visitors?username=pphatdev&theme=tokyo)
![Followers](https://stats.pphat.top/badge/followers?username=pphatdev&theme=tokyo)
![Total Stars](https://stats.pphat.top/badge/total-stars?username=pphatdev&theme=tokyo)

## My Statistics

![GitHub Stats](https://stats.pphat.top/stats?username=pphatdev&theme=tokyo)

## Quick Stats

- ![Repos](https://stats.pphat.top/badge/repositories?username=pphatdev) Public Repositories
- ![Languages](https://stats.pphat.top/badge/languages?username=pphatdev) Programming Languages
- ![Commits](https://stats.pphat.top/badge/total-commits?username=pphatdev) Total Commits
- ![PRs](https://stats.pphat.top/badge/total-pull-requests?username=pphatdev) Pull Requests
```

---

## Caching

All badge endpoints include intelligent caching:
- **Redis Layer:** Persistent cache (survives restarts)
- **In-Memory Layer:** Fast request deduplication
- **TTL:** Typically 1-2 hours depending on metric
- **Database:** SQLite persistence for historical tracking

For cache status, check:
```bash
curl "http://localhost:3000/cache/health"
```

---

## Error Handling

Badge endpoints return:
- `200` - Success
- `400` - Missing or invalid username
- `404` - User not found on GitHub
- `500` - Server error

All errors include error information in the response.

---

## See Also
- [Core Statistics Routes](./CORE_ROUTES.md) - Full stats cards
- [Project Badge Routes](./PROJECT_BADGES.md) - Repository badges
- [Cache Monitoring Guide](./CACHE_MONITORING.md) - Performance and health checks
