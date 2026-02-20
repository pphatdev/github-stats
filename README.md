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
