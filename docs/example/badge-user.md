# GET /badge/:type

Generate user metric badges.

## Route Types

- `/badge/visitors`
- `/badge/repositories`
- `/badge/organization`
- `/badge/languages`
- `/badge/followers`
- `/badge/total-stars`
- `/badge/total-contributors`
- `/badge/total-commits`
- `/badge/total-code-reviews`
- `/badge/total-issues`
- `/badge/total-pull-requests`
- `/badge/total-joined-years`

## Required Params

- `username`

## Optional Params

| Param | Description |
|---|---|
| `theme` | Badge theme |
| `customLabel` | Custom label text |
| `labelColor` | Label text color |
| `labelBackground` | Label background color |
| `iconColor` | Icon color |
| `valueColor` | Value text color |
| `valueBackground` | Value background color |
| `hideFrame` | Hide frame (`true`/`false`) |
| `hideIcon` | Hide icon (`true`/`false`) |

## Demo Each Route Type

![visitors](https://stats.pphat.top/badge/visitors?username=pphatdev)
![repositories](https://stats.pphat.top/badge/repositories?username=pphatdev)
![organization](https://stats.pphat.top/badge/organization?username=pphatdev)
![languages](https://stats.pphat.top/badge/languages?username=pphatdev)
![followers](https://stats.pphat.top/badge/followers?username=pphatdev)
![total-stars](https://stats.pphat.top/badge/total-stars?username=pphatdev)
![total-contributors](https://stats.pphat.top/badge/total-contributors?username=pphatdev)
![total-commits](https://stats.pphat.top/badge/total-commits?username=pphatdev)
![total-code-reviews](https://stats.pphat.top/badge/total-code-reviews?username=pphatdev)
![total-issues](https://stats.pphat.top/badge/total-issues?username=pphatdev)
![total-pull-requests](https://stats.pphat.top/badge/total-pull-requests?username=pphatdev)
![total-joined-years](https://stats.pphat.top/badge/total-joined-years?username=pphatdev)

## Demo Each Optional Param

| Param | Preview |
|---|---|
| `theme` | ![theme](https://stats.pphat.top/badge/visitors?username=pphatdev&theme=ocean) |
| `customLabel` | ![customLabel](https://stats.pphat.top/badge/repositories?username=pphatdev&customLabel=Public%20Repos) |
| `labelColor` | ![labelColor](https://stats.pphat.top/badge/followers?username=pphatdev&labelColor=ffffff) |
| `labelBackground` | ![labelBackground](https://stats.pphat.top/badge/languages?username=pphatdev&labelBackground=0d1117) |
| `iconColor` | ![iconColor](https://stats.pphat.top/badge/total-stars?username=pphatdev&iconColor=58a6ff) |
| `valueColor` | ![valueColor](https://stats.pphat.top/badge/total-commits?username=pphatdev&valueColor=22c55e) |
| `valueBackground` | ![valueBackground](https://stats.pphat.top/badge/total-issues?username=pphatdev&valueBackground=1f2937) |
| `hideFrame` | ![hideFrame](https://stats.pphat.top/badge/total-pull-requests?username=pphatdev&hideFrame=true) |
| `hideIcon` | ![hideIcon](https://stats.pphat.top/badge/total-joined-years?username=pphatdev&hideIcon=true) |

## Combined Demos

![combined-stars](https://stats.pphat.top/badge/total-stars?username=pphatdev&theme=ocean&customLabel=Total%20Stars&hideFrame=true&hideIcon=true)
![combined-followers](https://stats.pphat.top/badge/followers?username=pphatdev&theme=dracula&labelBackground=0d1117&labelColor=ffffff&iconColor=ff79c6&valueColor=f8f8f2)
![combined-repositories](https://stats.pphat.top/badge/repositories?username=pphatdev&theme=tokyonight&customLabel=My%20Projects&valueBackground=111827)
