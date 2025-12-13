import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useServerRunStore, useServerRun, useServerIsLoading, useServerError, useServerDailyXP, useServerTasks, useServerCurrentEnergy, useServerMaxEnergy } from '../store/useServerRunStore';
import { useTelegram } from '../hooks/useTelegram';
import { ServerTaskList } from '../components/run/ServerTaskList';
import { ServerAddTaskModal } from '../components/run/ServerAddTaskModal';
import { ExtractionModal } from '../components/run/ExtractionModal';
import { EnergyMeter } from '../components/run/EnergyMeter';
import { XPCounter } from '../components/run/XPCounter';
import { QuickStartCard } from '../components/run/QuickStartCard';
import { PresetAppliedToast } from '../components/run/PresetAppliedToast';
import { PresetPickerModal } from '../components/run/PresetPickerModal';
import { 
    IconEnergy, IconRun, IconMedal, IconXP, IconCheckCircle, 
    IconClock, IconRocket, IconExtraction, IconPreset, IconPlus, IconWarning
} from '../lib/icons';
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
    const [showPresetPicker, setShowPresetPicker] = useState(false);
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
                    <motion.div 
                        className="mb-4 flex justify-center"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        <IconEnergy size={48} color="var(--accent-primary)" />
                    </motion.div>
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
                    <div className="mb-4 flex justify-center">
                        <IconWarning size={48} color="var(--accent-danger)" />
                    </div>
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
                    <motion.div 
                        className="w-24 h-24 rounded-full bg-[var(--accent-xp)]/15 flex items-center justify-center mb-6"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.1 }}
                    >
                        <IconMedal size={48} color="var(--accent-xp)" />
                    </motion.div>
                    <h1 className="text-3xl font-bold mb-2">Миссия Завершена</h1>
                    <p className="text-[var(--text-secondary)] mb-8">
                        Отличная работа, оператор!
                    </p>

                    <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-default)] w-full max-w-sm mb-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[var(--text-secondary)] flex items-center gap-2">
                                    <IconXP size={18} color="var(--accent-xp)" />
                                    XP Эвакуирован
                                </span>
                                <span
                                    className="text-2xl font-bold font-mono"
                                    style={{ color: 'var(--accent-xp)' }}
                                >
                                    {extractionResult.finalXP}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-[var(--text-secondary)] flex items-center gap-2">
                                    <IconCheckCircle size={18} color="var(--accent-primary)" />
                                    Задач выполнено
                                </span>
                                <span className="text-xl font-bold text-[var(--accent-primary)]">
                                    {extractionResult.tasksCompleted}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-[var(--text-secondary)] flex items-center gap-2">
                                    <IconClock size={18} />
                                    Время в фокусе
                                </span>
                                <span className="text-xl font-bold">
                                    {extractionResult.totalFocusMinutes} мин
                                </span>
                            </div>
                        </div>
                    </div>

                    <motion.button
                        onClick={handleNewRun}
                        className="btn btn-primary text-lg px-8 py-4 rounded-xl bg-[var(--accent-primary)] text-white font-bold glow-success flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <IconRocket size={22} />
                        <span>Новый Ран</span>
                    </motion.button>
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
                    <motion.div 
                        className="w-24 h-24 rounded-full bg-[var(--accent-primary)]/15 flex items-center justify-center mb-6"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring' }}
                    >
                        <IconRun size={48} color="var(--accent-primary)" />
                    </motion.div>
                    <h1 className="text-3xl font-bold mb-2">Rogue-Day</h1>
                    <p className="text-[var(--text-secondary)] mb-2">
                        Каждый день — новый ран
                    </p>
                    <p className="text-sm text-[var(--text-muted)] mb-8 max-w-xs">
                        Выполняй задачи, зарабатывай XP, эвакуируй прогресс
                    </p>

                    {user && (
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                            Привет, {user.first_name}!
                        </p>
                    )}

                    <motion.button
                        onClick={handleStartRun}
                        className="btn btn-primary text-lg px-8 py-4 rounded-xl bg-[var(--accent-primary)] text-white font-bold glow-success animate-pulse-glow flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <IconEnergy size={22} />
                        <span>Начать Ран</span>
                    </motion.button>
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
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/15 flex items-center justify-center">
                            <IconEnergy size={22} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                                Ран активен
                            </h1>
                            <p className="text-sm text-[var(--text-muted)]">
                                {totalFocusMinutes} мин в фокусе • {tasks.length} задач
                            </p>
                        </div>
                    </div>

                    {/* Extraction button */}
                    <motion.button
                        onClick={() => setShowExtraction(true)}
                        className="btn btn-secondary text-sm px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] font-medium flex items-center gap-1.5"
                        whileHover={{ scale: 1.05, borderColor: 'var(--accent-xp)' }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <IconExtraction size={16} />
                        <span>Экстракция</span>
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

            {/* FAB Group */}
            <div className="fixed bottom-24 right-6 z-30 flex flex-col gap-3 items-center">
                {/* Preset picker FAB (secondary) */}
                <AnimatePresence>
                    {tasks.length > 0 && (
                        <motion.button
                            onClick={() => setShowPresetPicker(true)}
                            className="w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] shadow-lg flex items-center justify-center"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            whileHover={{ scale: 1.1, borderColor: 'var(--accent-secondary)' }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <IconPreset size={20} className="text-[var(--text-secondary)]" />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Add task FAB (primary) */}
                <motion.button
                    onClick={() => setShowAddTask(true)}
                    className="w-16 h-16 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-lg flex items-center justify-center glow-success"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <IconPlus size={28} strokeWidth={2.5} />
                </motion.button>
            </div>

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

            {/* Preset picker modal */}
            <PresetPickerModal
                isOpen={showPresetPicker}
                onClose={() => setShowPresetPicker(false)}
                onApplied={handlePresetApplied}
                currentEnergy={currentEnergy}
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
