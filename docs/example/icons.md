# GET /icons and /icons/:name

List available SVG icons or fetch a single icon.

## Routes

- `/icons` - Returns JSON metadata and icon names
- `/icons/:name` - Returns icon SVG (e.g. `/icons/react`)
- `/icons/:name.svg` - Same as above, with explicit `.svg` suffix
- `/icons/demo` - Interactive icon gallery page

## Required Params

- For `/icons` and `/icons/demo`: none
- For `/icons/:name`: path param `name`

Default demo icon: `react`

## Optional Query Params (`/icons/:name`)

| Param | Description |
|---|---|
| `color` | Replaces `currentColor` fills/strokes in the SVG |
| `foreground` | Recolors elements marked with `data-foreground` |
| `glow` | Enable glow effect (`true` or `1`) |
| `glowColor` | Set glow color (hex, rgb, named color). Defaults to `#00AAFF` if not specified |

## Default Demos

JSON list endpoint:

```bash
curl "https://stats.pphat.top/icons"
```

Single icon (SVG response):

![icon-react](https://stats.pphat.top/icons/react)

Single icon with explicit extension:

![icon-react-svg](https://stats.pphat.top/icons/react.svg)

Demo page:

`https://stats.pphat.top/icons/demo`

## Demo Each Optional Param

| Param | Preview |
|---|---|
| `color` | ![color](https://stats.pphat.top/icons/react?color=%230088CC) |
| `foreground` | ![foreground](https://stats.pphat.top/icons/html?foreground=%23FF0000) |
| `glow` | ![glow](https://stats.pphat.top/icons/react?glow=true) |
| `glowColor` | ![glowColor](https://stats.pphat.top/icons/typescript?glow=true&glowColor=%23FF00FF) |

## Combined Demos

![combined-react](https://stats.pphat.top/icons/react?color=%230088CC&foreground=%23FF0000)
![combined-github](https://stats.pphat.top/icons/github?color=blue)
![combined-glow](https://stats.pphat.top/icons/react?color=%230088CC&glow=true&glowColor=%2300FF00)
![combined-typescript](https://stats.pphat.top/icons/typescript?glow=true&glowColor=%23FF0000)

## Error Examples

Invalid icon name:

```bash
curl "https://stats.pphat.top/icons/../secret"
```

Icon not found:

```bash
curl "https://stats.pphat.top/icons/not-a-real-icon"
```
