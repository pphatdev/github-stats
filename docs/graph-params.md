# `/graph` Query Parameters

## Required

| Param | Type | Description |
|---|---|---|
| `username` | `string` | GitHub username to fetch contribution data for |

---

## Optional

### Appearance

| Param | Type | Default | Description |
|---|---|---|---|
| `theme` | `string` | `default` | Named color theme. See [Graph Themes](#graph-themes). |
| `bgColor` | `hex string` | *(from theme)* | Override background color |
| `borderColor` | `hex string` | *(from theme)* | Override border/line color |
| `textColor` | `hex string` | *(from theme)* | Override text color |
| `titleColor` | `hex string` | *(from theme)* | Override title color |

### Layout

| Param | Type | Default | Description |
|---|---|---|---|
| `size` | `small` \| `medium` \| `default` \| `large` | `default` | Canvas size preset |
| `show_title` | `boolean` | `true` | Show/hide the username + year heading. When `false`, remaining content is vertically centered. |
| `show_total_contribution` | `boolean` | `true` | Show/hide the total contributions subtitle. When `false`, SVG height shrinks to fit. |
| `show_background` | `boolean` | `true` | Show/hide the background gradient, stars, and grid lines. When `false`, background is transparent and SVG width shrinks to fit only the cells (+ 10 px margin). |

### Data

| Param | Type | Default | Description |
|---|---|---|---|
| `year` | `number` | *(last 365 days)* | 4-digit year to fetch contributions for |

### Animation

| Param | Type | Default | Description |
|---|---|---|---|
| `animate` | `glow` \| `wave` \| `pulse` \| `none` | `glow` | Cell animation mode |

---

## Size Presets

| Value | Canvas | Cell size |
|---|---|---|
| `small` | 800 × 400 | 9 px |
| `medium` | 1000 × 500 | 12 px |
| `default` | 1200 × 600 | 14 px |
| `large` | 1400 × 700 | 16 px |

---

## Animate Modes

| Value | Description |
|---|---|
| `glow` | Active cells pulse with a soft glow *(default)* |
| `wave` | Cells ripple in a wave pattern across columns |
| `pulse` | ~16 random cells flash independently |
| `none` | No animation — static render |

---

## Graph Themes

| Key | Description |
|---|---|
| `aurora` | 🌌 Purple-green aurora on near-black |
| `matrix` | 💚 Bright green on black |
| `inferno` | 🔥 Orange-red flame gradient |
| `ocean` | 🌊 Cyan-blue ocean tones |
| `neon` | 💜 Hot pink / violet neon |
| `solar` | ☀️ Amber-yellow solar flare |
| `galaxy` | 🌠 Deep blue starfield |
| `github-dark` | 🐙 GitHub dark heatmap palette |

---

## Example URLs

```
/graph?username=pphatdev
/graph?username=pphatdev&year=2024
/graph?username=pphatdev&theme=aurora&animate=wave
/graph?username=pphatdev&theme=matrix&animate=pulse&size=large
/graph?username=pphatdev&show_title=false&show_total_contribution=false
/graph?username=pphatdev&show_background=false
/graph?username=pphatdev&theme=ocean&size=small&animate=wave
```
