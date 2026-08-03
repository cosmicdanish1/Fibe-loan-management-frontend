import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // uses localStorage
import themeReducer from './slices/themeSlice';

// Persist config — saves theme state to localStorage under key 'pwt_theme'
const themePersistConfig = {
    key: 'pwt_theme',
    storage,
    // Persist all theme fields
    whitelist: [
        'interfaceMode',
        'accentColor',
        'fontScale',
        'density',
        'cornerRadius',
        'fontFamily',
        'backgroundType',
        'backgroundColor1',
        'backgroundColor2',
        'backgroundImage',
        'textColor',
        'notifications',
        'soundEffects',
        // Was absent, so the chatbot reappeared on every launch until the
        // backend preferences finished loading and corrected it.
        'showChatbot',
    ],
};

const persistedThemeReducer = persistReducer(themePersistConfig, themeReducer);

export const store = configureStore({
    reducer: {
        theme: persistedThemeReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore redux-persist actions
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
