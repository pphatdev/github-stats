/**
 * Health Controller
 * Handles HTTP requests for health and monitoring endpoints
 */

import { Request, Response } from 'express';
import { HealthService } from './health.service.js';
import { createLogger } from '../../shared/logs/logger.js';

const logger = createLogger({ controller: 'HealthController' });

export class HealthController {
    private healthService: HealthService;

    constructor(healthService: HealthService) {
        this.healthService = healthService;
    }

    /**
     * Get comprehensive health status
     */
    async getHealth(req: Request, res: Response): Promise<void> {
        try {
            const health = await this.healthService.performHealthCheck();

            const statusCode = health.status === 'healthy' ? 200 :
                health.status === 'degraded' ? 200 :
                    503;

            res.status(statusCode).json(health);
        } catch (error) {
            logger.error('Health check failed', error as Error);
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: 'Health check failed'
            });
        }
    }

    /**
     * Get readiness status (for Kubernetes)
     */
    async getReady(req: Request, res: Response): Promise<void> {
        try {
            const ready = await this.healthService.isReady();

            if (ready) {
                res.status(200).json({ status: 'ready' });
            } else {
                res.status(503).json({ status: 'not ready' });
            }
        } catch (error) {
            logger.error('Readiness check failed', error as Error);
            res.status(503).json({ status: 'not ready', error: 'Check failed' });
        }
    }

    /**
     * Get liveness status (for Kubernetes)
     */
    getLive(req: Request, res: Response): void {
        const alive = this.healthService.isAlive();

        if (alive) {
            res.status(200).json({ status: 'alive' });
        } else {
            res.status(503).json({ status: 'dead' });
        }
    }

    /**
     * Simple ping endpoint
     */
    ping(req: Request, res: Response): void {
        res.status(200).send('pong');
    }
}
