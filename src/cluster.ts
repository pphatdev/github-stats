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
    const {
        workers = os.cpus().length,
        respawnDelay = 1000,
        maxRestarts = 5
    } = options;

    if (cluster.isPrimary) {
        logger.info('Starting cluster mode', {
            workers,
            cpus: os.cpus().length,
            platform: os.platform(),
            memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`
        });

        const workerRestarts = new Map<number, number>();

        // Spawn workers
        for (let i = 0; i < workers; i++) {
            spawnWorker(i + 1);
        }

        // Handle worker exit
        cluster.on('exit', (worker, code, signal) => {
            const workerId = worker.id;
            const restarts = workerRestarts.get(workerId) || 0;

            logger.warn('Worker died', {
                workerId,
                pid: worker.process.pid,
                code,
                signal,
                restarts
            });

            // Check if we should respawn
            if (restarts < maxRestarts) {
                workerRestarts.set(workerId, restarts + 1);
                
                setTimeout(() => {
                    logger.info('Respawning worker', { workerId, attempt: restarts + 1 });
                    spawnWorker(workerId);
                }, respawnDelay);
            } else {
                logger.error('Worker exceeded max restarts', undefined, { workerId, maxRestarts });
            }
        });

        // Handle worker online
        cluster.on('online', (worker) => {
            logger.info('Worker online', {
                workerId: worker.id,
                pid: worker.process.pid
            });
        });

        // Handle worker listening
        cluster.on('listening', (worker, address) => {
            logger.info('Worker listening', {
                workerId: worker.id,
                pid: worker.process.pid,
                address: `${address.address}:${address.port}`
            });
        });

        // Graceful shutdown
        const shutdown = async () => {
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
        setInterval(() => {
            const workers = Object.values(cluster.workers || {});
            const activeWorkers = workers.filter(w => w && !w.isDead()).length;
            
            logger.debug('Cluster health check', {
                totalWorkers: workers.length,
                activeWorkers,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            });
        }, 60000); // Every minute

    } else {
        // Worker process - import and run the application
        try {
            await import(workerFile);
            
            // Handle shutdown signal from master
            process.on('message', (msg) => {
                if (msg === 'shutdown') {
                    logger.info('Worker received shutdown signal', {
                        workerId: cluster.worker?.id
                    });
                    
                    // Gracefully close connections
                    process.exit(0);
                }
            });
            
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
function spawnWorker(workerId: number) {
    const worker = cluster.fork();
    worker.id = workerId;
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
