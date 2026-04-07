/**
 * Languages Service
 * Business logic for GitHub language statistics
 */

import { GitHubClient } from '../../shared/utils/github-client.js';
import { LanguageCardRenderer } from '../../shared/components/language-card.js';
import { LanguagePieChartRenderer } from '../../shared/components/language-pie-chart.js';
import { createLogger } from '../../shared/logs/logger.js';
import type { LanguageQueryParams, LanguageCache } from './languages.types.js';
import type { LanguageCount } from '../../types.js';

const logger = createLogger({ service: 'LanguagesService' });

export class LanguagesService {
    private githubClient: GitHubClient;
    private cache: Map<string, LanguageCache>;
    private readonly cacheDuration: number;

    constructor(
        githubClient: GitHubClient,
        cache: Map<string, LanguageCache>,
        cacheDuration: number
    ) {
        this.githubClient = githubClient;
        this.cache = cache;
        this.cacheDuration = cacheDuration;
    }

    /**
     * Generate language visualization
     */
    async generateLanguageVisualization(params: LanguageQueryParams): Promise<string> {
        const cacheKey = this.getCacheKey(params);

        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            logger.debug('Returning cached language visualization', { username: params.username });
            return cached.data;
        }

        // Fetch language data
        const languages = await this.githubClient.fetchUserLanguages(params.username);

        // Generate visualization based on type
        const svg = params.type === 'pie'
            ? this.generatePieChart(languages, params)
            : this.generateCard(languages, params);

        // Cache result
        this.cache.set(cacheKey, { data: svg, timestamp: Date.now() });

        logger.info('Language visualization generated', {
            username: params.username,
            type: params.type
        });

        return svg;
    }

    /**
     * Generate language card
     */
    private generateCard(languages: LanguageCount[], params: LanguageQueryParams): string {
        return LanguageCardRenderer.generateLanguagesCard(languages, {
            theme: params.theme || 'default',
            showInfo: params.show_info !== 'false',
            dataBorderStyle: params.info_outline === 'frame' ? 'frame' : 'solid',
        });
    }

    /**
     * Generate language pie chart
     */
    private generatePieChart(languages: LanguageCount[], params: LanguageQueryParams): string {
        return LanguagePieChartRenderer.generatePieChart(languages, {
            theme: params.theme || 'default',
        });
    }

    /**
     * Get cache key for parameters
     */
    private getCacheKey(params: LanguageQueryParams): string {
        return `languages-${params.username}-${params.type}-${params.theme}-${params.show_info}-${params.info_outline}`;
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        logger.info('Languages cache cleared');
    }
}
