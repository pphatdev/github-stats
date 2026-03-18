# GET /project/:type

Generate repository metric badges.

## Route Types

- `/project/visitors`
- `/project/stars`
- `/project/forks`
- `/project/watchers`
- `/project/issues`
- `/project/prs`
- `/project/contributors`
- `/project/size`

## Required Params

- `repo` in format `OWNER/REPO`

Default demo repo: `pphatdev/github-stats`

## Optional Params

| Param | Description |
|---|---|
| `theme` | Badge theme |
| `customLabel` | Custom label text |
| `labelColor` | Label text color |
| `labelBackground` | Label background color |
| `valueColor` | Value text color |
| `valueBackground` | Value background color |

## Demo Each Route Type

![visitors](https://stats.pphat.top/project/visitors?repo=pphatdev/github-stats)
![stars](https://stats.pphat.top/project/stars?repo=pphatdev/github-stats)
![forks](https://stats.pphat.top/project/forks?repo=pphatdev/github-stats)
![watchers](https://stats.pphat.top/project/watchers?repo=pphatdev/github-stats)
![issues](https://stats.pphat.top/project/issues?repo=pphatdev/github-stats)
![prs](https://stats.pphat.top/project/prs?repo=pphatdev/github-stats)
![contributors](https://stats.pphat.top/project/contributors?repo=pphatdev/github-stats)
![size](https://stats.pphat.top/project/size?repo=pphatdev/github-stats)

## Demo Each Optional Param

| Param | Preview |
|---|---|
| `theme` | ![theme](https://stats.pphat.top/project/stars?repo=pphatdev/github-stats&theme=ocean) |
| `customLabel` | ![customLabel](https://stats.pphat.top/project/stars?repo=pphatdev/github-stats&customLabel=GitHub%20Stars) |
| `labelColor` | ![labelColor](https://stats.pphat.top/project/stars?repo=pphatdev/github-stats&labelColor=ffffff) |
| `labelBackground` | ![labelBackground](https://stats.pphat.top/project/stars?repo=pphatdev/github-stats&labelBackground=0d1117) |
| `valueColor` | ![valueColor](https://stats.pphat.top/project/stars?repo=pphatdev/github-stats&valueColor=ffffff) |
| `valueBackground` | ![valueBackground](https://stats.pphat.top/project/stars?repo=pphatdev/github-stats&valueBackground=1f2937) |

## Combined Demos

![combined-contributors](https://stats.pphat.top/project/contributors?repo=pphatdev/github-stats&theme=dracula&customLabel=Contributors&labelBackground=0d1117)
![combined-stars](https://stats.pphat.top/project/stars?repo=pphatdev/github-stats&theme=tokyonight&customLabel=Repo%20Stars&valueBackground=111827)
