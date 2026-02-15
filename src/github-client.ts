import { Octokit } from '@octokit/rest';
import { GitHubStats } from './types.js';
import fetch from 'node-fetch';

export class GitHubClient {
    private octokit: Octokit;

    constructor(token?: string) {
        this.octokit = new Octokit({
            auth: token,
        });
    }

    async fetchUserStats(username: string): Promise<GitHubStats> {
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

            // Fetch and convert avatar to base64 (using smaller size to reduce SVG size)
            let avatarBase64 = '';
            try {
                // Request 100x100 avatar to keep base64 size small (~2-3KB) to avoid GitHub camo proxy truncation
                const smallAvatarUrl = `${user.avatar_url}${user.avatar_url.includes('?') ? '&' : '?'}s=100`;
                const avatarResponse = await fetch(smallAvatarUrl);
                const avatarBuffer = await avatarResponse.arrayBuffer();
                avatarBase64 = `data:image/png;base64,${Buffer.from(avatarBuffer).toString('base64')}`;
            } catch (error) {
                console.warn('Could not fetch avatar:', error);
                avatarBase64 = user.avatar_url; // Fallback to URL if fetch fails
            }

            return {
                name: user.name || username,
                avatarUrl: avatarBase64,
                totalStars,
                totalCommits,
                totalPRs,
                totalIssues,
                contributedTo,
                rank,
            };
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
