import { create } from 'zustand';
import api from '../lib/api';
import type { RunResponse, TaskResponse, TaskCreate } from '../lib/api';
import type { TierLevel } from './types';
import { GAME_CONFIG } from '../lib/constants';

/**
 * Server-synced run store.
 * All operations go through the backend API.
 */

interface ServerRunState {
    // Data from server
    run: RunResponse | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    loadCurrentRun: () => Promise<RunResponse | null>;
    startNewRun: () => Promise<RunResponse | null>;
    addTask: (task: TaskCreate) => Promise<TaskResponse | null>;
    startTask: (taskId: number) => Promise<TaskResponse | null>;
    completeTask: (taskId: number) => Promise<TaskResponse | null>;
    failTask: (taskId: number) => Promise<TaskResponse | null>;
    deleteTask: (taskId: number) => Promise<boolean>;
    extractRun: () => Promise<{
        finalXP: number;
        tasksCompleted: number;
        tasksFailedCount: number;
        totalFocusMinutes: number;
    } | null>;

    // Helpers
    refreshRun: () => Promise<void>;
    isTierUnlocked: (tier: TierLevel) => boolean;
}

export const useServerRunStore = create<ServerRunState>((set, get) => ({
    run: null,
    isLoading: false,
    error: null,

    loadCurrentRun: async () => {
        set({ isLoading: true, error: null });
        try {
            const run = await api.run.getCurrent();
            set({ run, isLoading: false });
            return run;
        } catch (err) {
            // No active run is not an error
            set({ run: null, isLoading: false });
            return null;
        }
    },

    startNewRun: async () => {
        set({ isLoading: true, error: null });
        try {
            const run = await api.run.startNew();
            set({ run, isLoading: false });
            return run;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to start run';
            set({ error: message, isLoading: false });
            console.error('Failed to start run:', err);
            return null;
        }
    },

    addTask: async (taskData) => {
        try {
            const task = await api.task.create(taskData);
            // Refresh run to get updated state
            await get().refreshRun();
            return task;
        } catch (err) {
            console.error('Failed to add task:', err);
            return null;
        }
    },

    startTask: async (taskId) => {
        try {
            const task = await api.task.start(taskId);
            await get().refreshRun();
            return task;
        } catch (err) {
            console.error('Failed to start task:', err);
            return null;
        }
    },

    completeTask: async (taskId) => {
        try {
            const task = await api.task.complete(taskId);
            await get().refreshRun();
            return task;
        } catch (err) {
            console.error('Failed to complete task:', err);
            return null;
        }
    },

    failTask: async (taskId) => {
        try {
            const task = await api.task.fail(taskId);
            await get().refreshRun();
            return task;
        } catch (err) {
            console.error('Failed to fail task:', err);
            return null;
        }
    },

    deleteTask: async (taskId) => {
        try {
            await api.task.delete(taskId);
            await get().refreshRun();
            return true;
        } catch (err) {
            console.error('Failed to delete task:', err);
            return false;
        }
    },

    extractRun: async () => {
        const { run } = get();
        if (!run) return null;

        set({ isLoading: true });
        try {
            const extraction = await api.run.extract(run.id);
            set({ run: null, isLoading: false });

            return {
                finalXP: extraction.final_xp,
                tasksCompleted: extraction.tasks_completed,
                tasksFailedCount: extraction.tasks_failed,
                totalFocusMinutes: extraction.total_focus_minutes,
            };
        } catch (err) {
            console.error('Failed to extract run:', err);
            set({ isLoading: false });
            return null;
        }
    },

    refreshRun: async () => {
        try {
            const run = await api.run.getCurrent();
            set({ run });
        } catch {
            // Ignore - might not have active run
        }
    },

    isTierUnlocked: (tier: TierLevel) => {
        const totalFocusMinutes = get().run?.total_focus_minutes ?? 0;
        const unlockThreshold = GAME_CONFIG.TIER_UNLOCK[tier];
        return totalFocusMinutes >= unlockThreshold;
    },
}));

// Selectors - use useShallow or individual selectors to avoid infinite loops
// BAD: returning new object causes re-render -> infinite loop
// GOOD: use useShallow or select primitives

// Stable constants
const EMPTY_TASKS: any[] = [];

export const useServerRun = () => useServerRunStore(state => state.run);
export const useServerIsLoading = () => useServerRunStore(state => state.isLoading);
export const useServerError = () => useServerRunStore(state => state.error);
export const useServerTasks = () => useServerRunStore(state => state.run?.tasks ?? EMPTY_TASKS);
export const useServerDailyXP = () => useServerRunStore(state => state.run?.daily_xp ?? 0);
export const useServerCurrentEnergy = () => useServerRunStore(state => state.run?.focus_energy ?? 50);
export const useServerMaxEnergy = () => useServerRunStore(state => state.run?.max_energy ?? 50);

// For components that need multiple values, use the store directly
// Example: const { run, isLoading } = useServerRunStore(state => ({ run: state.run, isLoading: state.isLoading }))
// But be careful - this still creates new object! Use useShallow from zustand/shallow if needed.
