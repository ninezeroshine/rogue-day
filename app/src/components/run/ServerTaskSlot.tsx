import { motion } from 'framer-motion';
import { useState, useCallback, useMemo, memo } from 'react';
import { useServerRunStore } from '../../store/useServerRunStore';
import { useHaptic } from '../../hooks/useTelegram';
import { useTimer } from '../../hooks/useTimer';
import { getTierColor, TIER_CONFIG } from '../../lib/constants';
import { formatTimer, formatDuration } from '../../lib/utils';
import { 
    IconTier1, IconTier2, IconTier3, 
    IconPlay, IconCheck, IconX, IconCheckCircle, IconXCircle,
    IconTimer, IconFire, IconSave
} from '../../lib/icons';
import api from '../../lib/api';
import type { TaskResponse } from '../../lib/api';
import type { TierLevel } from '../../store/types';

interface ServerTaskSlotProps {
    task: TaskResponse;
}

// Get tier icon component
function getTierIcon(tier: TierLevel) {
    switch (tier) {
        case 1: return IconTier1;
        case 2: return IconTier2;
        case 3: return IconTier3;
    }
}

/**
 * Calculate remaining seconds based on server's started_at timestamp
 * This ensures timer is synced across devices
 */
function calculateRemainingSeconds(task: TaskResponse): number {
    const durationSeconds = task.duration * 60;

    // If task is not active or has no started_at, return full duration
    if (task.status !== 'active' || !task.started_at) {
        return durationSeconds;
    }

    // Calculate elapsed time since task started
    const startedAt = new Date(task.started_at).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startedAt) / 1000);

    // Calculate remaining time
    const remaining = durationSeconds - elapsedSeconds;

    // Return at least 0 (don't go negative)
    return Math.max(0, remaining);
}

