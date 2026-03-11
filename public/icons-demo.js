/**
 * Icons Gallery - Compiled Bundle
 * Includes all necessary classes and utilities
 */

// SVG Utilities
function createSVGElement(attributes, children) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    Object.entries(attributes).forEach(([key, value]) => {
        svg.setAttribute(key, value);
    });
    if (children) {
        children.forEach(child => svg.appendChild(child));
    }
    return svg;
}

function createSVGPath(attributes) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    Object.entries(attributes).forEach(([key, value]) => {
        path.setAttribute(key, value);
    });
    return path;
}

function createCopySVG() {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '14');
    rect.setAttribute('height', '14');
    rect.setAttribute('x', '8');
    rect.setAttribute('y', '8');
    rect.setAttribute('rx', '2');
    rect.setAttribute('ry', '2');

    const path = createSVGPath({ d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' });

    return createSVGElement({
        width: '16',
        height: '16',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        class: 'lucide lucide-copy',
    }, [rect, path]);
}

function createCheckSVG() {
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', '20 6 9 17 4 12');

    return createSVGElement({
        width: '16',
        height: '16',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
    }, [polyline]);
}

async function fetchSVGContent(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch SVG: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching SVG from ${path}:`, error);
        throw error;
    }
}



// IconCard Class
class IconCard {
    constructor(options) {
        this.options = options;
        this.element = document.createElement('div');
        this.element.className = 'icon-card';
        this.element.setAttribute('data-icon', options.name);

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'icon-wrapper';

        this.copyBtn = document.createElement('button');
        this.copyBtn.className = 'copy-btn';
        this.copyBtn.title = 'Copy Markdown URL';
        this.copyBtn.setAttribute('aria-label', `Copy ${options.name} icon URL`);
        this.copyBtn.appendChild(createCopySVG());

        this.initialize();
    }

    async initialize() {
        await this.loadSVGContent();
        this.setupEventListeners();
        this.buildElement();
    }

    async loadSVGContent() {
        try {
            const svgContent = await fetchSVGContent(this.options.assetPath);
            this.wrapper.innerHTML = svgContent;
        } catch (error) {
            this.wrapper.innerHTML = '❌';
            this.wrapper.style.fontSize = '32px';
            if (this.options.onError) {
                this.options.onError(this.options.name, error);
            }
        }
    }

    setupEventListeners() {
        this.copyBtn.addEventListener('click', (e) => this.handleCopy(e));
    }

    async handleCopy(e) {
        e.stopPropagation();
        const markdownUrl = `![icon-${this.options.name}](${this.options.origin}/assets/icons/${this.options.name}.svg)`;

        try {
            await navigator.clipboard.writeText(markdownUrl);
            this.showCopySuccess();
            if (this.options.onCopy) {
                this.options.onCopy(this.options.name);
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    }

    showCopySuccess() {
        this.copyBtn.innerHTML = '';
        this.copyBtn.appendChild(createCheckSVG());
        this.copyBtn.classList.add('copied');

        setTimeout(() => {
            this.copyBtn.innerHTML = '';
            this.copyBtn.appendChild(createCopySVG());
            this.copyBtn.classList.remove('copied');
        }, 2000);
    }

    buildElement() {
        const name = document.createElement('div');
        name.className = 'icon-name';
        name.textContent = this.options.name;

        this.element.appendChild(this.copyBtn);
        this.element.appendChild(this.wrapper);
        this.element.appendChild(name);
    }

    getElement() {
        return this.element;
    }

    show() {
        this.element.style.display = 'flex';
    }

    hide() {
        this.element.style.display = 'none';
    }
}

// IconsGallery Class
class IconsGallery {
    constructor(options) {
        this.cards = new Map();
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

    validate() {
        if (!this.grid) throw new Error(`Grid element not found: ${this.options.gridSelector}`);
        if (!this.statsElement) throw new Error(`Stats element not found: ${this.options.statsSelector}`);
        if (!this.searchBox) throw new Error(`Search box not found: ${this.options.searchSelector}`);
    }

    initialize() {
        this.renderIcons();
        this.setupEventListeners();
        this.updateStats();
    }

    renderIcons() {
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
            this.grid.appendChild(card.getElement());
        });
    }

    setupEventListeners() {
        if (this.searchBox) {
            this.searchBox.addEventListener('input', () => this.handleSearch());
        }

        if (this.reloadBtn) {
            this.reloadBtn.addEventListener('click', () => window.location.reload());
        }
    }

    handleSearch() {
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

    updateStats(visibleCount, searchTerm) {
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

    handleIconCopied(iconName) {
        console.log(`Icon copied: ${iconName}`);
    }

    handleIconError(iconName, error) {
        console.error(`Failed to load icon: ${iconName}`, error);
    }

    destroy() {
        this.cards.clear();
        if (this.grid) {
            this.grid.innerHTML = '';
        }
    }
}

// Initialization function
function initializeIconsDemo(icons) {
    if (!Array.isArray(icons) || icons.length === 0) {
        console.error('Invalid icons data provided:', icons);
        return;
    }

    const requiredSelectors = {
        grid: '#iconGrid',
        stats: '#stats',
        search: '#searchBox',
        reload: '.reload-btn',
    };

    const missingElements = Object.entries(requiredSelectors)
        .filter(([_, selector]) => !document.querySelector(selector))
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Missing required DOM elements:', missingElements.join(', '));
        return;
    }

    try {
        const gallery = new IconsGallery({
            icons,
            containerSelector: '.container',
            gridSelector: '#iconGrid',
            searchSelector: '#searchBox',
            statsSelector: '#stats',
            reloadSelector: '.reload-btn',
        });
        console.log('Icons gallery initialized successfully');
    } catch (error) {
        console.error('Failed to initialize icons gallery:', error);
    }
}

