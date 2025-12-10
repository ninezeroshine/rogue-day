import { useEffect, useCallback, useState } from 'react';

/**
 * Telegram WebApp types
 * Full SDK: https://core.telegram.org/bots/webapps
 */
interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
}

interface TelegramWebApp {
    ready: () => void;
    expand: () => void;
    close: () => void;
    initData: string;
    initDataUnsafe: {
        query_id?: string;
        user?: TelegramUser;
        auth_date?: number;
        hash?: string;
    };
    MainButton: {
        text: string;
        show: () => void;
        hide: () => void;
        onClick: (callback: () => void) => void;
        offClick: (callback: () => void) => void;
        enable: () => void;
        disable: () => void;
    };
    BackButton: {
        show: () => void;
        hide: () => void;
        onClick: (callback: () => void) => void;
        offClick: (callback: () => void) => void;
    };
    HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
    };
    themeParams: {
        bg_color?: string;
        text_color?: string;
        hint_color?: string;
        link_color?: string;
        button_color?: string;
        button_text_color?: string;
    };
    colorScheme: 'light' | 'dark';
    platform: string;
    version: string;
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}

/**
 * Main Telegram hook - provides access to WebApp API and user data
 */
export function useTelegram() {
    const [isReady, setIsReady] = useState(false);
    const [isTMA, setIsTMA] = useState(false);
    const [user, setUser] = useState<TelegramUser | null>(null);

    useEffect(() => {
        // Wait for DOM to be ready
        const initTelegram = () => {
            const tg = window.Telegram?.WebApp;

            if (tg) {
                // Initialize the app
                tg.ready();
                tg.expand();

                setIsTMA(true);

                // Get user data from initDataUnsafe
                const telegramUser = tg.initDataUnsafe?.user;
                if (telegramUser) {
                    setUser(telegramUser);
                    console.log('✅ Telegram user:', telegramUser.first_name, '@' + telegramUser.username);
                } else {
                    console.warn('⚠️ Telegram WebApp loaded but no user data in initDataUnsafe');
                    console.log('initData:', tg.initData);
                    console.log('initDataUnsafe:', tg.initDataUnsafe);
                }

                setIsReady(true);
            } else {
                // Not in Telegram environment
                console.log('ℹ️ Not in Telegram WebApp (dev mode)');
                setIsReady(true);
            }
        };

        // Small delay to ensure Telegram SDK is loaded
        if (window.Telegram?.WebApp) {
            initTelegram();
        } else {
            // Wait for script to load
            const timeout = setTimeout(initTelegram, 100);
            return () => clearTimeout(timeout);
        }
    }, []);

    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const colorScheme = tg?.colorScheme || 'dark';
    const themeParams = tg?.themeParams || {};

    return {
        tg,
        isReady,
        isTMA,
        user,
        colorScheme,
        themeParams,
        initData: tg?.initData || '',
    };
}

/**
 * Haptic feedback hook
 */
export function useHaptic() {
    const { tg, isTMA } = useTelegram();

    const impact = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
        if (isTMA && tg?.HapticFeedback) {
            tg.HapticFeedback.impactOccurred(style);
        }
    }, [tg, isTMA]);

    const notification = useCallback((type: 'error' | 'success' | 'warning') => {
        if (isTMA && tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred(type);
        }
    }, [tg, isTMA]);

    const selection = useCallback(() => {
        if (isTMA && tg?.HapticFeedback) {
            tg.HapticFeedback.selectionChanged();
        }
    }, [tg, isTMA]);

    return {
        impact,
        notification,
        selection,
    };
}

/**
 * Main Button hook
 */
export function useMainButton(text: string, onClick: () => void, visible = true) {
    const { tg, isTMA } = useTelegram();

    useEffect(() => {
        if (!isTMA || !tg?.MainButton) return;

        tg.MainButton.text = text;

        if (visible) {
            tg.MainButton.show();
        } else {
            tg.MainButton.hide();
        }

        tg.MainButton.onClick(onClick);

        return () => {
            tg.MainButton.offClick(onClick);
            tg.MainButton.hide();
        };
    }, [tg, isTMA, text, onClick, visible]);
}

/**
 * Back Button hook
 */
export function useBackButton(onClick: () => void, visible = true) {
    const { tg, isTMA } = useTelegram();

    useEffect(() => {
        if (!isTMA || !tg?.BackButton) return;

        if (visible) {
            tg.BackButton.show();
        } else {
            tg.BackButton.hide();
        }

        tg.BackButton.onClick(onClick);

        return () => {
            tg.BackButton.offClick(onClick);
            tg.BackButton.hide();
        };
    }, [tg, isTMA, onClick, visible]);
}
