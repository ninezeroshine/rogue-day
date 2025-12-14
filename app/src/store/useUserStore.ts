import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type { ExtractionResult } from './types';

// User settings interface
export interface UserSettings {
    notifications: boolean;
    sounds: boolean;
    haptics: boolean;
    morningReminder: string | null; // "08:00" or null
    eveningReminder: string | null; // "22:00" or null
    showGhost: boolean;
}

// User profile state
interface UserState {
    id: string;
    telegramId: number | null;
    username: string | null;

    // Aggregate stats
    totalXP: number;
    totalExtractions: number;
    totalTasksCompleted: number;
    totalFocusMinutes: number;
    currentStreak: number;
    bestStreak: number;

    // History (last 30 extractions)
    extractionHistory: ExtractionResult[];

    // Settings
    settings: UserSettings;
}

// Server stats sync - single source of truth from backend
interface ServerStats {
    totalXP: number;
    totalExtractions: number;
    totalTasksCompleted: number;
    totalFocusMinutes: number;
    currentStreak: number;
    bestStreak: number;
}

interface UserActions {
    // Profile
    setTelegramUser: (id: number, username?: string) => void;

    // Stats - server is source of truth
    syncWithServer: (stats: ServerStats) => void;
    addExtraction: (extraction: ExtractionResult) => void;
    setExtractionHistory: (history: ExtractionResult[]) => void;

    // Settings
    updateSettings: (settings: Partial<UserSettings>) => void;

    // Reset
    resetProgress: () => void;
}

export type UserStore = UserState & UserActions;

const DEFAULT_SETTINGS: UserSettings = {
    notifications: true,
    sounds: true,
    haptics: true,
    morningReminder: '08:00',
    eveningReminder: '22:00',
    showGhost: true,
};

const initialState: UserState = {
    id: '',
    telegramId: null,
    username: null,
    totalXP: 0,
    totalExtractions: 0,
    totalTasksCompleted: 0,
    totalFocusMinutes: 0,
    currentStreak: 0,
    bestStreak: 0,
    extractionHistory: [],
    settings: DEFAULT_SETTINGS,
};

export const useUserStore = create<UserStore>()(
    persist(
        (set, get) => ({
            ...initialState,

            setTelegramUser: (id: number, username?: string) => {
                set({ telegramId: id, username: username || null });
            },

            // Sync stats from server - this is the source of truth
            syncWithServer: (stats: ServerStats) => {
                set({
                    totalXP: stats.totalXP,
                    totalExtractions: stats.totalExtractions,
                    totalTasksCompleted: stats.totalTasksCompleted,
                    totalFocusMinutes: stats.totalFocusMinutes,
                    currentStreak: stats.currentStreak,
                    bestStreak: stats.bestStreak,
                });
            },

            addExtraction: (extraction: ExtractionResult) => {
                const state = get();

                // Only update history - stats come from server via syncWithServer
                const newHistory = [extraction, ...state.extractionHistory].slice(0, 30);
                set({ extractionHistory: newHistory });
            },

            setExtractionHistory: (history: ExtractionResult[]) => {
                // Trust server ordering; keep last 30 for storage limits
                set({ extractionHistory: history.slice(0, 30) });
            },

            updateSettings: (newSettings: Partial<UserSettings>) => {
                set(state => ({
                    settings: { ...state.settings, ...newSettings },
                }));
            },

            resetProgress: () => {
                set({
                    totalXP: 0,
                    totalExtractions: 0,
                    totalTasksCompleted: 0,
                    totalFocusMinutes: 0,
                    currentStreak: 0,
                    bestStreak: 0,
                    extractionHistory: [],
                });
            },
        }),
        {
            name: 'rogue-day-user',
        }
    )
);

// Selector hooks
export const useExtractionHistory = () => useUserStore(state => state.extractionHistory);
export const useUserSettings = () => useUserStore(state => state.settings);
export const useUserStats = () => useUserStore(
    useShallow(state => ({
        totalXP: state.totalXP,
        totalExtractions: state.totalExtractions,
        totalTasksCompleted: state.totalTasksCompleted,
        totalFocusMinutes: state.totalFocusMinutes,
        currentStreak: state.currentStreak,
        bestStreak: state.bestStreak,
    }))
);

