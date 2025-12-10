import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useServerRunStore } from '../../store/useServerRunStore';
import { useHaptic } from '../../hooks/useTelegram';
import { TIER_CONFIG } from '../../lib/constants';

interface ServerAddTaskModalProps {
    onClose: () => void;
    maxEnergy: number;
    currentEnergy: number;
}

const TIER_ICONS = { 1: '🌱', 2: '⚡', 3: '🔥' };

export function ServerAddTaskModal({ onClose, currentEnergy }: ServerAddTaskModalProps) {
    const { addTask } = useServerRunStore();
    const { impact } = useHaptic();

    const [title, setTitle] = useState('');
    const [tier, setTier] = useState<1 | 2 | 3>(1);
    const [duration, setDuration] = useState(15);
    const [useTimer, setUseTimer] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const config = TIER_CONFIG[tier];
    const canAfford = currentEnergy >= config.energyCost;

    // Calculate XP preview
    const durationMultiplier = useTimer ? (duration / 5) : (duration / 5) * 0.8;
    const estimatedXP = Math.round(config.baseXP * durationMultiplier);

    const handleSubmit = async () => {
        if (!title.trim() || !canAfford || isSubmitting) return;

        setIsSubmitting(true);
        impact('medium');

        await addTask({
            title: title.trim(),
            tier,
            duration,
            use_timer: useTimer,
        });

        onClose();
    };

    const durations = [5, 10, 15, 25, 30, 45, 60];

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl p-6"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <h2 className="text-xl font-bold mb-6 text-center">
                        ➕ Добавить Задачу
                    </h2>

                    {/* Title input */}
                    <div className="mb-4">
                        <label className="block text-sm text-[var(--text-muted)] mb-2">
                            Название задачи
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Что нужно сделать?"
                            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-[var(--accent-primary)] outline-none"
                            autoFocus
                        />
                    </div>

                    {/* Tier selector */}
                    <div className="mb-4">
                        <label className="block text-sm text-[var(--text-muted)] mb-2">
                            Уровень риска
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {([1, 2, 3] as const).map((t) => {
                                const cfg = TIER_CONFIG[t];
                                const affordable = currentEnergy >= cfg.energyCost;
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setTier(t)}
                                        disabled={!affordable}
                                        className={`p-3 rounded-xl border-2 transition-all ${tier === t
                                            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                                            : 'border-[var(--border-default)]'
                                            } ${!affordable ? 'opacity-40' : ''}`}
                                    >
                                        <div className="text-lg">{TIER_ICONS[t]}</div>
                                        <div className="text-sm font-medium">{cfg.name}</div>
                                        <div className="text-xs text-[var(--text-muted)]">
                                            {cfg.energyCost > 0 ? `-${cfg.energyCost}⚡` : 'Free'}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Duration selector */}
                    <div className="mb-4">
                        <label className="block text-sm text-[var(--text-muted)] mb-2">
                            Длительность: {duration} мин
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {durations.map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDuration(d)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${duration === d
                                        ? 'bg-[var(--accent-primary)] text-white'
                                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                                        }`}
                                >
                                    {d}м
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Timer toggle */}
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <div className="font-medium">⏱️ Таймер</div>
                            <div className="text-xs text-[var(--text-muted)]">
                                +20% XP за использование
                            </div>
                        </div>
                        <button
                            onClick={() => setUseTimer(!useTimer)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${useTimer ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-secondary)]'
                                }`}
                        >
                            <div
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${useTimer ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* XP Preview */}
                    <div className="mb-6 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-center">
                        <div className="text-sm text-[var(--text-muted)] mb-1">
                            Награда за выполнение
                        </div>
                        <div
                            className="text-3xl font-bold font-mono"
                            style={{ color: 'var(--accent-xp)' }}
                        >
                            +{estimatedXP} XP
                        </div>
                    </div>

                    {/* Submit button */}
                    <button
                        onClick={handleSubmit}
                        disabled={!title.trim() || !canAfford || isSubmitting}
                        className="w-full py-4 rounded-xl bg-[var(--accent-primary)] text-white font-bold text-lg disabled:opacity-50"
                    >
                        {isSubmitting ? 'Добавляем...' : '✓ Добавить задачу'}
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
