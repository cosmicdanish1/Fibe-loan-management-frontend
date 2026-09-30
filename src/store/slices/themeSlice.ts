import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ThemeState {
    interfaceMode: 'light' | 'dark';
    accentColor: string;
    fontScale: number;
    density: number;
    cornerRadius: number;

    // New Fields
    fontFamily?: string;
    backgroundType?: 'image' | 'gradient' | 'solid';
    backgroundColor1?: string;
    backgroundColor2?: string;
    backgroundImage?: string;
    textColor?: string;
    notifications?: boolean;
    soundEffects?: boolean;
    boldText?: boolean;
    showChatbot?: boolean;
    /** Soft shadows on cards, buttons, and popups. Stored on this device only. */
    shadows?: boolean;
    /** Decorative header background: none | waves | blobs | mesh. Stored on this device only. */
    headerStyle?: 'none' | 'waves' | 'blobs' | 'mesh';
}

const initialState: ThemeState = {
    interfaceMode: 'light',
    accentColor: '#ec4899',
    fontScale: 1.0,
    density: 1.0,
    cornerRadius: 8,

    // Default values for new fields
    fontFamily: 'Inter',
    backgroundType: 'solid',
    backgroundColor1: '#ffffff',
    backgroundColor2: '#000000',
    backgroundImage: '',
    textColor: '#1f2937',
    notifications: true,
    soundEffects: true,
    showChatbot: true,
    shadows: true,
    headerStyle: 'waves',
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        setTheme: (state, action: PayloadAction<Partial<ThemeState>>) => {
            const next = { ...state, ...action.payload };
            // The old "system" mode no longer exists; stored or synced values fall back to light.
            next.interfaceMode = next.interfaceMode === 'dark' ? 'dark' : 'light';
            return next;
        },
        setInterfaceMode: (state, action: PayloadAction<ThemeState['interfaceMode']>) => {
            state.interfaceMode = action.payload === 'dark' ? 'dark' : 'light';
        },
        setAccentColor: (state, action: PayloadAction<string>) => {
            state.accentColor = action.payload;
        },
        setFontScale: (state, action: PayloadAction<number>) => {
            state.fontScale = action.payload;
        },
        setDensity: (state, action: PayloadAction<number>) => {
            state.density = action.payload;
        },
        setCornerRadius: (state, action: PayloadAction<number>) => {
            state.cornerRadius = action.payload;
        },
        setBoldText: (state, action: PayloadAction<boolean>) => {
            state.boldText = action.payload;
        }
    }
});

export const {
    setTheme,
    setInterfaceMode,
    setAccentColor,
    setFontScale,
    setDensity,
    setCornerRadius,
    setBoldText
} = themeSlice.actions;

export default themeSlice.reducer;
