export class SidebarManager {
    private leftSidebar: HTMLElement;
    private rightSidebar: HTMLElement;
    private triggerButtons: NodeListOf<HTMLElement>;
    private content: HTMLElement;
    private readonly SMALL_SCREEN_BREAKPOINT = 64 * 16; // 64rem = 1024px
    private resizeTimeout: NodeJS.Timeout | null = null;

    constructor() {
        const left = document.querySelector('#leftSidebar');
        const right = document.querySelector('#rightSidebar');
        const buttons = document.querySelectorAll('[data-trigger]');
        const cont = document.querySelector('[data-content]');

        if (!left || !right || !buttons || !cont) {
            throw new Error('Required sidebar elements not found in DOM');
        }

        this.leftSidebar = left as HTMLElement;
        this.rightSidebar = right as HTMLElement;
        this.triggerButtons = buttons as NodeListOf<HTMLElement>;
        this.content = cont as HTMLElement;
    }

    private updateContentWidth(): void {
        const isSmallScreen = window.innerWidth < this.SMALL_SCREEN_BREAKPOINT;

        if (isSmallScreen) {
            // On small screens, sidebars use fixed positioning with transforms
            // Content takes full width
            this.content.style.width = '100%';
        } else {
            // On large screens, use width-based calculation
            const leftCollapsed = this.leftSidebar.classList.contains('collapsed');
            const rightCollapsed = this.rightSidebar.classList.contains('collapsed');

            let widthCalc = '100%';
            let subtractRem = 33;
            // Default: 15rem left + 15rem right + 3rem gap

            if (leftCollapsed) subtractRem -= 16.5;
            if (rightCollapsed) subtractRem -= 16.5;

            if (subtractRem > 0) {
                widthCalc = `calc(100% - ${subtractRem}rem)`;
            }

            this.content.style.width = widthCalc;
        }
    }

    private updateButtonPosition(target: string): void {
        const isSmallScreen = window.innerWidth < this.SMALL_SCREEN_BREAKPOINT;
        const button = document.querySelector(`[data-trigger="${target}"]`) as HTMLElement;

        if (!button) return;

        if (target === 'leftSidebar') {
            const isCollapsed = this.leftSidebar.classList.contains('collapsed');
            button.classList.remove('left-10', 'left-16', 'left-[12.55rem]');

            if (isSmallScreen) {
                button.classList.add('left-10');
            } else {
                button.classList.add(isCollapsed ? 'left-16' : 'left-[12.55rem]');
            }
        } else if (target === 'rightSidebar') {
            const isCollapsed = this.rightSidebar.classList.contains('collapsed');
            button.classList.remove('right-6', 'right-9', 'right-16');

            if (isSmallScreen) {
                button.classList.add('right-16');
            } else {
                button.classList.add(isCollapsed ? 'right-16' : 'right-9');
            }
        }
    }

    private toggleSidebar(target: string): void {
        const isSmallScreen = window.innerWidth < this.SMALL_SCREEN_BREAKPOINT;
        const sidebar = target === 'leftSidebar' ? this.leftSidebar : this.rightSidebar;
        const isCollapsed = sidebar.classList.contains('collapsed');

        if (isCollapsed) {
            sidebar.classList.remove('collapsed');
            setTimeout(() => {
                sidebar.classList.remove('overflow-hidden');
            }, 300);
        } else {
            sidebar.classList.add('overflow-hidden', 'collapsed');
        }

        if (!isSmallScreen) {
            this.updateButtonPosition(target);
            this.updateContentWidth();
        }
    }

    private handleSmallScreen(): void {
        const isSmallScreen = window.innerWidth < this.SMALL_SCREEN_BREAKPOINT;

        if (isSmallScreen) {
            // On small screens, collapse both sidebars by default
            this.leftSidebar.classList.add('collapsed', 'overflow-hidden');
            this.rightSidebar.classList.add('collapsed', 'overflow-hidden');
        } else {
            // On large screens, expand both sidebars
            this.leftSidebar.classList.remove('collapsed', 'overflow-hidden');
            this.rightSidebar.classList.remove('collapsed', 'overflow-hidden');
        }

        // Update button positions for current screen size
        this.updateButtonPosition('leftSidebar');
        this.updateButtonPosition('rightSidebar');

        this.updateContentWidth();
    }

    private attachEventListeners(): void {
        this.triggerButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const target = button.getAttribute('data-trigger');
                if (target) {
                    this.toggleSidebar(target);
                }
            });
        });

        window.addEventListener('resize', () => {
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            this.resizeTimeout = setTimeout(() => {
                this.handleSmallScreen();
            }, 250);
        });
    }

    public init(): void {
        this.handleSmallScreen();
        this.attachEventListeners();
    }
}