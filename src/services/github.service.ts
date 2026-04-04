/**
 * GitHub API Service (Refactored)
 * Handles all GitHub API interactions with proper error handling and caching
 */

import { Octokit } from '@octokit/rest';
import { GitHubStats, LanguageCount, BadgeType } from '../types.js';
import { BaseService, RequestDeduplicationService } from './base.service.js';
import {
    GitHubApiError,
    GitHubRateLimitError,
    GitHubAuthError,
    GitHubUserNotFoundError
} from '../common/errors.js';
import { getConfig } from '../config/index.js';

/** Project/Repository-specific badge types */
export type RepoBadgeType = 'repo-stars' | 'repo-forks' | 'repo-watchers' | 'repo-issues' | 'repo-prs' | 'repo-contributors' | 'repo-size';

/**
 * GitHub service for interacting with GitHub API
 */
export class GitHubService extends BaseService {
    private octokit: Octokit;
    private requestCache: Map<string, { data: any; timestamp: number }>;
    private deduplication: RequestDeduplicationService;
    private config: ReturnType<typeof getConfig>;
    private cleanupInterval?: NodeJS.Timeout;

    constructor(token?: string) {
        super('GitHubService');

        this.config = getConfig();
        this.octokit = new Octokit({
            auth: token || this.config.github.token,
        });

        this.requestCache = new Map();
        this.deduplication = new RequestDeduplicationService();

        // Clear expired cache entries periodically
        this.cleanupInterval = setInterval(() => this.cleanupCache(), 10 * 60 * 1000); // Every 10 minutes
    }

    /**
     * Cleanup expired cache entries
     */
    private cleanupCache(): void {
        const now = Date.now();
        const ttl = this.config.github.requestCacheTtl;
        let removed = 0;

        for (const [key, entry] of this.requestCache.entries()) {
            if (now - entry.timestamp > ttl) {
                this.requestCache.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            this.logger.debug('Cleaned up expired cache entries', { count: removed });
        }
    }

    /**
     * Cached request with deduplication
     */
    private async cachedRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
        // Check cache first
        const cached = this.requestCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.config.github.requestCacheTtl) {
            this.logger.debug('Cache hit', { key });
            return cached.data;
        }

