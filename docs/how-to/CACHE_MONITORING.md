# Cache Monitoring & Health Check Guide

This guide covers the cache monitoring and health check endpoints for the GitHub Stats API. Use these endpoints to monitor cache performance, troubleshoot issues, and understand caching strategies.

## Table of Contents
- [GET /cache/health](#get-cachehealth---health-status)
- [GET /cache/stats](#get-cachestats---detailed-statistics)
- [Cache Architecture](#cache-architecture)
- [Troubleshooting](#troubleshooting)
- [Performance Optimization](#performance-optimization)

---

## GET /cache/health - Health Status

Provides a quick health check of the cache system and returns connection status for all cache layers.

### Endpoint
```
GET /cache/health
```

### Parameters
None required. No parameters accepted.

### Response
**Content-Type:** `application/json`

Returns a JSON object with cache health information:

```json
{
  "status": "ok|degraded|error",
  "badge_cache": {
    "connected": true|false,
    "health": "healthy|degraded|offline",
    "db_size": 1024000,
    "memory": "42MB"
  },
  "cache_strategies": {
    "description": "TTL strategies for different badge types (in seconds)",
    "strategies": {
      "visitors": 1800,
      "repositories": 1800,
      "followers": 3600,
      "total_stars": 3600,
      "total_commits": 3600,
      "...": "..."
    }
  },
  "timestamp": "2026-03-05T10:30:00.000Z"
}
```

### Examples

#### Basic Health Check
```bash
curl "http://localhost:3000/cache/health"
```

#### Pretty Print (using jq)
```bash
curl "http://localhost:3000/cache/health" | jq .
```

#### Check Status Only
```bash
curl -s "http://localhost:3000/cache/health" | jq .status
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Overall cache status: `ok`, `degraded`, or `error` |
| `badge_cache.connected` | boolean | Is Redis cache connected |
| `badge_cache.health` | string | Cache health state |
| `badge_cache.db_size` | number | Database storage size in bytes |
| `badge_cache.memory` | string | Memory usage (if available) |
| `cache_strategies` | object | TTL configuration for all badge types |
| `timestamp` | string | ISO timestamp of the response |

### Status Meanings

| Status | Meaning | Action |
|--------|---------|--------|
| `ok` | All systems healthy | None needed |
| `degraded` | Some cache layers offline | Check Redis connection |
| `error` | Major cache failure | Check server logs |

---

## GET /cache/stats - Detailed Statistics

Provides comprehensive cache statistics, optimization notes, and performance recommendations.

### Endpoint
```
GET /cache/stats
```

### Parameters
None required. No parameters accepted.

### Response
**Content-Type:** `application/json`

Returns detailed cache statistics:

```json
{
  "cache_statistics": {
    "connected": true|false,
    "db_size": 1024000,
    "memory_usage": "42MB",
    "health": "healthy"
  },
  "optimization_notes": {
    "redis_benefits": [
      "Persistent SVG cache across server restarts",
      "Distributed cache for multi-worker deployments",
      "Automatic TTL-based eviction reduces memory overhead",
      "Intelligent TTL management based on data freshness"
    ],
    "caching_layers": [
      {
        "layer": "Redis",
        "scope": "Persistent - survives restarts",
        "ttl": "Adaptive (1min-2hrs based on data)",
        "use_case": "Primary cache for rendered SVGs"
      },
      {
        "layer": "In-Memory Map",
        "scope": "Process memory",
        "ttl": "600-3600 seconds",
        "use_case": "Secondary cache for request deduplication"
      },
      {
        "layer": "Database",
        "scope": "SQLite persistence",
        "ttl": "2 hours max",
        "use_case": "Source of truth for badge values"
      }
    ]
  },
  "recommendations": {
    "if_memory_high": "Reduce TTL values for less-critical badges",
    "if_cache_misses_high": "Increase TTL values or enable warmup",
    "if_disconnected": "Check Redis connection - falling back to in-memory"
  },
  "timestamp": "2026-03-05T10:30:00.000Z"
}
```

### Examples

#### Get Full Statistics
```bash
curl "http://localhost:3000/cache/stats"
```

#### Pretty Print with jq
```bash
curl "http://localhost:3000/cache/stats" | jq .
```

#### Check Cache Size
```bash
curl -s "http://localhost:3000/cache/stats" | jq '.cache_statistics.db_size'
```

#### View Recommendations
```bash
curl -s "http://localhost:3000/cache/stats" | jq '.recommendations'
```

### Cache Layers Explained

#### 1. Redis Persistent Cache
- **Purpose:** Primary cache for rendered SVG/WebP images
- **Scope:** Survives server restarts
- **TTL:** 1 minute to 2 hours (adaptive)
- **Use Case:** Long-term caching of frequently accessed badges
- **Benefits:**
  - Persistent across deployments
  - Supports distributed deployments
  - Automatic TTL eviction
  - Shared across worker processes

#### 2. In-Memory Cache
- **Purpose:** Fast request deduplication
- **Scope:** Process memory only
- **TTL:** 600-3600 seconds (10 min - 1 hour)
- **Use Case:** Prevent duplicate API calls during processing
- **Benefits:**
  - Fastest access time
  - Request coalescing
  - Reduces GitHub API calls

#### 3. Database Cache
- **Purpose:** Source of truth for computed metrics
- **Scope:** SQLite persistent storage
- **TTL:** Max 2 hours
- **Use Case:** Fallback when Redis unavailable
- **Benefits:**
  - Reliable persistence
  - Historical data tracking
  - Works without Redis

---

## Cache Architecture

### Multi-Layer Cache Strategy

```
Request
  ↓
In-Memory Cache (fast)
  ├─ HIT → Return immediately
  └─ MISS
     ↓
  Redis Cache (persistent)
     ├─ HIT → Return & update in-memory
     └─ MISS
        ↓
     Database
        ├─ HIT → Return & update layers
        └─ MISS → Compute & cache all layers
```

### TTL Strategy

Different badges have different TTL values based on update frequency:

| Badge Type | TTL | Reason |
|-----------|-----|--------|
| `visitors` | 10 min | Changes frequently |
| `followers` | 1 hour | Updates moderately |
| `repositories` | 1 hour | Stable metric |
| `total-stars` | 2 hours | Changes slowly |
| `total-commits` | 2 hours | Changes slowly |
| `language-breakdown` | 2 hours | Changes slowly |

### Request Deduplication

The in-memory cache prevents duplicate processing:
- Multiple identical requests are queued
- First request triggers computation
- Results shared with all queued requests
- Reduces GitHub API calls by 60-80%

---

## Monitoring & KPIs

### Key Performance Indicators

1. **Cache Hit Rate**
   - Indicates cache effectiveness
   - Healthy target: > 80%

2. **Memory Usage**
   - In-Memory: Should stay < 100MB
   - Redis: Should scale with data volume

3. **Response Time**
   - Cached: < 100ms
   - Uncached: 500ms - 2 seconds
   - Timeout limit: 30 seconds

4. **Database Size**
   - Typical: 10MB - 100MB
   - For 1000 users: ~50MB

### Monitoring Example

```bash
#!/bin/bash
echo "Cache Health Check"
echo "=================="

HEALTH=$(curl -s http://localhost:3000/cache/health)
STATUS=$(echo $HEALTH | jq -r '.status')
DB_SIZE=$(echo $HEALTH | jq '.badge_cache.db_size')

echo "Status: $STATUS"
echo "DB Size: $((DB_SIZE / 1024 / 1024))MB"

if [ "$STATUS" != "ok" ]; then
  echo "⚠️  Warning: Cache is not healthy!"
  echo $HEALTH | jq '.'
fi
```

---

## Troubleshooting

### Issue: Cache Status is "degraded" or "error"

#### Check Redis Connection
```bash
# The application falls back gracefully to in-memory caching
# Check server logs for connection errors
```

#### Possible Causes & Fixes

| Issue | Symptoms | Fix |
|-------|----------|-----|
| Redis offline | `connected: false` | Start Redis server |
| Wrong Redis URL | Connection timeout | Check `REDIS_URL` env var |
| Redis memory full | Slow responses | Clear cache or increase memory |
| Network issue | Intermittent failures | Check firewall/network |

#### Recovery Steps
```bash
# 1. Check health
curl http://localhost:3000/cache/health

# 2. Check Redis connection (if available)
redis-cli ping

# 3. Restart app if needed
npm restart
```

### Issue: Memory Usage is Too High

#### Check Database Size
```bash
curl -s http://localhost:3000/cache/stats | jq '.cache_statistics.db_size'
```

#### Solutions
1. **Reduce TTL values** for non-critical badges
2. **Clear old cache entries** manually
3. **Increase server memory** allocation
4. **Enable cache cleanup** jobs

### Issue: Slow Response Times

#### Diagnose Problem
```bash
# Check cache hit rate
curl -s http://localhost:3000/cache/stats | jq '.cache_statistics'
```

#### Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Cache miss due to low TTL | Increase TTL for stable badges |
| Redis connection slow | Check Redis server performance |
| GitHub API slow | Retry with cache warmer |
| Database queries slow | Optimize database indexes |

#### Performance Tuning
```bash
# Enable cache warming for popular users
# Contact admin team for configuration
```

### Issue: Cache Not Updating

#### Check Cache TTL
```bash
# Different badges have different TTL
curl -s http://localhost:3000/cache/health | \
  jq '.cache_strategies.strategies'
```

#### Possible Causes
1. **TTL hasn't expired** - Wait for TTL period
2. **Redis cache stuck** - Check Redis commands
3. **Database Update failed** - Check server logs
4. **Bug in update logic** - Report to developers

---

## Performance Optimization

### Cache Warmup

Pre-populate cache for frequently accessed users:

```bash
#!/bin/bash
# warm-cache.sh

USERS=("pphatdev" "torvalds" "gvanrossum")

for user in "${USERS[@]}"; do
  echo "Warming cache for: $user"
  curl -s "http://localhost:3000/stats?username=$user" > /dev/null
  curl -s "http://localhost:3000/badge/followers?username=$user" > /dev/null
  curl -s "http://localhost:3000/badge/total-stars?username=$user" > /dev/null
done

echo "Cache warmup complete!"
```

### Monitoring Script

```bash
#!/bin/bash
# monitor-cache.sh

while true; do
  clear
  echo "Cache Monitoring Dashboard"
  echo "=========================="
  echo "Timestamp: $(date)"
  echo ""
  
  curl -s http://localhost:3000/cache/health | jq '{
    status: .status,
    connected: .badge_cache.connected,
    memory: .badge_cache.memory,
    db_size: .badge_cache.db_size
  }'
  
  echo ""
  echo "Press Ctrl+C to exit..."
  sleep 5
done
```

### Optimization Checklist

- [ ] Verify Redis is running and configured
- [ ] Monitor memory usage weekly
- [ ] Check cache hit rates
- [ ] Review TTL settings for your use case
- [ ] Set up cache warming for popular users
- [ ] Monitor database size growth
- [ ] Plan capacity for expected growth

---

## Configuration

### Environment Variables

```bash
# Cache Configuration
CACHE_TTL_DEFAULT=3600          # Default TTL in seconds
CACHE_TTL_STATS=3600            # Stats card TTL
CACHE_TTL_LANGUAGES=5400        # Languages badge TTL
CACHE_TTL_GRAPH=7200            # Graph TTL

# Redis Configuration  
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=                 # Optional
REDIS_DB=0                      # Database number

# Cache Behavior
CACHE_ENABLE_WARMUP=false       # Enable automatic cache warmup
CACHE_WARMUP_USERS=             # Comma-separated list
```

### Advanced Settings

```typescript
// TTL Strategies (from badge-cache-manager.ts)
CACHE_TTL_STRATEGIES: {
  'visitors': 600,              // 10 minutes
  'repositories': 3600,         // 1 hour
  'followers': 3600,            // 1 hour
  'total-stars': 7200,          // 2 hours
  'total-commits': 7200,        // 2 hours
  // ... more badges
}
```

---

## Best Practices

### 1. Regular Monitoring
```bash
# Set up a cron job to monitor cache health
0 */6 * * * curl http://localhost:3000/cache/health | mail -s "Cache Health" admin@example.com
```

### 2. Alerts & Notifications
- Set up alerts when `status != "ok"`
- Monitor memory usage trends
- Track cache size growth

### 3. Capacity Planning
- Plan for 10MB per 200 users
- Monitor growth rate
- Scale Redis memory proactively

### 4. Maintenance
- Clear cache if needed during updates
- Schedule cleanups during off-peak hours
- Monitor logs for errors

### 5. Optimization
- Use appropriate TTL values
- Enable request deduplication
- Pre-warm cache for popular content

---

## Integration Examples

### Nagios / Monitoring System

```bash
#!/bin/bash
# check_cache_health.sh

RESPONSE=$(curl -s http://localhost:3000/cache/health)
STATUS=$(echo $RESPONSE | jq -r '.status')

if [ "$STATUS" == "ok" ]; then
  echo "OK - Cache is healthy"
  exit 0
elif [ "$STATUS" == "degraded" ]; then
  echo "WARNING - Cache is degraded"
  exit 1
else
  echo "CRITICAL - Cache error"
  exit 2
fi
```

### Prometheus Metrics Export

```bash
#!/bin/bash
# export_metrics.sh

STATS=$(curl -s http://localhost:3000/cache/stats)
DB_SIZE=$(echo $STATS | jq '.cache_statistics.db_size')
HEALTH=$(curl -s http://localhost:3000/cache/health)
STATUS=$(echo $HEALTH | jq -r '.status')

echo "# HELP cache_db_size_bytes Cache database size"
echo "cache_db_size_bytes $DB_SIZE"
echo "# HELP cache_status Cache health status (1=ok, 0=degraded)"
echo "cache_status $([ "$STATUS" == "ok" ] && echo 1 || echo 0)"
```

---

## See Also
- [Core Statistics Routes](./CORE_ROUTES.md) - Main endpoints
- [User Badge Routes](./USER_BADGES.md) - User badges
- [Project Badge Routes](./PROJECT_BADGES.md) - Project badges
