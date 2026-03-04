import { getTheme, getBadgeTheme } from '../utils/themes.js';
import type { BadgeType, BadgeOptions } from '../types.js';

interface BadgeConfig {
    label: string;
    iconPath: string;
    formatValue?: (n: number) => string;
}

const H = 26;
const ICON_SIZE = 12;
const ICON_PAD_L = 7;
const ICON_GAP = 13;
const LABEL_CHARW = 6.5;
const LABEL_PAD_R = 9;
const VALUE_CHARW = 8;
const VALUE_PAD_H = 12;
const ICON_SCALE = (ICON_SIZE / 14).toFixed(4);
const ICON_TOP = ((H - ICON_SIZE) / 2).toFixed(1);
const TEXT_Y = Math.round(H / 2 + 4);

const BADGE_CONFIGS: Record<BadgeType, BadgeConfig> = {
    'visitors': {
        label: 'Visitors',
        iconPath: 'M 1 7 Q 7 1.5 13 7 Q 7 12.5 1 7 Z M 7 5 A 2 2 0 1 1 6.99 5',
    },
    'repositories': {
        label: 'Repos',
        iconPath: 'M 5.25 1.75 a 0.583 0.583 0 0 1 0.354 0.12 l 0.058 0.051 l 1.579 1.579 h 3.841 a 1.75 1.75 0 0 1 1.747 1.647 l 0.003 0.103 v 4.667 a 1.75 1.75 0 0 1 -1.647 1.747 l -0.103 0.003 h -8.167 a 1.75 1.75 0 0 1 -1.747 -1.647 l -0.003 -0.103 v -6.417 a 1.75 1.75 0 0 1 1.647 -1.747 l 0.103 0.003 h 2.333 z',
    },
    'organization': {
        label: 'Orgs',
        iconPath: 'M 1.75 12.25 l 10.5 0 M 5.25 4.67 l 0.58 0 M 5.25 7 l 0.58 0 M 5.25 9.33 l 0.58 0 M 8.17 4.67 l 0.58 0 M 8.17 7 l 0.58 0 M 8.17 9.33 l 0.58 0 M 2.92 12.25 v -9.33 a 1.17 1.17 0 0 1 1.17 -1.17 h 5.83 a 1.17 1.17 0 0 1 1.17 1.17 v 9.33',
    },
    'languages': {
        label: 'Languages',
        iconPath: 'M 4.08 4.67 l -2.33 2.33 l 2.33 2.33 M 9.92 4.67 l 2.33 2.33 l -2.33 2.33 M 8.17 2.33 l -2.33 9.33',
    },
    'followers': {
        label: 'Followers',
        iconPath: 'M 5.83 7.58 a 1.167 1.167 0 1 0 2.333 0 a 1.167 1.167 0 0 0 -2.333 0 M 4.67 12.25 v -0.583 a 1.167 1.167 0 0 1 1.167 -1.167 h 2.333 a 1.167 1.167 0 0 1 1.167 1.167 v 0.583 M 8.75 2.92 a 1.167 1.167 0 1 0 2.333 0 a 1.167 1.167 0 0 0 -2.333 0 M 9.92 5.83 h 1.167 a 1.167 1.167 0 0 1 1.167 1.167 v 0.583 M 2.92 2.92 a 1.167 1.167 0 1 0 2.333 0 a 1.167 1.167 0 0 0 -2.333 0 M 1.75 7.58 v -0.583 a 1.167 1.167 0 0 1 1.167 -1.167 h 1.167',
    },
    'total-stars': {
        label: 'Stars',
        iconPath: 'M 4.808 4.281 l -3.722 0.540 l -0.066 0.013 a 0.583 0.583 0 0 0 -0.257 0.982 l 2.696 2.624 l -0.636 3.707 l -0.008 0.064 a 0.583 0.583 0 0 0 0.854 0.551 l 3.328 -1.750 l 3.321 1.750 l 0.058 0.027 a 0.583 0.583 0 0 0 0.789 -0.642 l -0.636 -3.707 l 2.697 -2.625 l 0.046 -0.050 a 0.583 0.583 0 0 0 -0.369 -0.945 l -3.722 -0.540 l -1.663 -3.372 a 0.583 0.583 0 0 0 -1.047 0 l -1.664 3.372 z',
    },
    'total-contributors': {
        label: 'Contributors',
        iconPath: 'M 2.917 4.083 a 2.333 2.333 0 1 0 4.667 0 a 2.333 2.333 0 1 0 -4.667 0 M 1.75 12.25 v -1.167 a 2.333 2.333 0 0 1 2.333 -2.333 h 2.333 a 2.333 2.333 0 0 1 2.333 2.333 v 1.167 M 9.333 1.826 a 2.333 2.333 0 0 1 0 4.521 M 12.25 12.25 v -1.167 a 2.333 2.333 0 0 0 -1.75 -2.246',
    },
    'total-commits': {
        label: 'Commits',
        iconPath: 'M 7 3.5 A 3.5 3.5 0 1 1 6.99 3.5 M 1 7 L 3.5 7 M 10.5 7 L 13 7',
    },
    'total-code-reviews': {
        label: 'Reviews',
        iconPath: 'M 2.91 7.50 a 4.14 4.14 0 0 0 7.10 2.29 a 1.14 1.14 0 0 1 -0.09 -0.37 l -0.003 -0.087 l 0.003 -0.088 a 1.167 1.167 0 1 1 1.031 1.246 a 5.308 5.308 0 0 1 -9.195 -2.829 a 0.583 0.583 0 0 1 1.155 -0.16 z M 7.0 4.667 a 2.333 2.333 0 1 1 -2.330 2.45 l -0.003 -0.117 l 0.003 -0.117 a 2.333 2.333 0 0 1 2.330 -2.217 z M 7.66 1.80 a 5.31 5.31 0 0 1 4.578 4.534 a 0.583 0.583 0 0 1 -1.155 0.161 a 4.14 4.14 0 0 0 -3.573 -3.537 a 4.14 4.14 0 0 0 -3.528 1.246 a 1.167 1.167 0 1 1 -2.235 0.548 l -0.003 -0.087 l 0.003 -0.088 a 1.167 1.167 0 0 1 1.293 -1.072 a 5.305 5.305 0 0 1 4.621 -1.705 z',
    },
    'total-issues': {
        label: 'Issues',
        iconPath: 'M 7 1 A 6 6 0 1 1 6.99 1 M 7 5 L 7 7.5 M 7 10 L 7 10.2',
    },
    'total-pull-requests': {
        label: 'Pull Reqs',
        iconPath: 'M 3 2 A 1.5 1.5 0 1 1 2.99 2 M 3 3.5 L 3 12.5 M 11 2 A 1.5 1.5 0 1 1 10.99 2 M 11 3.5 L 11 9.5 M 11 11 A 1.5 1.5 0 1 1 10.99 11 M 3 9 Q 3 13 9 13 L 9.5 13',
    },
    'total-joined-years': {
        label: 'Joined',
        iconPath: 'M 2 3 L 12 3 L 12 12 L 2 12 Z M 2 6 L 12 6 M 5 1.5 L 5 4 M 9 1.5 L 9 4 M 5 8.5 L 5 10 M 7 8.5 L 9 8.5',
        formatValue: (n) => `${n} yr${n !== 1 ? 's' : ''}`,
    },
    // Project/Repository-specific badges
    'repo-stars': {
        label: 'Stars',
        iconPath: 'M 4.808 4.281 l -3.722 0.540 l -0.066 0.013 a 0.583 0.583 0 0 0 -0.257 0.982 l 2.696 2.624 l -0.636 3.707 l -0.008 0.064 a 0.583 0.583 0 0 0 0.854 0.551 l 3.328 -1.750 l 3.321 1.750 l 0.058 0.027 a 0.583 0.583 0 0 0 0.789 -0.642 l -0.636 -3.707 l 2.697 -2.625 l 0.046 -0.050 a 0.583 0.583 0 0 0 -0.369 -0.945 l -3.722 -0.540 l -1.663 -3.372 a 0.583 0.583 0 0 0 -1.047 0 l -1.664 3.372 z',
    },
    'repo-forks': {
        label: 'Forks',
        iconPath: 'M 3.5 2 A 1.5 1.5 0 1 1 3.49 2 M 3.5 12 A 1.5 1.5 0 1 1 3.49 12 M 10.5 2 A 1.5 1.5 0 1 1 10.49 2 M 3.5 3.5 L 3.5 10.5 M 10.5 3.5 L 10.5 6 Q 10.5 7.5 7 7.5 L 3.5 7.5',
    },
    'repo-watchers': {
        label: 'Watchers',
        iconPath: 'M 1 7 Q 7 1.5 13 7 Q 7 12.5 1 7 Z M 7 5 A 2 2 0 1 1 6.99 5',
    },
    'repo-issues': {
        label: 'Issues',
        iconPath: 'M 7 1 A 6 6 0 1 1 6.99 1 M 7 5 L 7 7.5 M 7 10 L 7 10.2',
    },
    'repo-prs': {
        label: 'Pull Reqs',
        iconPath: 'M 3 2 A 1.5 1.5 0 1 1 2.99 2 M 3 3.5 L 3 12.5 M 11 2 A 1.5 1.5 0 1 1 10.99 2 M 11 3.5 L 11 9.5 M 11 11 A 1.5 1.5 0 1 1 10.99 11 M 3 9 Q 3 13 9 13 L 9.5 13',
    },
    'repo-contributors': {
        label: 'Contributors',
        iconPath: 'M 2.917 4.083 a 2.333 2.333 0 1 0 4.667 0 a 2.333 2.333 0 1 0 -4.667 0 M 1.75 12.25 v -1.167 a 2.333 2.333 0 0 1 2.333 -2.333 h 2.333 a 2.333 2.333 0 0 1 2.333 2.333 v 1.167 M 9.333 1.826 a 2.333 2.333 0 0 1 0 4.521 M 12.25 12.25 v -1.167 a 2.333 2.333 0 0 0 -1.75 -2.246',
    },
    'repo-size': {
        label: 'Size',
        iconPath: 'M 2 4 L 12 4 L 12 10 L 2 10 Z M 4 7 L 10 7 M 4 4 L 4 10 M 10 4 L 10 10',
        formatValue: (n) => n >= 1024 ? `${(n / 1024).toFixed(1)} MB` : `${n} KB`,
    },
};

