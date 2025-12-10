import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useServerRunStore, useServerRunData, useServerDailyXP, useServerEnergy, useServerTasks } from '../store/useServerRunStore';
import { useTelegram } from '../hooks/useTelegram';
import { useSync } from '../hooks/useSync';
import { EnergyMeter } from '../components/run/EnergyMeter';
import { XPCounter } from '../components/run/XPCounter';
import { ServerTaskList } from '../components/run/ServerTaskList';
import { ServerAddTaskModal } from '../components/run/ServerAddTaskModal';

export function RunPage() {
    const { isReady } = useTelegram();
    const { refetch: refetchUser } = useSync();

    // Server state
    const { run, isLoading, error } = useServerRunData();
    const dailyXP = useServerDailyXP();
    const energy = useServerEnergy();
    const tasks = useServerTasks();

    // Actions
    const { loadCurrentRun, startNewRun, extractRun } = useServerRunStore();

    const [showAddTask, setShowAddTask] = useState(false);
    const [extractionResult, setExtractionResult] = useState<{
        finalXP: number;
        tasksCompleted: number;
        totalFocusMinutes: number;
    } | null>(null);

    // Load current run on mount
    useEffect(() => {
        if (isReady) {
            loadCurrentRun();
        }
    }, [isReady, loadCurrentRun]);

    const handleStartRun = async () => {
        await startNewRun();
    };

    const handleExtract = async () => {
        const result = await extractRun();
        if (result) {
            setExtractionResult({
                finalXP: result.finalXP,
                tasksCompleted: result.tasksCompleted,
                totalFocusMinutes: result.totalFocusMinutes,
            });
            // Refresh user stats after extraction
            refetchUser();
        }
    };

    const handleNewRun = async () => {
        setExtractionResult(null);
        await startNewRun();
    };

    // Loading state
    if (!isReady || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4 animate-pulse">⚡</div>
                    <div className="text-[var(--text-muted)]">Загрузка...</div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-4xl mb-4">⚠️</div>
                    <div className="text-[var(--accent-danger)] mb-4">{error}</div>
                    <button
                        onClick={() => loadCurrentRun()}
                        className="btn-primary"
                    >
                        Повторить
                    </button>
                </div>
            </div>
        );
    }

    // After extraction - show results
    if (extractionResult) {
        return (
            <div className="min-h-screen p-4 flex flex-col">
                <motion.div
                    className="flex-1 flex flex-col items-center justify-center text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div className="text-6xl mb-6">🎖️</div>
                    <h1 className="text-3xl font-bold mb-2">Миссия Завершена</h1>
                    <p className="text-[var(--text-secondary)] mb-8">
                        Отличная работа, оператор!
                    </p>

                    <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-default)] w-full max-w-sm mb-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[var(--text-secondary)]">💎 XP Эвакуирован</span>
                                <span
                                    className="text-2xl font-bold font-mono"
                                    style={{ color: 'var(--accent-xp)' }}
                                >
                                    {extractionResult.finalXP}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-[var(--text-secondary)]">✅ Задач выполнено</span>
                                <span className="text-xl font-bold text-[var(--accent-primary)]">
                                    {extractionResult.tasksCompleted}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-[var(--text-secondary)]">⏱️ Время в фокусе</span>
                                <span className="text-xl font-bold">
                                    {extractionResult.totalFocusMinutes} мин
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleNewRun}
                        className="btn-primary text-lg px-8 py-4"
                    >
                        🚀 Новый Ран
                    </button>
                </motion.div>
            </div>
        );
    }

    // No active run - show start screen
    if (!run) {
        return (
            <div className="min-h-screen p-4 flex flex-col items-center justify-center">
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="text-6xl mb-6">🎯</div>
                    <h1 className="text-3xl font-bold mb-2">Rogue-Day</h1>
                    <p className="text-[var(--text-secondary)] mb-8 max-w-xs">
                        Каждый день — новый ран. Добавляй задачи, зарабатывай XP, извлекай прогресс.
                    </p>
                    <button
                        onClick={handleStartRun}
                        className="btn-primary text-lg px-8 py-4"
                    >
                        🚀 Начать Ран
                    </button>
                </motion.div>
            </div>
        );
    }

    // Active run
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;

    return (
        <div className="min-h-screen p-4 pb-24 flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold">🎯 Активный Ран</h1>
                    <p className="text-sm text-[var(--text-muted)]">
                        {completedTasks}/{totalTasks} задач • {run.run_date}
                    </p>
                </div>
                <XPCounter xp={dailyXP} />
            </header>

            {/* Energy meter */}
            <div className="mb-6">
                <EnergyMeter current={energy.current} max={energy.max} />
            </div>

            {/* Task list */}
            <div className="flex-1">
                <ServerTaskList tasks={tasks} />
            </div>

            {/* FAB */}
            <div className="fixed bottom-24 right-4 flex flex-col gap-3">
                {/* Add task */}
                <motion.button
                    onClick={() => setShowAddTask(true)}
                    className="w-14 h-14 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-lg"
                    whileTap={{ scale: 0.95 }}
                >
                    <span className="text-2xl">+</span>
                </motion.button>

                {/* Extract */}
                {tasks.length > 0 && (
                    <motion.button
                        onClick={handleExtract}
                        className="w-14 h-14 rounded-full bg-[var(--accent-secondary)] text-white flex items-center justify-center shadow-lg"
                        whileTap={{ scale: 0.95 }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                    >
                        <span className="text-xl">🚁</span>
                    </motion.button>
                )}
            </div>

            {/* Add Task Modal */}
            {showAddTask && (
                <ServerAddTaskModal
                    onClose={() => setShowAddTask(false)}
                    maxEnergy={energy.max}
                    currentEnergy={energy.current}
                />
            )}
        </div>
    );
}
