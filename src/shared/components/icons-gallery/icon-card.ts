import { createCopySVG, createCheckSVG, fetchSVGContent } from './svg-utils.js';

export interface IconCardOptions {
    name: string;
    assetPath: string;
    origin: string;
    onCopy?: (iconName: string) => void;
    onError?: (iconName: string, error: Error) => void;
}

export class IconCard {
    private element: HTMLElement;
    private options: IconCardOptions;
    private wrapper: HTMLElement;
    private copyBtn: HTMLButtonElement;

    constructor(options: IconCardOptions) {
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

    private async initialize(): Promise<void> {
        await this.loadSVGContent();
        this.setupEventListeners();
        this.buildElement();
    }

    private async loadSVGContent(): Promise<void> {
        try {
            const svgContent = await fetchSVGContent(this.options.assetPath);
            this.wrapper.innerHTML = svgContent;
        } catch (error) {
            this.wrapper.innerHTML = '❌';
            this.wrapper.style.fontSize = '32px';
            if (this.options.onError) {
                this.options.onError(this.options.name, error as Error);
            }
        }
    }

    private setupEventListeners(): void {
        this.copyBtn.addEventListener('click', (e) => this.handleCopy(e));
    }

    private async handleCopy(e: MouseEvent): Promise<void> {
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

    private showCopySuccess(): void {
        const oldContent = this.copyBtn.innerHTML;
        this.copyBtn.innerHTML = '';
        this.copyBtn.appendChild(createCheckSVG());
        this.copyBtn.classList.add('copied');

        setTimeout(() => {
            this.copyBtn.innerHTML = '';
            this.copyBtn.appendChild(createCopySVG());
            this.copyBtn.classList.remove('copied');
        }, 2000);
    }

    private buildElement(): void {
        const name = document.createElement('div');
        name.className = 'icon-name';
        name.textContent = this.options.name;

        this.element.appendChild(this.copyBtn);
        this.element.appendChild(this.wrapper);
        this.element.appendChild(name);
    }

    getElement(): HTMLElement {
        return this.element;
    }

    show(): void {
        this.element.style.display = 'flex';
    }

    hide(): void {
        this.element.style.display = 'none';
    }
}
