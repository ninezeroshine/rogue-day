import { useEffect, useCallback, useState } from 'react';

// TMA SDK types (we'll import the real SDK later)
interface TelegramWebApp {
    ready: () => void;
    expand: () => void;
    close: () => void;
    initData: string;
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
    initDataUnsafe: {
        user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
        };
    };
    colorScheme: 'light' | 'dark';
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}

export function useTelegram() {
    const [isReady, setIsReady] = useState(false);
    const [isTMA, setIsTMA] = useState(false);

    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;

    useEffect(() => {
        if (tg) {
            tg.ready();
            tg.expand();
            setIsTMA(true);
            setIsReady(true);
        } else {
            // Not in Telegram, still ready for development
            setIsReady(true);
        }
    }, [tg]);

    const user = tg?.initDataUnsafe?.user;
    const colorScheme = tg?.colorScheme || 'dark';
    const themeParams = tg?.themeParams || {};

    return {
        tg,
        isReady,
        isTMA,
        user,
        colorScheme,
        themeParams,
    };
}

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
