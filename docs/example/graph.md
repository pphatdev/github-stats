# GET /graph

Generate contribution graph cards and exports.

## Required Params

- `username`

Default demo username: `pphatdev`

## Optional Params

| Param | Description |
|---|---|
| `theme` | Theme preset |
| `year` | 4-digit year |
| `animate` | `glow`, `wave`, `pulse`, `none` |
| `size` | `default`, `small`, `medium`, `large` |
| `as` | `svg`, `gif`, `webp`, `png` |
| `format` | Alternate format selector |
| `show_title` | Show/hide title |
| `show_total_contribution` | Show/hide subtitle |
| `show_background` | Show/hide background effects |
| `bgColor` | Background color |
| `borderColor` | Border color |
| `textColor` | Text color |
| `titleColor` | Title color |

## Default Demo

![graph-default](https://stats.pphat.top/graph?username=pphatdev)

## Demo Each Optional Param

| Param | Preview |
|---|---|
| `theme` | ![theme](https://stats.pphat.top/graph?username=pphatdev&theme=aurora) |
| `year` | ![year](https://stats.pphat.top/graph?username=pphatdev&year=2024) |
| `animate` | ![animate](https://stats.pphat.top/graph?username=pphatdev&animate=wave) |
| `size` | ![size](https://stats.pphat.top/graph?username=pphatdev&size=small) |
| `as` | ![as](https://stats.pphat.top/graph?username=pphatdev&as=png) |
| `format` | ![format](https://stats.pphat.top/graph?username=pphatdev&format=webp) |
| `show_title` | ![show_title](https://stats.pphat.top/graph?username=pphatdev&show_title=true) |
| `show_total_contribution` | ![show_total_contribution](https://stats.pphat.top/graph?username=pphatdev&show_total_contribution=true) |
| `show_background` | ![show_background](https://stats.pphat.top/graph?username=pphatdev&show_background=true) |
| `bgColor` | ![bgColor](https://stats.pphat.top/graph?username=pphatdev&bgColor=0d1117) |
| `borderColor` | ![borderColor](https://stats.pphat.top/graph?username=pphatdev&borderColor=58a6ff) |
| `textColor` | ![textColor](https://stats.pphat.top/graph?username=pphatdev&textColor=c9d1d9) |
| `titleColor` | ![titleColor](https://stats.pphat.top/graph?username=pphatdev&titleColor=58a6ff) |

## Combined Demos

![combined-animated](https://stats.pphat.top/graph?username=pphatdev&theme=matrix&animate=pulse&size=medium&show_title=true&show_background=true&as=gif)
![combined-static](https://stats.pphat.top/graph?username=pphatdev&theme=ocean&size=small&as=png)
