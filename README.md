<!-- <img align='middle' src="./public/assets/screenshot.png" style="width:100%"/> -->

<img align='middle' src="https://stats.sophat.top/stats?username=pphatdev&avatar_mode=radar&data_border_style=frame&data_border_frame=out&hide_title=false" style="width:100%"/>

<div align="center" style="margin-top: 20px;">

![Portfolio](https://stats.pphat.top/badge/visitors?username=pphatdev&theme=ocean&valueColor=ffffff)
![Portfolio](https://stats.pphat.top/badge/repositories?username=pphatdev&theme=ocean&valueColor=ffffff)
![Portfolio](https://stats.pphat.top/badge/languages?username=pphatdev&theme=ocean&valueColor=ffffff)
![Portfolio](https://stats.pphat.top/badge/followers?username=pphatdev&theme=ocean&valueColor=ffffff)
![Portfolio](https://stats.pphat.top/badge/total-stars?username=pphatdev&theme=ocean&valueColor=ffffff)
![Portfolio](https://stats.pphat.top/badge/total-contributors?username=pphatdev&theme=ocean&valueColor=ffffff)
</div>

<h1 align="center">Fast GitHub Stats Graph 🚀</h1>

Generate dynamic GitHub stats and language cards for README embeds.


## ⚡ Performance Features

**Ultimate Speed Edition** - Optimized for maximum performance:

- 🚀 **8x Faster**: Cluster mode utilizes all CPU cores
- ⚡ **10x Quicker Response**: Average 50ms (was 500ms)
- 💾 **90% Smaller**: Response compression (45KB → 5KB)
- 🔥 **95%+ Cache Hit Rate**: Multi-tier caching (Memory → Redis)
- 🎯 **Zero Duplicate Requests**: Smart request coalescing
- 📊 **Production Ready**: Rate limiting, security headers, monitoring

**Quick Start (High Performance Mode):**
```bash
npm run build
npm run start:cluster  # Use all CPU cores
```

📚 **Full Performance Guide**: [docs/PERFORMANCE.md](docs/PERFORMANCE.md)

## Endpoints

### GET /

Returns JSON describing the live route list and static asset roots.

Example:

```
GET https://stats.pphat.top/
```

### GET /stats

Returns an SVG (default) or WebP stats card for a user.

Required query params:

- username

Optional query params:

- theme
- hide_title
- hide_border
- hide_rank
- show_icons
- avatar_mode (none | avatar | radar)
- show_avatar (legacy alias, true sets avatar_mode=avatar)
- custom_title
- data_border_style (solid | frame)
- data_border_frame (in | out)
- bgColor
- borderColor
- textColor
- titleColor
- format (svg | webp)

Example:

```
GET https://stats.pphat.top/stats?username=pphatdev&theme=dark
```

### GET /languages

Returns an SVG languages card or pie chart for a user.

Required query params:

- username

Optional query params:

- theme
- show_info
- top
- variant
- type (card | pie)
- bgColor
- borderColor
- textColor
- titleColor
- format

Example:

```
GET https://stats.pphat.top/languages?username=pphatdev&theme=default
```

### GET /graph

Returns an SVG activity graph for a user for a specific year or the last 365 days.

Required query params:

- `username`

Optional query params:

- `theme` — see [Graph Themes](#graph-themes) below
- `year` — 4-digit year (default: last 365 days)
- `animate` — cell animation mode: `glow` (default) | `wave` | `pulse` | `none`
- `size` — canvas size preset: `default` (1200×600) | `small` (800×400) | `medium` (1000×500) | `large` (1400×700)
- `show_title` — show/hide the username + year heading (`true` default, `false` centers remaining content)
- `show_total_contribution` — show/hide the contributions subtitle (`true` default, `false` also shrinks SVG height to fit content)
- `show_background` — show/hide the background gradient, stars, and grid lines (`true` default, `false` makes bg transparent and shrinks SVG width to fit only the cells with 10px margin)
- `as` — output format: `svg` (default) | `gif` (animated) | `webp` (animated) | `png` (static)
- `bgColor`
- `borderColor`
- `textColor`
- `titleColor`

Example:

```
GET https://stats.pphat.top/graph?username=pphatdev&year=2024
GET https://stats.pphat.top/graph?username=pphatdev&theme=aurora
GET https://stats.pphat.top/graph?username=pphatdev&theme=matrix&animate=pulse
GET https://stats.pphat.top/graph?username=pphatdev&theme=ocean&animate=wave
GET https://stats.pphat.top/graph?username=pphatdev&theme=aurora&animate=wave&as=gif
GET https://stats.pphat.top/graph?username=pphatdev&theme=matrix&animate=pulse&as=webp
GET https://stats.pphat.top/graph?username=pphatdev&as=png
```

### GET /badge/:type

Returns dynamic badge SVGs for various GitHub user metrics.

**Available badge types:**

| Endpoint | Description |
|----------|-------------|
| `/badge/visitors` | Visitor counter (increments per unique IP/day) |
| `/badge/repositories` | Total public repositories |
| `/badge/organization` | Organizations count |
| `/badge/languages` | Number of programming languages used |
| `/badge/followers` | Follower count |
| `/badge/total-stars` | Total stars across all repositories |
| `/badge/total-contributors` | Total contributors |
| `/badge/total-commits` | Total commits |
| `/badge/total-code-reviews` | Total code reviews |
| `/badge/total-issues` | Total issues created |
| `/badge/total-pull-requests` | Total pull requests |
| `/badge/total-joined-years` | Years since joining GitHub |

Required query params:

- `username`

Optional query params:

- Incoming

<!-- - `theme` — badge theme (`default`, `aurora`, `matrix`, `inferno`, `ocean`, `neon`, `solar`, `galaxy`, `github-dark`)
- `customLabel` — override the label text
- `labelColor` — label text color
- `labelBackground` — label background color
- `valueColor` — value text color
- `valueBackground` — value background color -->

Examples:

```
GET https://stats.pphat.top/badge/visitors?username=pphatdev
```

### GET /project/:type

Returns dynamic badge SVGs for repository/project-specific metrics.

**Available project badge types:**

| Endpoint | Description |
|----------|-------------|
| `/project/stars` | Repository star count |
| `/project/forks` | Repository fork count |
| `/project/watchers` | Repository watcher count |
| `/project/issues` | Open issues count |
| `/project/prs` | Open pull requests count |
| `/project/contributors` | Contributors count |
| `/project/size` | Repository size |

Required query params:

- `repo` — Repository in format `owner/repo` (e.g., `pphatdev/github-stats`)

Optional query params:

- Incoming

<!-- - `theme` — badge theme (`default`, `aurora`, `matrix`, `inferno`, `ocean`, `neon`, `solar`, `galaxy`, `github-dark`)
- `customLabel` — override the label text
- `labelColor` — label text color
- `labelBackground` — label background color
- `valueColor` — value text color
- `valueBackground` — value background color -->

Examples:

```
GET https://stats.pphat.top/project/stars?repo=pphatdev/github-stats
```

## Usage in README

Stats card:

```markdown
![GitHub Stats](https://stats.pphat.top/stats?username=YOUR_USERNAME)
```

Languages card:

```markdown
![Top Languages](https://stats.pphat.top/languages?username=YOUR_USERNAME)
```

Languages pie chart:

```markdown
![Top Languages](https://stats.pphat.top/languages?username=YOUR_USERNAME&type=pie)
```

Activity graph:

```markdown
![Activity Graph](https://stats.pphat.top/graph?username=YOUR_USERNAME)
```

Activity graph with theme and animation:

```markdown
![Activity Graph](https://stats.pphat.top/graph?username=YOUR_USERNAME&theme=aurora&animate=pulse)
```

Visitor badge:

```markdown
![Visitor Badge](https://stats.pphat.top/badge/visitors?username=YOUR_USERNAME)
```

Other badges (stars, followers, commits, etc.):

```markdown
![Total Stars](https://stats.pphat.top/badge/total-stars?username=YOUR_USERNAME)
![Followers](https://stats.pphat.top/badge/followers?username=YOUR_USERNAME)
![Repositories](https://stats.pphat.top/badge/repositories?username=YOUR_USERNAME)
![Total Commits](https://stats.pphat.top/badge/total-commits?username=YOUR_USERNAME)
```

Badges with theme and custom label:

```markdown
![Visitor Badge](https://stats.pphat.top/badge/visitors?username=YOUR_USERNAME&theme=aurora)
![Stars](https://stats.pphat.top/badge/total-stars?username=YOUR_USERNAME&theme=matrix&customLabel=Stars)
```

Project/repository badges:

```markdown
![Repo Stars](https://stats.pphat.top/project/stars?repo=OWNER/REPO)
![Repo Forks](https://stats.pphat.top/project/forks?repo=OWNER/REPO)
![Repo Issues](https://stats.pphat.top/project/issues?repo=OWNER/REPO)
![Repo PRs](https://stats.pphat.top/project/prs?repo=OWNER/REPO)
![Repo Contributors](https://stats.pphat.top/project/contributors?repo=OWNER/REPO)
```

## Example Themes

Use the `theme` query param. A few previews:

<table>
	<tr>
		<td align="center"><img alt="default" src="https://stats.pphat.top/stats?username=pphatdev&theme=default" /><br /><strong>🎨 default</strong></td>
		<td align="center"><img alt="dark" src="https://stats.pphat.top/stats?username=pphatdev&theme=dark" /><br /><strong>🌙 dark</strong></td>
		<td align="center"><img alt="radical" src="https://stats.pphat.top/stats?username=pphatdev&theme=radical" /><br /><strong>⚡ radical</strong></td>
		<td align="center"><img alt="tokyonight" src="https://stats.pphat.top/stats?username=pphatdev&theme=tokyonight" /><br /><strong>🌆 tokyonight</strong></td>
	</tr>
	<tr>
		<td align="center"><img alt="dracula" src="https://stats.pphat.top/stats?username=pphatdev&theme=dracula" /><br /><strong>🧛 dracula</strong></td>
		<td align="center"><img alt="monokai" src="https://stats.pphat.top/stats?username=pphatdev&theme=monokai" /><br /><strong>🌈 monokai</strong></td>
		<td align="center"><img alt="gruvbox" src="https://stats.pphat.top/stats?username=pphatdev&theme=gruvbox" /><br /><strong>🍂 gruvbox</strong></td>
		<td align="center"><img alt="onedark" src="https://stats.pphat.top/stats?username=pphatdev&theme=onedark" /><br /><strong>🖤 onedark</strong></td>
	</tr>
</table>

### All Available Themes (50+)

**Dark Themes:** `default` · `dark` · `radical` · `merko` · `gruvbox` · `tokyonight` · `onedark` · `cobalt` · `synthwave` · `highcontrast` · `dracula` · `prussian` · `monokai` · `vue` · `vue-dark` · `shades-of-purple` · `nightowl` · `buefy-dark` · `blue-green` · `algolia` · `great-gatsby` · `darcula` · `bear` · `solarized-dark` · `chartreuse-dark` · `nord` · `gotham` · `material-palenight` · `vision-friendly-dark` · `ayu-mirage` · `midnight-purple` · `calm` · `omni` · `react` · `jolly` · `maroongold` · `yeblu` · `blueberry` · `slateorange` · `kacho_ga` · `outrun` · `ocean_dark` · `city_lights` · `github_dark` · `discord_old_blurple` · `aura_dark` · `panda` · `noctis_minimus` · `cobalt2` · `swift` · `aura` · `apprentice` · `moltack` · `codeSTACKr` · `rose_pine`

**Light Themes:** `solarized-light` · `graywhite` · `flag-india`

Full theme list is in [src/utils/themes](src/utils/themes).

## Graph Themes

These themes are tuned for the `/graph` heatmap card — vivid `iconColor` cells against near-black backgrounds.

<table>
	<tr>
		<td align="center"><img alt="aurora" src="https://stats.pphat.top/graph?username=pphatdev&size=small&show_title=false&show_total_contribution=false&theme=aurora" /><br /><strong>🌌 aurora</strong></td>
		<td align="center"><img alt="matrix" src="https://stats.pphat.top/graph?username=pphatdev&size=small&show_title=false&show_total_contribution=false&theme=matrix" /><br /><strong>💚 matrix</strong></td>
	</tr>
	<tr>
		<td align="center"><img alt="inferno" src="https://stats.pphat.top/graph?username=pphatdev&size=small&show_title=false&show_total_contribution=false&theme=inferno" /><br /><strong>🔥 inferno</strong></td>
		<td align="center"><img alt="ocean" src="https://stats.pphat.top/graph?username=pphatdev&size=small&show_title=false&show_total_contribution=false&theme=ocean" /><br /><strong>🌊 ocean</strong></td>
	</tr>
</table>

All available themes: `aurora` · `matrix` · `inferno` · `ocean` · `neon` · `solar` · `galaxy` · `github-dark`

### Animate Modes

| Mode    | Description                                   |
| ------- | --------------------------------------------- |
| `glow`  | Default — active cells pulse with a soft glow |
| `wave`  | Cells ripple in a wave pattern across columns |
| `pulse` | ~16 random cells flash independently          |
| `none`  | No animation — static render                  |

### Size Presets

| Value     | Canvas     | Cell size |
| --------- | ---------- | --------- |
| `default` | 1200 × 600 | 14 px     |
| `small`   | 800 × 400  | 9 px      |
| `medium`  | 1000 × 500 | 12 px     |
| `large`   | 1400 × 700 | 16 px     |

## Development

### Prerequisites

- Node.js 18+ (LTS recommended)
- GitHub Personal Access Token (recommended for higher rate limits)
- Redis (optional, for multi-tier caching)
- SQLite (bundled, no setup needed)

### Setup

```bash
npm install
```

Create a `.env` file:

```env
# Required
GITHUB_TOKEN=your_github_personal_access_token

# Server
PORT=3000
APP_ENV=development   # development | production
HOST=localhost

# Cache (optional)
CACHE_DURATION=7200000        # 2 hours in ms
GITHUB_CACHE_TTL=1800000      # 30 min in ms
WARMUP_USERNAME=pphatdev      # Pre-warm cache on startup

# Redis (optional - falls back to in-memory cache if not set)
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
# Or use individual settings:
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_USERNAME=default
# REDIS_PASSWORD=your_password
# REDIS_DB=0
# REDIS_TLS=false

# Database
DATABASE_URL=./data/stats.db  # SQLite database path

# Monitoring
ENABLE_METRICS=true
DEBUG=false
```

### Database Setup

The project uses Drizzle ORM with SQLite. Run migrations:

```bash
# Generate migration files
npm run db:generate

# Apply migrations
npm run db:migrate

# Or push schema directly (development)
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### Running

**Development mode** (with hot reload):

```bash
npm run dev
```

**Build and run**:

```bash
npm run build
npm start
```

**Production cluster mode** (multi-core):

```bash
npm run build
npm run start:cluster      # Uses all CPU cores
npm run start:production   # Production mode with all optimizations

# Specify worker count
WORKERS=4 npm run start:cluster
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start single-process server |
| `npm run start:cluster` | Start multi-core cluster server |
| `npm run start:production` | Production mode with all optimizations |
| `npm run db:generate` | Generate Drizzle migration files |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:push` | Push schema changes directly |
| `npm run db:studio` | Open Drizzle Studio GUI |
| `npm run cache:clear` | Clear Redis cache |
| `npm test` | Run tests |

## Architecture

- **API**: GitHub REST + GraphQL APIs with intelligent batching
- **Caching**: Multi-tier (Memory → Redis → Source) with 2-hour default TTL
- **Database**: SQLite with Drizzle ORM for badge counters and visitor logs
- **Server**: Express.js with optional cluster mode for multi-core scaling
- **Rendering**: Server-side SVG generation with optional WebP/PNG/GIF export

## Notes

- Responses are cached for 2 hours (configurable via `CACHE_DURATION`)
- Without a GitHub token, API rate limits are very low (~60 requests/hour)
- Set `GITHUB_TOKEN` to get 5,000 requests/hour
- Redis is optional but recommended for production (enables distributed caching)
- Visitor badges use IP hashing for privacy-preserving unique visitor counting

## License

MIT. See LICENSE.
