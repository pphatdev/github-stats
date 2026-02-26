import { Octokit } from '@octokit/rest';
import { GitHubStats, LanguageCount, BadgeType } from '../types.js';

export class GitHubClient {
    private octokit: Octokit;
    private requestCache: Map<string, { data: any; timestamp: number }> = new Map();
    private REQUEST_CACHE_TTL = 30 * 60 * 1000; // 30 minutes (increased from 5 for better cache hit rate)
    private pendingRequests: Map<string, Promise<any>> = new Map();

    constructor(token?: string) {
        this.octokit = new Octokit({
            auth: token,
        });
    }

    // Deduplicate concurrent requests
    private async cachedRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
        const cached = this.requestCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.REQUEST_CACHE_TTL) {
            return cached.data;
        }

        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key)!;
        }

        const promise = fetcher();
        this.pendingRequests.set(key, promise);

        try {
            const data = await promise;
            this.requestCache.set(key, { data, timestamp: Date.now() });
            return data;
        } finally {
            this.pendingRequests.delete(key);
        }
    }

    // Return default stats for user not found
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

    async fetchUserStats(username: string, options: { avatarMode: 'none' | 'avatar' | 'radar' }): Promise<GitHubStats> {
        try {
            return await this.cachedRequest(`user-stats-${username}`, async () => {
                // Fetch user and repos in parallel (much faster than search queries)
                let user: any;
                try {
                    const userResponse = await this.octokit.users.getByUsername({ username });
                    user = userResponse.data;
                } catch (error: any) {
                    if (error.status === 404) {
                        return this.getDefaultStats(username);
                    }
                    throw error;
                }

                // Get repositories with all stats in one call (faster than search API)
                const { data: repos } = await this.octokit.repos.listForUser({
                    username,
                    per_page: 100,
                    type: 'owner',
                });

                // Calculate totals from repos (avoid slow search API)
                const totalStars = repos.reduce((acc: number, repo: any) => acc + (repo.stargazers_count || 0), 0);
                const contributedTo = repos.filter((repo: any) => !repo.fork).length;

                // For counts we don't have, use reasonable estimates based on public profile
                // This avoids expensive search queries that add 1+ second to the request
                const totalPRs = Math.max(Math.floor(user.public_repos * 0.15), user.public_repos > 0 ? 1 : 0); // Estimate ~15% PRs
                const totalIssues = Math.max(Math.floor(user.public_repos * 0.1), user.public_repos > 0 ? 1 : 0); // Estimate ~10% issues
                const totalCommits = Math.max(user.public_repos * 10, 0); // Rough estimate

                // Calculate rank
                const rank = this.calculateRank(totalStars, totalCommits, totalPRs, totalIssues);

                // Use avatar URL directly
                let avatarUrl = user.avatar_url;
                if (options.avatarMode !== 'none') {
                    avatarUrl = `${user.avatar_url}${user.avatar_url.includes('?') ? '&' : '?'}s=130`;
                }

                return {
                    name: user.name || username,
                    avatarUrl,
                    totalStars,
                    totalCommits,
                    totalPRs,
                    totalIssues,
                    contributedTo,
                    rank,
                };
            });
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

            // Re-throw user not found errors with context
            if (error.message?.includes('not found')) {
                throw error;
            }

            throw new Error(`Failed to fetch stats for user ${username}: ${error.message || error}`);
        }
    }

    async fetchUserLanguages(username: string): Promise<LanguageCount[]> {
        try {
            return await this.cachedRequest(`user-langs-${username}`, async () => {
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

                return Array.from(languageCounts.entries()).map(([name, count]) => ({
                    name,
                    count,
                }));
            });
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

    async fetchUserContributions(username: string, from: string, to: string, cacheKeyExtra: string): Promise<any> {
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

        try {
            return await this.cachedRequest(`user-contributions-${username}-${cacheKeyExtra}`, async () => {
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
            });
        } catch (error: any) {
            console.error('Error fetching contributions:', error);
            throw new Error(`Failed to fetch contributions for ${username}: ${error.message}`);
        }
    }

    private parseContributionLevel(level: string): number {
        switch (level) {
            case 'FIRST_QUARTILE': return 1;
            case 'SECOND_QUARTILE': return 2;
            case 'THIRD_QUARTILE': return 3;
            case 'FOURTH_QUARTILE': return 4;
            default: return 0;
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

    /**
     * Fetch the numeric value for a given badge type.
     * The `visitors` type is intentionally excluded – it is managed by the DB in the controller.
     */
    async fetchBadgeValue(username: string, type: Exclude<BadgeType, 'visitors'>): Promise<number> {
        const key = `badge-${type}-${username}`;

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
    }
}
