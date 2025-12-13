// ===== ROGUE-DAY TYPE DEFINITIONS =====

// Task tiers
export type TierLevel = 1 | 2 | 3;
export type TimerMode = 'none' | 'optional' | 'required';
export type TaskStatus = 'pending' | 'active' | 'completed' | 'failed';
export type RunStatus = 'active' | 'extracted' | 'abandoned';

// Tier configuration
export interface TierConfig {
    name: string;
    duration: { min: number; max: number };
    energyCost: number;
    baseXP: number;
    unlockRequirement: number;
    timerMode: TimerMode;
    canFail: boolean;
    failPenalty: number | 'energy';
    noTimerXPMultiplier?: number;
}

// Task entity
export interface Task {
    id: string;
    title: string;
    tier: TierLevel;
    duration: number; // in minutes
    status: TaskStatus;
    xpEarned: number;
    energyCost: number;
    useTimer: boolean;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
}

// Run state (daily session)
export interface RunState {
    id: string;
    userId: string;
    runDate: string;
    dailyXP: number;
    focusEnergy: number;
    maxEnergy: number;
    totalFocusMinutes: number;
    status: RunStatus;
    tasks: Task[];
    startedAt: string;
    extractedAt?: string;
}

// User profile
export interface User {
    id: string;
    telegramId: number;
    username?: string;
    totalExtractions: number;
    createdAt: string;
    lastRunAt?: string;
}

// Extraction result (after-action report)
export interface ExtractionResult {
    id: string;
    runId: string;
    finalXP: number;
    xpBeforePenalties?: number;
    penaltyXP?: number;
    tasksCompleted: number;
    tasksFailed: number;
    tasksTotal?: number;
    totalFocusMinutes: number;
    t1Completed?: number;
    t2Completed?: number;
    t3Completed?: number;
    t1Failed?: number;
    t2Failed?: number;
    t3Failed?: number;
    completedWithTimer?: number;
    completedWithoutTimer?: number;
    createdAt: string;

    // Run metadata (for Journal cards)
    runDate?: string; // "YYYY-MM-DD"
    startedAt?: string;
    extractedAt?: string | null;
}

// Store actions
export interface RunActions {
    // Run lifecycle
    startNewRun: () => void;
    extractRun: () => ExtractionResult;

    // Task management
    addTask: (title: string, tier: TierLevel, duration: number, useTimer: boolean) => Task;
    startTask: (taskId: string) => void;
    completeTask: (taskId: string) => void;
    failTask: (taskId: string) => void;
    removeTask: (taskId: string) => void;

    // Energy management
    spendEnergy: (amount: number) => boolean;
    recoverEnergy: (amount: number) => void;

    // XP management
    addXP: (amount: number) => void;
    removeXP: (amount: number) => void;

    // Tier unlock check
    isTierUnlocked: (tier: TierLevel) => boolean;

    // Reset
    reset: () => void;
}

export type RunStore = RunState & RunActions;
