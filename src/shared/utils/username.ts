/**
 * Canonical GitHub-username validator.
 *
 * GitHub's rules: 1–39 chars, ASCII alphanumeric, single hyphens between
 * alphanumerics only (no leading/trailing/double hyphens). Shared by every
 * DB-write path so a malformed value never becomes a table row.
 */

export const GITHUB_USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

export function isValidGithubUsername(value: unknown): value is string {
    return typeof value === 'string' && GITHUB_USERNAME_RE.test(value);
}