export class BadgeRenderer {

    static visitors(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['visitors'], 'visitors', value, options);
    }

    static repositories(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['repositories'], 'repositories', value, options);
    }

    static organization(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['organization'], 'organization', value, options);
    }

    static languages(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['languages'], 'languages', value, options);
    }

    static followers(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['followers'], 'followers', value, options);
    }

    static totalStars(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['total-stars'], 'total-stars', value, options);
    }

    static totalContributors(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['total-contributors'], 'total-contributors', value, options);
    }

    static totalCommits(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['total-commits'], 'total-commits', value, options);
    }

    static totalCodeReviews(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['total-code-reviews'], 'total-code-reviews', value, options);
    }

    static totalIssues(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['total-issues'], 'total-issues', value, options);
    }

    static totalPullRequests(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['total-pull-requests'], 'total-pull-requests', value, options);
    }

    static totalJoinedYears(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['total-joined-years'], 'total-joined-years', value, options);
    }

    // Project/Repository-specific badge renderers
    static repoStars(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['repo-stars'], 'repo-stars', value, options);
    }

    static repoForks(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['repo-forks'], 'repo-forks', value, options);
    }

    static repoWatchers(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['repo-watchers'], 'repo-watchers', value, options);
    }

    static repoIssues(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['repo-issues'], 'repo-issues', value, options);
    }

    static repoPrs(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['repo-prs'], 'repo-prs', value, options);
    }

    static repoContributors(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['repo-contributors'], 'repo-contributors', value, options);
    }

    static repoSize(value: number, options: Omit<BadgeOptions, 'type'> = {}): string {
        return BadgeRenderer._render(BADGE_CONFIGS['repo-size'], 'repo-size', value, options);
    }

    /**
     * Render a badge SVG for any badge type.
     * @param value  The numeric value to display (visitors count, stars, etc.)
     * @param options  Badge display options including `type`, `theme`, and optional color overrides.
     */
    /**
     * Render a badge SVG for any badge type.
     * @param value  The numeric value to display (visitors count, stars, etc.)
     * @param options  Badge display options including `type`, `theme`, and optional color overrides.
     */
    static generateBadge(value: number, options: BadgeOptions): string {
        const type: BadgeType = options.type ?? 'visitors';
        return BadgeRenderer._render(BADGE_CONFIGS[type], type, value, options);
    }

    private static _resolveColor(override: string | undefined, fallback: string): string {
        if (!override) return fallback;
        return override.startsWith('#') ? override : `#${override}`;
    }

    private static _render(
        config: BadgeConfig,
        type: BadgeType,
        value: number,
        options: Omit<BadgeOptions, 'type'>
    ): string {
        const themeName = options.theme ?? 'default';
        const theme = getTheme(themeName);
        const badgeTheme = getBadgeTheme(themeName);
        const rc = BadgeRenderer._resolveColor;

        const labelColor = rc(options.labelColor, badgeTheme.labelColor);
        const labelBg = rc(options.labelBackground, badgeTheme.labelBackground);
        const valueColor = rc(options.valueColor, badgeTheme.valueColor);
        const valueBg = rc(options.valueBackground, badgeTheme.valueBackground);

        const fontName = theme.fontName || 'Orbitron';
        const fontFamily = theme.fontFamily || `'${fontName}', 'Ubuntu', sans-serif`;

        const labelText = (options.customLabel ?? config.label).toUpperCase();
        const displayValue = config.formatValue ? config.formatValue(value) : value.toLocaleString();

        const labelTextW = Math.ceil(labelText.length * LABEL_CHARW);
        const labelSecW = ICON_PAD_L + ICON_SIZE + ICON_GAP + labelTextW + LABEL_PAD_R;
        const valueTextW = Math.ceil(displayValue.length * VALUE_CHARW);
        const valueSecW = VALUE_PAD_H + valueTextW + VALUE_PAD_H;
        const totalWidth = labelSecW + valueSecW;

        const labelTextX = (ICON_PAD_L + ICON_SIZE + ICON_GAP + labelTextW / 2).toFixed(1);
        const valueTextX = (labelSecW + valueSecW / 2).toFixed(1);

        return `<svg width="${totalWidth}" height="${H}" viewBox="0 0 ${totalWidth} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><filter id="glow-${type}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><clipPath id="clip-${type}"><rect width="${totalWidth}" height="${H}" rx="4"/></clipPath></defs><style>@font-face{font-family:'${fontName}';font-style:normal;font-weight:400 900;font-display:swap;src:url(/fonts/orbitron.woff2) format('woff2')}.badge-text{font-family:${fontFamily};font-weight:700;letter-spacing:.8px;text-transform:uppercase}</style><rect width="${totalWidth}" height="${H}" rx="4" fill="${valueBg}" stroke="${theme.borderColor}" stroke-width="1"/><path clip-path="url(#clip-${type})" d="M 0 0 H ${labelSecW} V ${H} H 0 Z" fill="${labelBg}"/><g transform="translate(${ICON_PAD_L},${ICON_TOP}) scale(${ICON_SCALE})"><path d="${config.iconPath}" stroke="${labelColor}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".9"/></g><text x="${labelTextX}" y="${TEXT_Y}" text-anchor="middle" class="badge-text" fill="${labelColor}" font-size="9.5">${labelText}</text><line x1="${labelSecW}" y1="5" x2="${labelSecW}" y2="${H - 5}" stroke="${theme.borderColor}" stroke-width="1" opacity=".35"/><text x="${valueTextX}" y="${TEXT_Y}" text-anchor="middle" class="badge-text" fill="${valueColor}" font-size="12" filter="url(#glow-${type})">${displayValue}</text></svg>`;
    }
}
