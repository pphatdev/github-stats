import 'dotenv/config';
import { getRedisClient, closeRedisClient, CACHE_KEYS } from '../src/utils/redis-client.js';
import { db } from '../src/db/index.js';
import { badges, visitorLogs } from '../src/db/schema.js';
import { like, sql } from 'drizzle-orm';

interface ClearOptions {
    pattern?: string;
    dryRun?: boolean;
    redis?: boolean;
    database?: boolean;
    includeLogs?: boolean;
}

async function clearRedisCache(options: ClearOptions): Promise<void> {
    const { pattern = '*', dryRun = false } = options;

    console.log('\n📦 Redis Cache');
    console.log('─'.repeat(40));
    console.log('🔄 Connecting to Redis...');

    try {
        const client = await getRedisClient();
        console.log('✅ Connected to Redis');

        // Get all keys matching the pattern
        const keys = await client.keys(pattern);

        if (keys.length === 0) {
            console.log(`ℹ️  No keys found matching pattern: "${pattern}"`);
            return;
        }

        console.log(`📦 Found ${keys.length} key(s) matching pattern: "${pattern}"`);

        if (dryRun) {
            console.log('\n🔍 Dry run mode - keys that would be deleted:');
            keys.forEach((key, index) => {
                console.log(`   ${index + 1}. ${key}`);
            });
            return;
        }

        // Delete all matching keys
        console.log('🗑️  Deleting keys...');
        const deleted = await client.del(keys);

        console.log(`✅ Successfully deleted ${deleted} Redis key(s)`);

    } catch (error) {
        console.error('❌ Redis Error:', error instanceof Error ? error.message : error);
        throw error;
    } finally {
        await closeRedisClient();
        console.log('👋 Redis connection closed');
    }
}

async function clearDatabaseCache(options: ClearOptions): Promise<void> {
    const { pattern = '*', dryRun = false, includeLogs = false } = options;

    console.log('\n🗄️  Database Cache');
    console.log('─'.repeat(40));

    try {
        // Convert Redis-style pattern to SQL LIKE pattern
        const sqlPattern = pattern === '*' ? '%' : pattern.replace(/\*/g, '%');
        const isAllPattern = pattern === '*';

        // Clear badges table
        let badgeCount: number;
        if (isAllPattern) {
            const countResult = db.select({ count: sql<number>`count(*)` }).from(badges).get();
            badgeCount = countResult?.count ?? 0;
        } else {
            const countResult = db.select({ count: sql<number>`count(*)` }).from(badges)
                .where(like(badges.username, sqlPattern)).get();
            badgeCount = countResult?.count ?? 0;
        }

        console.log(`📊 Found ${badgeCount} badge record(s) matching pattern`);

        if (dryRun) {
            console.log('🔍 Dry run mode - records that would be deleted:');
            const records = isAllPattern
                ? db.select({ username: badges.username }).from(badges).all()
                : db.select({ username: badges.username }).from(badges)
                    .where(like(badges.username, sqlPattern)).all();
            records.forEach((r, i) => console.log(`   ${i + 1}. badges: ${r.username}`));
        } else if (badgeCount > 0) {
            if (isAllPattern) {
                db.delete(badges).run();
            } else {
                db.delete(badges).where(like(badges.username, sqlPattern)).run();
            }
            console.log(`✅ Deleted ${badgeCount} badge record(s)`);
        }

        // Optionally clear visitor logs
        if (includeLogs) {
            let logCount: number;
            if (isAllPattern) {
                const countResult = db.select({ count: sql<number>`count(*)` }).from(visitorLogs).get();
                logCount = countResult?.count ?? 0;
            } else {
                const countResult = db.select({ count: sql<number>`count(*)` }).from(visitorLogs)
                    .where(like(visitorLogs.username, sqlPattern)).get();
                logCount = countResult?.count ?? 0;
            }

            console.log(`📋 Found ${logCount} visitor log(s) matching pattern`);

            if (dryRun) {
                console.log('🔍 Dry run mode - visitor logs would be deleted');
            } else if (logCount > 0) {
                if (isAllPattern) {
                    db.delete(visitorLogs).run();
                } else {
                    db.delete(visitorLogs).where(like(visitorLogs.username, sqlPattern)).run();
                }
                console.log(`✅ Deleted ${logCount} visitor log(s)`);
            }
        }

        console.log('✅ Database cache cleared');

    } catch (error) {
        console.error('❌ Database Error:', error instanceof Error ? error.message : error);
        throw error;
    }
}

async function clearCache(options: ClearOptions = {}): Promise<void> {
    const { redis = true, database = true, dryRun = false } = options;

    if (dryRun) {
        console.log('🔍 DRY RUN MODE - No data will be deleted\n');
    }

    let hasError = false;

    if (redis) {
        try {
            await clearRedisCache(options);
        } catch {
            hasError = true;
        }
    }

    if (database) {
        try {
            await clearDatabaseCache(options);
        } catch {
            hasError = true;
        }
    }

    if (!dryRun) {
        console.log('\n' + '═'.repeat(40));
        console.log(hasError ? '⚠️  Completed with errors' : '✅ All cache cleared successfully!');
    } else {
        console.log('\n💡 Run without --dry-run to actually delete');
    }

    if (hasError) {
        process.exit(1);
    }
}

function printUsage(): void {
    console.log(`
📖 Cache Clear Script

Usage:
  npx tsx scripts/clear-redis-cache.ts [options]

Options:
  --pattern <pattern>   Key pattern to match (default: "*" for all keys)
  --redis-only          Clear only Redis cache
  --db-only             Clear only database cache
  --include-logs        Also clear visitor logs (use with caution)
  --dry-run             Show what would be deleted without actually deleting
  --help                Show this help message

Examples:
  # Clear all cache (Redis + Database)
  npx tsx scripts/clear-redis-cache.ts

  # Clear only Redis cache
  npx tsx scripts/clear-redis-cache.ts --redis-only

  # Clear only database cache
  npx tsx scripts/clear-redis-cache.ts --db-only

  # Clear cache for specific user
  npx tsx scripts/clear-redis-cache.ts --pattern "*pphatdev*"

  # Clear with visitor logs (careful!)
  npx tsx scripts/clear-redis-cache.ts --db-only --include-logs

  # Preview what will be deleted (dry run)
  npx tsx scripts/clear-redis-cache.ts --dry-run

Available cache key patterns (Redis):
  stats:*              - User stats cache
  languages:*          - Language stats cache
  graph:*              - Graph cache
  badge:*              - All badge cache
  user:*               - User data cache

Database tables:
  badges               - Cached badge statistics per user
  visitor_logs         - Visitor tracking logs (--include-logs to clear)
`);
}

// Parse command line arguments
function parseArgs(): ClearOptions & { help: boolean } {
    const args = process.argv.slice(2);
    const options: ClearOptions & { help: boolean } = {
        pattern: '*',
        dryRun: false,
        redis: true,
        database: true,
        includeLogs: false,
        help: false,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg === '--redis-only') {
            options.redis = true;
            options.database = false;
        } else if (arg === '--db-only') {
            options.redis = false;
            options.database = true;
        } else if (arg === '--include-logs') {
            options.includeLogs = true;
        } else if (arg === '--pattern' && args[i + 1]) {
            options.pattern = args[++i];
        }
    }

    return options;
}

// Main execution
const options = parseArgs();

if (options.help) {
    printUsage();
    process.exit(0);
}

console.log('🧹 Cache Clear Script');
console.log('═'.repeat(40));
clearCache(options);
