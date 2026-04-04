# Release v2.0.3

Release date: 2026-04-04

## Summary 📝

This release focuses on consistency, maintainability, and documentation improvements.

## Highlights ✨

- 🧩 Added badge collection examples to the main README.
- 🎨 Added support for multiple themes in badge collections (theme cycling by badge index).
- ✅ Added explicit theme validation for badge collection requests.
- 🧱 Standardized controller filenames to the pattern `filename.controller.ts`.
- 🛠️ Standardized service filenames to the pattern `filename.service.ts`.
- 🚀 Updated project version to `2.0.3`.

## API Notes 🔌

### Badge Collection 🧩

Endpoint:

- `GET /badge/collection`

Key query parameters:

- `username` (required)
- `type` (required, comma-separated badge types)
- `columns` (optional, 1-50)
- `gap` (optional, 0-100)
- `theme` (optional)

Theme behavior:

- Single theme: applies to all badges
- Multiple themes: comma-separated list, applied in a loop across badges

Example:

```text
https://stats.pphat.top/badge/collection?username=pphatdev&type=visitors,total-stars,repositories,total-issues,followers&theme=galaxy,aurora,ocean
```

## Refactor Details 🔧

### Controllers renamed 🎮

- `stats.ts` -> `stats.controller.ts`
- `languages.ts` -> `languages.controller.ts`
- `graph.ts` -> `graph.controller.ts`
- `badge.ts` -> `badge.controller.ts`
- `controller.ts` -> `index.controller.ts`

### Services renamed 🧰

- `base.ts` -> `base.service.ts`
- `github-graphql-optimizer.ts` -> `github-graphql-optimizer.service.ts`

## Compatibility 🔒

- No endpoint removals in this release.
- Existing route behavior remains unchanged outside the documented badge collection improvements.

## Verification Checklist ✅

- Build passes after import path updates.
- `README.md` includes badge collection examples.
- `package.json` version is `2.0.3`.
- Controller and service imports use standardized file patterns.

## Related Docs 📚

- `README.md`
- `docs/example/badge-collection.md`
- `docs/RELEASE/RELEASE_ICONS.md`
