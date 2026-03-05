# GET /stats

Generate a GitHub stats card.

## Required Params

- `username`

Default demo username: `pphatdev`

## Optional Params

| Param | Description |
|---|---|
| `theme` | Theme preset |
| `hide_title` | Hide title |
| `hide_border` | Hide border |
| `hide_rank` | Hide rank |
| `show_icons` | Show/hide icons |
| `avatar_mode` | `none`, `avatar`, `radar` |
| `show_avatar` | Legacy alias (`true` sets `avatar_mode=avatar`) |
| `custom_title` | Custom title text |
| `data_border_style` | `solid`, `frame` |
| `data_border_frame` | `in`, `out` |
| `bgColor` | Background color |
| `borderColor` | Border color |
| `textColor` | Text color |
| `titleColor` | Title color |
| `format` | `svg`, `webp` |

## Default Demo

![stats-default](https://stats.pphat.top/stats?username=pphatdev)

## Demo Each Optional Param

| Param | Preview |
|---|---|
| `theme` | ![theme](https://stats.pphat.top/stats?username=pphatdev&theme=tokyonight) |
| `hide_title` | ![hide_title](https://stats.pphat.top/stats?username=pphatdev&hide_title=true) |
| `hide_border` | ![hide_border](https://stats.pphat.top/stats?username=pphatdev&hide_border=true) |
| `hide_rank` | ![hide_rank](https://stats.pphat.top/stats?username=pphatdev&hide_rank=true) |
| `show_icons` | ![show_icons](https://stats.pphat.top/stats?username=pphatdev&show_icons=false) |
| `avatar_mode` | ![avatar_mode](https://stats.pphat.top/stats?username=pphatdev&avatar_mode=radar) |
| `show_avatar` | ![show_avatar](https://stats.pphat.top/stats?username=pphatdev&show_avatar=true) |
| `custom_title` | ![custom_title](https://stats.pphat.top/stats?username=pphatdev&custom_title=My%20GitHub%20Stats) |
| `data_border_style` | ![data_border_style](https://stats.pphat.top/stats?username=pphatdev&data_border_style=frame) |
| `data_border_frame` | ![data_border_frame](https://stats.pphat.top/stats?username=pphatdev&data_border_frame=in) |
| `bgColor` | ![bgColor](https://stats.pphat.top/stats?username=pphatdev&bgColor=0d1117) |
| `borderColor` | ![borderColor](https://stats.pphat.top/stats?username=pphatdev&borderColor=58a6ff) |
| `textColor` | ![textColor](https://stats.pphat.top/stats?username=pphatdev&textColor=c9d1d9) |
| `titleColor` | ![titleColor](https://stats.pphat.top/stats?username=pphatdev&titleColor=58a6ff) |
| `format` | ![format](https://stats.pphat.top/stats?username=pphatdev&format=webp) |

## Combined Demos

![combined-profile](https://stats.pphat.top/stats?username=pphatdev&theme=tokyonight&avatar_mode=avatar&hide_rank=true&custom_title=Developer%20Profile)
![combined-clean](https://stats.pphat.top/stats?username=pphatdev&theme=dracula&hide_border=true&show_icons=false)
