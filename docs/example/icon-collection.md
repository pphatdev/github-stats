# GET /icons (Collection Mode)

Render multiple icons into one SVG image using the name query parameter.

## Route

- /icons?name=react,typescript,github

When name is present, this endpoint returns SVG content instead of JSON.

## Required Query Params

| Param | Description |
|---|---|
| name | Comma-separated icon names, for example react,typescript,github |

## Optional Query Params

| Param | Description |
|---|---|
| color | Comma-separated colors mapped by icon index. Unspecified icons use fallback palette colors |
| size | Size preset: small, medium, large |
| effect | Visual effect: glow, wave |
| columns | Number of columns in the grid (default: 3, max: 20) |

## Basic Examples

Plain collection:

![icon-collection-basic](https://stats.pphat.top/icons?name=react,typescript,github)

Two columns:

![icon-collection-columns](https://stats.pphat.top/icons?name=react,typescript,github,tailwindcss&columns=2)

## Size Examples

Small:

![icon-collection-small](https://stats.pphat.top/icons?name=react,typescript,github,tailwindcss&size=small&columns=2)

Medium:

![icon-collection-medium](https://stats.pphat.top/icons?name=react,typescript,github,tailwindcss&size=medium&columns=2)

Large:

![icon-collection-large](https://stats.pphat.top/icons?name=react,typescript,github,tailwindcss&size=large&columns=2)

## Color Mapping Examples

Mapped colors (index by index):

![icon-collection-colors](https://stats.pphat.top/icons?name=react,typescript,github&color=%230088CC,%233178C6,white)

Partial colors (remaining icons use fallback colors):

![icon-collection-partial-colors](https://stats.pphat.top/icons?name=react,typescript,github,tailwindcss,postgresql&color=%2300AACC,%23EAB308)

## Effect Examples

Glow:

![icon-collection-glow](https://stats.pphat.top/icons?name=react,typescript,github,tailwindcss&effect=glow&columns=2)

Wave:

![icon-collection-wave](https://stats.pphat.top/icons?name=react,typescript,github,tailwindcss,python,go&effect=wave&columns=3)

## Combined Example

Size + colors + glow + columns:

![icon-collection-combined](https://stats.pphat.top/icons?name=react,typescript,github,tailwindcss&size=large&color=%230088CC,%233178C6,%23FFFFFF,%2338B2AC&effect=glow&columns=2)

## Curl Examples

```bash
curl "https://stats.pphat.top/icons?name=react,typescript,github"
curl "https://stats.pphat.top/icons?name=react,typescript,github,tailwindcss&size=large&columns=2"
curl "https://stats.pphat.top/icons?name=react,typescript,github&color=%230088CC,%233178C6,white&effect=glow"
curl "https://stats.pphat.top/icons?name=react,typescript,github,tailwindcss,python,go&effect=wave&columns=3"
```

## Error Examples

Missing name:

```bash
curl "https://stats.pphat.top/icons?size=medium"
```

Invalid size:

```bash
curl "https://stats.pphat.top/icons?name=react,typescript&size=huge"
```

Invalid columns:

```bash
curl "https://stats.pphat.top/icons?name=react,typescript&columns=0"
```

Invalid effect:

```bash
curl "https://stats.pphat.top/icons?name=react,typescript&effect=bounce"
```

Icon not found:

```bash
curl "https://stats.pphat.top/icons?name=react,not-a-real-icon"
```
