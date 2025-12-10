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

interface UserActions {
    // Profile
    setTelegramUser: (id: number, username?: string) => void;

    // Stats
    addExtraction: (extraction: ExtractionResult) => void;

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

            addExtraction: (extraction: ExtractionResult) => {
                const state = get();

                // Update history (keep last 30)
                const newHistory = [extraction, ...state.extractionHistory].slice(0, 30);

                // Update stats
                set({
                    totalXP: state.totalXP + extraction.finalXP,
                    totalExtractions: state.totalExtractions + 1,
                    totalTasksCompleted: state.totalTasksCompleted + extraction.tasksCompleted,
                    totalFocusMinutes: state.totalFocusMinutes + extraction.totalFocusMinutes,
                    currentStreak: state.currentStreak + 1,
                    bestStreak: Math.max(state.bestStreak, state.currentStreak + 1),
                    extractionHistory: newHistory,
                });
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