function ServerTaskSlotComponent({ task }: ServerTaskSlotProps) {
    const { impact, notification } = useHaptic();
    const [isProcessing, setIsProcessing] = useState(false);
    const [savedAsTemplate, setSavedAsTemplate] = useState(false);

    // Get actions directly to avoid re-renders
    const startTaskAction = useCallback(() => {
        return useServerRunStore.getState().startTask(task.id);
    }, [task.id]);

    const completeTaskAction = useCallback(() => {
        return useServerRunStore.getState().completeTask(task.id);
    }, [task.id]);

    const failTaskAction = useCallback(() => {
        return useServerRunStore.getState().failTask(task.id);
    }, [task.id]);

    const deleteTaskAction = useCallback(() => {
        return useServerRunStore.getState().deleteTask(task.id);
    }, [task.id]);

    const tier = task.tier as TierLevel;
    const tierConfig = TIER_CONFIG[tier];
    const tierColor = getTierColor(tier);
    const TierIcon = getTierIcon(tier);

    // Calculate remaining time from server's started_at for sync across devices
    const serverRemaining = useMemo(() => {
        return calculateRemainingSeconds(task);
    }, [task.started_at, task.duration, task.status]);

    // Determine if timer should auto-start (task is active with timer)
    const shouldAutoStart = task.status === 'active' && task.use_timer && serverRemaining > 0;

    // Timer hook - initialized with server-calculated remaining time
    // autoStart ensures it runs immediately for active tasks (device sync)
    const timer = useTimer({
        duration: serverRemaining,
        autoStart: shouldAutoStart,
        onComplete: () => {
            // Auto-complete when timer ends
            handleComplete();
        },
    });

    const handleStart = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        impact('medium');

        try {
            await startTaskAction();
            // Start timer if task uses timer
            if (task.use_timer) {
                timer.start();
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleComplete = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        notification('success');
        timer.stop();

        try {
            await completeTaskAction();
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFail = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        notification('error');
        timer.stop();

        try {
            await failTaskAction();
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRemove = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        impact('light');

        try {
            await deleteTaskAction();
        } finally {
            setIsProcessing(false);
        }
    };

    // Render based on status
    const renderContent = () => {
        switch (task.status) {
            case 'pending':
                return (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${tierColor}15` }}
                            >
                                <TierIcon size={22} color={tierColor} />
                            </div>
                            <div className="min-w-0">
                                <div className="font-medium truncate">{task.title}</div>
                                <div className="text-sm text-[var(--text-muted)] flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{
                                            backgroundColor: `${tierColor}20`,
                                            color: tierColor,
                                        }}>
                                        {tierConfig.name}
                                    </span>
                                    <span>{formatDuration(task.duration)}</span>
                                    <span className="font-mono" style={{ color: 'var(--accent-xp)' }}>
                                        +{task.xp_earned} XP
                                    </span>
                                    {task.use_timer && (
                                        <IconTimer size={14} className="text-[var(--text-muted)]" />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto sm:flex-shrink-0 sm:justify-end">
                            <motion.button
                                onClick={handleStart}
                                disabled={isProcessing}
                                className="btn btn-primary flex-1 sm:flex-none"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <IconPlay size={16} />
                                <span className="sm:hidden">Старт</span>
                                <span className="hidden sm:inline">Начать</span>
                            </motion.button>
                            <motion.button
                                onClick={handleRemove}
                                disabled={isProcessing}
                                className="btn btn-secondary w-12 sm:w-auto"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <IconX size={18} />
                            </motion.button>
                        </div>
                    </div>
                );

            case 'active':
                return (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse"
                                    style={{ backgroundColor: `${tierColor}20` }}
                                >
                                    <TierIcon size={22} color={tierColor} />
                                </div>
                                <div>
                                    <div className="font-medium">{task.title}</div>
                                    <div
                                        className="text-sm font-medium flex items-center gap-1"
                                        style={{ color: tierColor }}
                                    >
                                        <IconFire size={14} />
                                        <span>В процессе...</span>
                                    </div>
                                </div>
                            </div>

                            {task.use_timer && (
                                <div
                                    className="text-3xl font-mono font-bold"
                                    style={{ color: tierColor }}
                                >
                                    {formatTimer(timer.remaining)}
                                </div>
                            )}
                        </div>

                        {/* Timer progress bar */}
                        {task.use_timer && (
                            <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-linear"
                                    style={{
                                        backgroundColor: tierColor,
                                        width: `${timer.progress}%`
                                    }}
                                />
                            </div>
                        )}

                        {/* XP reward preview */}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--text-muted)]">Награда за выполнение:</span>
                            <span className="font-bold font-mono" style={{ color: 'var(--accent-xp)' }}>
                                +{task.xp_earned} XP
                            </span>
                        </div>

                        <div className="flex gap-2 justify-end w-full flex-wrap">
                            <motion.button
                                onClick={handleComplete}
                                disabled={isProcessing}
                                className="btn btn-primary glow-success"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <IconCheck size={16} />
                                <span>Завершить</span>
                            </motion.button>
                            {tierConfig.canFail && (
                                <motion.button
                                    onClick={handleFail}
                                    disabled={isProcessing}
                                    className="btn btn-danger"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <IconX size={16} />
                                    <span>Провал</span>
                                </motion.button>
                            )}
                        </div>
                    </div>
                );

            case 'completed':
                return (
                    <motion.div
                        className="flex items-center justify-between"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.8 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/15 flex items-center justify-center">
                                <IconCheckCircle size={22} color="var(--accent-primary)" />
                            </div>
                            <div>
                                <div className="font-medium line-through text-[var(--text-muted)]">
                                    {task.title}
                                </div>
                                <div className="text-sm flex items-center gap-2">
                                    <span style={{ color: 'var(--accent-primary)' }}>Выполнено</span>
                                    <span className="font-mono" style={{ color: 'var(--accent-xp)' }}>
                                        +{task.xp_earned} XP
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Save as template button */}
                        {!savedAsTemplate ? (
                            <motion.button
                                onClick={async () => {
                                    try {
                                        await api.template.createFromTask(task.id);
                                        setSavedAsTemplate(true);
                                        notification('success');
                                    } catch (err) {
                                        console.error('Failed to save as template:', err);
                                        const errorMsg = err instanceof Error ? err.message : 'Ошибка';
                                        alert(`Ошибка сохранения: ${errorMsg}`);
                                        notification('error');
                                    }
                                }}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <IconSave size={14} />
                                <span>Шаблон</span>
                            </motion.button>
                        ) : (
                            <span className="text-xs text-[var(--accent-primary)] flex items-center gap-1">
                                <IconCheck size={14} />
                                <span>Сохранено</span>
                            </span>
                        )}
                    </motion.div>
                );

            case 'failed':
                return (
                    <motion.div
                        className="flex items-center justify-between"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--accent-danger)]/15 flex items-center justify-center">
                                <IconXCircle size={22} color="var(--accent-danger)" />
                            </div>
                            <div>
                                <div className="font-medium line-through text-[var(--text-muted)]">
                                    {task.title}
                                </div>
                                <div className="text-sm text-[var(--accent-danger)]">
                                    Провалено
                                    {tier === 3 && ' • -10% XP'}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );

            default:
                return null;
        }
    };

    // Dynamic border and background based on status
    const getCardStyles = () => {
        const baseStyles = {
            borderLeftWidth: '4px',
            borderLeftColor: task.status === 'active' ? tierColor : 'var(--border-default)',
        };

        if (task.status === 'active') {
            return {
                ...baseStyles,
                boxShadow: `0 0 20px ${tierColor}30`,
                background: `linear-gradient(135deg, var(--bg-card) 0%, ${tierColor}08 100%)`,
            };
        }

        if (task.status === 'completed') {
            return {
                ...baseStyles,
                borderLeftColor: 'var(--accent-primary)',
            };
        }

        if (task.status === 'failed') {
            return {
                ...baseStyles,
                borderLeftColor: 'var(--accent-danger)',
            };
        }

        return baseStyles;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
            className="card"
            style={getCardStyles()}
        >
            {renderContent()}
        </motion.div>
    );
}

// Memoize component to prevent re-renders when task hasn't changed
export const ServerTaskSlot = memo(ServerTaskSlotComponent, (prevProps, nextProps) => {
    // Only re-render if task.id changed or task object reference changed
    // This prevents unnecessary re-renders when other tasks in the list update
    return prevProps.task.id === nextProps.task.id && 
           prevProps.task === nextProps.task;
});
