import { SidebarManager } from '../../utils/sidebar.js';

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

// Initialize sidebar management
const sidebarManager = new SidebarManager();
sidebarManager.init();

// DOM Elements
const themesElement = document.getElementById('users-themes') as HTMLScriptElement;
const themeSelectElement = document.getElementById('themeSelect') as HTMLSelectElement;
const bgColorHexInput = document.getElementById('bgColorHex') as HTMLInputElement;
const borderColorHexInput = document.getElementById('borderColorHex') as HTMLInputElement;
const textColorHexInput = document.getElementById('textColorHex') as HTMLInputElement;
const accentColorHexInput = document.getElementById('accentColorHex') as HTMLInputElement;
const templateLoaders = document.querySelectorAll('[data-load-template]') as NodeListOf<HTMLButtonElement>;
const saveThemeBtn = document.getElementById('saveThemeBtn') as HTMLButtonElement;
const deleteThemeBtn = document.getElementById('deleteThemeBtn') as HTMLButtonElement;
const customThemesGroup = document.getElementById('customThemesGroup') as HTMLOptGroupElement;
const copyMarkdownBtn = document.getElementById('copyMarkdownBtn') as HTMLButtonElement;

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

// Custom theme management
const CUSTOM_THEMES_KEY = 'github-stats-custom-themes';

interface CustomTheme extends Theme {
    name: string;
}

// Get custom themes from localStorage
const getCustomThemes = (): { [key: string]: CustomTheme } => {
    try {
        const stored = localStorage.getItem(CUSTOM_THEMES_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('Error loading custom themes:', error);
        return {};
    }
}

// Save custom themes to localStorage
const saveCustomThemes = (customThemes: { [key: string]: CustomTheme }): void => {
    try {
        localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes));
    } catch (error) {
        console.error('Error saving custom themes:', error);
    }
}

// Populate custom themes in dropdown
const populateCustomThemes = (): void => {
    const customThemes = getCustomThemes();
    const customThemeKeys = Object.keys(customThemes);

    if (customThemeKeys.length > 0) {
        customThemesGroup.style.display = '';
        customThemesGroup.innerHTML = '';

        customThemeKeys.forEach(themeKey => {
            const option = document.createElement('option');
            option.value = `custom-${themeKey}`;
            option.textContent = customThemes[themeKey].name;
            customThemesGroup.appendChild(option);
        });
    } else {
        customThemesGroup.style.display = 'none';
    }
}

// Update delete button visibility
const updateDeleteButtonVisibility = (): void => {
    const selectedValue = themeSelectElement?.value || '';
    if (selectedValue.startsWith('custom-')) {
        deleteThemeBtn.style.display = 'block';
    } else {
        deleteThemeBtn.style.display = 'none';
    }
}

// Initialize custom themes
populateCustomThemes();

const getCurrentPayloads = (): TemplateConfig => ({
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
});

