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
}

export interface LanguagesPieChartOptions extends ThemeOverrides {
    listLength?: number;
}