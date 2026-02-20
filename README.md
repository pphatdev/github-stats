# GitHub Stats API

Generate dynamic GitHub stats and language cards for README embeds.

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
- `show_title` — show/hide the username + year heading (`true` default, `false` centers remaining content)
- `show_total_contribution` — show/hide the contributions subtitle (`true` default, `false` also shrinks SVG height to fit content)
- `show_background` — show/hide the background gradient, stars, and grid lines (`true` default, `false` makes bg transparent and shrinks SVG width to fit only the cells with 10px margin)
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

Full theme list is in [src/utils/themes.ts](src/utils/themes.ts).

## Graph Themes

These themes are tuned for the `/graph` heatmap card — vivid `iconColor` cells against near-black backgrounds.

| Theme | Key | Preview |
|---|---|---|
| 🌌 Aurora | `aurora` | ![aurora](https://stats.pphat.top/graph?username=mrdoob&size=small&show_title=false&show_total_contribution=false&theme=aurora) |
| 💚 Matrix | `matrix` | ![matrix](https://stats.pphat.top/graph?username=mrdoob&size=small&show_title=false&show_total_contribution=false&theme=matrix) |
| 🔥 Inferno | `inferno` | ![inferno](https://stats.pphat.top/graph?username=mrdoob&size=small&show_title=false&show_total_contribution=false&theme=inferno) |
| 🌊 Ocean | `ocean` | ![ocean](https://stats.pphat.top/graph?username=mrdoob&size=small&show_title=false&show_total_contribution=false&theme=ocean) |
| 💜 Neon | `neon` | ![neon](https://stats.pphat.top/graph?username=mrdoob&size=small&show_title=false&show_total_contribution=false&theme=neon) |
| ☀️ Solar | `solar` | ![solar](https://stats.pphat.top/graph?username=mrdoob&size=small&show_title=false&show_total_contribution=false&theme=solar) |
| 🌠 Galaxy | `galaxy` | ![galaxy](https://stats.pphat.top/graph?username=mrdoob&size=small&show_title=false&show_total_contribution=false&theme=galaxy) |
| 🐙 GitHub Dark | `github-dark` | ![github-dark](https://stats.pphat.top/graph?username=mrdoob&size=small&show_title=false&show_total_contribution=false&theme=github-dark) |

### Animate Modes

| Mode | Description |
|---|---|
| `glow` | Default — active cells pulse with a soft glow |
| `wave` | Cells ripple in a wave pattern across columns |
| `pulse` | ~16 random cells flash independently |
| `none` | No animation — static render |

## Development

### Prerequisites
- Node.js 16+
- GitHub Personal Access Token (recommended)

### Setup
```bash
npm install
```

Create a .env file:
```env
GITHUB_TOKEN=your_github_personal_access_token
PORT=3000
APP_ENV=development
```

Build and run:
```bash
npm run build
npm start
```

Development mode:
```bash
npm run dev
```

## Notes
- The API uses GitHub REST and caches responses for 20 minutes.
- Without a token, GitHub rate limits are low; set GITHUB_TOKEN for higher limits.

## License
MIT. See LICENSE.