// Load template function
const loadTemplate = (templateName?: string): void => {
    const previewElement = document.getElementById('svgPreview') as HTMLDivElement;
    const templateElement = document.querySelector(`[data-load-template].active`) as HTMLButtonElement;

    const templateKey = templateName || templateElement?.getAttribute('data-load-template') || 'stats';

    if (!previewElement) return;

    // set loading state
    previewElement.innerHTML = '<p class="text-gray-500 loading">Loading preview...</p>';

    // Get current form values dynamically
    const payloads: TemplateConfig = getCurrentPayloads();

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

const buildTemplateUrl = (templateName?: string): string => {
    const templateElement = document.querySelector(`[data-load-template].active`) as HTMLButtonElement;
    const templateKey = templateName || templateElement?.getAttribute('data-load-template') || 'stats';
    const payloads: TemplateConfig = getCurrentPayloads();
    const selectedTheme = themeSelectElement?.value || '';

    if (selectedTheme && !selectedTheme.startsWith('custom-')) {
        delete payloads.bgColor;
        delete payloads.borderColor;
        delete payloads.textColor;
        delete payloads.titleColor;
    }
    const formData = new FormData();

    for (const [key, value] of Object.entries(payloads)) {
        if (value) formData.append(key, value);
    }

    const query = new URLSearchParams(formData as any).toString();
    return `${window.location.origin}/${templateKey}?${query}`;
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
    if (themeSelectElement) {
        themeSelectElement.value = '';
        updateDeleteButtonVisibility();
    }
}

// Apply theme colors to inputs
const applyTheme = (themeName: string): void => {
    if (!themeName) {
        updateDeleteButtonVisibility();
        return;
    }

    let theme: Theme | null = null;

    // Check if it's a custom theme
    if (themeName.startsWith('custom-')) {
        const customThemes = getCustomThemes();
        const customThemeKey = themeName.replace('custom-', '');
        theme = customThemes[customThemeKey];
    } else {
        // Built-in theme
        theme = themes[themeName];
    }

    if (!theme) {
        return;
    }

    // Update color inputs
    updateColorInput('bgColor', theme.bgColor);
    updateColorInput('borderColor', theme.borderColor);
    updateColorInput('textColor', theme.textColor);
    updateColorInput('accentColor', theme.titleColor);

    updateDeleteButtonVisibility();
    loadTemplate();
}

// Event Listeners
// Theme select change
themeSelectElement?.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    applyTheme(target.value);
});

// Save custom theme
saveThemeBtn?.addEventListener('click', () => {
    const themeName = prompt('Enter a name for your custom theme:');
    if (!themeName || themeName.trim() === '') {
        return;
    }

    const customThemes = getCustomThemes();
    const themeKey = themeName.toLowerCase().replace(/\s+/g, '-');

    // Get current colors
    const newTheme: CustomTheme = {
        name: themeName.trim(),
        bgColor: bgColorHexInput?.value || '#0d1117',
        borderColor: borderColorHexInput?.value || '#1e293b',
        textColor: textColorHexInput?.value || '#ffffff',
        titleColor: accentColorHexInput?.value || '#3b82f6',
        iconColor: accentColorHexInput?.value || '#3b82f6',
    };

    customThemes[themeKey] = newTheme;
    saveCustomThemes(customThemes);
    populateCustomThemes();

    // Select the newly saved theme
    themeSelectElement.value = `custom-${themeKey}`;
    updateDeleteButtonVisibility();

    alert(`Theme "${themeName}" saved successfully!`);
});

// Delete custom theme
deleteThemeBtn?.addEventListener('click', () => {
    const selectedValue = themeSelectElement?.value || '';
    if (!selectedValue.startsWith('custom-')) {
        return;
    }

    const customThemes = getCustomThemes();
    const themeKey = selectedValue.replace('custom-', '');
    const themeName = customThemes[themeKey]?.name || themeKey;

    if (confirm(`Are you sure you want to delete the theme "${themeName}"?`)) {
        delete customThemes[themeKey];
        saveCustomThemes(customThemes);
        populateCustomThemes();

        // Reset to custom
        themeSelectElement.value = '';
        updateDeleteButtonVisibility();

        alert(`Theme "${themeName}" deleted successfully!`);
    }
});

copyMarkdownBtn?.addEventListener('click', async () => {
    const templateElement = document.querySelector(`[data-load-template].active`) as HTMLButtonElement;
    const templateKey = templateElement?.getAttribute('data-load-template') || 'stats';
    const url = buildTemplateUrl(templateKey);
    const markdown = `![Theme ${templateKey}](${url})`;

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(markdown);
        } else {
            const tempInput = document.createElement('textarea');
            tempInput.value = markdown;
            tempInput.style.position = 'fixed';
            tempInput.style.left = '-9999px';
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
        }
        alert('Markdown copied to clipboard.');
    } catch (error) {
        console.error('Error copying markdown:', error);
        alert('Failed to copy markdown.');
    }
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
            if (themeSelectElement) {
                themeSelectElement.value = '';
                updateDeleteButtonVisibility();
            }
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