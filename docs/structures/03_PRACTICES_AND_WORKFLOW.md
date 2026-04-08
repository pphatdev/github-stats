# Project Structure: Best Practices and Workflow

## Best Practices

### Module Creation

1. Create folder in src/modules/{name}/
2. Add required files: controller, routes, service, types, index
3. Export from index.ts
4. Register routes in main app.ts
5. Add documentation in docs/how-to/
6. Add examples in docs/example/

### File Naming

- Use kebab-case for files: badge-renderer.ts
- Use PascalCase for classes: class BadgeRenderer
- Use camelCase for functions: function renderBadge()
- Module files: {module-name}.{type}.ts

## Development Workflow

1. Setup: install dependencies and configure environment
2. Development: use npm run dev
3. Database: run npm run db:migrate
4. Testing: run npm test
5. Build: run npm run build
6. Deploy: run npm run start:cluster

## Related Documentation

- [Development Guide](../how-to/DEVELOPMENT.md)
- [Core Routes](../how-to/CORE_ROUTES.md)
- [Contributing Guidelines](../../CONTRIBUTING.md)
- [Main README](../../README.md)
