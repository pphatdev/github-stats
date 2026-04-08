# Project Structure: Directory Map

## Root Directory

```text
stats.pphat.top/
|- src/                    # Source code
|- public/                 # Static assets
|- docs/                   # Documentation
|- data/                   # Database files
|- drizzle/                # Database migrations
|- scripts/                # Utility scripts
|- tests/                  # Test files
|- package.json            # Project dependencies and scripts
|- tsconfig.json           # TypeScript configuration
|- drizzle.config.ts       # Drizzle ORM configuration
|- wrangler.toml           # Cloudflare Workers configuration
|- ecosystem.config.cjs    # PM2 configuration
`- README.md               # Main documentation
```

## Source Code (src)

### Entry Points

```text
src/
|- index.ts
|- server.ts
|- server-cluster.ts
|- cluster.ts
|- worker.ts
|- app.ts
`- types.ts
```

### Configuration (src/config)

```text
src/config/
|- index.ts
|- env.ts
|- db.ts
|- logger.ts
`- swagger.ts
```

### Database (src/db)

```text
src/db/
|- index.ts
|- pool.ts
`- schema.ts
```

### Modules (src/modules)

- Each module includes: index.ts, *.controller.ts, *.routes.ts, *.service.ts, *.types.ts
- Current module folders: badges, graphs, health, icons, languages, stats

### Routes, Services, Shared, Views

```text
src/routes/docs.routes.ts
src/services/badge-cache.service.ts
src/services/base.service.ts
src/shared/
src/views/icons-demo.view.tsx
```

## Public Assets (public)

```text
public/
|- assets/icons/
|- css/main.css
|- css/icons-demo.css
|- fonts/
|- user/pphatdev/
|- icons-demo.js
`- sitemap.xml
```

## Documentation (docs)

Path-by-path breakdown:

| Path | Type | Purpose |
|------|------|---------|
| docs/collections/ | Directory | API collections and integration assets |
| docs/collections/postman_collection.json | File | Postman collection for API testing |
| docs/example/ | Directory | Endpoint usage examples |
| docs/example/README.md | File | Overview for example documents |
| docs/example/badge-collection.md | File | Badge collection usage examples |
| docs/example/badge-user.md | File | User badge usage examples |
| docs/example/graph.md | File | Graph endpoint usage examples |
| docs/example/icon-collection.md | File | Icon collection usage examples |
| docs/example/icons.md | File | Icon endpoint usage examples |
| docs/example/languages.md | File | Language stats usage examples |
| docs/example/project.md | File | Project-related usage examples |
| docs/example/stats.md | File | Stats endpoint usage examples |
| docs/features/ | Directory | Feature-specific documentation |
| docs/features/badges.md | File | Badge feature details |
| docs/RELEASE/ | Directory | Release notes and changelog docs |
| docs/RELEASE/RELEASE_ICONS.md | File | Icons release notes |
| docs/RELEASE/RELEASE_v2.0.3.md | File | Version 2.0.3 release notes |
| docs/STRUCTURE/ | Directory | Repository and architecture structure docs |
| docs/STRUCTURE/PROJECT_STRUCTURE.md | File | Structure index and navigation |

## Database, Scripts, Tests, and Config

```text
drizzle/
scripts/
tests/
package.json
tsconfig.json
drizzle.config.ts
wrangler.toml
ecosystem.config.cjs
```
