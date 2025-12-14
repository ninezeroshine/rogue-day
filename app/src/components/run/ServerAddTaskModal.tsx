import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useServerRunStore } from '../../store/useServerRunStore';
import { useHaptic } from '../../hooks/useTelegram';
import { TIER_CONFIG, getTierColor } from '../../lib/constants';
import { IconTier1, IconTier2, IconTier3, IconTimer, IconEnergy, IconXP, IconPlus } from '../../lib/icons';
import type { TierLevel } from '../../store/types';
import type { FC } from 'react';

interface ServerAddTaskModalProps {
    onClose: () => void;
    maxEnergy: number;
    currentEnergy: number;
    totalFocusMinutes?: number;
}

// Get tier icon component
function getTierIcon(tier: TierLevel): FC<{ size?: number; color?: string }> {
    switch (tier) {
        case 1: return IconTier1;
        case 2: return IconTier2;
        case 3: return IconTier3;
    }
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
        if (!isTierUnlocked(tier)) return;

        setSelectedTier(tier);
        const config = TIER_CONFIG[tier];

        setDuration(config.duration.min);

        if (config.timerMode === 'required') {
            setUseTimer(true);
        } else if (config.timerMode === 'none') {
            setUseTimer(false);
        }

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
                key="add-task-backdrop"
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
            />

            {/* Modal */}
            <motion.div
                key="add-task-modal"
                className="fixed bottom-0 left-0 right-0 z-50 p-4"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <div className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border-default)]">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <IconPlus size={20} color="var(--accent-primary)" />
                        Новая задача
                    </h2>

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
                                const TierIcon = getTierIcon(tier);
                                const tierColor = getTierColor(tier);

                                return (
                                    <button
                                        key={tier}
                                        onClick={() => handleTierSelect(tier)}
                                        disabled={!canSelect}
                                        className={`
                                            p-3 rounded-xl border-2 transition-all flex flex-col items-center
                                            ${isSelected
                                                ? 'border-[var(--accent-primary)] bg-[var(--bg-hover)]'
                                                : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
                                            }
                                            ${!canSelect ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                                        `}
                                        style={{
                                            borderColor: isSelected ? tierColor : undefined,
                                        }}
                                    >
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                                            style={{ backgroundColor: `${tierColor}15` }}
                                        >
                                            <TierIcon size={22} color={tierColor} />
                                        </div>
                                        <div className="text-sm font-medium">{config.name}</div>
                                        <div className="text-xs text-[var(--text-muted)]">
                                            {config.duration.min}-{config.duration.max} мин
                                        </div>

                                        {/* Locked indicator */}
                                        {!unlocked && (
                                            <div className="text-xs text-[var(--accent-warning)] mt-1 flex items-center gap-1">
                                                <span>🔒</span>
                                                <span>{config.unlockRequirement} мин</span>
                                            </div>
                                        )}

                                        {/* Energy cost (only if unlocked) */}
                                        {unlocked && config.energyCost > 0 && (
                                            <div className={`text-xs mt-1 flex items-center gap-1 ${hasEnoughEnergy ? 'text-[var(--text-muted)]' : 'text-[var(--accent-danger)]'}`}>
                                                <IconEnergy size={12} />
                                                <span>{config.energyCost}</span>
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
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] flex items-center justify-center">
                                    <IconTimer size={16} className="text-[var(--text-secondary)]" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium">С таймером</div>
                                    <div className="text-xs text-[var(--text-muted)]">
                                        {useTimer ? '100% XP, можно провалить' : '80% XP, без риска'}
                                    </div>
                                </div>
                            </div>
                            <motion.button
                                onClick={() => setUseTimer(!useTimer)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${useTimer ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)]'}`}
                                whileTap={{ scale: 0.95 }}
                            >
                                <motion.div
                                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                                    animate={{ x: useTimer ? 28 : 4 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            </motion.button>
                        </div>
                    )}

                    {/* Timer info for T3 (required) */}
                    {tierConfig.timerMode === 'required' && (
                        <div className="mb-4 p-3 bg-[var(--accent-warning)]/10 rounded-xl border border-[var(--accent-warning)]/30 flex items-start gap-3">
                            <IconTimer size={18} color="var(--accent-warning)" className="mt-0.5" />
                            <div>
                                <div className="text-sm text-[var(--accent-warning)] font-medium">
                                    Таймер обязателен для Фокус-задач
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">
                                    Провал = потеря 10% дневного XP
                                </div>
                            </div>
                        </div>
                    )}

                    {/* XP Preview */}
                    <div className="mb-4 p-3 bg-[var(--bg-secondary)] rounded-xl">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                                <IconXP size={16} color="var(--accent-xp)" />
                                Награда:
                            </span>
                            <span className="font-bold text-lg" style={{ color: 'var(--accent-xp)' }}>
                                +{estimatedXP} XP
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <motion.button
                            onClick={handleClose}
                            className="flex-1 py-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                            whileTap={{ scale: 0.95 }}
                        >
                            Отмена
                        </motion.button>
                        <motion.button
                            onClick={handleSubmit}
                            disabled={!canAdd}
                            className={`flex-1 py-3 rounded-xl bg-[var(--accent-primary)] text-white font-bold flex items-center justify-center gap-2 ${!canAdd ? 'opacity-50 cursor-not-allowed' : ''}`}
                            whileTap={canAdd ? { scale: 0.95 } : undefined}
                        >
                            <IconPlus size={18} />
                            <span>{isSubmitting ? 'Добавляем...' : 'Добавить'}</span>
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
