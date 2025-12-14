import { create } from 'zustand';
import api from '../lib/api';
import type { RunResponse, TaskResponse, TaskCreate } from '../lib/api';
import type { TierLevel } from './types';
import { GAME_CONFIG } from '../lib/constants';
import { useUserStore } from './useUserStore';

/**
 * Server-synced run store with optimistic updates.
 * 
 * Optimistic Update Pattern:
 * 1. Immediately update local state
 * 2. Send request to server in background
 * 3. On success: replace optimistic data with server response
 * 4. On error: rollback to previous state
 */

// Extended task type with optimistic marker
interface OptimisticTask extends TaskResponse {
    _optimistic?: boolean;
    _previousStatus?: TaskResponse['status'];
}

interface OptimisticRun extends Omit<RunResponse, 'tasks'> {
    tasks: OptimisticTask[];
}

interface ServerRunState {
    // Data from server
    run: OptimisticRun | null;
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
            set({ run: run as OptimisticRun, isLoading: false });
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
            set({ run: run as OptimisticRun, isLoading: false });
            return run;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to start run';
            set({ error: message, isLoading: false });
            console.error('Failed to start run:', err);
            return null;
        }
    },

    // addTask: Non-optimistic approach to preserve animations
    // Status changes (start/complete/fail) remain optimistic since they don't change IDs
    addTask: async (taskData) => {
        try {
            // Send to server first
            const task = await api.task.create(taskData);
            // Refresh to get updated run state (includes new task with stable ID)
            await get().refreshRun();
            return task;
        } catch (err) {
            console.error('Failed to add task:', err);
            return null;
        }
    },

    startTask: async (taskId) => {
        const { run } = get();
        if (!run) return null;

        const task = run.tasks.find(t => t.id === taskId);
        if (!task || task.status !== 'pending') return null;

        // Optimistic update: set status to active, deduct energy
        const optimisticStartedAt = new Date().toISOString();
        set({
            run: {
                ...run,
                tasks: run.tasks.map(t =>
                    t.id === taskId
                        ? { ...t, status: 'active' as const, started_at: optimisticStartedAt, _previousStatus: t.status }
                        : t
                ),
                // Deduct energy when starting task (T2/T3 cost energy)
                focus_energy: run.focus_energy - task.energy_cost,
            },
        });

        try {
            const serverTask = await api.task.start(taskId);

            // Update with server response
            set(state => {
                if (!state.run) return state;
                return {
                    run: {
                        ...state.run,
                        tasks: state.run.tasks.map(t =>
                            t.id === taskId ? { ...serverTask, _optimistic: false } : t
                        ),
                    },
                };
            });

            return serverTask;
        } catch (err) {
            console.error('Failed to start task:', err);

            // Rollback to previous status and restore energy
            set(state => {
                if (!state.run) return state;
                return {
                    run: {
                        ...state.run,
                        tasks: state.run.tasks.map(t =>
                            t.id === taskId
                                ? { ...t, status: t._previousStatus ?? 'pending', started_at: null }
                                : t
                        ),
                        // Restore energy on rollback
                        focus_energy: state.run.focus_energy + task.energy_cost,
                    },
                };
            });

            return null;
        }
    },

    completeTask: async (taskId) => {
        const { run } = get();
        if (!run) return null;

        const task = run.tasks.find(t => t.id === taskId);
        if (!task) return null;

        // Optimistic update: mark as completed, add XP, restore energy, add focus minutes
        // Energy was deducted at start - restore it on SUCCESS (but not on fail)
        set({
            run: {
                ...run,
                tasks: run.tasks.map(t =>
                    t.id === taskId
                        ? { ...t, status: 'completed' as const, completed_at: new Date().toISOString(), _previousStatus: t.status }
                        : t
                ),
                daily_xp: run.daily_xp + task.xp_earned,
                focus_energy: Math.min(run.max_energy, run.focus_energy + task.energy_cost),
                total_focus_minutes: run.total_focus_minutes + task.duration,
            },
        });

        try {
            const serverTask = await api.task.complete(taskId);

            // Sync with server state
            await get().refreshRun();

            return serverTask;
        } catch (err) {
            console.error('Failed to complete task:', err);

            // Rollback: revert XP, energy, and focus minutes
            set(state => {
                if (!state.run) return state;

                return {
                    run: {
                        ...state.run,
                        tasks: state.run.tasks.map(t =>
                            t.id === taskId
                                ? { ...t, status: t._previousStatus ?? 'active', completed_at: null }
                                : t
                        ),
                        daily_xp: state.run.daily_xp - task.xp_earned,
                        focus_energy: state.run.focus_energy - task.energy_cost,
                        total_focus_minutes: state.run.total_focus_minutes - task.duration,
                    },
                };
            });

            return null;
        }
    },

    failTask: async (taskId) => {
        const { run } = get();
        if (!run) return null;

        const task = run.tasks.find(t => t.id === taskId);
        if (!task) return null;

        // Calculate penalty for T3
        const penalty = task.tier === 3 ? Math.floor(run.daily_xp * 0.1) : 0;

        // Optimistic update: mark as failed, apply penalty
        set({
            run: {
                ...run,
                tasks: run.tasks.map(t =>
                    t.id === taskId
                        ? { ...t, status: 'failed' as const, completed_at: new Date().toISOString(), _previousStatus: t.status }
                        : t
                ),
                daily_xp: Math.max(0, run.daily_xp - penalty),
            },
        });

        try {
            const serverTask = await api.task.fail(taskId);

            // Sync with server state
            await get().refreshRun();

            return serverTask;
        } catch (err) {
            console.error('Failed to fail task:', err);

            // Rollback
            set(state => {
                if (!state.run) return state;
                return {
                    run: {
                        ...state.run,
                        tasks: state.run.tasks.map(t =>
                            t.id === taskId
                                ? { ...t, status: t._previousStatus ?? 'active', completed_at: null }
                                : t
                        ),
                        daily_xp: state.run.daily_xp + penalty,
                    },
                };
            });

            return null;
        }
    },

    // deleteTask: Non-optimistic to preserve exit animations  
    deleteTask: async (taskId) => {
        const { run } = get();
        if (!run) return false;

        try {
            await api.task.delete(taskId);
            // Refresh to let AnimatePresence handle exit animation
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

            // Persist extraction into local Journal (offline-friendly)
            useUserStore.getState().addExtraction({
                id: String(extraction.id),
                runId: String(extraction.run_id),
                finalXP: extraction.final_xp,
                xpBeforePenalties: extraction.xp_before_penalties,
                penaltyXP: extraction.penalty_xp,
                tasksCompleted: extraction.tasks_completed,
                tasksFailed: extraction.tasks_failed,
                tasksTotal: extraction.tasks_total,
                totalFocusMinutes: extraction.total_focus_minutes,
                t1Completed: extraction.t1_completed,
                t2Completed: extraction.t2_completed,
                t3Completed: extraction.t3_completed,
                t1Failed: extraction.t1_failed,
                t2Failed: extraction.t2_failed,
                t3Failed: extraction.t3_failed,
                completedWithTimer: extraction.completed_with_timer,
                completedWithoutTimer: extraction.completed_without_timer,
                createdAt: extraction.created_at,
            });

            // Sync user stats with server
            try {
                const freshUser = await api.user.getMe();
                useUserStore.getState().syncWithServer({
                    totalXP: freshUser.stats.total_xp,
                    totalExtractions: freshUser.stats.total_extractions,
                    totalTasksCompleted: freshUser.stats.total_tasks_completed,
                    totalFocusMinutes: freshUser.stats.total_focus_minutes,
                    currentStreak: freshUser.stats.current_streak,
                    bestStreak: freshUser.stats.best_streak,
                });
            } catch (syncErr) {
                console.warn('Failed to sync user stats:', syncErr);
            }

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
            set({ run: run as OptimisticRun });
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
const EMPTY_TASKS: TaskResponse[] = [];

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
