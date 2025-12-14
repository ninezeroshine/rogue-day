import { motion, AnimatePresence } from 'framer-motion';
import { useHaptic } from '../../hooks/useTelegram';
import { formatDuration } from '../../lib/utils';
import { useServerTasks, useServerDailyXP } from '../../store/useServerRunStore';
import { IconMedal, IconExtraction, IconClock, IconCheckCircle, IconXCircle, IconXP } from '../../lib/icons';

interface ExtractionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExtract: () => void;
}

export function ExtractionModal({ isOpen, onClose, onExtract }: ExtractionModalProps) {
    const tasks = useServerTasks();
    const dailyXP = useServerDailyXP();
    const { notification } = useHaptic();

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const failedTasks = tasks.filter(t => t.status === 'failed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'active').length;

    const totalFocusMinutes = tasks
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + (t.duration || 0), 0);

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
                        key="extraction-backdrop"
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        key="extraction-modal"
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-default)] max-w-sm w-full text-center">
                            <motion.div
                                className="w-20 h-20 rounded-full bg-[var(--accent-xp)]/15 flex items-center justify-center mx-auto mb-4"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', delay: 0.1 }}
                            >
                                <IconMedal size={40} color="var(--accent-xp)" />
                            </motion.div>

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
                                    <div className="flex justify-between items-center">
                                        <span className="text-[var(--text-secondary)] flex items-center gap-2">
                                            <IconClock size={16} />
                                            Время в фокусе
                                        </span>
                                        <span className="font-mono font-bold">{formatDuration(totalFocusMinutes)}</span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-[var(--text-secondary)] flex items-center gap-2">
                                            <IconCheckCircle size={16} color="var(--accent-primary)" />
                                            Задач выполнено
                                        </span>
                                        <span className="font-mono font-bold text-[var(--accent-primary)]">{completedTasks}</span>
                                    </div>

                                    {failedTasks > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[var(--text-secondary)] flex items-center gap-2">
                                                <IconXCircle size={16} color="var(--accent-danger)" />
                                                Провалено
                                            </span>
                                            <span className="font-mono font-bold text-[var(--accent-danger)]">{failedTasks}</span>
                                        </div>
                                    )}

                                    <div className="border-t border-[var(--border-default)] my-2 pt-2 flex justify-between items-center">
                                        <span className="font-medium flex items-center gap-2">
                                            <IconXP size={16} color="var(--accent-xp)" />
                                            XP к эвакуации
                                        </span>
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
                                <motion.button
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Отмена
                                </motion.button>
                                <motion.button
                                    onClick={handleExtract}
                                    className="flex-1 py-3 rounded-xl bg-[var(--accent-primary)] text-white font-bold flex items-center justify-center gap-2"
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <IconExtraction size={18} />
                                    <span>Эвакуация</span>
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
