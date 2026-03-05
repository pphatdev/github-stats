# Core Statistics Routes

These routes provide comprehensive GitHub user statistics visualizations including stats cards, language breakdowns, and contribution graphs.

## Table of Contents
- [GET /stats](#get-stats-user-statistics-card)
- [GET /languages](#get-languages-language-breakdown)
- [GET /graph](#get-graph-contribution-graph)

---

## GET /stats - User Statistics Card

Generates a detailed GitHub user statistics card displaying various metrics and achievements.

### Endpoint
```
GET /stats
```

### Required Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `username` | string | GitHub username | `pphatdev` |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `theme` | string | `default` | Color theme for the card |
| `hide_title` | boolean | `false` | Hide the title section |
| `hide_border` | boolean | `false` | Hide the border |
| `hide_rank` | boolean | `false` | Hide the rank badge |
| `show_icons` | boolean | `true` | Display icons next to metrics |
| `avatar_mode` | string | `none` | Avatar display mode (`none`, `avatar`, `github`) |
| `custom_title` | string | - | Custom title text |
| `data_border_style` | string | `solid` | Border style (`solid`, `dashed`) |
| `data_border_frame` | string | `out` | Border frame position (`in`, `out`) |
| `bgColor` | string | - | Custom background color (hex) |
| `borderColor` | string | - | Custom border color (hex) |
| `textColor` | string | - | Custom text color (hex) |
| `titleColor` | string | - | Custom title color (hex) |
| `format` | string | `svg` | Output format (`svg`, `webp`) |

### Response
**Content-Type:** `image/svg+xml` or `image/webp`

Returns an SVG image containing:
- User avatar (if avatar_mode enabled)
- Username and rank badge
- Total contributions
- Repositories count
- Followers count
- GitHub join date
- Customizable theme colors

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/stats?username=pphatdev"
```

#### With Theme
```bash
curl "http://localhost:3000/stats?username=pphatdev&theme=tokyo"
```

#### With Customization
```bash
curl "http://localhost:3000/stats?username=pphatdev&theme=dracula&hide_rank=true&show_icons=true&avatar_mode=avatar"
```

#### With Custom Colors
```bash
curl "http://localhost:3000/stats?username=pphatdev&bgColor=%23ffffff&textColor=%23000000&titleColor=%23ff0000"
```

#### WebP Format
```bash
curl "http://localhost:3000/stats?username=pphatdev&format=webp"
```

### Markdown Embedding
```markdown
![GitHub Stats](https://stats.pphat.top/stats?username=pphatdev&theme=tokyo)
```

### Available Themes
- `default` - Default theme
- `tokyo` - Tokyo Night theme
- `dracula` - Dracula theme
- `nord` - Nord theme
- And many more...

### Caching
- **TTL:** 1 hour (configurable)
- **Key:** `stats:{username}:{params_hash}`
- **Layer:** Redis persistent + In-Memory

---

## GET /languages - Language Breakdown

Returns a visualization of programming languages used across a user's repositories.

### Endpoint
```
GET /languages
```

### Required Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `username` | string | GitHub username | `pphatdev` |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `theme` | string | `default` | Color theme |
| `hide_border` | boolean | `false` | Hide the border |
| `langs_count` | number | `8` | Number of languages to display |
| `hide_rank` | boolean | `false` | Hide rank badge |
| `customLabel` | string | - | Custom label text |
| `bgColor` | string | - | Custom background color (hex) |

### Response
**Content-Type:** `image/svg+xml`

Returns an SVG showing:
- Top programming languages
- Usage percentages
- Color-coded language indicators
- Customizable layout and colors

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/languages?username=pphatdev"
```

#### With Custom Count
```bash
curl "http://localhost:3000/languages?username=pphatdev&langs_count=10"
```

#### With Theme and Customization
```bash
curl "http://localhost:3000/languages?username=pphatdev&theme=nord&customLabel=Top%20Languages"
```

### Markdown Embedding
```markdown
![Top Languages](https://stats.pphat.top/languages?username=pphatdev&theme=tokyo)
```

### Caching
- **TTL:** 1.5 hours (configurable)
- **Key:** `languages:{username}`
- **Layer:** Redis persistent + In-Memory

---

## GET /graph - Contribution Graph

Displays a GitHub-like contribution graph visualization for a specific time period.

### Endpoint
```
GET /graph
```

### Required Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `username` | string | GitHub username | `pphatdev` |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `theme` | string | `default` | Color theme |
| `format` | string | `svg` | Output format (`svg`, `png`, `webp`) |
| `as` | string | `svg` | Alternative format param (`svg`, `png`, `webp`) |
| `year` | number | current | Year to display contributions for |
| `hide_border` | boolean | `false` | Hide the border |
| `hide_title` | boolean | `false` | Hide the title |
| `custom_title` | string | - | Custom title text |

### Response
**Content-Type:** `image/svg+xml`, `image/png`, or `image/webp`

Returns a visualization showing:
- Weekly contribution calendar grid
- Color intensity based on contribution count
- Contribution statistics
- Customizable themes and labels

### Examples

#### Basic Usage
```bash
curl "http://localhost:3000/graph?username=pphatdev"
```

#### SVG Format
```bash
curl "http://localhost:3000/graph?username=pphatdev&format=svg&theme=tokyo"
```

#### PNG Format
```bash
curl "http://localhost:3000/graph?username=pphatdev&format=png"
```

#### Specific Year
```bash
curl "http://localhost:3000/graph?username=pphatdev&year=2023"
```

#### Custom Title
```bash
curl "http://localhost:3000/graph?username=pphatdev&custom_title=My%20Contributions&theme=dracula"
```

### Markdown Embedding
```markdown
![Contribution Graph](https://stats.pphat.top/graph?username=pphatdev&theme=tokyo&format=svg)
```

### Caching
- **TTL:** 2 hours (configurable)
- **Key:** `graph:{username}:{params_hash}`
- **Layer:** Redis persistent + In-Memory

---

## General Notes

### Error Handling
All core routes return appropriate HTTP status codes:
- `200` - Success
- `400` - Missing or invalid required parameters
- `404` - User not found
- `500` - Server error (check `/cache/health`)

### Response Headers
```
Content-Type: image/svg+xml (or configured format)
Cache-Control: public, max-age=3600
```

### Performance Optimization
- Requests are automatically deduplicated while processing
- Multiple identical requests are coalesced into one API call
- Cache middleware handles response caching transparently
- WebP/PNG conversion uses sharp library for optimal compression

### Rate Limiting Notes
- GitHub API calls are optimized to minimize quotas
- All responses are cached to prevent duplicate API calls
- Cache warming can pre-populate frequently accessed stats

### Access from Different Platforms

#### GitHub Profile README
```markdown
![Stats](https://stats.pphat.top/stats?username=yourname&theme=tokyo)
```

#### LinkedIn Profile
Embed as image URL in profile

#### Portfolio Website
```html
<img src="https://stats.pphat.top/stats?username=yourname" alt="GitHub Stats">
```

#### Discord
Share as image URL in messages

---

## Troubleshooting

### No Data Returned
1. Verify the username exists on GitHub
2. Check if the account is public
3. Verify GitHub token has sufficient permissions

### Cache Issues
Check cache status:
```bash
curl "http://localhost:3000/cache/health"
```

### Styling Issues
- Ensure theme name is valid
- Verify hex colors are properly URL-encoded
- Test with basic theme first

### Timeout Issues
These routes may timeout for users with:
- Very large number of repositories
- Complex contribution history
- High API latency

Consider increasing cache TTL or investigating Redis connection.

---

## See Also
- [User Badge Routes](./USER_BADGES.md) - Individual badge endpoints
- [Project Badge Routes](./PROJECT_BADGES.md) - Repository-specific badges
- [Cache Monitoring Guide](./CACHE_MONITORING.md) - Health and performance checks
