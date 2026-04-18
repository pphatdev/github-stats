/**
 * Cluster Mode Support
 * Utilizes all CPU cores for maximum performance
 */

import cluster from 'cluster';
import os from 'os';
import { createLogger } from './shared/logs/logger.js';

const logger = createLogger({ service: 'ClusterManager' });

interface ClusterOptions {
    workers?: number;
    respawnDelay?: number;
    maxRestarts?: number;
}

/**
 * Start application in cluster mode
 */
export async function startCluster(
    workerFile: string,
    options: ClusterOptions = {}
) {
    const availableWorkers = typeof os.availableParallelism === 'function'
        ? os.availableParallelism()
        : os.cpus().length;
    const {
        workers = availableWorkers,
        respawnDelay = 1000,
        maxRestarts = 5
    } = options;
    const workerCount = Math.max(1, Math.min(workers, availableWorkers));

    if (cluster.isPrimary) {
        cluster.schedulingPolicy = cluster.SCHED_RR;

        logger.info('Starting cluster mode', {
            workers: workerCount,
            cpus: availableWorkers,
            platform: os.platform(),
            memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
            schedulingPolicy: 'round-robin'
        });

        const workerRestarts = new Map<number, number>();
        const workerSlots = new Map<number, number>();
        let isShuttingDown = false;
        let healthCheckInterval: NodeJS.Timeout | undefined;

        // Spawn workers
        for (let slot = 1; slot <= workerCount; slot++) {
            spawnWorker(slot, workerSlots);
        }

        // Handle worker exit
        cluster.on('exit', (worker, code, signal) => {
            const workerId = worker.id;
            const workerSlot = workerSlots.get(workerId) || workerId;
            const restarts = workerRestarts.get(workerSlot) || 0;

            workerSlots.delete(workerId);

            logger.warn('Worker died', {
                workerId,
                workerSlot,
                pid: worker.process.pid,
                code,
                signal,
                restarts
            });

            if (isShuttingDown) {
                return;
            }

            // Check if we should respawn
            if (restarts < maxRestarts) {
                workerRestarts.set(workerSlot, restarts + 1);
                
                setTimeout(() => {
                    if (isShuttingDown) {
                        return;
                    }

                    logger.info('Respawning worker', { workerId, workerSlot, attempt: restarts + 1 });
                    spawnWorker(workerSlot, workerSlots);
                }, respawnDelay);
            } else {
                logger.error('Worker exceeded max restarts', undefined, {
                    workerId,
                    workerSlot,
                    maxRestarts,
                });
            }
        });

        // Handle worker online
        cluster.on('online', (worker) => {
            const workerSlot = workerSlots.get(worker.id) || worker.id;
            logger.info('Worker online', {
                workerId: worker.id,
                workerSlot,
                pid: worker.process.pid
            });
        });

        // Handle worker listening
        cluster.on('listening', (worker, address) => {
            const workerSlot = workerSlots.get(worker.id) || worker.id;
            logger.info('Worker listening', {
                workerId: worker.id,
                workerSlot,
                pid: worker.process.pid,
                address: `${address.address}:${address.port}`
            });
        });

        // Graceful shutdown
        const shutdown = async () => {
            if (isShuttingDown) {
                return;
            }

            isShuttingDown = true;
            if (healthCheckInterval) {
                clearInterval(healthCheckInterval);
            }
            logger.info('Shutting down cluster...');
            
            const workers = Object.values(cluster.workers || {});
            const shutdownPromises = workers.map((worker) => {
                return new Promise<void>((resolve) => {
                    if (worker) {
                        worker.once('exit', () => {
                            logger.info('Worker shut down', { workerId: worker.id });
                            resolve();
                        });
                        
                        worker.send('shutdown');
                        
                        // Force kill after 10 seconds
                        setTimeout(() => {
                            if (!worker.isDead()) {
                                logger.warn('Force killing worker', { workerId: worker.id });
                                worker.kill('SIGKILL');
                            }
                            resolve();
                        }, 10000);
                    } else {
                        resolve();
                    }
                });
            });

            await Promise.all(shutdownPromises);
            logger.info('All workers shut down');
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

        // Performance monitoring
        healthCheckInterval = setInterval(() => {
            const workers = Object.values(cluster.workers || {});
            const activeWorkers = workers.filter(w => w && !w.isDead()).length;
            
            logger.debug('Cluster health check', {
                totalWorkers: workers.length,
                activeWorkers,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            });
        }, 60000); // Every minute

        healthCheckInterval.unref();

    } else {
        // Worker process - import and run the application
        try {
            const workerModule = await import(workerFile) as {
                startServer?: () => Promise<unknown>;
                stopServer?: () => Promise<void>;
            };
            let isWorkerShuttingDown = false;

            if (typeof workerModule.startServer === 'function') {
                await workerModule.startServer();
            }

            const shutdownWorker = async () => {
                if (isWorkerShuttingDown) {
                    return;
                }

                isWorkerShuttingDown = true;
                logger.info('Worker received shutdown signal', {
                    workerId: cluster.worker?.id,
                    workerSlot: process.env.WORKER_SLOT,
                });

                try {
                    await workerModule.stopServer?.();
                } catch (error) {
                    logger.error('Worker failed to shut down cleanly', error as Error, {
                        workerId: cluster.worker?.id,
                        workerSlot: process.env.WORKER_SLOT,
                    });
                } finally {
                    process.exit(0);
                }
            };
            
            // Handle shutdown signal from master
            process.on('message', (msg) => {
                if (msg === 'shutdown') {
                    void shutdownWorker();
                }
            });

            process.once('SIGTERM', () => void shutdownWorker());
            process.once('SIGINT', () => void shutdownWorker());
            
        } catch (error) {
            logger.error('Worker failed to start', error as Error, {
                stack: (error as Error).stack
            });
            process.exit(1);
        }
    }
}

/**
 * Spawn a new worker
 */
function spawnWorker(workerSlot: number, workerSlots: Map<number, number>) {
    const worker = cluster.fork({
        WORKER_SLOT: String(workerSlot),
    });
    workerSlots.set(worker.id, workerSlot);
    return worker;
}

/**
 * Check if running in cluster mode
 */
export function isClusterMode(): boolean {
    return cluster.isWorker;
}

/**
 * Get worker ID (0 if not in cluster mode)
 */
export function getWorkerId(): number {
    return cluster.worker?.id || 0;
}

/**
 * Get total number of workers
 */
export function getTotalWorkers(): number {
    if (cluster.isPrimary) {
        return Object.keys(cluster.workers || {}).length;
    }
    return 0;
}
