import { ThemeOverrides } from "./themes.type.js";

export interface LanguageCount {
    name: string;
    count: number;
}


export interface LanguagesCardOptions extends ThemeOverrides {
    showInfo?: boolean;
    listLength?: number;
    variant?: 'bubbles' | 'pie';
    dataBorderStyle?: 'solid' | 'frame';
    dataBorderFramePosition?: 'in' | 'out';
    size?: 'small' | 'medium' | 'large' | 'default';
}

export interface LanguagesPieChartOptions extends ThemeOverrides {
    listLength?: number;
    size?: 'small' | 'medium' | 'large' | 'default';
}