/**
 * Health Service
 * Business logic for health checks and system monitoring
 */

import { db } from '../../db/index.js';
import { sql } from 'drizzle-orm';
import { createLogger } from '../../shared/logs/logger.js';
import type { ICacheService } from '../../services/base.service.js';
import type { HealthStatus, CheckResult, MemoryUsage } from './health.types.js';

const logger = createLogger({ service: 'HealthService' });

export class HealthService {
    private startTime: number;
    private cacheService?: Pick<ICacheService, 'get' | 'set' | 'del'>;

    constructor(cacheService?: unknown) {
        this.startTime = Date.now();
        this.cacheService = this.isCacheServiceCompatible(cacheService) ? cacheService : undefined;

        if (cacheService && !this.cacheService) {
            logger.warn('HealthService received incompatible cache service implementation');
        }
    }

    private isCacheServiceCompatible(cacheService?: unknown): cacheService is Pick<ICacheService, 'get' | 'set' | 'del'> {
        return Boolean(
            cacheService
            && typeof (cacheService as Pick<ICacheService, 'get' | 'set' | 'del'>).get === 'function'
            && typeof (cacheService as Pick<ICacheService, 'get' | 'set' | 'del'>).set === 'function'
            && typeof (cacheService as Pick<ICacheService, 'get' | 'set' | 'del'>).del === 'function'
        );
    }

    /**
     * Perform comprehensive health check
     */
    async performHealthCheck(): Promise<HealthStatus> {
        const [databaseCheck, cacheCheck, memoryCheck] = await Promise.all([
            this.checkDatabase(),
            this.checkCache(),
            this.checkMemory()
        ]);

        const status = this.determineOverallStatus([
            databaseCheck,
            cacheCheck,
            memoryCheck
        ]);

        return {
            status,
            timestamp: new Date().toISOString(),
            uptime: this.getUptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            checks: {
                database: databaseCheck,
                cache: cacheCheck,
                memory: memoryCheck
            }
        };
    }

    /**
     * Check database connectivity
     */
    private async checkDatabase(): Promise<CheckResult> {
        const startTime = Date.now();

        try {
            // Simple query to test database
            await db.get(sql`SELECT 1`);

            return {
                status: 'pass',
                responseTime: Date.now() - startTime,
            };
        } catch (error) {
            logger.error('Database health check failed', error as Error);
            return {
                status: 'fail',
                message: 'Database connection failed',
                responseTime: Date.now() - startTime,
            };
        }
    }

    /**
     * Check cache service
     */
    private async checkCache(): Promise<CheckResult> {
        const startTime = Date.now();

        if (!this.cacheService) {
            return {
                status: 'warn',
                message: 'Cache service not initialized',
            };
        }

        try {
            // Test cache connectivity with a simple operation
            const testKey = 'health-check-test';
            const testValue = Date.now().toString();

            await this.cacheService.set(testKey, testValue, 10);
            const retrieved = await this.cacheService.get(testKey);
            const normalizedRetrieved = retrieved == null ? null : String(retrieved);

            if (normalizedRetrieved !== testValue) {
                throw new Error('Cache read/write mismatch');
            }

            await this.cacheService.del(testKey);

            return {
                status: 'pass',
                responseTime: Date.now() - startTime,
            };
        } catch (error) {
            logger.error('Cache health check failed', error as Error);
            return {
                status: 'fail',
                message: 'Cache service failed',
                responseTime: Date.now() - startTime,
            };
        }
    }

    /**
     * Check memory usage
     */
    private async checkMemory(): Promise<CheckResult> {
        const memoryUsage = this.getMemoryUsage();
        const threshold = 90; // 90% threshold

        if (memoryUsage.percentage >= threshold) {
            logger.warn('High memory usage detected', { memoryUsage });
            return {
                status: 'warn',
                message: `Memory usage at ${memoryUsage.percentage.toFixed(2)}%`,
                details: memoryUsage
            };
        }

        return {
            status: 'pass',
            details: memoryUsage
        };
    }

    /**
     * Get memory usage information
     */
    private getMemoryUsage(): MemoryUsage {
        const mem = process.memoryUsage();
        const used = mem.heapUsed;
        const total = mem.heapTotal;
        const percentage = (used / total) * 100;

        return {
            used: Math.round(used / 1024 / 1024), // MB
            total: Math.round(total / 1024 / 1024), // MB
            percentage: Math.round(percentage * 100) / 100
        };
    }

    /**
     * Get application uptime in seconds
     */
    private getUptime(): number {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    /**
     * Determine overall health status based on individual checks
     */
    private determineOverallStatus(checks: CheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
        const hasFailure = checks.some(check => check.status === 'fail');
        const hasWarning = checks.some(check => check.status === 'warn');

        if (hasFailure) {
            return 'unhealthy';
        }

        if (hasWarning) {
            return 'degraded';
        }

        return 'healthy';
    }

    /**
     * Get simple readiness check
     */
    async isReady(): Promise<boolean> {
        try {
            await db.get(sql`SELECT 1`);
            return true;
        } catch (error) {
            logger.error('Readiness check failed', error as Error);
            return false;
        }
    }

    /**
     * Get simple liveness check
     */
    isAlive(): boolean {
        return true;
    }
}
