import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useServerRunStore, useServerRun, useServerIsLoading, useServerError, useServerDailyXP, useServerTasks, useServerCurrentEnergy, useServerMaxEnergy } from '../store/useServerRunStore';
import { useTelegram } from '../hooks/useTelegram';
import { ServerTaskList } from '../components/run/ServerTaskList';
import { ServerAddTaskModal } from '../components/run/ServerAddTaskModal';
import { ExtractionModal } from '../components/run/ExtractionModal';
import { EnergyMeter } from '../components/run/EnergyMeter';
import { XPCounter } from '../components/run/XPCounter';
import { QuickStartCard } from '../components/run/QuickStartCard';
import { PresetAppliedToast } from '../components/run/PresetAppliedToast';
import type { PresetApplyResponse } from '../lib/api';

export function RunPage() {
    const { isReady, user } = useTelegram();

    // Server state - use individual selectors to avoid infinite loops
    const run = useServerRun();
    const isLoading = useServerIsLoading();
    const error = useServerError();
    const dailyXP = useServerDailyXP();
    const tasks = useServerTasks();
    const currentEnergy = useServerCurrentEnergy();
    const maxEnergy = useServerMaxEnergy();

    // Calculate total focus minutes from completed tasks (memoized)
    const totalFocusMinutes = useMemo(() =>
        tasks
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + (t.duration || 0), 0),
        [tasks]
    );

    // Get actions directly from store.getState() to avoid re-render triggers
    const loadCurrentRun = useCallback(() => {
        return useServerRunStore.getState().loadCurrentRun();
    }, []);

    const startNewRun = useCallback(() => {
        return useServerRunStore.getState().startNewRun();
    }, []);

    const extractRunAction = useCallback(() => {
        return useServerRunStore.getState().extractRun();
    }, []);

    const [showAddTask, setShowAddTask] = useState(false);
    const [showExtraction, setShowExtraction] = useState(false);
    const [extractionResult, setExtractionResult] = useState<{
        finalXP: number;
        tasksCompleted: number;
        totalFocusMinutes: number;
    } | null>(null);

    // Preset applied toast state
    const [presetToast, setPresetToast] = useState<{
        visible: boolean;
        message: string;
        tasksCreated: number;
    }>({ visible: false, message: '', tasksCreated: 0 });

    const handlePresetApplied = useCallback((result: PresetApplyResponse) => {
        setPresetToast({
            visible: true,
            message: result.message,
            tasksCreated: result.tasks_created,
        });
    }, []);

    const closePresetToast = useCallback(() => {
        setPresetToast(prev => ({ ...prev, visible: false }));
    }, []);

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
        const result = await extractRunAction();
        if (result) {
            setExtractionResult({
                finalXP: result.finalXP,
                tasksCompleted: result.tasksCompleted,
                totalFocusMinutes: result.totalFocusMinutes,
            });
            setShowExtraction(false);
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
                        className="btn btn-primary px-6 py-3 rounded-xl bg-[var(--accent-primary)] text-white font-medium"
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
                        className="btn btn-primary text-lg px-8 py-4 rounded-xl bg-[var(--accent-primary)] text-white font-bold glow-success"
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
                        className="btn btn-primary text-lg px-8 py-4 rounded-xl bg-[var(--accent-primary)] text-white font-bold glow-success animate-pulse-glow"
                    >
                        ⚡ Начать Ран
                    </button>
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
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚡</span>
                        <div>
                            <h1 className="text-xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                                Ран активен
                            </h1>
                            <p className="text-sm text-[var(--text-muted)]">
                                {totalFocusMinutes} мин в фокусе • {tasks.length} задач
                            </p>
                        </div>
                    </div>

                    {/* Extraction button - glowing */}
                    <motion.button
                        onClick={() => setShowExtraction(true)}
                        className="btn btn-secondary text-sm px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] font-medium"
                        whileHover={{ scale: 1.05, borderColor: 'var(--accent-xp)' }}
                        whileTap={{ scale: 0.95 }}
                    >
                        🚁 Экстракция
                    </motion.button>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-2 gap-4">
                    <XPCounter xp={dailyXP} />
                    <EnergyMeter current={currentEnergy} max={maxEnergy} />
                </div>
            </header>

            {/* Quick Start presets - show when no tasks yet */}
            {tasks.length === 0 && (
                <QuickStartCard onApplied={handlePresetApplied} />
            )}

            {/* Task list */}
            <main className="flex-1 overflow-y-auto pb-20">
                <ServerTaskList tasks={tasks} />
            </main>

            {/* Add task FAB */}
            <motion.button
                onClick={() => setShowAddTask(true)}
                className="fixed bottom-24 right-6 w-16 h-16 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-3xl font-bold shadow-lg flex items-center justify-center z-30 glow-success"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                +
            </motion.button>

            {/* Modals */}
            {showAddTask && (
                <ServerAddTaskModal
                    onClose={() => setShowAddTask(false)}
                    maxEnergy={maxEnergy}
                    currentEnergy={currentEnergy}
                    totalFocusMinutes={totalFocusMinutes}
                />
            )}

            <ExtractionModal
                isOpen={showExtraction}
                onClose={() => setShowExtraction(false)}
                onExtract={handleExtract}
            />

            {/* Preset applied toast */}
            <PresetAppliedToast
                visible={presetToast.visible}
                message={presetToast.message}
                tasksCreated={presetToast.tasksCreated}
                onClose={closePresetToast}
            />
        </div>
    );
}
