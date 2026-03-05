# Development Guide

This guide contains all local setup, environment, database, and run commands for the project.

## Prerequisites

- Node.js 18+ (LTS recommended)
- GitHub Personal Access Token (recommended for higher rate limits)
- Redis (optional, for multi-tier caching)
- SQLite (bundled, no setup needed)

## Setup

```bash
npm install
```

Create a `.env` file:

```env
# Required
GITHUB_TOKEN=your_github_personal_access_token

# Server
PORT=3000
APP_ENV=development   # development | production
HOST=localhost

# Cache (optional)
CACHE_DURATION=7200000        # 2 hours in ms
GITHUB_CACHE_TTL=1800000      # 30 min in ms
WARMUP_USERNAME=pphatdev      # Pre-warm cache on startup

# Redis (optional - falls back to in-memory cache if not set)
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
# Or use individual settings:
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_USERNAME=default
# REDIS_PASSWORD=your_password
# REDIS_DB=0
# REDIS_TLS=false

# Database
DATABASE_URL=./data/stats.db  # SQLite database path

# Monitoring
ENABLE_METRICS=true
DEBUG=false
```

## Database Setup

The project uses Drizzle ORM with SQLite. Run migrations:

```bash
# Generate migration files
npm run db:generate

# Apply migrations
npm run db:migrate

# Or push schema directly (development)
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## Running

Development mode (with hot reload):

```bash
npm run dev
```

Build and run:

```bash
npm run build
npm start
```

Production cluster mode (multi-core):

```bash
npm run build
npm run start:cluster      # Uses all CPU cores
npm run start:production   # Production mode with all optimizations

# Specify worker count
WORKERS=4 npm run start:cluster
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start single-process server |
| `npm run start:cluster` | Start multi-core cluster server |
| `npm run start:production` | Production mode with all optimizations |
| `npm run db:generate` | Generate Drizzle migration files |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:push` | Push schema changes directly |
| `npm run db:studio` | Open Drizzle Studio GUI |
| `npm run cache:clear` | Clear Redis cache |
| `npm test` | Run tests |
