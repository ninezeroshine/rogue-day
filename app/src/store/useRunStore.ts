import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, TierLevel, RunStore, ExtractionResult, RunStatus } from './types';
import { TIER_CONFIG, GAME_CONFIG, calculateTaskXP, calculateFailPenalty } from '../lib/constants';

// Generate unique ID
const generateId = () => crypto.randomUUID();

// Get today's date string
const getTodayDate = () => new Date().toISOString().split('T')[0];

// Initial state
const initialState = {
    id: '',
    userId: '',
    runDate: '',
    dailyXP: 0,
    focusEnergy: GAME_CONFIG.BASE_MAX_ENERGY,
    maxEnergy: GAME_CONFIG.BASE_MAX_ENERGY,
    totalFocusMinutes: 0,
    status: 'active' as RunStatus,
    tasks: [] as Task[],
    startedAt: '',
    extractedAt: undefined as string | undefined,
};

export const useRunStore = create<RunStore>()(
    persist(
        (set, get) => ({
            ...initialState,

            // ===== RUN LIFECYCLE =====

            startNewRun: () => {
                set({
                    id: generateId(),
                    userId: 'local-user', // Will be replaced with Telegram ID
                    runDate: getTodayDate(),
                    dailyXP: 0,
                    focusEnergy: GAME_CONFIG.BASE_MAX_ENERGY,
                    maxEnergy: GAME_CONFIG.BASE_MAX_ENERGY,
                    totalFocusMinutes: 0,
                    status: 'active',
                    tasks: [],
                    startedAt: new Date().toISOString(),
                    extractedAt: undefined,
                });
            },

            extractRun: () => {
                const state = get();
                const completedTasks = state.tasks.filter(t => t.status === 'completed');
                const failedTasks = state.tasks.filter(t => t.status === 'failed');

                const result: ExtractionResult = {
                    id: generateId(),
                    runId: state.id,
                    finalXP: state.dailyXP,
                    tasksCompleted: completedTasks.length,
                    tasksFailed: failedTasks.length,
                    totalFocusMinutes: state.totalFocusMinutes,
                    createdAt: new Date().toISOString(),
                };

                set({
                    status: 'extracted',
                    extractedAt: new Date().toISOString(),
                });

                return result;
            },

            // ===== TASK MANAGEMENT =====

            addTask: (title: string, tier: TierLevel, duration: number, useTimer: boolean) => {
                const config = TIER_CONFIG[tier];
                const xpReward = calculateTaskXP(tier, duration, useTimer);

                const newTask: Task = {
                    id: generateId(),
                    title,
                    tier,
                    duration,
                    status: 'pending',
                    xpEarned: xpReward,
                    energyCost: config.energyCost,
                    useTimer,
                    createdAt: new Date().toISOString(),
                };

                // Spend energy when adding T2/T3 task
                if (config.energyCost > 0) {
                    const canSpend = get().spendEnergy(config.energyCost);
                    if (!canSpend) {
                        throw new Error('Not enough energy');
                    }
                }

                set(state => ({
                    tasks: [...state.tasks, newTask],
                }));

                return newTask;
            },

            startTask: (taskId: string) => {
                set(state => ({
                    tasks: state.tasks.map(task =>
                        task.id === taskId
                            ? { ...task, status: 'active' as const, startedAt: new Date().toISOString() }
                            : task
                    ),
                }));
            },

            completeTask: (taskId: string) => {
                const state = get();
                const task = state.tasks.find(t => t.id === taskId);
                if (!task) return;

                const config = TIER_CONFIG[task.tier];

                // Add XP
                get().addXP(task.xpEarned);

                // Return energy on success
                if (config.energyCost > 0) {
                    get().recoverEnergy(config.energyCost);
                }

                // Add focus minutes
                set(state => ({
                    tasks: state.tasks.map(t =>
                        t.id === taskId
                            ? { ...t, status: 'completed' as const, completedAt: new Date().toISOString() }
                            : t
                    ),
                    totalFocusMinutes: state.totalFocusMinutes + task.duration,
                }));
            },

            failTask: (taskId: string) => {
                const state = get();
                const task = state.tasks.find(t => t.id === taskId);
                if (!task) return;

                const penalties = calculateFailPenalty(task.tier, state.dailyXP, task.energyCost);

                // Apply XP penalty
                if (penalties.xpLoss > 0) {
                    get().removeXP(penalties.xpLoss);
                }

                // Energy is NOT returned on fail (already spent when adding)

                set(state => ({
                    tasks: state.tasks.map(t =>
                        t.id === taskId
                            ? { ...t, status: 'failed' as const, completedAt: new Date().toISOString() }
                            : t
                    ),
                }));
            },

            removeTask: (taskId: string) => {
                const state = get();
                const task = state.tasks.find(t => t.id === taskId);
                if (!task || task.status !== 'pending') return;

                // Return energy if task was pending
                if (task.energyCost > 0) {
                    get().recoverEnergy(task.energyCost);
                }

                set(state => ({
                    tasks: state.tasks.filter(t => t.id !== taskId),
                }));
            },

            // ===== ENERGY MANAGEMENT =====

            spendEnergy: (amount: number) => {
                const state = get();
                if (state.focusEnergy < amount) return false;

                set({ focusEnergy: state.focusEnergy - amount });
                return true;
            },

            recoverEnergy: (amount: number) => {
                set(state => ({
                    focusEnergy: Math.min(state.focusEnergy + amount, state.maxEnergy),
                }));
            },

            // ===== XP MANAGEMENT =====

            addXP: (amount: number) => {
                set(state => ({ dailyXP: state.dailyXP + amount }));
            },

            removeXP: (amount: number) => {
                set(state => ({ dailyXP: Math.max(0, state.dailyXP - amount) }));
            },

            // ===== TIER UNLOCK =====

            isTierUnlocked: (tier: TierLevel) => {
                const state = get();
                const config = TIER_CONFIG[tier];
                return state.totalFocusMinutes >= config.unlockRequirement;
            },

            // ===== RESET =====

            reset: () => {
                set(initialState);
            },
        }),
        {
            name: 'rogue-day-run',
            partialize: (state) => ({
                id: state.id,
                userId: state.userId,
                runDate: state.runDate,
                dailyXP: state.dailyXP,
                focusEnergy: state.focusEnergy,
                maxEnergy: state.maxEnergy,
                totalFocusMinutes: state.totalFocusMinutes,
                status: state.status,
                tasks: state.tasks,
                startedAt: state.startedAt,
                extractedAt: state.extractedAt,
            }),
        }
    )
);

// Selector hooks for performance
export const useDailyXP = () => useRunStore(state => state.dailyXP);
export const useFocusEnergy = () => useRunStore(state => state.focusEnergy);
export const useMaxEnergy = () => useRunStore(state => state.maxEnergy);
export const useTasks = () => useRunStore(state => state.tasks);
export const useRunStatus = () => useRunStore(state => state.status);
export const useTotalFocusMinutes = () => useRunStore(state => state.totalFocusMinutes);
