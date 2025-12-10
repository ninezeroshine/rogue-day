import { motion, AnimatePresence } from 'framer-motion';
import { useDailyXP, useTasks, useTotalFocusMinutes } from '../../store/useRunStore';
import { useHaptic } from '../../hooks/useTelegram';
import { formatDuration } from '../../lib/utils';

interface ExtractionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExtract: () => void;
}

export function ExtractionModal({ isOpen, onClose, onExtract }: ExtractionModalProps) {
    const dailyXP = useDailyXP();
    const tasks = useTasks();
    const totalFocusMinutes = useTotalFocusMinutes();
    const { notification } = useHaptic();

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const failedTasks = tasks.filter(t => t.status === 'failed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;

    const handleExtract = () => {
        notification('success');
        onExtract();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/80 z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Modal */}
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-default)] max-w-sm w-full text-center">
                            <div className="text-5xl mb-4">🎖️</div>

                            <h2 className="text-2xl font-bold mb-2">Завершить Ран?</h2>

                            <p className="text-[var(--text-secondary)] text-sm mb-6">
                                {pendingTasks > 0
                                    ? `Осталось ${pendingTasks} невыполненных задач`
                                    : 'Все задачи выполнены!'
                                }
                            </p>

                            {/* Stats preview */}
                            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6 text-left">
                                <div className="text-sm text-[var(--text-muted)] mb-3 uppercase tracking-wide">
                                    Итоги дня
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Время в фокусе</span>
                                        <span className="font-mono font-bold">{formatDuration(totalFocusMinutes)}</span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Задач выполнено</span>
                                        <span className="font-mono font-bold text-[var(--accent-primary)]">{completedTasks}</span>
                                    </div>

                                    {failedTasks > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-secondary)]">Провалено</span>
                                            <span className="font-mono font-bold text-[var(--accent-danger)]">{failedTasks}</span>
                                        </div>
                                    )}

                                    <div className="border-t border-[var(--border-default)] my-2 pt-2 flex justify-between">
                                        <span className="font-medium">XP к эвакуации</span>
                                        <span
                                            className="font-mono font-bold text-lg"
                                            style={{ color: 'var(--accent-xp)' }}
                                        >
                                            {dailyXP}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="btn btn-secondary flex-1"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleExtract}
                                    className="btn btn-primary flex-1 glow-success"
                                >
                                    🚁 Эвакуация
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
