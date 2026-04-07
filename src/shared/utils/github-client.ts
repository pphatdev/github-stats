import { Octokit } from '@octokit/rest';
import { GitHubStats, LanguageCount, BadgeType } from '../../types.js';

/** Project/Repository-specific badge types */
export type RepoBadgeType = 'repo-stars' | 'repo-forks' | 'repo-watchers' | 'repo-issues' | 'repo-prs' | 'repo-contributors' | 'repo-size';

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

    /**
     * Clear all caches
     */
    clearCache(): void {
        this.requestCache.clear();
        this.pendingRequests.clear();
    }

    // Return default stats for user not found
    private getDefaultStats(username: string): GitHubStats {
        return {
            name: username,
            avatarUrl: 'https://avatars.githubusercontent.com/u/0?v=4',
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

    private buildContributionYearRanges(createdAt: Date): Array<{ from: string; to: string }> {
        const now = new Date();
        const years: Array<{ from: string; to: string }> = [];
        let yearStart = new Date(createdAt.getFullYear(), 0, 1);

        while (yearStart <= now) {
            const yearEnd = new Date(yearStart.getFullYear(), 11, 31, 23, 59, 59);
            years.push({
                from: (yearStart > createdAt ? yearStart : createdAt).toISOString(),
                to: (yearEnd > now ? now : yearEnd).toISOString(),
            });
            yearStart = new Date(yearStart.getFullYear() + 1, 0, 1);
        }

        return years;
    }

    private async fetchTotalCommitContributions(username: string, createdAt: string): Promise<number> {
        const ranges = this.buildContributionYearRanges(new Date(createdAt));

        if (ranges.length === 0) {
            return 0;
        }

        const variableDefinitions = ranges
            .map((_, index) => `$from${index}: DateTime!, $to${index}: DateTime!`)
            .join(', ');
        const contributionSelections = ranges
            .map((_, index) => `year${index}: contributionsCollection(from: $from${index}, to: $to${index}) { totalCommitContributions restrictedContributionsCount }`)
            .join('\n');

        const query = `
            query($username: String!, ${variableDefinitions}) {
                user(login: $username) {
                    ${contributionSelections}
                }
            }
        `;

        const variables: Record<string, string> = { username };
        ranges.forEach((range, index) => {
            variables[`from${index}`] = range.from;
            variables[`to${index}`] = range.to;
        });

        const result: any = await this.octokit.graphql(query, variables);
        const user = result.user;

        if (!user) {
            return 0;
        }

        return ranges.reduce((sum, _, index) => {
            const contributionYear = user[`year${index}`];
            return sum + (contributionYear?.totalCommitContributions || 0) + (contributionYear?.restrictedContributionsCount || 0);
        }, 0);
    }

    private withAvatarMode(stats: GitHubStats, avatarMode: 'none' | 'avatar' | 'radar'): GitHubStats {
        if (avatarMode === 'none') {
            return stats;
        }

        return {
            ...stats,
            avatarUrl: `${stats.avatarUrl}${stats.avatarUrl.includes('?') ? '&' : '?'}s=130`,
        };
    }

    async fetchUserStats(username: string, options: { avatarMode: 'none' | 'avatar' | 'radar' }): Promise<GitHubStats> {
        try {
            const stats = await this.cachedRequest(`user-stats-${username}`, async () => {
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

                let userData: any;
                try {
                    const response: any = await this.octokit.graphql(query, { username });
                    userData = response.user;
                } catch (error: any) {
                    if (error.status === 404 || error.errors?.[0]?.type === 'NOT_FOUND') {
                        return this.getDefaultStats(username);
                    }
                    throw error;
                }

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

                const totalCommits = await this.fetchTotalCommitContributions(username, userData.createdAt);

                // Calculate rank
                const rank = this.calculateRank(totalStars, totalCommits, totalPRs, totalIssues);

                return {
                    name: userData.name || username,
                    avatarUrl: userData.avatarUrl,
                    totalStars,
                    totalCommits,
                    totalPRs,
                    totalIssues,
                    contributedTo,
                    rank,
                };
            });

            return this.withAvatarMode(stats, options.avatarMode);
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
        else if (score <= 100) level = 'C';
        else if (score <= 0) level = 'D';

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

    /**
     * Fetch the numeric value for a given repository/project badge type.
     * Requires both owner and repo name.
     */
    async fetchRepoBadgeValue(owner: string, repo: string, type: RepoBadgeType): Promise<number> {
        const key = `repo-badge-${type}-${owner}-${repo}`;
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
                        await this.octokit.repos.listContributors({
                            owner,
                            repo,
                            per_page: 1,
                            anon: 'true',
                        });
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
    }
}
