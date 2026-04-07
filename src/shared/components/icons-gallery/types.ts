export interface IconsGalleryConfig {
    icons: string[];
    assetPath?: string;
    origin?: string;
}

export interface IconCardData {
    name: string;
    path: string;
}

export enum IconGalleryEvents {
    ICON_COPIED = 'icon:copied',
    ICON_FAILED = 'icon:failed',
    SEARCH_CHANGED = 'search:changed',
}
