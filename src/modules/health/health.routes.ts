/**
 * Health Routes
 * Defines HTTP routes for health check endpoints
 */

import { Router } from 'express';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

export function createHealthRouter(cacheService?: any): Router {
    const router = Router();

    // Initialize service and controller
    const healthService = new HealthService(cacheService);
    const healthController = new HealthController(healthService);

    /**
     * @route GET /health
     * @desc Get comprehensive health status
     */
    router.get('/', async (req, res) => {
        await healthController.getHealth(req, res);
    });

    /**
     * @route GET /health/ready
     * @desc Kubernetes readiness probe
     */
    router.get('/ready', async (req, res) => {
        await healthController.getReady(req, res);
    });

    /**
     * @route GET /health/live
     * @desc Kubernetes liveness probe
     */
    router.get('/live', (req, res) => {
        healthController.getLive(req, res);
    });

    /**
     * @route GET /health/ping
     * @desc Simple ping endpoint
     */
    router.get('/ping', (req, res) => {
        healthController.ping(req, res);
    });

    return router;
}
