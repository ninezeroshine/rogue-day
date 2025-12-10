import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Task } from '../../store/types';
import { useRunStore } from '../../store/useRunStore';
import { useHaptic } from '../../hooks/useTelegram';
import { useTimer } from '../../hooks/useTimer';
import { getTierEmoji, getTierColor, TIER_CONFIG } from '../../lib/constants';
import { formatTimer, formatDuration } from '../../lib/utils';

interface TaskSlotProps {
    task: Task;
}

export function TaskSlot({ task }: TaskSlotProps) {
    const { startTask, completeTask, failTask, removeTask } = useRunStore();
    const { impact, notification } = useHaptic();
    const [isExpanded, setIsExpanded] = useState(false);

    const tierConfig = TIER_CONFIG[task.tier];
    const tierColor = getTierColor(task.tier);
    const tierEmoji = getTierEmoji(task.tier);

    const durationSeconds = task.duration * 60;

    const timer = useTimer({
        duration: durationSeconds,
        onComplete: () => {
            handleComplete();
        },
    });

    const handleStart = () => {
        startTask(task.id);
        if (task.useTimer) {
            timer.start();
        }
        impact('medium');
    };

    const handleComplete = () => {
        completeTask(task.id);
        notification('success');
        timer.stop();
    };

    const handleFail = () => {
        failTask(task.id);
        notification('error');
        timer.stop();
    };

    const handleRemove = () => {
        removeTask(task.id);
        impact('light');
    };

    // Render based on status
    const renderContent = () => {
        switch (task.status) {
            case 'pending':
                return (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">{tierEmoji}</span>
                            <div>
                                <div className="font-medium">{task.title}</div>
                                <div className="text-sm text-[var(--text-muted)]">
                                    {tierConfig.name} • {formatDuration(task.duration)} • +{task.xpEarned} XP
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleStart}
                                className="btn btn-primary text-sm py-2 px-4"
                            >
                                ▶ Начать
                            </button>
                            <button
                                onClick={handleRemove}
                                className="btn btn-secondary text-sm py-2 px-3"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                );

            case 'active':
                return (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xl animate-pulse">{tierEmoji}</span>
                                <div>
                                    <div className="font-medium">{task.title}</div>
                                    <div className="text-sm" style={{ color: tierColor }}>
                                        В процессе...
                                    </div>
                                </div>
                            </div>

                            {task.useTimer && (
                                <div className="text-3xl font-mono font-bold" style={{ color: tierColor }}>
                                    {formatTimer(timer.remaining)}
                                </div>
                            )}
                        </div>

                        {/* Timer progress bar */}
                        {task.useTimer && (
                            <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: tierColor }}
                                    animate={{ width: `${timer.progress}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        )}

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={handleComplete}
                                className="btn btn-primary text-sm py-2 px-4"
                            >
                                ✓ Завершить
                            </button>
                            {tierConfig.canFail && (
                                <button
                                    onClick={handleFail}
                                    className="btn btn-danger text-sm py-2 px-4"
                                >
                                    ✕ Провал
                                </button>
                            )}
                        </div>
                    </div>
                );

            case 'completed':
                return (
                    <div className="flex items-center justify-between opacity-60">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">✅</span>
                            <div>
                                <div className="font-medium line-through">{task.title}</div>
                                <div className="text-sm text-[var(--accent-primary)]">
                                    +{task.xpEarned} XP заработано
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'failed':
                return (
                    <div className="flex items-center justify-between opacity-60">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">❌</span>
                            <div>
                                <div className="font-medium line-through">{task.title}</div>
                                <div className="text-sm text-[var(--accent-danger)]">
                                    Провалено
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="card"
            style={{
                borderLeftWidth: '4px',
                borderLeftColor: task.status === 'active' ? tierColor : 'var(--border-default)',
            }}
            onClick={() => task.status === 'pending' && setIsExpanded(!isExpanded)}
        >
            {renderContent()}
        </motion.div>
    );
}
