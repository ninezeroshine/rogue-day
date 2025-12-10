import { motion } from 'framer-motion';
import { useExtractionHistory } from '../store/useUserStore';
import { useSync } from '../hooks/useSync';
import { formatDuration } from '../lib/utils';

export function JournalPage() {
    const localHistory = useExtractionHistory();
    const { isOnline, stats } = useSync();

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };

    return (
        <div className="min-h-screen p-4">
            {/* Header */}
            <header className="mb-6">
                <h1 className="text-2xl font-bold">📊 Журнал Капитана</h1>
                <p className="text-sm text-[var(--text-muted)]">
                    История твоих экстракций
                </p>
            </header>

            {/* Summary stats */}
            <motion.div
                className="card mb-6 bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-secondary)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex justify-around text-center">
                    <div>
                        <div className="text-2xl font-bold font-mono" style={{ color: 'var(--accent-xp)' }}>
                            {stats.total_xp.toLocaleString()}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">Всего XP</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold font-mono text-[var(--accent-primary)]">
                            {stats.total_extractions}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">Экстракций</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold font-mono">
                            {stats.current_streak}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">Дней 🔥</div>
                    </div>
                </div>
            </motion.div>

            {/* Connection status */}
            <div className="flex items-center gap-2 mb-4">
                <span
                    className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}`}
                />
                <span className="text-xs text-[var(--text-muted)]">
                    {isOnline ? 'Данные с сервера' : 'Локальные данные'}
                </span>
            </div>

            {/* History list */}
            {localHistory.length === 0 ? (
                <motion.div
                    className="flex flex-col items-center justify-center py-16 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <span className="text-5xl mb-4">📝</span>
                    <h3 className="text-lg font-semibold text-[var(--text-secondary)]">
                        Пока пусто
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1 max-w-xs">
                        Заверши свой первый ран с экстракцией, и он появится здесь
                    </p>
                </motion.div>
            ) : (
                <div className="space-y-3">
                    {localHistory.map((extraction, index) => (
                        <motion.div
                            key={extraction.id}
                            className="card"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">
                                        {formatDate(extraction.createdAt)}
                                    </div>
                                    <div className="text-sm text-[var(--text-muted)]">
                                        {extraction.tasksCompleted} задач • {formatDuration(extraction.totalFocusMinutes)}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div
                                        className="text-xl font-bold font-mono"
                                        style={{ color: 'var(--accent-xp)' }}
                                    >
                                        {extraction.finalXP}
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)]">XP</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Future: Weekly stats, graphs, Ghost System */}
            {/* These will be added in future iterations */}
        </div>
    );
}
