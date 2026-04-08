# Project Structure: Overview and Flows

## Version

Current Version: **2.1.1**

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

## Architecture Overview

### Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: SQLite with Drizzle ORM
- **Cache**: Redis (optional) + in-memory
- **Process Management**: PM2 / Native cluster module

### Data Flow

```text
Request -> Middleware -> Controller -> Service -> Cache/DB/GitHub API
                                                ->
Response <- Renderer <- Transform <- Process <- Data
```
