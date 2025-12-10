import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useServerRunStore } from '../../store/useServerRunStore';
import { useHaptic } from '../../hooks/useTelegram';
import { TIER_CONFIG, getTierEmoji, getTierColor } from '../../lib/constants';
import type { TierLevel } from '../../store/types';

interface ServerAddTaskModalProps {
    onClose: () => void;
    maxEnergy: number;
    currentEnergy: number;
    totalFocusMinutes?: number; // For tier unlock checking
}

export function ServerAddTaskModal({ onClose, currentEnergy, totalFocusMinutes = 0 }: ServerAddTaskModalProps) {
    const { impact, notification } = useHaptic();

    const [title, setTitle] = useState('');
    const [selectedTier, setSelectedTier] = useState<TierLevel>(1);
    const [duration, setDuration] = useState(TIER_CONFIG[1].duration.min);
    const [useTimer, setUseTimer] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const tierConfig = TIER_CONFIG[selectedTier];

    // Check if tier is unlocked based on focus minutes
    const isTierUnlocked = (tier: TierLevel): boolean => {
        const config = TIER_CONFIG[tier];
        return totalFocusMinutes >= config.unlockRequirement;
    };

    const hasEnergy = currentEnergy >= tierConfig.energyCost;
    const isUnlocked = isTierUnlocked(selectedTier);
    const canAdd = title.trim() && hasEnergy && isUnlocked && !isSubmitting;

    // Handle tier selection with auto-duration and auto-timer
    const handleTierSelect = (tier: TierLevel) => {
        if (!isTierUnlocked(tier)) return; // Can't select locked tier

        setSelectedTier(tier);
        const config = TIER_CONFIG[tier];

        // Reset duration to tier's minimum
        setDuration(config.duration.min);

        // Auto-set useTimer based on tier
        if (config.timerMode === 'required') {
            setUseTimer(true);
        } else if (config.timerMode === 'none') {
            setUseTimer(false);
        }
        // For 'optional' (T2), keep user's choice

        impact('light');
    };

    const handleSubmit = async () => {
        if (!canAdd) return;

        setIsSubmitting(true);
        impact('medium');

        try {
            const addTaskFn = useServerRunStore.getState().addTask;
            await addTaskFn({
                title: title.trim(),
                tier: selectedTier,
                duration,
                use_timer: useTimer,
            });
            notification('success');
            onClose();
        } catch (error) {
            notification('error');
            console.error('Failed to add task:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setTitle('');
        setSelectedTier(1);
        setDuration(TIER_CONFIG[1].duration.min);
        setUseTimer(false);
        onClose();
    };

    // Calculate XP preview
    const xpMultiplier = useTimer || tierConfig.timerMode !== 'optional'
        ? 1
        : (tierConfig.noTimerXPMultiplier || 0.8);
    const estimatedXP = Math.round(
        tierConfig.baseXP * (duration / tierConfig.duration.min) * xpMultiplier
    );

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                className="fixed inset-0 bg-black/60 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
            />

            {/* Modal */}
            <motion.div
                className="fixed bottom-0 left-0 right-0 z-50 p-4"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <div className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border-default)]">
                    <h2 className="text-xl font-bold mb-4">Новая задача</h2>

                    {/* Title input */}
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Название задачи..."
                        className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] mb-4"
                        autoFocus
                    />

                    {/* Tier selection */}
                    <div className="mb-4">
                        <label className="text-sm text-[var(--text-muted)] mb-2 block">
                            Выбери уровень сложности
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {([1, 2, 3] as TierLevel[]).map((tier) => {
                                const config = TIER_CONFIG[tier];
                                const unlocked = isTierUnlocked(tier);
                                const hasEnoughEnergy = currentEnergy >= config.energyCost;
                                const isSelected = selectedTier === tier;
                                const canSelect = unlocked && hasEnoughEnergy;

                                return (
                                    <button
                                        key={tier}
                                        onClick={() => handleTierSelect(tier)}
                                        disabled={!canSelect}
                                        className={`
                                            p-3 rounded-xl border-2 transition-all
                                            ${isSelected
                                                ? 'border-[var(--accent-primary)] bg-[var(--bg-hover)]'
                                                : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
                                            }
                                            ${!canSelect ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                                        `}
                                        style={{
                                            borderColor: isSelected ? getTierColor(tier) : undefined,
                                        }}
                                    >
                                        <div className="text-2xl mb-1">{getTierEmoji(tier)}</div>
                                        <div className="text-sm font-medium">{config.name}</div>
                                        <div className="text-xs text-[var(--text-muted)]">
                                            {config.duration.min}-{config.duration.max} мин
                                        </div>

                                        {/* Locked indicator */}
                                        {!unlocked && (
                                            <div className="text-xs text-[var(--accent-warning)] mt-1">
                                                🔒 Нужно {config.unlockRequirement} мин
                                            </div>
                                        )}

                                        {/* Energy cost (only if unlocked) */}
                                        {unlocked && config.energyCost > 0 && (
                                            <div className={`text-xs mt-1 ${hasEnoughEnergy ? 'text-[var(--text-muted)]' : 'text-[var(--accent-danger)]'}`}>
                                                ⚡ {config.energyCost}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Duration slider */}
                    <div className="mb-4">
                        <label className="text-sm text-[var(--text-muted)] mb-2 block">
                            Длительность: <span className="font-bold text-[var(--text-primary)]">{duration} мин</span>
                        </label>
                        <input
                            type="range"
                            min={tierConfig.duration.min}
                            max={tierConfig.duration.max}
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full accent-[var(--accent-primary)] h-2 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                            <span>{tierConfig.duration.min} мин</span>
                            <span>{tierConfig.duration.max} мин</span>
                        </div>
                    </div>

                    {/* Timer toggle (only for T2 - optional mode) */}
                    {tierConfig.timerMode === 'optional' && (
                        <div className="mb-4 flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-xl">
                            <div>
                                <div className="text-sm font-medium">⏱️ С таймером</div>
                                <div className="text-xs text-[var(--text-muted)]">
                                    {useTimer ? '100% XP, можно провалить' : '80% XP, без риска'}
                                </div>
                            </div>
                            <button
                                onClick={() => setUseTimer(!useTimer)}
                                className={`
                                    w-12 h-6 rounded-full transition-colors relative
                                    ${useTimer ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)]'}
                                `}
                            >
                                <div
                                    className={`
                                        absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow
                                        ${useTimer ? 'translate-x-7' : 'translate-x-1'}
                                    `}
                                />
                            </button>
                        </div>
                    )}

                    {/* Timer info for T3 (required) */}
                    {tierConfig.timerMode === 'required' && (
                        <div className="mb-4 p-3 bg-[var(--accent-warning)]/10 rounded-xl border border-[var(--accent-warning)]/30">
                            <div className="text-sm text-[var(--accent-warning)] font-medium">
                                ⏱️ Таймер обязателен для Фокус-задач
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                                Провал = потеря 10% дневного XP
                            </div>
                        </div>
                    )}

                    {/* XP Preview */}
                    <div className="mb-4 p-3 bg-[var(--bg-secondary)] rounded-xl">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-[var(--text-muted)]">Награда:</span>
                            <span className="font-bold text-lg" style={{ color: 'var(--accent-xp)' }}>
                                +{estimatedXP} XP
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleClose}
                            className="flex-1 py-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!canAdd}
                            className={`flex-1 py-3 rounded-xl bg-[var(--accent-primary)] text-white font-bold ${!canAdd ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'Добавляем...' : 'Добавить'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
