# GET /languages

Generate a language card or pie chart.

## Required Params

- `username`

Default demo username: `pphatdev`

## Optional Params

| Param | Description |
|---|---|
| `theme` | Theme preset |
| `show_info` | Show/hide language details |
| `top` | Number of top languages |
| `variant` | Card style variant |
| `type` | `card`, `pie` |
| `bgColor` | Background color |
| `borderColor` | Border color |
| `textColor` | Text color |
| `titleColor` | Title color |
| `format` | Output format |

## Default Demo

![languages-default](https://stats.pphat.top/languages?username=pphatdev)

## Demo Each Optional Param

| Param | Preview |
|---|---|
| `theme` | ![theme](https://stats.pphat.top/languages?username=pphatdev&theme=dracula) |
| `show_info` | ![show_info](https://stats.pphat.top/languages?username=pphatdev&show_info=false) |
| `top` | ![top](https://stats.pphat.top/languages?username=pphatdev&top=10) |
| `variant` | ![variant](https://stats.pphat.top/languages?username=pphatdev&variant=bubbles) |
| `type` | ![type](https://stats.pphat.top/languages?username=pphatdev&type=pie) |
| `bgColor` | ![bgColor](https://stats.pphat.top/languages?username=pphatdev&bgColor=0d1117) |
| `borderColor` | ![borderColor](https://stats.pphat.top/languages?username=pphatdev&borderColor=58a6ff) |
| `textColor` | ![textColor](https://stats.pphat.top/languages?username=pphatdev&textColor=c9d1d9) |
| `titleColor` | ![titleColor](https://stats.pphat.top/languages?username=pphatdev&titleColor=58a6ff) |
| `format` | ![format](https://stats.pphat.top/languages?username=pphatdev&format=svg) |

## Combined Demos

![combined-card](https://stats.pphat.top/languages?username=pphatdev&type=card&top=8&theme=nord&show_info=true)
![combined-pie](https://stats.pphat.top/languages?username=pphatdev&type=pie&top=6&theme=tokyonight)
