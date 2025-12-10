import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { TierLevel } from '../../store/types';
import { useRunStore } from '../../store/useRunStore';
import { useHaptic } from '../../hooks/useTelegram';
import { TIER_CONFIG, getTierEmoji, getTierColor } from '../../lib/constants';

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddTaskModal({ isOpen, onClose }: AddTaskModalProps) {
    const { addTask, isTierUnlocked, focusEnergy } = useRunStore();
    const { impact, notification } = useHaptic();

    const [title, setTitle] = useState('');
    const [selectedTier, setSelectedTier] = useState<TierLevel>(1);
    const [duration, setDuration] = useState(5);
    const [useTimer, setUseTimer] = useState(false);

    const tierConfig = TIER_CONFIG[selectedTier];
    const isUnlocked = isTierUnlocked(selectedTier);
    const hasEnergy = focusEnergy >= tierConfig.energyCost;
    const canAdd = title.trim() && isUnlocked && hasEnergy;

    const handleTierSelect = (tier: TierLevel) => {
        setSelectedTier(tier);
        const config = TIER_CONFIG[tier];
        setDuration(config.duration.min);

        // Auto-set useTimer based on tier
        if (config.timerMode === 'required') {
            setUseTimer(true);
        } else if (config.timerMode === 'none') {
            setUseTimer(false);
        }

        impact('light');
    };

    const handleSubmit = () => {
        if (!canAdd) return;

        try {
            addTask(title.trim(), selectedTier, duration, useTimer);
            notification('success');
            setTitle('');
            onClose();
        } catch (error) {
            notification('error');
        }
    };

    const handleClose = () => {
        setTitle('');
        setSelectedTier(1);
        setDuration(5);
        setUseTimer(false);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
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
                                        const hasEnoughEnergy = focusEnergy >= config.energyCost;
                                        const isSelected = selectedTier === tier;

                                        return (
                                            <button
                                                key={tier}
                                                onClick={() => handleTierSelect(tier)}
                                                disabled={!unlocked}
                                                className={`
                          p-3 rounded-xl border-2 transition-all
                          ${isSelected
                                                        ? 'border-[var(--accent-primary)] bg-[var(--bg-hover)]'
                                                        : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
                                                    }
                          ${!unlocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
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
                                                {!unlocked && (
                                                    <div className="text-xs text-[var(--accent-warning)] mt-1">
                                                        🔒 Нужно {config.unlockRequirement} мин
                                                    </div>
                                                )}
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
                                    Длительность: {duration} мин
                                </label>
                                <input
                                    type="range"
                                    min={tierConfig.duration.min}
                                    max={tierConfig.duration.max}
                                    value={duration}
                                    onChange={(e) => setDuration(Number(e.target.value))}
                                    className="w-full accent-[var(--accent-primary)]"
                                />
                            </div>

                            {/* Timer toggle (for T2 only) */}
                            {tierConfig.timerMode === 'optional' && (
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium">С таймером</div>
                                        <div className="text-xs text-[var(--text-muted)]">
                                            {useTimer ? '100% XP, можно провалить' : '80% XP, без риска'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setUseTimer(!useTimer)}
                                        className={`
                      w-12 h-6 rounded-full transition-colors relative
                      ${useTimer ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-secondary)]'}
                    `}
                                    >
                                        <div
                                            className={`
                        absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                        ${useTimer ? 'translate-x-7' : 'translate-x-1'}
                      `}
                                        />
                                    </button>
                                </div>
                            )}

                            {/* XP Preview */}
                            <div className="mb-4 p-3 bg-[var(--bg-secondary)] rounded-xl">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-[var(--text-muted)]">Награда:</span>
                                    <span className="font-bold" style={{ color: 'var(--accent-xp)' }}>
                                        +{Math.round(
                                            tierConfig.baseXP *
                                            (duration / tierConfig.duration.min) *
                                            (useTimer || tierConfig.timerMode !== 'optional' ? 1 : tierConfig.noTimerXPMultiplier || 1)
                                        )} XP
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleClose}
                                    className="btn btn-secondary flex-1"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!canAdd}
                                    className={`btn btn-primary flex-1 ${!canAdd ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Добавить
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
