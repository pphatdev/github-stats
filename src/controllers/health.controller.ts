/**
 * Health Check and Monitoring Endpoints
 * Provides system health status and metrics for monitoring
 */

import { Request, Response } from 'express';
import { ICacheService } from '../services/base.js';
import { db } from '../db/index.js';
import { createLogger } from '../common/logger.js';
import { getConfig } from '../config/index.js';

const logger = createLogger({ service: 'HealthCheck' });

/**
 * Health check status
 */
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    checks: {
        database: CheckResult;
        cache: CheckResult;
        memory: CheckResult;
    };
}

interface CheckResult {
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    responseTime?: number;
    details?: any;
}

/**
 * Service dependencies
 */
let cacheService: ICacheService | null = null;

export function initializeHealthCheck(cache: ICacheService): void {
    cacheService = cache;
}

/**
 * Perform database health check
 */
async function checkDatabase(): Promise<CheckResult> {
    const startTime = Date.now();

    try {
        // Simple query to test database
        await db.run('SELECT 1');

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
 * Perform cache health check
 */
async function checkCache(): Promise<CheckResult> {
    const startTime = Date.now();

    if (!cacheService) {
        return {
            status: 'warn',
            message: 'Cache service not initialized',
        };
    }

    try {
        const testKey = '_health_check_';
        const testValue = Date.now().toString();

        await cacheService.set(testKey, testValue, 5000);
        const retrieved = await cacheService.get<string>(testKey);
        await cacheService.del(testKey);

        if (retrieved !== testValue) {
            return {
                status: 'fail',
                message: 'Cache read/write verification failed',
                responseTime: Date.now() - startTime,
            };
        }

        return {
            status: 'pass',
            responseTime: Date.now() - startTime,
        };
    } catch (error) {
        logger.error('Cache health check failed', error as Error);
        return {
            status: 'warn',
            message: 'Cache check failed - falling back to memory cache',
            responseTime: Date.now() - startTime,
        };
    }
}

/**
 * Check memory usage
 */
function checkMemory(): CheckResult {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message: string | undefined;

    if (heapUsagePercent > 90) {
        status = 'fail';
        message = 'Critical memory usage';
    } else if (heapUsagePercent > 75) {
        status = 'warn';
        message = 'High memory usage';
    }

    return {
        status,
        message,
        details: {
            heapUsed: `${heapUsedMB} MB`,
            heapTotal: `${heapTotalMB} MB`,
            heapUsagePercent: `${heapUsagePercent.toFixed(2)}%`,
            rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
        },
    };
}

/**
 * Main health check endpoint
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const config = getConfig();

    try {
        // Run all health checks in parallel
        const [databaseCheck, cacheCheck] = await Promise.all([
            checkDatabase(),
            checkCache(),
        ]);

        const memoryCheck = checkMemory();

        // Determine overall status
        const checks = { database: databaseCheck, cache: cacheCheck, memory: memoryCheck };
        const hasFailure = Object.values(checks).some(check => check.status === 'fail');
        const hasWarning = Object.values(checks).some(check => check.status === 'warn');

        let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
        if (hasFailure) {
            overallStatus = 'unhealthy';
        } else if (hasWarning) {
            overallStatus = 'degraded';
        } else {
            overallStatus = 'healthy';
        }

        const health: HealthStatus = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: config.server.env,
            checks,
        };

        const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

        res.status(statusCode).json(health);

        logger.debug('Health check completed', {
            status: overallStatus,
            duration: Date.now() - startTime,
        });
    } catch (error) {
        logger.error('Health check failed', error as Error);

        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
        });
    }
}

/**
 * Liveness probe (simple check)
 */
export function livenessProbe(req: Request, res: Response): void {
    res.status(200).json({ status: 'alive' });
}

/**
 * Readiness probe (check if ready to serve traffic)
 */
export async function readinessProbe(req: Request, res: Response): Promise<void> {
    try {
        // Check critical dependencies
        await checkDatabase();

        res.status(200).json({ status: 'ready' });
    } catch (error) {
        logger.error('Readiness check failed', error as Error);
        res.status(503).json({ status: 'not ready' });
    }
}

/**
 * Metrics endpoint
 */
export function metrics(req: Request, res: Response): void {
    const usage = process.memoryUsage();
    const config = getConfig();

    const metricsData = {
        uptime: process.uptime(),
        memory: {
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            rss: usage.rss,
            external: usage.external,
        },
        process: {
            pid: process.pid,
            nodeVersion: process.version,
            platform: process.platform,
        },
        environment: config.server.env,
    };

    res.json(metricsData);
}
