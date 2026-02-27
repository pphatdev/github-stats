/**
 * Cluster Mode Entry Point
 * Starts the application in multi-core cluster mode for maximum performance
 * 
 * Usage:
 *   node dist/cluster.js              - Use all CPU cores
 *   WORKERS=4 node dist/cluster.js     - Use 4 workers
 */

import { startCluster } from './cluster.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workerFile = path.join(__dirname, 'index.js');
const workers = parseInt(process.env.WORKERS || '0') || undefined;

startCluster(workerFile, {
    workers,
    respawnDelay: 1000,
    maxRestarts: 5
});
