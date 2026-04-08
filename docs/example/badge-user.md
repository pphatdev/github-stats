# GET /badges

Generate one or more badges from a single query-style endpoint.

## Route

- `/badges?username=pphatdev&name=visitors`

## Required Params

- `username`

## Optional Params

| Param | Description |
|---|---|
| `repo` | Repository name for repo-level badges such as `stars` or `forks` |
| `name` | Comma-separated badge names |
| `theme` | One theme or multiple comma-separated themes cycled across badges |
| `effect` | `wave` or `glow` |
| `column` | Grid columns for multi-badge output (`1-50`) |
| `size` | `small`, `medium`, or `large` |
| `customLabel` | Custom label text |
| `labelColor` | Label text color |
| `labelBackground` | Label background color |
| `iconColor` | Icon color |
| `valueColor` | Value text color |
| `valueBackground` | Value background color |
| `hideFrame` | Hide frame (`true`/`false`) |
| `hideIcon` | Hide icon (`true`/`false`) |

## Supported User Badge Names

- `visitors`
- `repositories`
- `organization`
- `languages`
- `followers`
- `total-stars`
- `total-contributors`
- `total-commits`
- `total-code-reviews`
- `total-issues`
- `total-pull-requests`
- `total-joined-years`

## Supported Repo Badge Names

- `stars`
- `forks`
- `contributors`
- `issues`
- `pull-requests`
- `watchers`
- `size`

## Single Badge Examples

![visitors](https://stats.pphat.top/badges?username=pphatdev&name=visitors)
![repositories](https://stats.pphat.top/badges?username=pphatdev&name=repositories)
![followers](https://stats.pphat.top/badges?username=pphatdev&name=followers)
![total-stars](https://stats.pphat.top/badges?username=pphatdev&name=total-stars)

## Repo Badge Examples

![repo-stars](https://stats.pphat.top/badges?username=pphatdev&repo=github-stats&name=stars)
![repo-forks](https://stats.pphat.top/badges?username=pphatdev&repo=github-stats&name=forks)

## Style Examples

| Param | Preview |
|---|---|
| `theme` | ![theme](https://stats.pphat.top/badges?username=pphatdev&name=visitors&theme=ocean) |
| `customLabel` | ![customLabel](https://stats.pphat.top/badges?username=pphatdev&name=repositories&customLabel=Public%20Repos) |
| `labelColor` | ![labelColor](https://stats.pphat.top/badges?username=pphatdev&name=followers&labelColor=ffffff) |
| `labelBackground` | ![labelBackground](https://stats.pphat.top/badges?username=pphatdev&name=languages&labelBackground=0d1117) |
| `iconColor` | ![iconColor](https://stats.pphat.top/badges?username=pphatdev&name=total-stars&iconColor=58a6ff) |
| `valueColor` | ![valueColor](https://stats.pphat.top/badges?username=pphatdev&name=total-commits&valueColor=22c55e) |
| `valueBackground` | ![valueBackground](https://stats.pphat.top/badges?username=pphatdev&name=total-issues&valueBackground=1f2937) |
| `hideFrame` | ![hideFrame](https://stats.pphat.top/badges?username=pphatdev&name=total-pull-requests&hideFrame=true) |
| `hideIcon` | ![hideIcon](https://stats.pphat.top/badges?username=pphatdev&name=total-joined-years&hideIcon=true) |

## Combined Examples

![combined-stars](https://stats.pphat.top/badges?username=pphatdev&name=total-stars&theme=ocean&customLabel=Total%20Stars&hideFrame=true&hideIcon=true)
![combined-followers](https://stats.pphat.top/badges?username=pphatdev&name=followers&theme=dracula&labelBackground=0d1117&labelColor=ffffff&iconColor=ff79c6&valueColor=f8f8f2)
![combined-repositories](https://stats.pphat.top/badges?username=pphatdev&name=repositories&theme=tokyonight&customLabel=My%20Projects&valueBackground=111827)
