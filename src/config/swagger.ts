/**
 * Swagger/OpenAPI Configuration
 * API documentation setup
 */

import { getEnv } from './env.js';

export interface SwaggerConfig {
    info: {
        title: string;
        version: string;
        description: string;
        contact?: {
            name: string;
            url: string;
            email?: string;
        };
        license?: {
            name: string;
            url: string;
        };
    };
    servers: Array<{
        url: string;
        description: string;
    }>;
    tags: Array<{
        name: string;
        description: string;
    }>;
}

/**
 * Get Swagger/OpenAPI configuration
 */
export function getSwaggerConfig(): SwaggerConfig {
    const env = getEnv();
    const protocol = env.APP_ENV === 'production' ? 'https' : 'http';
    const baseUrl = env.APP_ENV === 'production' 
        ? 'https://stats.pphat.top' 
        : `${protocol}://${env.HOST}:${env.PORT}`;

    return {
        info: {
            title: 'GitHub Stats API',
            version: '2.0.0',
            description: 'Dynamic GitHub statistics, badges, and visualizations API',
            contact: {
                name: 'Sophat Phath',
                url: 'https://github.com/pphatdev/github-stats',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: baseUrl,
                description: env.APP_ENV === 'production' ? 'Production Server' : 'Development Server',
            },
        ],
        tags: [
            {
                name: 'stats',
                description: 'User statistics endpoints',
            },
            {
                name: 'badges',
                description: 'Badge generation endpoints',
            },
            {
                name: 'icons',
                description: 'Icon management endpoints',
            },
            {
                name: 'languages',
                description: 'Language statistics and visualizations',
            },
            {
                name: 'graphs',
                description: 'Graph generation endpoints',
            },
            {
                name: 'health',
                description: 'Health check and monitoring',
            },
        ],
    };
}

/**
 * Generate OpenAPI JSON specification
 * This can be extended to include full API documentation
 */
export function generateOpenAPISpec() {
    const config = getSwaggerConfig();
    
    return {
        openapi: '3.0.0',
        ...config,
        paths: {
            // Paths will be automatically generated from route decorators
            // or can be manually defined here
        },
        components: {
            schemas: {
                // Define reusable schemas here
            },
            securitySchemes: {
                // Define security schemes if needed
            },
        },
    };
}
