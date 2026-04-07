/**
 * Health Module Types
 * Type definitions for health check and monitoring
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

export interface CheckResult {
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    responseTime?: number;
    details?: any;
}

export interface MemoryUsage {
    used: number;
    total: number;
    percentage: number;
}
