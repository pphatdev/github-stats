interface Theme {
    titleColor: string;
    textColor: string;
    iconColor: string;
    bgColor: string;
    borderColor: string;
}

interface ThemesData {
    [key: string]: Theme;
}


interface TemplateConfig {
    theme?: string;
    customTitle?: string;
    avatarMode?: string;
    dataBorderStyle?: string;
    [key: string]: any;
}

// DOM Elements
const themesElement = document.getElementById('users-themes') as HTMLScriptElement;
const themeSelectElement = document.getElementById('themeSelect') as HTMLSelectElement;
const bgColorHexInput = document.getElementById('bgColorHex') as HTMLInputElement;
const borderColorHexInput = document.getElementById('borderColorHex') as HTMLInputElement;
const textColorHexInput = document.getElementById('textColorHex') as HTMLInputElement;
const accentColorHexInput = document.getElementById('accentColorHex') as HTMLInputElement;
const templateLoaders = document.querySelectorAll('[data-load-template]') as NodeListOf<HTMLButtonElement>;

// Load themes data
let themes: ThemesData = {};

if (themesElement) {
    try {
        const content = JSON.parse(themesElement.textContent || '{}');
        themes = JSON.parse(content.themes || '{}');
    } catch (error) {
        themes = {};
    }
}

// Load template function
const loadTemplate = (templateName?: string): void => {
    const previewElement = document.getElementById('svgPreview') as HTMLDivElement;
    const templateElement = document.querySelector(`[data-load-template].active`) as HTMLButtonElement;

    const templateKey = templateName || templateElement?.getAttribute('data-load-template') || 'stats';

    if (!previewElement) return;

    // set loading state
    previewElement.innerHTML = '<p class="text-gray-500 loading">Loading preview...</p>';

    // Get current form values dynamically
    const payloads: TemplateConfig = {
        theme: themeSelectElement?.value || 'default',
        custom_title: (document.getElementById('cardTitle') as HTMLInputElement)?.value || '',
        avatar_mode: (document.getElementById('avatarMode') as HTMLSelectElement)?.value || 'radar',
        username: (document.getElementById('username') as HTMLInputElement)?.value || '',
        data_border_style: (document.getElementById('dataBorderStyle') as HTMLSelectElement)?.value || 'frame',
        data_border_frame: (document.getElementById('dataBorderFrame') as HTMLSelectElement)?.value || 'out',
        hide_title: (!(document.getElementById('showTitle') as HTMLInputElement)?.checked).toString(),
        hide_border: (!(document.getElementById('showBorder') as HTMLInputElement)?.checked).toString(),
        hide_rank: (!(document.getElementById('showRank') as HTMLInputElement)?.checked).toString(),
        bgColor: bgColorHexInput?.value || '',
        borderColor: borderColorHexInput?.value || '',
        textColor: textColorHexInput?.value || '',
        titleColor: accentColorHexInput?.value || '',
    };

    const formData = new FormData();

    for (const [key, value] of Object.entries(payloads)) {
        if (value) formData.append(key, value);
    }

    // Fetch and render the SVG preview
    fetch(`/${templateKey}?${new URLSearchParams(formData as any).toString()}`)
        .then(response => response.text())
        .then(svgContent => {
            previewElement.innerHTML = svgContent;

            // remove loading state
            const loadingText = previewElement.querySelector('p.loading');
            if (loadingText) loadingText.remove();
        })
        .catch(error => {
            console.error('Error loading SVG preview:', error);
            previewElement.innerHTML = '<p class="text-red-500">Failed to load SVG preview.</p>';
        });
}

// Update both color picker and hex input
const updateColorInput = (colorId: string, hexValue: string): void => {
    const colorInput = document.getElementById(colorId) as HTMLInputElement;
    const hexInput = document.getElementById(colorId + 'Hex') as HTMLInputElement;

    if (colorInput) colorInput.value = hexValue;
    if (hexInput) hexInput.value = hexValue;
}

// Color picker sync
const updateColorPicker = (colorInputId: string, hexValue: string): void => {
    const colorInput = document.getElementById(colorInputId) as HTMLInputElement;
    if (colorInput) {
        colorInput.value = hexValue;
    }
    // Reset theme select to "Custom" when manually changing colors
    if (themeSelectElement) themeSelectElement.value = '';
}

// Apply theme colors to inputs
const applyTheme = (themeName: string): void => {
    if (!themeName || !themes[themeName]) {
        return;
    }

    const theme = themes[themeName];

    // Update color inputs
    updateColorInput('bgColor', theme.bgColor);
    updateColorInput('borderColor', theme.borderColor);
    updateColorInput('textColor', theme.textColor);
    updateColorInput('accentColor', theme.titleColor);

    loadTemplate();
}

// Event Listeners
// Theme select change
themeSelectElement?.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    applyTheme(target.value);
});

// Hex input changes
bgColorHexInput?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    updateColorPicker('bgColor', target.value);
    loadTemplate();
});

borderColorHexInput?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    updateColorPicker('borderColor', target.value);
    loadTemplate();
});

textColorHexInput?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    updateColorPicker('textColor', target.value);
    loadTemplate();
});

accentColorHexInput?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    updateColorPicker('accentColor', target.value);
    loadTemplate();
});

