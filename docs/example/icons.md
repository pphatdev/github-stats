# GET /icons and /icons/:name


![icon-react](https://stats.pphat.top/icons/react?color=%230088CC&glow=true&glowColor=%2300FF)
![icon-python](https://stats.pphat.top/icons/python?color=%234584B6&glow=true&glowColor=%2300FF)
![icon-typescript](https://stats.pphat.top/icons/typescript?color=%230088CC&glow=true&glowColor=%2300FF)
![icon-javascript](https://stats.pphat.top/icons/javascript?color=%23FFDE57&glow=true&glowColor=%2300FF)
![icon-html](https://stats.pphat.top/icons/html?color=%23E34F26&glow=true&glowColor=%2300FF)
![icon-css](https://stats.pphat.top/icons/css?color=%231572B6&glow=true&glowColor=%2300FF)
![icon-nodedotjs](https://stats.pphat.top/icons/nodedotjs?color=%23339933&glow=true&glowColor=%2300FF)
![icon-nextjs](https://stats.pphat.top/icons/nextjs?color=white&glow=true&glowColor=%2300FF)
![icon-nuxt](https://stats.pphat.top/icons/nuxt?color=%2300C58E&glow=true&glowColor=%2300FF)
![icon-postgresql](https://stats.pphat.top/icons/postgresql?color=%230088CC&glow=true&glowColor=%2300FF)
![icon-mysql](https://stats.pphat.top/icons/mysql?color=%230088CC&glow=true&glowColor=%2300FF)
![icon-tailwindcss](https://stats.pphat.top/icons/tailwindcss?color=%2338B2AC&glow=true&glowColor=%2300FF)
![icon-markdown](https://stats.pphat.top/icons/markdown?color=orange&glow=true&glowColor=%2300FF)
![icon-laravel](https://stats.pphat.top/icons/laravel?color=%23FF2D20&glow=true&glowColor=%2300FF)
![icon-php](https://stats.pphat.top/icons/php?color=%23777BB4&glow=true&glowColor=%2300FF)
![icon-cplusplus](https://stats.pphat.top/icons/cplusplus?color=%2300AACC&glow=true&glowColor=%2300FF)
![icon-fastapi](https://stats.pphat.top/icons/fastapi?color=white&glow=true&glowColor=%2300FF)
![icon-hugo](https://stats.pphat.top/icons/hugo?color=white&glow=true&glowColor=%2300FF)

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

