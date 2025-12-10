import type { TierConfig, TierLevel } from '../store/types';

// ===== TIER CONFIGURATION =====
// Based on the approved mechanics:
// T1: No timer, just checkbox, no fail
// T2: Optional timer, fail = energy loss
// T3: Required timer, fail = -10% XP

export const TIER_CONFIG: Record<TierLevel, TierConfig> = {
    1: {
        name: "Разминка",
        duration: { min: 2, max: 5 },
        energyCost: 0,
        baseXP: 15,
        unlockRequirement: 0,
        timerMode: "none",
        canFail: false,
        failPenalty: 0,
    },
    2: {
        name: "Рутина",
        duration: { min: 10, max: 15 },
        energyCost: 5,
        baseXP: 65,
        unlockRequirement: 15, // 15 min total focus
        timerMode: "optional",
        canFail: true,
        failPenalty: "energy",
        noTimerXPMultiplier: 0.8,
    },
    3: {
        name: "Фокус",
        duration: { min: 25, max: 30 },
        energyCost: 15,
        baseXP: 175,
        unlockRequirement: 45, // 45 min total focus
        timerMode: "required",
        canFail: true,
        failPenalty: 0.1, // -10% of daily XP
    },
} as const;

// ===== GAME CONSTANTS =====

export const GAME_CONFIG = {
    // Energy
    BASE_MAX_ENERGY: 50,
    ENERGY_REGEN_PER_MINUTE: 0.5,

    // XP multipliers
    TIMER_XP_BONUS: 1.0, // 100% XP with timer
    NO_TIMER_XP_MULTIPLIER: 0.8, // 80% XP without timer

    // Tier unlock thresholds (minutes of focus)
    TIER_UNLOCK: {
        1: 0,
        2: 15,
        3: 45,
    },

    // UI
    ANIMATION_DURATION: 300,
    HAPTIC_IMPACT: 'medium' as const,
} as const;

// ===== TIER HELPERS =====

export function getTierConfig(tier: TierLevel): TierConfig {
    return TIER_CONFIG[tier];
}

export function getTierColor(tier: TierLevel): string {
    switch (tier) {
        case 1: return 'var(--accent-primary)'; // Green
        case 2: return 'var(--accent-secondary)'; // Cyan
        case 3: return 'var(--accent-warning)'; // Orange
        default: return 'var(--text-muted)';
    }
}

export function getTierEmoji(tier: TierLevel): string {
    switch (tier) {
        case 1: return '⚡';
        case 2: return '🔹';
        case 3: return '🔥';
        default: return '•';
    }
}

// ===== XP CALCULATION =====

export function calculateTaskXP(
    tier: TierLevel,
    duration: number,
    useTimer: boolean
): number {
    const config = TIER_CONFIG[tier];
    const baseXP = config.baseXP;

    // Duration multiplier (longer = more XP)
    const durationMultiplier = duration / config.duration.min;

    // Timer bonus
    const timerMultiplier = useTimer ? 1.0 : (config.noTimerXPMultiplier ?? 1.0);

    return Math.round(baseXP * durationMultiplier * timerMultiplier);
}

// ===== FAIL PENALTY CALCULATION =====

export function calculateFailPenalty(
    tier: TierLevel,
    currentDailyXP: number,
    energyCost: number
): { xpLoss: number; energyLoss: number } {
    const config = TIER_CONFIG[tier];

    if (config.failPenalty === 'energy') {
        return { xpLoss: 0, energyLoss: energyCost };
    }

    if (typeof config.failPenalty === 'number') {
        return {
            xpLoss: Math.round(currentDailyXP * config.failPenalty),
            energyLoss: energyCost // Energy not returned on fail
        };
    }

    return { xpLoss: 0, energyLoss: 0 };
}