// Sync color inputs with hex inputs
['bgColor', 'borderColor', 'textColor', 'accentColor'].forEach(colorId => {
    const colorInput = document.getElementById(colorId) as HTMLInputElement;
    const hexInput = document.getElementById(colorId + 'Hex') as HTMLInputElement;

    if (colorInput && hexInput) {
        colorInput.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            hexInput.value = target.value;
            // Reset theme select to "Custom" when manually changing colors
            if (themeSelectElement) themeSelectElement.value = '';
            loadTemplate();
        });
    }
});
// Settings change listeners
['username', 'cardTitle'].forEach(inputId => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    input?.addEventListener('change', () => loadTemplate());
});

['avatarMode', 'dataBorderStyle', 'dataBorderFrame'].forEach(selectId => {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    select?.addEventListener('change', () => {
        // Show/hide frame position based on border style
        if (selectId === 'dataBorderStyle') {
            const frameContainer = document.getElementById('framePositionContainer');
            if (frameContainer) {
                frameContainer.style.display = select.value === 'frame' ? 'block' : 'none';
            }
        }
        loadTemplate();
    });
});

// Initialize frame position visibility
const dataBorderStyleSelect = document.getElementById('dataBorderStyle') as HTMLSelectElement;
const frameContainer = document.getElementById('framePositionContainer');
if (dataBorderStyleSelect && frameContainer) {
    frameContainer.style.display = dataBorderStyleSelect.value === 'frame' ? 'block' : 'none';
}

['showTitle', 'showBorder', 'showRank'].forEach(checkboxId => {
    const checkbox = document.getElementById(checkboxId) as HTMLInputElement;
    checkbox?.addEventListener('change', () => loadTemplate());
});
// Template loader buttons
templateLoaders.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        templateLoaders.forEach(btn => btn.classList.remove('active'));

        // Add active class to clicked button
        button.classList.add('active');

        const templateName = button.getAttribute('data-load-template');
        if (templateName) {
            loadTemplate(templateName);
        }
    });
});

// Load initial template
loadTemplate();

// Sidebar collapse functionality
const leftSidebar = document.getElementById('leftSidebar');
const rightSidebar = document.getElementById('rightSidebar');
const toggleLeftBtn = document.getElementById('toggleLeftSidebar');
const toggleRightBtn = document.getElementById('toggleRightSidebar');

function toggleLeftSidebar() {
    if (!leftSidebar || !toggleLeftBtn) return;

    const isCollapsed = leftSidebar.classList.contains('collapsed');

    if (isCollapsed) {
        // Expand
        leftSidebar.classList.remove('collapsed');
        leftSidebar.style.width = '15rem'; // 60 = w-60
        leftSidebar.style.opacity = '1';
        toggleLeftBtn.querySelector('span')!.textContent = 'chevron_left';
        toggleLeftBtn.title = 'Collapse sidebar';
        localStorage.setItem('leftSidebarCollapsed', 'false');
    } else {
        // Collapse
        leftSidebar.classList.add('collapsed');
        leftSidebar.style.width = '3.5rem'; // Just enough for the icon
        leftSidebar.style.opacity = '0.8';
        toggleLeftBtn.querySelector('span')!.textContent = 'chevron_right';
        toggleLeftBtn.title = 'Expand sidebar';
        localStorage.setItem('leftSidebarCollapsed', 'true');
    }
}

function toggleRightSidebar() {
    if (!rightSidebar || !toggleRightBtn) return;

    const isCollapsed = rightSidebar.classList.contains('collapsed');

    if (isCollapsed) {
        // Expand
        rightSidebar.classList.remove('collapsed');
        rightSidebar.style.width = '15rem'; // 60 = w-60
        rightSidebar.style.opacity = '1';
        toggleRightBtn.querySelector('span')!.textContent = 'chevron_right';
        toggleRightBtn.title = 'Collapse sidebar';
        localStorage.setItem('rightSidebarCollapsed', 'false');
    } else {
        // Collapse
        rightSidebar.classList.add('collapsed');
        rightSidebar.style.width = '3.5rem'; // Just enough for the icon
        rightSidebar.style.opacity = '0.8';
        toggleRightBtn.querySelector('span')!.textContent = 'chevron_left';
        toggleRightBtn.title = 'Expand sidebar';
        localStorage.setItem('rightSidebarCollapsed', 'true');
    }
}

// Restore saved state on load
const leftCollapsed = localStorage.getItem('leftSidebarCollapsed') === 'true';
const rightCollapsed = localStorage.getItem('rightSidebarCollapsed') === 'true';

if (leftCollapsed && leftSidebar) {
    leftSidebar.classList.add('collapsed');
    leftSidebar.style.width = '3.5rem';
    leftSidebar.style.opacity = '0.8';
    if (toggleLeftBtn) {
        toggleLeftBtn.querySelector('span')!.textContent = 'chevron_right';
        toggleLeftBtn.title = 'Expand sidebar';
    }
}

if (rightCollapsed && rightSidebar) {
    rightSidebar.classList.add('collapsed');
    rightSidebar.style.width = '3.5rem';
    rightSidebar.style.opacity = '0.8';
    if (toggleRightBtn) {
        toggleRightBtn.querySelector('span')!.textContent = 'chevron_left';
        toggleRightBtn.title = 'Expand sidebar';
    }
}

// Add event listeners
toggleLeftBtn?.addEventListener('click', toggleLeftSidebar);
toggleRightBtn?.addEventListener('click', toggleRightSidebar);