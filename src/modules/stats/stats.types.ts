/**
 * Stats Module - Types
 */

export interface StatsQueryParams {
    username: string;
    theme?: string;
    hide_title?: string;
    hide_border?: string;
    hide_rank?: string;
    show_icons?: string;
    avatar_mode?: 'none' | 'avatar' | 'radar';
    show_avatar?: string;
    custom_title?: string;
    data_border_style?: 'solid' | 'frame';
    data_border_frame?: 'in' | 'out';
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
    titleColor?: string;
    format?: string;
}

export interface StatsCardOptions {
    theme?: string;
    hideTitle?: boolean;
    hideBorder?: boolean;
    hideRank?: boolean;
    showIcons?: boolean;
    avatarMode?: 'none' | 'avatar' | 'radar';
    customTitle?: string;
    dataBorderStyle?: 'solid' | 'frame';
    dataBorderFramePosition?: 'in' | 'out';
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
    titleColor?: string;
}

export interface StatsCache {
    data: string;
    timestamp: number;
}

export interface PngCache {
    data: Buffer;
    timestamp: number;
}
