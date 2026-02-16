import { Octokit } from '@octokit/rest';
import { GitHubStats, LanguageCount } from '../types.js';
import fetch from 'node-fetch';
import sharp from 'sharp';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

export class GitHubClient {
    private octokit: Octokit;
    private cache: Map<string, CacheEntry<any>>;
    private cacheDuration: number;

    constructor(token?: string, cacheDuration: number = 600000) { // Default 10 minutes
        this.octokit = new Octokit({
            auth: token,
        });
        this.cache = new Map();
        this.cacheDuration = cacheDuration;

        // Clean up expired cache entries every 5 minutes
        setInterval(() => this.cleanupCache(), 300000);
    }

    private getCacheKey(prefix: string, ...params: string[]): string {
        return `${prefix}:${params.join(':')}`;
    }

    private getFromCache<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if cache entry has expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    private setCache<T>(key: string, data: T): void {
        const now = Date.now();
        this.cache.set(key, {
            data,
            timestamp: now,
            expiresAt: now + this.cacheDuration,
        });
    }

    private cleanupCache(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));

        if (keysToDelete.length > 0) {
            console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
        }
    }

    public clearCache(): void {
        this.cache.clear();
        console.log('Cache cleared');
    }

    public getCacheStats(): { size: number; entries: Array<{ key: string; age: number }> } {
        const now = Date.now();
        const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
            key,
            age: Math.floor((now - entry.timestamp) / 1000), // age in seconds
        }));

        return {
            size: this.cache.size,
            entries,
        };
    }

    async fetchUserStats(username: string): Promise<GitHubStats> {
        // Check cache first
        const cacheKey = this.getCacheKey('stats', username.toLowerCase());
        const cached = this.getFromCache<GitHubStats>(cacheKey);

        if (cached) {
            console.log(`Cache hit for stats: ${username}`);
            return cached;
        }

        console.log(`Cache miss for stats: ${username}, fetching from GitHub...`);

        try {
            // Fetch user data
            const { data: user } = await this.octokit.users.getByUsername({
                username,
            });

            // Fetch user's repositories
            const { data: repos } = await this.octokit.repos.listForUser({
                username,
                per_page: 100,
                type: 'owner',
            });

            // Calculate total stars
            const totalStars = repos.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0);

            // Fetch commit count (approximation using search API)
            let totalCommits = 0;
            try {
                const { data: commitData } = await this.octokit.search.commits({
                    q: `author:${username}`,
                    per_page: 1,
                });
                totalCommits = commitData.total_count;
            } catch (error) {
                console.warn('Could not fetch commit count:', error);
            }

            // Fetch PR count
            let totalPRs = 0;
            try {
                const { data: prData } = await this.octokit.search.issuesAndPullRequests({
                    q: `author:${username} type:pr`,
                    per_page: 1,
                });
                totalPRs = prData.total_count;
            } catch (error) {
                console.warn('Could not fetch PR count:', error);
            }

            // Fetch issue count
            let totalIssues = 0;
            try {
                const { data: issueData } = await this.octokit.search.issuesAndPullRequests({
                    q: `author:${username} type:issue`,
                    per_page: 1,
                });
                totalIssues = issueData.total_count;
            } catch (error) {
                console.warn('Could not fetch issue count:', error);
            }

            // Get contributed repositories count
            const contributedTo = repos.filter(repo => !repo.fork).length;

            // Calculate rank
            const rank = this.calculateRank(totalStars, totalCommits, totalPRs, totalIssues);

            // Fetch and convert avatar to WebP, then base64 for smaller size
            let avatarBase64 = '';
            try {
                // Fetch avatar at reasonable size
                const avatarUrl = `${user.avatar_url}${user.avatar_url.includes('?') ? '&' : '?'}s=130`;
                const avatarResponse = await fetch(avatarUrl);
                const avatarBuffer = Buffer.from(await avatarResponse.arrayBuffer());

                // Compress to WebP format (much smaller than PNG)
                const webpBuffer = await sharp(avatarBuffer)
                    .resize(120, 120) // Resize to 120x120
                    .webp({ quality: 80 }) // Convert to WebP with 80% quality
                    .toBuffer();

                avatarBase64 = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
            } catch (error) {
                console.warn('Could not fetch/compress avatar:', error);
                avatarBase64 = user.avatar_url; // Fallback to URL if fetch fails
            }

            const stats: GitHubStats = {
                name: user.name || username,
                avatarUrl: avatarBase64,
                totalStars,
                totalCommits,
                totalPRs,
                totalIssues,
                contributedTo,
                rank,
            };

            // Cache the result
            this.setCache(cacheKey, stats);

            return stats;
        } catch (error: any) {
            // Check if it's a rate limit error
            if (error.status === 403 && error.message?.includes('rate limit')) {
                throw new Error(
                    `GitHub API rate limit exceeded. Please set a valid GITHUB_TOKEN in your .env file. ` +
                    `Get a token at: https://github.com/settings/tokens (requires 'repo' and 'user' scopes)`
                );
            }

            // Check if token is invalid
            if (error.status === 401) {
                throw new Error(
                    `GitHub authentication failed. Your GITHUB_TOKEN may be invalid or expired. ` +
                    `Please update your token in the .env file. Get a new token at: https://github.com/settings/tokens`
                );
            }

            throw new Error(`Failed to fetch stats for user ${username}: ${error.message || error}`);
        }
    }

    async fetchUserLanguages(username: string): Promise<LanguageCount[]> {
        // Check cache first
        const cacheKey = this.getCacheKey('languages', username.toLowerCase());
        const cached = this.getFromCache<LanguageCount[]>(cacheKey);

        if (cached) {
            console.log(`Cache hit for languages: ${username}`);
            return cached;
        }

        console.log(`Cache miss for languages: ${username}, fetching from GitHub...`);

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

            const languages = Array.from(languageCounts.entries()).map(([name, count]) => ({
                name,
                count,
            }));

            // Cache the result
            this.setCache(cacheKey, languages);

            return languages;
        } catch (error: any) {
            if (error.status === 403 && error.message?.includes('rate limit')) {
                throw new Error(
                    `GitHub API rate limit exceeded. Please set a valid GITHUB_TOKEN in your .env file. ` +
                    `Get a token at: https://github.com/settings/tokens (requires 'repo' and 'user' scopes)`
                );
            }

            if (error.status === 401) {
                throw new Error(
                    `GitHub authentication failed. Your GITHUB_TOKEN may be invalid or expired. ` +
                    `Please update your token in the .env file. Get a new token at: https://github.com/settings/tokens`
                );
            }

            throw new Error(`Failed to fetch languages for user ${username}: ${error.message || error}`);
        }
    }

    private calculateRank(stars: number, commits: number, prs: number, issues: number): { level: string; score: number } {
        // Simple ranking algorithm (can be improved)
        const score = stars * 2 + commits * 1 + prs * 3 + issues * 1;

        let level = 'C';
        if (score > 10000) level = 'S+';
        else if (score > 5000) level = 'S';
        else if (score > 2000) level = 'A+';
        else if (score > 1000) level = 'A';
        else if (score > 500) level = 'B+';
        else if (score > 100) level = 'B';

        return { level, score };
    }
}
