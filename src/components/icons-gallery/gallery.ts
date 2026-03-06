import { IconCard, IconCardOptions } from './icon-card.js';
import { IconsGalleryConfig } from './types.js';

export interface IconsGalleryOptions extends IconsGalleryConfig {
    containerSelector: string;
    gridSelector: string;
    searchSelector: string;
    statsSelector: string;
    reloadSelector: string;
}

export class IconsGallery {
    private options: IconsGalleryOptions;
    private cards: Map<string, IconCard> = new Map();
    private container: HTMLElement | null;
    private grid: HTMLElement | null;
    private searchBox: HTMLInputElement | null;
    private statsElement: HTMLElement | null;
    private reloadBtn: HTMLElement | null;

    constructor(options: IconsGalleryOptions) {
        this.options = {
            ...options,
            assetPath: options.assetPath ?? '/assets/icons',
            origin: options.origin ?? window.location.origin ?? 'https://stats.pphat.top',
        };

        this.container = document.querySelector(options.containerSelector);
        this.grid = document.querySelector(options.gridSelector);
        this.searchBox = document.querySelector(options.searchSelector);
        this.statsElement = document.querySelector(options.statsSelector);
        this.reloadBtn = document.querySelector(options.reloadSelector);

        this.validate();
        this.initialize();
    }

    private validate(): void {
        if (!this.grid) throw new Error(`Grid element not found: ${this.options.gridSelector}`);
        if (!this.statsElement) throw new Error(`Stats element not found: ${this.options.statsSelector}`);
        if (!this.searchBox) throw new Error(`Search box not found: ${this.options.searchSelector}`);
    }

    private initialize(): void {
        this.renderIcons();
        this.setupEventListeners();
        this.updateStats();
    }

    private renderIcons(): void {
        this.options.icons.forEach((iconName) => {
            const assetPath = this.options.assetPath ?? '/assets/icons';
            const origin = this.options.origin ?? window.location.origin ?? 'https://stats.pphat.top';
            const card = new IconCard({
                name: iconName,
                assetPath: `${assetPath}/${iconName}.svg`,
                origin,
                onCopy: (name) => this.handleIconCopied(name),
                onError: (name, error) => this.handleIconError(name, error),
            });

            this.cards.set(iconName, card);
            this.grid!.appendChild(card.getElement());
        });
    }

    private setupEventListeners(): void {
        if (this.searchBox) {
            this.searchBox.addEventListener('input', () => this.handleSearch());
        }

        if (this.reloadBtn) {
            this.reloadBtn.addEventListener('click', () => window.location.reload());
        }
    }

    private handleSearch(): void {
        const searchTerm = this.searchBox?.value.toLowerCase() || '';
        let visibleCount = 0;

        this.cards.forEach((card, iconName) => {
            if (iconName.toLowerCase().includes(searchTerm)) {
                card.show();
                visibleCount++;
            } else {
                card.hide();
            }
        });

        this.updateStats(visibleCount, searchTerm);
    }

    private updateStats(visibleCount?: number, searchTerm?: string): void {
        if (!this.statsElement) return;

        const total = this.options.icons.length;
        const count = visibleCount !== undefined ? visibleCount : total;
        const filtered = searchTerm ? ` (filtered)` : '';

        if (count === total) {
            this.statsElement.textContent = `Total Icons: ${total}`;
        } else {
            this.statsElement.textContent = `${count} of ${total} icons${filtered}`;
        }
    }

    private handleIconCopied(iconName: string): void {
        // Could emit event or track analytics here
        console.log(`Icon copied: ${iconName}`);
    }

    private handleIconError(iconName: string, error: Error): void {
        console.error(`Failed to load icon: ${iconName}`, error);
    }

    public destroy(): void {
        this.cards.clear();
        if (this.grid) {
            this.grid.innerHTML = '';
        }
    }
}

/**
 * Initialize the gallery with default selectors
 */
export function initializeIconsGallery(icons: string[]): IconsGallery {
    return new IconsGallery({
        icons,
        containerSelector: '.container',
        gridSelector: '#iconGrid',
        searchSelector: '#searchBox',
        statsSelector: '#stats',
        reloadSelector: '.reload-btn',
    });
}
