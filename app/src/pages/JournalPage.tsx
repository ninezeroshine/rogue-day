import { motion, AnimatePresence } from 'framer-motion';
import { useExtractionHistory } from '../store/useUserStore';
import { useSync } from '../hooks/useSync';
import api from '../lib/api';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useUserStore } from '../store/useUserStore';
import { JournalDayCard } from '../components/journal/JournalDayCard';
import { JournalEntryModal } from '../components/journal/JournalEntryModal';
import { useHaptic } from '../hooks/useTelegram';
import type { ExtractionResult } from '../store/types';

// Group extractions by date
interface DayGroup {
    date: string; // YYYY-MM-DD
    dateLabel: string;
    totalXP: number;
    totalTasks: number;
    totalFailed: number;
    totalFocusMinutes: number;
    runs: ExtractionResult[];
}

export function JournalPage() {
    const localHistory = useExtractionHistory();
    const { isOnline, stats } = useSync();
    const setExtractionHistory = useUserStore(state => state.setExtractionHistory);
    const [selected, setSelected] = useState<ExtractionResult | null>(null);
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
    const { impact } = useHaptic();

    // When online, hydrate journal from server (source of truth)
    useEffect(() => {
        if (!isOnline) return;

        let cancelled = false;
        (async () => {
            try {
                const server = await api.run.journal(30);
                if (cancelled) return;
                setExtractionHistory(server.map(entry => ({
                    id: String(entry.extraction.id),
                    runId: String(entry.extraction.run_id),
                    finalXP: entry.extraction.final_xp,
                    xpBeforePenalties: entry.extraction.xp_before_penalties,
                    penaltyXP: entry.extraction.penalty_xp,
                    tasksCompleted: entry.extraction.tasks_completed,
                    tasksFailed: entry.extraction.tasks_failed,
                    tasksTotal: entry.extraction.tasks_total,
                    totalFocusMinutes: entry.extraction.total_focus_minutes,
                    t1Completed: entry.extraction.t1_completed,
                    t2Completed: entry.extraction.t2_completed,
                    t3Completed: entry.extraction.t3_completed,
                    t1Failed: entry.extraction.t1_failed,
                    t2Failed: entry.extraction.t2_failed,
                    t3Failed: entry.extraction.t3_failed,
                    completedWithTimer: entry.extraction.completed_with_timer,
                    completedWithoutTimer: entry.extraction.completed_without_timer,
                    createdAt: entry.extraction.created_at,
                    runDate: entry.run_date,
                    startedAt: entry.started_at,
                    extractedAt: entry.extracted_at,
                })));
            } catch (err) {
                console.warn('Failed to load extraction history from server:', err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isOnline, setExtractionHistory]);

    // Group extractions by date
    const dayGroups = useMemo((): DayGroup[] => {
        const groups = new Map<string, ExtractionResult[]>();
        
        for (const entry of localHistory) {
            const dateKey = entry.runDate || entry.createdAt.split('T')[0];
            if (!groups.has(dateKey)) {
                groups.set(dateKey, []);
            }
            groups.get(dateKey)!.push(entry);
        }

        // Convert to array and calculate aggregates
        const result: DayGroup[] = [];
        for (const [date, runs] of groups) {
            const dateObj = new Date(date + 'T12:00:00');
            const dateLabel = dateObj.toLocaleDateString('ru-RU', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
            });

            const totalXP = runs.reduce((sum, r) => sum + r.finalXP, 0);
            const totalTasks = runs.reduce((sum, r) => sum + r.tasksCompleted, 0);
            const totalFailed = runs.reduce((sum, r) => sum + r.tasksFailed, 0);
            const totalFocusMinutes = runs.reduce((sum, r) => sum + r.totalFocusMinutes, 0);

            result.push({
                date,
                dateLabel,
                totalXP,
                totalTasks,
                totalFailed,
                totalFocusMinutes,
                runs: runs.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ),
            });
        }

        // Sort by date descending
        return result.sort((a, b) => b.date.localeCompare(a.date));
    }, [localHistory]);

    const toggleDay = useCallback((date: string) => {
        impact('light');
        setExpandedDays(prev => {
            const next = new Set(prev);
            if (next.has(date)) {
                next.delete(date);
            } else {
                next.add(date);
            }
            return next;
        });
    }, [impact]);

    const openEntry = useCallback((entry: ExtractionResult) => {
        impact('medium');
        setSelected(entry);
    }, [impact]);

    const formatDate = useCallback((dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    }, []);

    return (
        <div className="min-h-screen p-4 pb-24">
            {/* Header */}
            <motion.header 
                className="mb-6"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl">📊</span>
                    <h1 className="text-2xl font-bold">Журнал Капитана</h1>
                </div>
                <p className="text-sm text-[var(--text-muted)] ml-10">
                    История миссий и эвакуаций
                </p>
            </motion.header>

            {/* Summary stats section */}
            <motion.section
                className="mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
            >
                <h2 className="text-sm text-[var(--text-muted)] mb-4 uppercase tracking-wide flex items-center gap-2">
                    <span>🎖️</span> Общий прогресс
                </h2>

                <div className="grid grid-cols-3 gap-3">
                    <SummaryStatCard
                        value={stats.total_xp.toLocaleString()}
                        label="Всего XP"
                        color="var(--accent-xp)"
                        icon="✨"
                    />
                    <SummaryStatCard
                        value={stats.total_extractions.toString()}
                        label="Эвакуаций"
                        color="var(--accent-primary)"
                        icon="🚁"
                    />
                    <SummaryStatCard
                        value={stats.current_streak.toString()}
                        label="Серия"
                        color="var(--accent-warning)"
                        icon="🔥"
                    />
                </div>
            </motion.section>

            {/* Connection status */}
            <motion.div 
                className="flex items-center gap-2 mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <span
                    className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'} ${isOnline ? 'shadow-[0_0_6px_rgba(34,197,94,0.6)]' : ''}`}
                />
                <span className="text-xs text-[var(--text-muted)]">
                    {isOnline ? 'Данные синхронизированы' : 'Локальный кэш'}
                </span>
            </motion.div>

            {/* Day groups section */}
            <motion.section
                className="mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <h2 className="text-sm text-[var(--text-muted)] mb-4 uppercase tracking-wide flex items-center gap-2">
                    <span>📅</span> История по дням
                </h2>

                {dayGroups.length === 0 ? (
                    <motion.div
                        className="card flex flex-col items-center justify-center py-12 text-center"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
                            <span className="text-3xl">📝</span>
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-1">
                            Пока пусто
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] max-w-xs">
                            Заверши свой первый ран с экстракцией, и он появится здесь
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {dayGroups.map((group, index) => (
                                <JournalDayCard
                                    key={group.date}
                                    group={group}
                                    index={index}
                                    isExpanded={expandedDays.has(group.date)}
                                    onToggle={() => toggleDay(group.date)}
                                    onRunClick={openEntry}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </motion.section>

            {/* Entry detail modal */}
            <JournalEntryModal
                entry={selected}
                onClose={() => setSelected(null)}
                formatDate={formatDate}
            />
        </div>
    );
}

// Summary stat card component
function SummaryStatCard({
    value,
    label,
    color,
    icon,
}: {
    value: string;
    label: string;
    color: string;
    icon: string;
}) {
    return (
        <motion.div 
            className="card flex flex-col items-center py-3 text-center"
            whileHover={{ scale: 1.02, borderColor: color }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
            {icon && <span className="text-lg mb-1">{icon}</span>}
            <span className="text-xl font-bold font-mono" style={{ color }}>
                {value}
            </span>
            <span className="text-xs text-[var(--text-muted)]">{label}</span>
        </motion.div>
    );
}
