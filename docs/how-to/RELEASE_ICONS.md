# Release Icons Documentation

This guide covers how to use icons in release documentation, changelogs, README badges, and project release notes.

## Overview

Icons enhance release documentation by:
- Creating visual consistency in release notes
- Making technology stacks clear at a glance
- Adding professional polish to README files
- Highlighting key technologies and dependencies
- Making version badges more engaging

---

## Table of Contents
- [Available Icons](#available-icons)
- [Basic Usage](#basic-usage)
- [Release Badge Patterns](#release-badge-patterns)
- [Technology Stack Display](#technology-stack-display)
- [Themed Icon Sets](#themed-icon-sets)
- [Best Practices](#best-practices)

---

## Available Icons

All icons are available via the `/icons/:name` endpoint. Common icons used in release documentation:

### Core Technologies
- **Languages**: `javascript`, `typescript`, `python`, `php`, `rust`, `cpp`, etc.
- **Frameworks**: `react`, `nextjs`, `vue`, `angular`, `laravel`, `django`, etc.
- **Build Tools**: `vite`, `webpack`, `npm`, `yarn`, etc.
- **Databases**: `postgresql`, `mysql`, `mongodb`, `redis`, etc.
- **DevOps**: `docker`, `kubernetes`, `github`, `gitlab`, `gitpod`, etc.

### Full Icon List
View all available icons at: [`/icons/demo`](https://stats.pphat.top/icons/demo)

Or fetch the JSON list:
```bash
curl "https://stats.pphat.top/icons"
```

---

## Basic Usage

### Endpoint
```
GET /icons/:name
```

### Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `name` | string | Icon name (required) | `react`, `typescript`, `docker` |
| `color` | string | Icon color (hex, rgb, or named) | `%230088CC`, `blue`, `rgb(255,0,0)` |
| `glow` | boolean | Enable glow effect | `true`, `1` |
| `glowColor` | string | Glow color (requires `glow=true`) | `%23FF0000`, `red` |
| `foreground` | string | Recolor foreground elements | `white`, `%23000000` |

### Examples

**Basic Icon:**
```markdown
![React](https://stats.pphat.top/icons/react)
```
![React](https://stats.pphat.top/icons/react)

**Colored Icon:**
```markdown
![TypeScript](https://stats.pphat.top/icons/typescript?color=%233178C6)
```
![TypeScript](https://stats.pphat.top/icons/typescript?color=%233178C6)

**Glowing Icon:**
```markdown
![Docker](https://stats.pphat.top/icons/docker?color=%232496ED&glow=true&glowColor=%232496ED)
```
![Docker](https://stats.pphat.top/icons/docker?color=%232496ED&glow=true&glowColor=%232496ED)

---

## Release Badge Patterns

### Version Header with Icons

Create an attractive release header by combining icons with badges:

```markdown
# Release v2.0.0

![React](https://stats.pphat.top/icons/react?color=%2361DAFB) ![TypeScript](https://stats.pphat.top/icons/typescript?color=%233178C6) ![Node.js](https://stats.pphat.top/icons/nodedotjs?color=%23339933)

Major update with improved performance and new features!
```

### Technology Stack in Releases

Show what technologies are used in each release:

```markdown
## What's New in v2.0.0

### Built With
<div>
<img src="https://stats.pphat.top/icons/react?color=%2361DAFB" width="40" height="40" alt="React"/>
<img src="https://stats.pphat.top/icons/typescript?color=%233178C6" width="40" height="40" alt="TypeScript"/>
<img src="https://stats.pphat.top/icons/nextjs?color=white" width="40" height="40" alt="Next.js"/>
<img src="https://stats.pphat.top/icons/postgresql?color=%234169E1" width="40" height="40" alt="PostgreSQL"/>
<img src="https://stats.pphat.top/icons/docker?color=%232496ED" width="40" height="40" alt="Docker"/>
</div>
```

Result:
<div>
<img src="https://stats.pphat.top/icons/react?color=%2361DAFB" width="40" height="40" alt="React"/>
<img src="https://stats.pphat.top/icons/typescript?color=%233178C6" width="40" height="40" alt="TypeScript"/>
<img src="https://stats.pphat.top/icons/nextjs?color=white" width="40" height="40" alt="Next.js"/>
<img src="https://stats.pphat.top/icons/postgresql?color=%234169E1" width="40" height="40" alt="PostgreSQL"/>
<img src="https://stats.pphat.top/icons/docker?color=%232496ED" width="40" height="40" alt="Docker"/>
</div>

### Inline Release Notes

```markdown
## v1.5.0 - Frontend Improvements

- ![React](https://stats.pphat.top/icons/react?color=%2361DAFB) Upgraded to React 18
- ![TypeScript](https://stats.pphat.top/icons/typescript?color=%233178C6) Added strict type checking
- ![Vite](https://stats.pphat.top/icons/vite?color=%23646CFF) Migrated to Vite for faster builds
```

---

## Technology Stack Display

### README Header

Create a professional technology stack section:

```markdown
## 🛠️ Tech Stack

### Frontend
![React](https://stats.pphat.top/icons/react?color=%2361DAFB&glow=true&glowColor=%2361DAFB)
![TypeScript](https://stats.pphat.top/icons/typescript?color=%233178C6&glow=true&glowColor=%233178C6)
![Next.js](https://stats.pphat.top/icons/nextjs?color=white&glow=true&glowColor=white)
![TailwindCSS](https://stats.pphat.top/icons/tailwindcss?color=%2306B6D4&glow=true&glowColor=%2306B6D4)

### Backend
![Node.js](https://stats.pphat.top/icons/nodedotjs?color=%23339933&glow=true&glowColor=%23339933)
![Express](https://stats.pphat.top/icons/express?color=white&glow=true&glowColor=white)
![PostgreSQL](https://stats.pphat.top/icons/postgresql?color=%234169E1&glow=true&glowColor=%234169E1)

### DevOps
![Docker](https://stats.pphat.top/icons/docker?color=%232496ED&glow=true&glowColor=%232496ED)
![GitHub Actions](https://stats.pphat.top/icons/githubactions?color=%232088FF&glow=true&glowColor=%232088FF)
![Vercel](https://stats.pphat.top/icons/vercel?color=white&glow=true&glowColor=white)
```

### Compact Icon Grid

For a cleaner look, use HTML with custom sizing:

```html
<p align="center">
  <img src="https://stats.pphat.top/icons/react?color=%2361DAFB" width="48" alt="React"/>
  <img src="https://stats.pphat.top/icons/typescript?color=%233178C6" width="48" alt="TypeScript"/>
  <img src="https://stats.pphat.top/icons/nextjs?color=white" width="48" alt="Next.js"/>
  <img src="https://stats.pphat.top/icons/tailwindcss?color=%2306B6D4" width="48" alt="Tailwind"/>
  <img src="https://stats.pphat.top/icons/nodedotjs?color=%23339933" width="48" alt="Node.js"/>
  <img src="https://stats.pphat.top/icons/postgresql?color=%234169E1" width="48" alt="PostgreSQL"/>
  <img src="https://stats.pphat.top/icons/docker?color=%232496ED" width="48" alt="Docker"/>
</p>
```

---

## Themed Icon Sets

### Light Theme (for Dark Backgrounds)
```markdown
![React](https://stats.pphat.top/icons/react?color=white&glow=true&glowColor=%2361DAFB)
![Vue](https://stats.pphat.top/icons/vuedotjs?color=white&glow=true&glowColor=%234FC08D)
![Angular](https://stats.pphat.top/icons/angular?color=white&glow=true&glowColor=%23DD0031)
```

### Monochrome Set
```markdown
![React](https://stats.pphat.top/icons/react?color=%23333333)
![Vue](https://stats.pphat.top/icons/vuedotjs?color=%23333333)
![Angular](https://stats.pphat.top/icons/angular?color=%23333333)
```

### Brand Colors
```markdown
![React](https://stats.pphat.top/icons/react?color=%2361DAFB)
![Vue](https://stats.pphat.top/icons/vuedotjs?color=%234FC08D)
![Angular](https://stats.pphat.top/icons/angular?color=%23DD0031)
![Svelte](https://stats.pphat.top/icons/svelte?color=%23FF3E00)
```

### Neon Glow Theme
```markdown
![JavaScript](https://stats.pphat.top/icons/javascript?color=%23F7DF1E&glow=true&glowColor=%23F7DF1E)
![Python](https://stats.pphat.top/icons/python?color=%233776AB&glow=true&glowColor=%233776AB)
![Rust](https://stats.pphat.top/icons/rust?color=%23CE412B&glow=true&glowColor=%23CE412B)
```

---

## Best Practices

### 1. Consistent Sizing

Use consistent dimensions across your documentation:

```markdown
<!-- Small icons for inline use -->
<img src="https://stats.pphat.top/icons/react?color=%2361DAFB" width="24" height="24" alt="React"/>

<!-- Medium icons for headers -->
<img src="https://stats.pphat.top/icons/react?color=%2361DAFB" width="40" height="40" alt="React"/>

<!-- Large icons for hero sections -->
<img src="https://stats.pphat.top/icons/react?color=%2361DAFB" width="64" height="64" alt="React"/>
```

### 2. Use Alt Text

Always include descriptive alt text for accessibility:

```markdown
![React - A JavaScript library for building user interfaces](https://stats.pphat.top/icons/react?color=%2361DAFB)
```

### 3. URL Encoding

Properly encode color values with `%23` for hash symbols:

```markdown
<!-- Correct -->
![Icon](https://stats.pphat.top/icons/react?color=%2361DAFB)

<!-- Incorrect -->
![Icon](https://stats.pphat.top/icons/react?color=#61DAFB)
```

### 4. Meaningful Organization

Group icons logically in your release notes:

```markdown
## v2.0.0 Release Notes

### Frontend Updates
![React](https://stats.pphat.top/icons/react?color=%2361DAFB) React 18 support
![TypeScript](https://stats.pphat.top/icons/typescript?color=%233178C6) Enhanced TypeScript definitions

### Backend Updates
![Node.js](https://stats.pphat.top/icons/nodedotjs?color=%23339933) Node.js 20 LTS
![PostgreSQL](https://stats.pphat.top/icons/postgresql?color=%234169E1) PostgreSQL 16
```

### 5. Performance Considerations

Icons are SVGs served directly from the server. They're lightweight and render quickly, but:

- **Use caching**: Icons are cached by default
- **Limit quantity**: Don't overload pages with hundreds of icons
- **Lazy loading**: Consider lazy loading for icon-heavy pages

### 6. Avoid Common Mistakes

❌ **Don't use file paths**
```markdown
![Wrong](./icons/react.svg)
```

✅ **Use the API endpoint**
```markdown
![Correct](https://stats.pphat.top/icons/react)
```

❌ **Don't forget encoding**
```markdown
![Wrong](https://stats.pphat.top/icons/react?color=#61DAFB)
```

✅ **Encode special characters**
```markdown
![Correct](https://stats.pphat.top/icons/react?color=%2361DAFB)
```

---

## Advanced Examples

### Changelog with Icons

```markdown
# Changelog

## [2.0.0] - 2024-03-15

### Added
- ![React](https://stats.pphat.top/icons/react?color=%2361DAFB) React 18 concurrent features
- ![TypeScript](https://stats.pphat.top/icons/typescript?color=%233178C6) Full TypeScript migration
- ![Docker](https://stats.pphat.top/icons/docker?color=%232496ED) Docker compose support

### Changed
- ![Vite](https://stats.pphat.top/icons/vite?color=%23646CFF) Upgraded Vite to v5
- ![Node.js](https://stats.pphat.top/icons/nodedotjs?color=%23339933) Node.js 20 LTS requirement

### Fixed
- ![PostgreSQL](https://stats.pphat.top/icons/postgresql?color=%234169E1) Database connection pooling
```

### Multi-Version Comparison

```markdown
## Version Comparison

| Feature | v1.0 | v2.0 |
|---------|------|------|
| Framework | ![React 17](https://stats.pphat.top/icons/react?color=%2361DAFB) | ![React 18](https://stats.pphat.top/icons/react?color=%2361DAFB&glow=true&glowColor=%2361DAFB) |
| Language | JavaScript | ![TypeScript](https://stats.pphat.top/icons/typescript?color=%233178C6) |
| Build | Webpack | ![Vite](https://stats.pphat.top/icons/vite?color=%23646CFF) |
```

### Release Highlights Card

```markdown
<div align="center">
  <h2>🚀 Major Release v2.0.0</h2>
  <p>
    <img src="https://stats.pphat.top/icons/react?color=%2361DAFB&glow=true&glowColor=%2361DAFB" width="60" alt="React"/>
    <img src="https://stats.pphat.top/icons/typescript?color=%233178C6&glow=true&glowColor=%233178C6" width="60" alt="TypeScript"/>
    <img src="https://stats.pphat.top/icons/vite?color=%23646CFF&glow=true&glowColor=%23646CFF" width="60" alt="Vite"/>
  </p>
  <p><strong>Performance improvements • TypeScript migration • Modern tooling</strong></p>
</div>
```

---

## Related Documentation

- [Icons API Reference](./icons.md)
- [User Badges](./USER_BADGES.md)
- [Project Badges](./PROJECT_BADGES.md)
- [Core Routes](./CORE_ROUTES.md)

---

## Support

For issues or questions about icons:
- View all icons: https://stats.pphat.top/icons/demo
- API documentation: https://stats.pphat.top/icons
- GitHub Issues: [Report a problem](https://github.com/pphatdev/github-stats/issues)
