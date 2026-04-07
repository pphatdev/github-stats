/**
 * Main Entry Point
 * Starts the application using the modular architecture
 */

import { startServer } from './server.js';

// Start the server
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
