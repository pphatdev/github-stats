/**
 * Optimized GitHub GraphQL Service
 * Batches multiple queries into single requests for maximum performance
 */

import { Octokit } from '@octokit/rest';
import { createLogger } from '../common/logger.js';
import { GitHubApiError } from '../common/errors.js';

const logger = createLogger({ service: 'GitHubGraphQLOptimizer' });

interface QueryBatch {
    queries: Map<string, { query: string; variables: any; resolve: (data: any) => void; reject: (error: any) => void }>;
    timeout: NodeJS.Timeout;
}

/**
 * Optimized GitHub GraphQL client with request batching
 */
export class GitHubGraphQLOptimizer {
    private octokit: Octokit;
    private batchWindow: number = 50; // milliseconds to wait before executing batch
    private currentBatch: QueryBatch | null = null;
    private queryCache: Map<string, { data: any; timestamp: number }> = new Map();
    private cacheTtl: number = 5 * 60 * 1000; // 5 minutes

    constructor(token?: string) {
        this.octokit = new Octokit({ auth: token });
    }

    /**
     * Execute a GraphQL query with batching
     */
    async query<T = any>(queryName: string, query: string, variables: any = {}): Promise<T> {
        // Check cache first
        const cacheKey = `${queryName}:${JSON.stringify(variables)}`;
        const cached = this.queryCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
            logger.debug('GraphQL cache hit', { queryName });
            return cached.data;
        }

        // Add to batch
        return new Promise<T>((resolve, reject) => {
            if (!this.currentBatch) {
                this.currentBatch = {
                    queries: new Map(),
                    timeout: setTimeout(() => this.executeBatch(), this.batchWindow)
                };
            }

            this.currentBatch.queries.set(cacheKey, {
                query,
                variables,
                resolve: (data) => {
                    this.queryCache.set(cacheKey, { data, timestamp: Date.now() });
                    resolve(data);
                },
                reject
            });

            // If batch is getting large, execute immediately
            if (this.currentBatch.queries.size >= 5) {
                clearTimeout(this.currentBatch.timeout);
                this.executeBatch();
            }
        });
    }

    /**
     * Execute the current batch of queries
     */
    private async executeBatch() {
        if (!this.currentBatch || this.currentBatch.queries.size === 0) {
            return;
        }

        const batch = this.currentBatch;
        this.currentBatch = null;

        const queries = Array.from(batch.queries.entries());

        logger.debug('Executing query batch', { count: queries.length });

        // If only one query, execute directly
        if (queries.length === 1) {
            const [cacheKey, { query, variables, resolve, reject }] = queries[0];
            try {
                const result = await this.octokit.graphql(query, variables);
                resolve(result);
            } catch (error) {
                reject(error);
            }
            return;
        }

        // Build combined query with aliases
        const aliases = queries.map((_, index) => `query${index}`);
        const combinedQuery = queries.map(([_, { query }], index) => {
            // Extract query body (remove "query {" and "}")
            const body = query.replace(/query\s*\{/, '').replace(/\}$/, '').trim();
            return `${aliases[index]}: ${body}`;
        }).join('\n');

        const wrappedQuery = `query {\n${combinedQuery}\n}`;

        try {
            const startTime = Date.now();
            const result: any = await this.octokit.graphql(wrappedQuery);
            const duration = Date.now() - startTime;

            logger.info('Batch query executed', {
                queries: queries.length,
                duration,
                avgPerQuery: Math.round(duration / queries.length)
            });

            // Distribute results to individual promises
            queries.forEach(([_, { resolve }], index) => {
                const alias = aliases[index];
                resolve(result[alias]);
            });

        } catch (error) {
            logger.error('Batch query failed', error as Error);

            // Fall back to individual queries
            logger.warn('Falling back to individual queries');
            await Promise.all(
                queries.map(async ([_, { query, variables, resolve, reject }]) => {
                    try {
                        const result = await this.octokit.graphql(query, variables);
                        resolve(result);
                    } catch (err) {
                        reject(err);
                    }
                })
            );
        }
    }

    /**
     * Get user stats with optimized single query
     */
    async getUserStatsOptimized(username: string) {
        const query = `
            query($username: String!) {
                user(login: $username) {
                    name
                    login
                    avatarUrl
                    createdAt
                    contributionsCollection {
                        totalCommitContributions
                        totalIssueContributions
                        totalPullRequestContributions
                        totalPullRequestReviewContributions
                        contributionCalendar {
                            totalContributions
                        }
                    }
                    repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: STARGAZERS, direction: DESC}) {
                        totalCount
                        nodes {
                            name
                            stargazerCount
                            forkCount
                            primaryLanguage {
                                name
                                color
                            }
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                    repositoriesContributedTo(first: 100, contributionTypes: [COMMIT, PULL_REQUEST, ISSUE]) {
                        totalCount
                    }
                    pullRequests(first: 1) {
                        totalCount
                    }
                    issues(first: 1) {
                        totalCount
                    }
                    followers {
                        totalCount
                    }
                    following {
                        totalCount
                    }
                }
            }
        `;

        return this.query('userStats', query, { username });
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.queryCache.clear();
        logger.info('GraphQL cache cleared');
    }

    /**
     * Get cache size
     */
    getCacheSize(): number {
        return this.queryCache.size;
    }
}

/**
 * Shared instance
 */
let sharedInstance: GitHubGraphQLOptimizer | null = null;

export function getGraphQLOptimizer(token?: string): GitHubGraphQLOptimizer {
    if (!sharedInstance) {
        sharedInstance = new GitHubGraphQLOptimizer(token);
    }
    return sharedInstance;
}