        // Deduplicate concurrent requests
        return this.deduplication.deduplicate(key, async () => {
            const data = await fetcher();
            this.requestCache.set(key, { data, timestamp: Date.now() });
            return data;
        });
    }

    /**
     * Handle GitHub API errors
     */
    private handleGitHubError(error: any, username?: string): never {
        this.logger.error('GitHub API error', error, { username });

        // Rate limit error
        if (error.status === 403 && error.message?.includes('rate limit')) {
            const resetTime = error.response?.headers?.['x-ratelimit-reset'];
            const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : undefined;
            throw new GitHubRateLimitError(resetDate);
        }

        // Authentication error
        if (error.status === 401) {
            throw new GitHubAuthError();
        }

        // User not found
        if (error.status === 404 && username) {
            throw new GitHubUserNotFoundError(username);
        }

        // Generic API error
        throw new GitHubApiError(
            error.message || 'GitHub API request failed',
            error.status || 500,
            { originalError: error.message }
        );
    }

    /**
     * Get default stats for user
     */
    private getDefaultStats(username: string): GitHubStats {
        return {
            name: username,
            avatarUrl: `https://avatars.githubusercontent.com/u/0?v=4?s=130`,
            totalStars: 0,
            totalCommits: 0,
            totalPRs: 0,
            totalIssues: 0,
            contributedTo: 0,
            rank: {
                level: 'F',
                score: 0,
            },
        };
    }

    /**
     * Calculate user rank based on stats
     */
    private calculateRank(stars: number, commits: number, prs: number, issues: number): { level: string; score: number } {
        // Weighted scoring system
        const score = (stars * 5) + (commits * 0.1) + (prs * 2) + (issues * 1);

        let level: string;
        if (score >= 10000) level = 'S++';
        else if (score >= 5000) level = 'S+';
        else if (score >= 2500) level = 'S';
        else if (score >= 1000) level = 'A++';
        else if (score >= 500) level = 'A+';
        else if (score >= 250) level = 'A';
        else if (score >= 100) level = 'B+';
        else if (score >= 50) level = 'B';
        else if (score >= 25) level = 'C+';
        else if (score >= 10) level = 'C';
        else level = 'D';

        return { level, score: Math.round(score) };
    }

    /**
     * Fetch user statistics
     */
    async fetchUserStats(
        username: string,
        options: { avatarMode: 'none' | 'avatar' | 'radar' }
    ): Promise<GitHubStats> {
        return this.executeWithLogging(`fetchUserStats(${username})`, async () => {
            return this.cachedRequest(`user-stats-${username}-${options.avatarMode}`, async () => {
                try {
                    // Use GraphQL to get all-time stats in a single request
                    const query = `
                        query($username: String!) {
                            user(login: $username) {
                                name
                                login
                                avatarUrl
                                createdAt
                                repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: STARGAZERS, direction: DESC}) {
                                    totalCount
                                    nodes {
                                        stargazerCount
                                        isFork
                                    }
                                }
                                repositoriesContributedTo(contributionTypes: [COMMIT, PULL_REQUEST, ISSUE]) {
                                    totalCount
                                }
                                pullRequests {
                                    totalCount
                                }
                                issues {
                                    totalCount
                                }
                            }
                        }
                    `;

                    const response: any = await this.octokit.graphql(query, { username }).catch((error: any) => {
                        if (error.status === 404 || error.errors?.[0]?.type === 'NOT_FOUND') {
                            return { user: null };
                        }
                        throw error;
                    });

                    const userData = response.user;

                    if (!userData) {
                        return this.getDefaultStats(username);
                    }

                    // Calculate total stars from repositories
                    const totalStars = userData.repositories.nodes.reduce(
                        (acc: number, repo: any) => acc + (repo.stargazerCount || 0), 0
                    );

                    // Count non-fork repositories
                    const contributedTo = userData.repositories.nodes.filter((repo: any) => !repo.isFork).length;

                    // Get real PR and issue counts
                    const totalPRs = userData.pullRequests.totalCount;
                    const totalIssues = userData.issues.totalCount;

                    // Get all-time commits by summing contributions from account creation to now
                    const createdAt = new Date(userData.createdAt);
                    const now = new Date();
                    let totalCommits = 0;

                    // Fetch commits year by year (GitHub only allows 1 year at a time)
                    const years: { from: Date; to: Date }[] = [];
                    let yearStart = new Date(createdAt.getFullYear(), 0, 1);

                    while (yearStart <= now) {
                        const yearEnd = new Date(yearStart.getFullYear(), 11, 31, 23, 59, 59);
                        years.push({
                            from: yearStart > createdAt ? yearStart : createdAt,
                            to: yearEnd > now ? now : yearEnd
                        });
                        yearStart = new Date(yearStart.getFullYear() + 1, 0, 1);
                    }

                    // Fetch all years' contributions in parallel
                    const commitPromises = years.map(async ({ from, to }) => {
                        const commitQuery = `
                            query($username: String!, $from: DateTime!, $to: DateTime!) {
                                user(login: $username) {
                                    contributionsCollection(from: $from, to: $to) {
                                        totalCommitContributions
                                        restrictedContributionsCount
                                    }
                                }
                            }
                        `;
                        try {
                            const result: any = await this.octokit.graphql(commitQuery, {
                                username,
                                from: from.toISOString(),
                                to: to.toISOString()
                            });
                            const collection = result.user?.contributionsCollection;
                            return (collection?.totalCommitContributions || 0) + (collection?.restrictedContributionsCount || 0);
                        } catch {
                            return 0;
                        }
                    });

                    const yearlyCommits = await Promise.all(commitPromises);
                    totalCommits = yearlyCommits.reduce((sum, count) => sum + count, 0);

                    // Calculate rank
                    const rank = this.calculateRank(totalStars, totalCommits, totalPRs, totalIssues);

                    // Format avatar URL
                    let avatarUrl = userData.avatarUrl;
                    if (options.avatarMode !== 'none') {
                        avatarUrl = `${userData.avatarUrl}${userData.avatarUrl.includes('?') ? '&' : '?'}s=130`;
                    }

                    return {
                        name: userData.name || username,
                        avatarUrl,
                        totalStars,
                        totalCommits,
                        totalPRs,
                        totalIssues,
                        contributedTo,
                        rank,
                    };
                } catch (error: any) {
                    return this.handleGitHubError(error, username);
                }
            });
        });
    }

    /**
     * Fetch user language statistics
     */
    async fetchUserLanguages(username: string): Promise<LanguageCount[]> {
        return this.executeWithLogging(`fetchUserLanguages(${username})`, async () => {
            return this.cachedRequest(`user-langs-${username}`, async () => {
                try {
                    const { data: repos } = await this.octokit.repos.listForUser({
                        username,
                        per_page: 100,
                        type: 'owner',
                    });

                    const languageCounts = new Map<string, number>();

                    repos.forEach(repo => {
                        if (!repo.language) return;
                        const current = languageCounts.get(repo.language) || 0;
                        languageCounts.set(repo.language, current + 1);
                    });

                    return Array.from(languageCounts.entries())
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count);
                } catch (error: any) {
                    return this.handleGitHubError(error, username);
                }
            });
        });
    }

    /**
     * Parse contribution level from GitHub API
     */
    private parseContributionLevel(level: string): number {
        switch (level) {
            case 'FIRST_QUARTILE': return 1;
            case 'SECOND_QUARTILE': return 2;
            case 'THIRD_QUARTILE': return 3;
            case 'FOURTH_QUARTILE': return 4;
            default: return 0;
        }
    }

    /**
     * Fetch user contributions
     */
    async fetchUserContributions(
        username: string,
        from: string,
        to: string,
        cacheKeyExtra: string
    ): Promise<any> {
        return this.executeWithLogging(`fetchUserContributions(${username})`, async () => {
            const query = `
                query($username: String!, $from: DateTime!, $to: DateTime!) {
                    user(login: $username) {
                        contributionsCollection(from: $from, to: $to) {
                            contributionCalendar {
                                totalContributions
                                weeks {
                                    contributionDays {
                                        contributionCount
                                        date
                                        contributionLevel
                                    }
                                }
                            }
                        }
                    }
                }
            `;

            return this.cachedRequest(`user-contributions-${username}-${cacheKeyExtra}`, async () => {
                try {
                    const response: any = await this.octokit.graphql(query, {
                        username,
                        from,
                        to
                    });

                    const calendar = response.user.contributionsCollection.contributionCalendar;

                    return {
                        username,
                        totalContributions: calendar.totalContributions,
                        weeks: calendar.weeks.map((week: any) =>
                            week.contributionDays.map((day: any) => ({
                                date: day.date,
                                count: day.contributionCount,
                                level: this.parseContributionLevel(day.contributionLevel)
                            }))
                        )
                    };
                } catch (error: any) {
                    return this.handleGitHubError(error, username);
                }
            });
        });
    }

    /**
     * Fetch badge value
     */
    async fetchBadgeValue(username: string, type: Exclude<BadgeType, 'visitors'>): Promise<number> {
        const key = `badge-${type}-${username}`;

        return this.executeWithLogging(`fetchBadgeValue(${username}, ${type})`, async () => {
            switch (type) {
                // ── profile fields (single user request) ──────────────────────
                case 'repositories':
                    return this.cachedRequest(key, async () => {
                        const { data } = await this.octokit.users.getByUsername({ username });
                        return data.public_repos;
                    });

                case 'followers':
                    return this.cachedRequest(key, async () => {
                        const { data } = await this.octokit.users.getByUsername({ username });
                        return data.followers;
                    });

                case 'total-joined-years':
                    return this.cachedRequest(key, async () => {
                        const { data } = await this.octokit.users.getByUsername({ username });
                        const joinedYear = new Date(data.created_at).getFullYear();
                        return new Date().getFullYear() - joinedYear;
                    });

                // ── organization membership ────────────────────────────────────
                case 'organization':
                    return this.cachedRequest(key, async () => {
                        const { data } = await this.octokit.orgs.listForUser({ username, per_page: 100 });
                        return data.length;
                    });

                // ── derived from repo list ─────────────────────────────────────
                case 'languages': {
                    const langs = await this.fetchUserLanguages(username);
                    return langs.length;
                }

                case 'total-stars':
                    return this.cachedRequest(key, async () => {
                        const { data: repos } = await this.octokit.repos.listForUser({
                            username, per_page: 100, type: 'owner',
                        });
                        return repos.reduce((acc, r) => acc + (r.stargazers_count ?? 0), 0);
                    });

                case 'total-contributors':
                    return this.cachedRequest(key, async () => {
                        // Fetch top-10 most-starred repos to keep API calls manageable
                        const { data: repos } = await this.octokit.repos.listForUser({
                            username, per_page: 10, type: 'owner', sort: 'pushed', direction: 'desc',
                        });
                        const unique = new Set<string>();
                        for (const repo of repos) {
                            try {
                                const { data: contribs } = await this.octokit.repos.listContributors({
                                    owner: username, repo: repo.name, per_page: 100,
                                });
                                contribs.forEach(c => c.login && unique.add(c.login));
                            } catch { /* non-critical – skip unavailable repos */ }
                        }
                        return unique.size;
                    });

                // ── search API ────────────────────────────────────────────────
                case 'total-commits':
                    return this.cachedRequest(key, async () => {
                        const { data } = await this.octokit.search.commits({
                            q: `author:${username}`, per_page: 1,
                        });
                        return data.total_count;
                    });

                case 'total-code-reviews':
                    return this.cachedRequest(key, async () => {
                        const { data } = await this.octokit.search.issuesAndPullRequests({
                            q: `reviewed-by:${username} type:pr`, per_page: 1,
                        });
                        return data.total_count;
                    });

                case 'total-issues':
                    return this.cachedRequest(key, async () => {
                        const { data } = await this.octokit.search.issuesAndPullRequests({
                            q: `author:${username} type:issue`, per_page: 1,
                        });
                        return data.total_count;
                    });

                case 'total-pull-requests':
                    return this.cachedRequest(key, async () => {
                        const { data } = await this.octokit.search.issuesAndPullRequests({
                            q: `author:${username} type:pr`, per_page: 1,
                        });
                        return data.total_count;
                    });

                default:
                    throw new Error(`Unknown badge type: ${type}`);
            }
        });
    }

    /**
     * Fetch the numeric value for a given repository/project badge type.
     * Requires both owner and repo name.
     */
    async fetchRepoBadgeValue(owner: string, repo: string, type: RepoBadgeType): Promise<number> {
        const key = `repo-badge-${type}-${owner}-${repo}`;

        return this.executeWithLogging(`fetchRepoBadgeValue(${owner}/${repo}, ${type})`, async () => {
            try {
                switch (type) {
                    case 'repo-stars':
                        return await this.cachedRequest(key, async () => {
                            const { data } = await this.octokit.repos.get({ owner, repo });
                            return data.stargazers_count;
                        });

                    case 'repo-forks':
                        return await this.cachedRequest(key, async () => {
                            const { data } = await this.octokit.repos.get({ owner, repo });
                            return data.forks_count;
                        });

                    case 'repo-watchers':
                        return await this.cachedRequest(key, async () => {
                            const { data } = await this.octokit.repos.get({ owner, repo });
                            return data.subscribers_count;
                        });

                    case 'repo-issues':
                        return await this.cachedRequest(key, async () => {
                            const { data } = await this.octokit.repos.get({ owner, repo });
                            return data.open_issues_count;
                        });

                    case 'repo-prs':
                        return await this.cachedRequest(key, async () => {
                            const { data } = await this.octokit.search.issuesAndPullRequests({
                                q: `repo:${owner}/${repo} type:pr state:open`,
                                per_page: 1,
                            });
                            return data.total_count;
                        });

                    case 'repo-contributors':
                        return await this.cachedRequest(key, async () => {
                            const response = await this.octokit.repos.listContributors({
                                owner,
                                repo,
                                per_page: 100,
                            });
                            return response.data.length;
                        });

                    case 'repo-size':
                        return await this.cachedRequest(key, async () => {
                            const { data } = await this.octokit.repos.get({ owner, repo });
                            return data.size; // Size in KB
                        });

                    default:
                        throw new Error(`Unknown repo badge type: ${type}`);
                }
            } catch (error: any) {
                const isNotFound = error?.status === 404 || String(error?.message || '').toLowerCase().includes('not found');
                if (isNotFound) {
                    return 0;
                }
                throw error;
            }
        });
    }

    /**
     * Clear all caches
     */
    clearCache(): void {
        this.requestCache.clear();
        this.logger.info('GitHub service cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.requestCache.size,
            pendingRequests: this.deduplication.getPendingCount(),
        };
    }

    /**
     * Cleanup resources and stop background tasks
     * Call this when the service is no longer needed to prevent memory leaks
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        this.clearCache();
        this.logger.info('GitHub service destroyed');
    }
}
