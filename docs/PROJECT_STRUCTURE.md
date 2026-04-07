# Project Structure

This document provides a comprehensive overview of the GitHub Stats project structure and organization.

## Table of Contents

1. [Version](#version)
2. [System Architecture Flow](#system-architecture-flow)
   - [Overall Request Flow](#overall-request-flow)
   - [Module Architecture Flow](#module-architecture-flow)
   - [Caching Strategy Flow](#caching-strategy-flow)
   - [Module Structure Flow](#module-structure-flow)
3. [Root Directory](#root-directory)
   - [Directory Structure Visualization](#directory-structure-visualization)
4. [Source Code Structure](#source-code-src)
   - [Entry Points](#entry-points)
   - [Configuration](#configuration-srcconfig)
   - [Database](#database-srcdb)
   - [Modules](#modules-srcmodules)
   - [Routes](#routes-srcroutes)
   - [Services](#services-srcservices)
   - [Shared](#shared-srcshared)
   - [Views](#views-srcviews)
5. [Public Assets](#public-assets-public)
6. [Documentation](#documentation-docs)
7. [Database Migrations](#database-drizzle)
8. [Scripts](#scripts-scripts)
9. [Tests](#tests-tests)
10. [Configuration Files](#configuration-files)
11. [Architecture Overview](#architecture-overview)
12. [Detailed Flow Diagrams](#detailed-flow-diagrams)
    - [Deployment Architecture](#deployment-architecture)
    - [Service Layer Interaction](#service-layer-interaction)
    - [Error Handling Flow](#error-handling-flow)
    - [Icon Collection Rendering Flow](#icon-collection-rendering-flow)
    - [Badge Collection Rendering Flow](#badge-collection-rendering-flow)
13. [Best Practices](#best-practices)
14. [Development Workflow](#development-workflow)
    - [Development Lifecycle Flow](#development-lifecycle-flow)
    - [Module Creation Workflow](#module-creation-workflow)
15. [Related Documentation](#related-documentation)

## Version

Current Version: **2.1.0**

## System Architecture Flow

### Overall Request Flow

```mermaid
flowchart LR
    Client[Client Request] --> LB[Load Balancer]
    LB --> W1[Worker 1]
    LB --> W2[Worker 2]
    LB --> W3[Worker N]
    
    W1 --> MW[Middleware Layer]
    W2 --> MW
    W3 --> MW
    
    MW --> Router[Router]
    Router --> Module[Module Controller]
    Module --> Service[Service Layer]
    
    Service --> Cache{Cache Hit?}
    Cache -->|Yes| Return[Return Cached SVG]
    Cache -->|No| Data[Data Layer]
    
    Data --> MEM[(Memory Cache)]
    Data --> REDIS[(Redis Cache)]
    Data --> DB[(SQLite DB)]
    Data --> API[GitHub API]
    
    MEM --> Render[SVG Renderer]
    REDIS --> Render
    DB --> Render
    API --> Render
    
    Render --> Store[Store in Cache]
    Store --> Return
    Return --> Client
```

### Module Architecture Flow

```mermaid
flowchart TD
    Request[HTTP Request] --> Routes[Route Handler]
    Routes --> Validation[Input Validation]
    Validation --> Controller[Controller]
    
    Controller --> Service[Service Layer]
    
    Service --> Cache{Check Cache}
    Cache -->|Hit| Response[Format Response]
    Cache -->|Miss| External[External APIs]
    
    External --> GitHub[GitHub API]
    External --> Database[(Database)]
    External --> FileSystem[File System]
    
    GitHub --> Transform[Data Transform]
    Database --> Transform
    FileSystem --> Transform
    
    Transform --> Render[Render Component]
    Render --> SaveCache[Save to Cache]
    SaveCache --> Response
    
    Response --> Controller
    Controller --> SVG[SVG/PNG/WebP]
    SVG --> Client[Client Response]
```

### Caching Strategy Flow

```mermaid
flowchart TD
    Request[Incoming Request] --> L1{L1: Memory Cache}
    
    L1 -->|Hit - TTL Valid| Return1[Return Immediately]
    L1 -->|Miss| L2{L2: Redis Cache}
    
    L2 -->|Hit - TTL Valid| Store1[Store in L1]
    Store1 --> Return2[Return Data]
    
    L2 -->|Miss| L3{L3: Database}
    
    L3 -->|Hit - Fresh Data| Store2[Store in Redis + Memory]
    Store2 --> Return3[Return Data]
    
    L3 -->|Miss/Stale| API[GitHub API Call]
    
    API --> Process[Process & Transform]
    Process --> StoreAll[Store in All Caches]
    StoreAll --> DB[(Update Database)]
    StoreAll --> Redis[(Update Redis)]
    StoreAll --> Mem[(Update Memory)]
    
    DB --> Return4[Return Fresh Data]
    Redis --> Return4
    Mem --> Return4
    
    Return1 --> Client[Client]
    Return2 --> Client
    Return3 --> Client
    Return4 --> Client
```

### Module Structure Flow

```mermaid
flowchart LR
    subgraph Module[" Module (badges/stats/icons/etc) "]
        direction TB
        Router[*.routes.ts<br/>Route Definitions] --> Controller[*.controller.ts<br/>Request Handler]
        Controller --> Service[*.service.ts<br/>Business Logic]
        Service --> Types[*.types.ts<br/>Type Definitions]
        Index[index.ts<br/>Module Exports] -.-> Router
        Index -.-> Controller
        Index -.-> Service
        Index -.-> Types
    end
    
    Module --> App[app.ts<br/>Main Application]
    
    App --> Middleware[Middleware Chain]
    Middleware --> ErrorHandler[Error Handler]
    
    Service --> Shared[Shared Utilities]
    
    subgraph Shared[" Shared Layer "]
        direction TB
        Utils[Utils] --- Components[Components]
        Utils --- Cache[Cache Manager]
        Utils --- GitHub[GitHub Client]
        Components --- Renderers[SVG Renderers]
    end
```

## Root Directory

```
stats.pphat.top/
├── src/                    # Source code
├── public/                 # Static assets
├── docs/                   # Documentation
├── data/                   # Database files
├── drizzle/               # Database migrations
├── scripts/               # Utility scripts
├── tests/                 # Test files
├── package.json           # Project dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── drizzle.config.ts      # Drizzle ORM configuration
├── wrangler.toml          # Cloudflare Workers configuration
├── ecosystem.config.cjs   # PM2 configuration
└── README.md              # Main documentation
```

### Directory Structure Visualization

```mermaid
graph TD
    Root[stats.pphat.top] --> Src[src/<br/>Source Code]
    Root --> Public[public/<br/>Static Assets]
    Root --> Docs[docs/<br/>Documentation]
    Root --> Data[data/<br/>Database]
    Root --> Drizzle[drizzle/<br/>Migrations]
    Root --> Scripts[scripts/<br/>Utilities]
    Root --> Tests[tests/<br/>Test Files]
    Root --> Config[Config Files<br/>*.json, *.ts, *.toml]
    
    Src --> SrcModules[modules/<br/>Feature Modules]
    Src --> SrcShared[shared/<br/>Shared Code]
    Src --> SrcConfig[config/<br/>Configuration]
    Src --> SrcDB[db/<br/>Database]
    Src --> SrcRoutes[routes/<br/>Routes]
    Src --> SrcServices[services/<br/>Services]
    Src --> SrcViews[views/<br/>UI Views]
    
    SrcModules --> Badges[badges/]
    SrcModules --> Stats[stats/]
    SrcModules --> Graphs[graphs/]
    SrcModules --> Icons[icons/]
    SrcModules --> Languages[languages/]
    SrcModules --> Health[health/]
    
    SrcShared --> Components[components/<br/>Renderers]
    SrcShared --> Utils[utils/<br/>Helpers]
    SrcShared --> Middleware[middlewares/]
    SrcShared --> Errors[errors/]
    SrcShared --> Validations[validations/]
    
    Public --> Assets[assets/icons/]
    Public --> CSS[css/]
    Public --> Fonts[fonts/]
    
    Docs --> HowTo[how-to/<br/>Guides]
    Docs --> Examples[example/<br/>Demos]
    Docs --> Release[RELEASE/]
    
    Tests --> Unit[unit/]
    Tests --> Integration[integration/]
    Tests --> E2E[e2e/]
    
    style Root fill:#4a90e2,color:#fff
    style Src fill:#50c878,color:#fff
    style SrcModules fill:#ff6b6b,color:#fff
    style SrcShared fill:#ffd93d,color:#000
    style Public fill:#a8dadc,color:#000
    style Docs fill:#b392ac,color:#fff
```

## Source Code (`src/`)

### Entry Points

```
src/
├── index.ts              # Main application entry point
├── server.ts             # Single-process server
├── server-cluster.ts     # Multi-core cluster server
├── cluster.ts            # Cluster management utilities
├── worker.ts             # Worker process logic
├── app.ts                # Express app configuration
└── types.ts              # Global TypeScript types
```

### Configuration (`src/config/`)

```
src/config/
├── index.ts              # Configuration exports
├── env.ts                # Environment variables
├── db.ts                 # Database configuration
├── logger.ts             # Logging configuration
└── swagger.ts            # API documentation setup
```

### Database (`src/db/`)

```
src/db/
├── index.ts              # Database exports
├── pool.ts               # Connection pooling
└── schema.ts             # Drizzle schema definitions
```

### Modules (`src/modules/`)

Feature-based modular architecture. Each module follows the same structure:

```
src/modules/
├── badges/               # User badge endpoints
│   ├── index.ts
│   ├── badges.controller.ts
│   ├── badges.routes.ts
│   ├── badges.service.ts
│   └── badges.types.ts
│
├── graphs/               # Contribution graph endpoints
│   ├── index.ts
│   ├── graphs.controller.ts
│   ├── graphs.routes.ts
│   ├── graphs.service.ts
│   └── graphs.types.ts
│
├── health/               # Health check endpoints
│   ├── index.ts
│   ├── health.controller.ts
│   ├── health.routes.ts
│   ├── health.service.ts
│   └── health.types.ts
│
├── icons/                # Icon delivery endpoints
│   ├── index.ts
│   ├── icons.controller.ts
│   ├── icons.routes.ts
│   ├── icons.service.ts
│   └── icons.types.ts
│
├── languages/            # Language statistics endpoints
│   ├── index.ts
│   ├── languages.controller.ts
│   ├── languages.routes.ts
│   ├── languages.service.ts
│   └── languages.types.ts
│
└── stats/                # User statistics endpoints
    ├── index.ts
    ├── stats.controller.ts
    ├── stats.routes.ts
    ├── stats.service.ts
    └── stats.types.ts
```

**Module Pattern:**
- `*.controller.ts` - Request handlers
- `*.routes.ts` - Route definitions
- `*.service.ts` - Business logic
- `*.types.ts` - TypeScript interfaces
- `index.ts` - Module exports

### Routes (`src/routes/`)

```
src/routes/
└── docs.routes.ts        # API documentation routes
```

### Services (`src/services/`)

```
src/services/
├── badge-cache.service.ts    # Badge caching logic
└── base.service.ts           # Base service class
```

### Shared (`src/shared/`)

Reusable components, utilities, and middleware:

```
src/shared/
├── components/           # Reusable UI components
│   ├── badge-renderer.ts
│   ├── card-renderer.ts
│   ├── graph-renderer.ts
│   ├── language-card.ts
│   ├── language-pie-chart.ts
│   └── icons-gallery/
│
├── utils/                # Utility functions
│   ├── index.ts
│   ├── cache.ts
│   ├── cache-middleware.ts
│   ├── badge-cache-manager.ts
│   ├── github-client.ts
│   ├── redis-client.ts
│   ├── global-error.ts
│   ├── sidebar.ts
│   ├── themes.ts
│   └── themes/
│       ├── base.ts
│       ├── badge.ts
│       └── graph.ts
│
├── middlewares/          # Express middleware
├── errors/               # Error handling
├── logs/                 # Logging utilities
├── validations/          # Input validation
├── types/                # Shared TypeScript types
└── constants.ts          # Application constants
```

### Views (`src/views/`)

```
src/views/
└── icons-demo.view.tsx   # Icons gallery demo page
```

## Public Assets (`public/`)

```
public/
├── assets/
│   └── icons/            # SVG icon collection
├── css/
│   ├── main.css
│   └── icons-demo.css
├── fonts/                # Web fonts
├── user/                 # User-specific assets
│   └── pphatdev/
├── icons-demo.js         # Icons demo script
└── sitemap.xml           # Sitemap
```

## Documentation (`docs/`)

```
docs/
├── PROJECT_STRUCTURE.md  # This file
├── collections/
│   └── postman_collection.json
│
├── example/              # Usage examples
│   ├── README.md
│   ├── badge-collection.md
│   ├── badge-user.md
│   ├── graph.md
│   ├── icon-collection.md
│   ├── icons.md
│   ├── languages.md
│   ├── project.md
│   └── stats.md
│
├── how-to/               # Development guides
│   ├── README.md
│   ├── DEVELOPMENT.md
│   ├── CORE_ROUTES.md
│   ├── USER_BADGES.md
│   ├── BADGE_COLLECTIONS.md
│   ├── PROJECT_BADGES.md
│   ├── CACHE_MONITORING.md
│   └── RELEASE/
│
└── RELEASE/              # Release notes
    ├── RELEASE_ICONS.md
    └── RELEASE_v2.0.3.md
```

## Database (`drizzle/`)

```
drizzle/
├── meta/
│   ├── _journal.json
│   ├── 0000_snapshot.json
│   └── 0002_snapshot.json
├── 0000_daily_trish_tilby.sql
├── 0000_supreme_bulldozer.sql
├── 0001_visitor_logs.sql
└── 0002_stats_requests.sql
```

## Scripts (`scripts/`)

```
scripts/
├── clear-redis-cache.ts      # Redis cache management
└── test-performance.sh       # Performance testing
```

## Tests (`tests/`)

```
tests/
├── unit/                 # Unit tests
├── integration/          # Integration tests
└── e2e/                  # End-to-end tests
```

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, and metadata |
| `tsconfig.json` | TypeScript compiler configuration |
| `drizzle.config.ts` | Drizzle ORM and database configuration |
| `wrangler.toml` | Cloudflare Workers deployment config |
| `ecosystem.config.cjs` | PM2 process manager configuration |
| `LICENSE` | MIT License |
| `CODE_OF_CONDUCT.md` | Community guidelines |
| `CONTRIBUTING.md` | Contribution guidelines |
| `README.md` | Main project documentation |

## Architecture Overview

### Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: SQLite with Drizzle ORM
- **Cache**: Redis (optional) + in-memory
- **Process Management**: PM2 / Native cluster module

### Design Patterns

1. **Modular Architecture**: Feature-based modules with clear separation of concerns
2. **Layered Architecture**: Controller → Service → Data layers
3. **Dependency Injection**: Services injected into controllers
4. **Caching Strategy**: Multi-tier (Memory → Redis → Database → API)
5. **Error Handling**: Centralized error middleware

### Module Responsibilities

- **Controllers**: Handle HTTP requests/responses, validation
- **Services**: Business logic, external API calls, data transformation
- **Routes**: Define endpoints and middleware chain
- **Types**: TypeScript interfaces and type definitions
- **Shared**: Cross-cutting concerns (logging, caching, utilities)

### Data Flow

```
Request → Middleware → Controller → Service → Cache/DB/GitHub API
                                                ↓
Response ← Renderer ← Transform ← Process ← Data
```

### Caching Strategy

1. **L1 Cache**: In-memory (600-3600s TTL)
2. **L2 Cache**: Redis (1min-2hrs TTL, optional)
3. **L3 Cache**: Database persistence (visitor counts, stats)
4. **Source**: GitHub API (rate-limited)

## Detailed Flow Diagrams

### Deployment Architecture

```mermaid
flowchart TB
    subgraph Production
        direction TB
        PM2[PM2 Process Manager] --> Master[Master Process]
        Master --> Worker1[Worker Process 1]
        Master --> Worker2[Worker Process 2]
        Master --> Worker3[Worker Process N]
        
        Worker1 --> Express1[Express App]
        Worker2 --> Express2[Express App]
        Worker3 --> Express3[Express App]
    end
    
    subgraph Shared Resources
        direction LR
        Redis[(Redis Cache<br/>Shared Memory)]
        SQLite[(SQLite DB<br/>Visitor Logs)]
        Files[/Static Files<br/>Icons & Assets/]
    end
    
    Express1 --> Redis
    Express2 --> Redis
    Express3 --> Redis
    
    Express1 --> SQLite
    Express2 --> SQLite
    Express3 --> SQLite
    
    Express1 --> Files
    Express2 --> Files
    Express3 --> Files
    
    Redis -.->|Fallback| GitHub[GitHub API]
    SQLite -.->|New Data| GitHub
```

### Service Layer Interaction

```mermaid
flowchart TD
    Controller[Controller Layer] --> BadgeService[Badge Service]
    Controller --> StatsService[Stats Service]
    Controller --> GraphService[Graph Service]
    Controller --> IconService[Icon Service]
    Controller --> LanguageService[Language Service]
    
    BadgeService --> BaseService[Base Service<br/>Common Logic]
    StatsService --> BaseService
    GraphService --> BaseService
    IconService --> BaseService
    LanguageService --> BaseService
    
    BaseService --> CacheService[Cache Service]
    BaseService --> GitHubClient[GitHub Client]
    BaseService --> Database[(Database)]
    
    CacheService --> RedisClient[Redis Client]
    CacheService --> MemoryCache[In-Memory Cache]
    
    GitHubClient --> REST[REST API]
    GitHubClient --> GraphQL[GraphQL API]
    
    subgraph Renderers
        BadgeRenderer[Badge Renderer]
        CardRenderer[Card Renderer]
        GraphRenderer[Graph Renderer]
        IconGallery[Icon Gallery]
    end
    
    BadgeService --> BadgeRenderer
    StatsService --> CardRenderer
    GraphService --> GraphRenderer
    IconService --> IconGallery
```

### Error Handling Flow

```mermaid
flowchart TD
    Request[Request] --> Try{Try Block}
    
    Try -->|Success| Process[Process Logic]
    Try -->|Error| Catch[Catch Error]
    
    Process --> Validate{Validation}
    Validate -->|Valid| Execute[Execute Service]
    Validate -->|Invalid| ValidationError[Validation Error]
    
    Execute --> APICall{API Call}
    APICall -->|Success| Transform[Transform Data]
    APICall -->|Rate Limit| RateLimitError[Rate Limit Error]
    APICall -->|Auth Error| AuthError[Auth Error]
    APICall -->|Not Found| NotFoundError[404 Error]
    
    Transform --> Render{Render SVG}
    Render -->|Success| Response[Success Response]
    Render -->|Error| RenderError[Render Error]
    
    Catch --> ErrorMiddleware[Error Middleware]
    ValidationError --> ErrorMiddleware
    RateLimitError --> ErrorMiddleware
    AuthError --> ErrorMiddleware
    NotFoundError --> ErrorMiddleware
    RenderError --> ErrorMiddleware
    
    ErrorMiddleware --> Log[Log Error]
    Log --> ErrorResponse[Error SVG/JSON]
    
    Response --> Client[Client]
    ErrorResponse --> Client
```

### Icon Collection Rendering Flow

```mermaid
flowchart LR
    Request[Request: icons?name=react,vue,node] --> Parse[Parse Icon Names]
    
    Parse --> Loop[For Each Icon]
    
    Loop --> Check{Icon Exists?}
    Check -->|Yes| Load[Load SVG File]
    Check -->|No| Fallback[Use Fallback Icon]
    
    Load --> Color{Custom Color?}
    Fallback --> Color
    
    Color -->|Yes| Apply[Apply Color Transform]
    Color -->|No| Default[Use Default Color]
    
    Apply --> Effect{Effect Enabled?}
    Default --> Effect
    
    Effect -->|Glow| AddGlow[Add Glow Filter]
    Effect -->|Wave| AddWave[Add Wave Animation]
    Effect -->|None| NoEffect[No Effect]
    
    AddGlow --> Collect[Collect Icons]
    AddWave --> Collect
    NoEffect --> Collect
    
    Collect --> Layout[Calculate Layout<br/>Columns & Gap]
    
    Layout --> Combine[Combine into SVG Grid]
    Combine --> Cache[Cache Result]
    Cache --> Response[Return SVG]
```

### Badge Collection Rendering Flow

```mermaid
flowchart TD
    Request[Request: badge/collection?type=stars,forks,visitors] --> ParseTypes[Parse Badge Types]
    
    ParseTypes --> Parallel{Parallel Fetch}
    
    Parallel --> Fetch1[Fetch Stars Data]
    Parallel --> Fetch2[Fetch Forks Data]
    Parallel --> Fetch3[Fetch Visitors Data]
    
    Fetch1 --> Cache1{Cache Hit?}
    Fetch2 --> Cache2{Cache Hit?}
    Fetch3 --> Cache3{Cache Hit?}
    
    Cache1 -->|Yes| Data1[Cached Data]
    Cache1 -->|No| API1[GitHub API]
    
    Cache2 -->|Yes| Data2[Cached Data]
    Cache2 -->|No| API2[GitHub API]
    
    Cache3 -->|Yes| Data3[Database Query]
    Cache3 -->|No| DB[Update Database]
    
    API1 --> Data1
    API2 --> Data2
    DB --> Data3
    
    Data1 --> Render1[Render Badge 1]
    Data2 --> Render2[Render Badge 2]
    Data3 --> Render3[Render Badge 3]
    
    Render1 --> Collect[Collect All Badges]
    Render2 --> Collect
    Render3 --> Collect
    
    Collect --> Layout[Apply Layout<br/>Columns, Gap, Padding]
    
    Layout --> Theme{Multi-Theme?}
    Theme -->|Yes| Cycle[Cycle Themes]
    Theme -->|No| Single[Single Theme]
    
    Cycle --> Combine[Combine SVG Collection]
    Single --> Combine
    
    Combine --> Effects{Effect Enabled?}
    Effects -->|Glow| ApplyGlow[Apply Glow Effect]
    Effects -->|Wave| ApplyWave[Apply Wave Animation]
    Effects -->|None| Final[Final SVG]
    
    ApplyGlow --> Final
    ApplyWave --> Final
    
    Final --> StoreCache[Store in Cache]
    StoreCache --> Return[Return to Client]
```

## Best Practices

### Module Creation

When creating a new module:

1. Create folder in `src/modules/{name}/`
2. Add required files: controller, routes, service, types, index
3. Export from index.ts
4. Register routes in main app.ts
5. Add documentation in `docs/how-to/`
6. Add examples in `docs/example/`

### File Naming

- Use kebab-case for files: `badge-renderer.ts`
- Use PascalCase for classes: `class BadgeRenderer`
- Use camelCase for functions: `function renderBadge()`
- Module files: `{module-name}.{type}.ts`

### Import Organization

```typescript
// 1. External dependencies
import express from 'express';

// 2. Config and types
import { config } from '@/config';

// 3. Services
import { BadgeService } from '@/modules/badges';

// 4. Utilities
import { cache } from '@/shared/utils';

// 5. Local imports
import { BadgeOptions } from './badges.types';
```

## Development Workflow

1. **Setup**: Install dependencies and configure environment
2. **Development**: Use `npm run dev` for hot reload
3. **Database**: Run migrations with `npm run db:migrate`
4. **Testing**: Execute tests with `npm test`
5. **Build**: Compile with `npm run build`
6. **Deploy**: Run cluster mode with `npm run start:cluster`

### Development Lifecycle Flow

```mermaid
flowchart TD
    Start[Start Development] --> Clone[Clone Repository]
    Clone --> Install[npm install]
    
    Install --> EnvSetup[Setup .env File]
    EnvSetup --> GitHubToken{GitHub Token?}
    
    GitHubToken -->|Yes| RedisSetup{Redis Available?}
    GitHubToken -->|No| LimitedMode[Limited Mode<br/>60 req/hour]
    
    RedisSetup -->|Yes| FullMode[Full Mode<br/>All Features]
    RedisSetup -->|No| MemoryMode[Memory Cache Only]
    
    LimitedMode --> DBSetup[Database Setup]
    FullMode --> DBSetup
    MemoryMode --> DBSetup
    
    DBSetup --> Generate[npm run db:generate]
    Generate --> Migrate[npm run db:migrate]
    
    Migrate --> DevMode{Development Mode}
    
    DevMode --> HotReload[npm run dev<br/>Hot Reload Server]
    
    HotReload --> Code[Write Code]
    
    Code --> Change{Code Changed?}
    Change -->|Yes| AutoReload[Auto Reload]
    Change -->|No| Continue[Continue Coding]
    
    AutoReload --> Test{Need Testing?}
    Continue --> Test
    
    Test -->|Yes| RunTests[npm test]
    Test -->|No| Code
    
    RunTests --> TestResult{Tests Pass?}
    TestResult -->|No| FixBugs[Fix Bugs]
    TestResult -->|Yes| ReadyBuild{Ready to Build?}
    
    FixBugs --> Code
    
    ReadyBuild -->|No| Code
    ReadyBuild -->|Yes| Build[npm run build]
    
    Build --> BuildSuccess{Build Success?}
    BuildSuccess -->|No| BuildError[Check Errors]
    BuildSuccess -->|Yes| LocalTest[Test Production Build]
    
    BuildError --> Code
    
    LocalTest --> StartSingle[npm start<br/>Single Process]
    StartSingle --> TestLocal{Works Locally?}
    
    TestLocal -->|No| Debug[Debug Issues]
    TestLocal -->|Yes| ClusterTest[npm run start:cluster<br/>Multi-Core Test]
    
    Debug --> Code
    
    ClusterTest --> LoadTest{Load Testing?}
    LoadTest -->|Yes| Performance[Run Performance Tests]
    LoadTest -->|No| ReadyDeploy{Ready to Deploy?}
    
    Performance --> Optimize{Needs Optimization?}
    Optimize -->|Yes| Code
    Optimize -->|No| ReadyDeploy
    
    ReadyDeploy -->|No| Code
    ReadyDeploy -->|Yes| Deploy[Deploy to Production]
    
    Deploy --> Monitor[Monitor Logs & Metrics]
    Monitor --> Production[Production Running]
    
    Production --> Issues{Issues Found?}
    Issues -->|Yes| Hotfix[Create Hotfix]
    Issues -->|No| Feature{New Feature?}
    
    Hotfix --> Code
    Feature -->|Yes| Code
    Feature -->|No| Maintain[Maintain & Monitor]
    
    Maintain --> Issues
```

### Module Creation Workflow

```mermaid
flowchart LR
    Start[New Module Request] --> Plan[Plan Module Structure]
    
    Plan --> CreateFolder[Create src/modules/NAME/]
    
    CreateFolder --> CreateFiles[Create Module Files]
    
    CreateFiles --> Types[NAME.types.ts<br/>Interfaces & Types]
    CreateFiles --> Service[NAME.service.ts<br/>Business Logic]
    CreateFiles --> Controller[NAME.controller.ts<br/>Request Handlers]
    CreateFiles --> Routes[NAME.routes.ts<br/>Route Definitions]
    CreateFiles --> Index[index.ts<br/>Module Exports]
    
    Types --> Implement[Implement Logic]
    Service --> Implement
    Controller --> Implement
    Routes --> Implement
    Index --> Implement
    
    Implement --> Register[Register in app.ts]
    
    Register --> Docs[Create Documentation]
    
    Docs --> HowTo[docs/how-to/MODULE.md]
    Docs --> Examples[docs/example/module.md]
    
    HowTo --> Test[Write Tests]
    Examples --> Test
    
    Test --> UnitTests[tests/unit/module.test.ts]
    Test --> IntegrationTests[tests/integration/module.test.ts]
    
    UnitTests --> Run[Run Test Suite]
    IntegrationTests --> Run
    
    Run --> Pass{Tests Pass?}
    
    Pass -->|No| Debug[Debug & Fix]
    Pass -->|Yes| Review[Code Review]
    
    Debug --> Implement
    
    Review --> Approved{Approved?}
    Approved -->|No| Revise[Make Changes]
    Approved -->|Yes| Merge[Merge to Main]
    
    Revise --> Implement
    
    Merge --> Done[Module Complete]
```

## Related Documentation

- [Development Guide](./how-to/DEVELOPMENT.md)
- [Core Routes](./how-to/CORE_ROUTES.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Main README](../README.md)
