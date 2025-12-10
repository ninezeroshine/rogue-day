import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRunStore, useRunStatus } from '../store/useRunStore';
import { useUserStore } from '../store/useUserStore';
import { useTelegram } from '../hooks/useTelegram';
import { EnergyMeter } from '../components/run/EnergyMeter';
import { XPCounter } from '../components/run/XPCounter';
import { TaskList } from '../components/run/TaskList';
import { AddTaskModal } from '../components/run/AddTaskModal';
import { ExtractionModal } from '../components/run/ExtractionModal';

export function RunPage() {
    const { startNewRun, extractRun, status, totalFocusMinutes } = useRunStore();
    const runStatus = useRunStatus();
    const { isReady, isTMA, user } = useTelegram();

    const [showAddTask, setShowAddTask] = useState(false);
    const [showExtraction, setShowExtraction] = useState(false);
    const [extractionResult, setExtractionResult] = useState<{
        finalXP: number;
        tasksCompleted: number;
        totalFocusMinutes: number;
    } | null>(null);

    const handleStartRun = () => {
        startNewRun();
    };

    const handleExtract = () => {
        const result = extractRun();

        // Save to user history
        useUserStore.getState().addExtraction(result);

        setExtractionResult({
            finalXP: result.finalXP,
            tasksCompleted: result.tasksCompleted,
            totalFocusMinutes: result.totalFocusMinutes,
        });
        setShowExtraction(false);
    };

    const handleNewRun = () => {
        setExtractionResult(null);
        startNewRun();
    };

    // Loading state
    if (!isReady) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4 animate-pulse">⚡</div>
                    <div className="text-[var(--text-muted)]">Загрузка...</div>
                </div>
            </div>
        );
    }

    // No active run - show start screen
    if (runStatus !== 'active' || !status) {
        // Check if we just extracted
        if (extractionResult) {
            return (
                <div className="min-h-screen p-4 flex flex-col">
                    {/* After-Action Report */}
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
                            className="btn btn-primary text-lg px-8 py-4 glow-success"
                        >
                            🚀 Новый Ран
                        </button>
                    </motion.div>
                </div>
            );
        }

        // Initial start screen
        return (
            <div className="min-h-screen p-4 flex flex-col">
                <motion.div
                    className="flex-1 flex flex-col items-center justify-center text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="text-6xl mb-6">🎯</div>
                    <h1 className="text-3xl font-bold mb-2">Rogue-Day</h1>
                    <p className="text-[var(--text-secondary)] mb-2">
                        Каждый день — новый ран
                    </p>
                    <p className="text-sm text-[var(--text-muted)] mb-8 max-w-xs">
                        Выполняй задачи, зарабатывай XP, эвакуируй прогресс
                    </p>

                    {user && (
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                            Привет, {user.first_name}! 👋
                        </p>
                    )}

                    <button
                        onClick={handleStartRun}
                        className="btn btn-primary text-lg px-8 py-4 glow-success animate-pulse-glow"
                    >
                        ⚡ Начать Ран
                    </button>

                    {!isTMA && (
                        <p className="text-xs text-[var(--text-muted)] mt-4">
                            💡 Режим разработки (вне Telegram)
                        </p>
                    )}
                </motion.div>
            </div>
        );
    }

    // Active run
    return (
        <div className="min-h-screen p-4 flex flex-col">
            {/* Header */}
            <header className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-bold">Ран активен</h1>
                        <p className="text-sm text-[var(--text-muted)]">
                            {totalFocusMinutes} мин в фокусе
                        </p>
                    </div>

                    <button
                        onClick={() => setShowExtraction(true)}
                        className="btn btn-secondary text-sm"
                    >
                        🚁 Экстракция
                    </button>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-2 gap-4">
                    <XPCounter />
                    <EnergyMeter />
                </div>
            </header>

            {/* Task list */}
            <main className="flex-1 overflow-y-auto pb-20">
                <TaskList />
            </main>

            {/* Add task FAB */}
            {/* Add task FAB - positioned above tab bar */}
            <motion.button
                onClick={() => setShowAddTask(true)}
                className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-2xl font-bold shadow-lg flex items-center justify-center z-30"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                +
            </motion.button>

            {/* Modals */}
            <AddTaskModal
                isOpen={showAddTask}
                onClose={() => setShowAddTask(false)}
            />

            <ExtractionModal
                isOpen={showExtraction}
                onClose={() => setShowExtraction(false)}
                onExtract={handleExtract}
            />
        </div>
    );
}
