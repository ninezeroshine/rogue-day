import { memo, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDuration } from '../../lib/utils';
import { IconExtraction, IconX, IconClock, IconTimer, IconTier1, IconTier2, IconTier3 } from '../../lib/icons';
import type { ExtractionResult } from '../../store/types';

interface JournalEntryModalProps {
    entry: ExtractionResult | null;
    onClose: () => void;
    formatDate: (dateString: string) => string;
}

export const JournalEntryModal = memo(function JournalEntryModal({
    entry,
    onClose,
    formatDate,
}: JournalEntryModalProps) {
    const model = useMemo(() => {
        if (!entry) return null;

        const tasksTotal = entry.tasksTotal ?? (entry.tasksCompleted + entry.tasksFailed);
        const total = Math.max(1, tasksTotal);
        const pending = Math.max(0, total - entry.tasksCompleted - entry.tasksFailed);
        const w = (n: number) => `${(n / total) * 100}%`;

        const xpBefore = entry.xpBeforePenalties;
        const penalty = entry.penaltyXP;
        const successRate = Math.round((entry.tasksCompleted / total) * 100);

        // Time formatting
        const extractTime = entry.extractedAt 
            ? new Date(entry.extractedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            : null;

        return {
            tasksTotal,
            pending,
            wCompleted: w(entry.tasksCompleted),
            wFailed: w(entry.tasksFailed),
            wPending: w(pending),
            xpBefore,
            penalty,
            successRate,
            extractTime,
        };
    }, [entry]);

    return (
        <AnimatePresence>
            {entry && model && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/85 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] max-w-sm w-full overflow-hidden shadow-2xl"
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header with gradient */}
                            <div className="relative bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-card)] p-5 pb-4 border-b border-[var(--border-default)]">
                                <motion.button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <IconX size={16} />
                                </motion.button>
                                
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-xp)]/10 flex items-center justify-center">
                                        <IconExtraction size={22} color="var(--accent-xp)" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-[var(--text-primary)]">
                                            {formatDate(entry.runDate || entry.createdAt)}
                                        </h2>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {model.extractTime ? `Эвакуация в ${model.extractTime}` : 'Отчёт о миссии'}
                                        </p>
                                    </div>
                                </div>

                                {/* XP Hero */}
                                <div className="mt-4 flex items-end justify-between">
                                    <div>
                                        <div className="text-xs text-[var(--text-muted)] mb-1">Добыто XP</div>
                                        <motion.div 
                                            className="text-4xl font-bold font-mono"
                                            style={{ color: 'var(--accent-xp)' }}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.1, type: 'spring' }}
                                        >
                                            +{entry.finalXP}
                                        </motion.div>
                                        {typeof model.xpBefore === 'number' && typeof model.penalty === 'number' && model.penalty > 0 && (
                                            <div className="text-xs text-[var(--text-muted)] mt-1">
                                                Было {model.xpBefore} • <span className="text-[var(--accent-danger)]">−{model.penalty} штраф</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div 
                                            className="text-2xl font-bold"
                                            style={{ color: model.successRate >= 80 ? 'var(--accent-primary)' : model.successRate >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)' }}
                                        >
                                            {model.successRate}%
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)]">успех</div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="p-5 space-y-4">
                                {/* Focus & Timer row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <StatBox
                                        Icon={IconClock}
                                        label="Время в фокусе"
                                        value={formatDuration(entry.totalFocusMinutes)}
                                    />
                                    <StatBox
                                        Icon={IconTimer}
                                        label="С таймером"
                                        value={`${entry.completedWithTimer ?? 0} / ${(entry.completedWithTimer ?? 0) + (entry.completedWithoutTimer ?? 0)}`}
                                    />
                                </div>

                                {/* Tasks progress */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-[var(--text-muted)]">Прогресс задач</span>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            {entry.tasksCompleted} / {model.tasksTotal}
                                        </span>
                                    </div>
                                    <div className="h-3 w-full rounded-full overflow-hidden flex bg-[var(--bg-secondary)]">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: model.wCompleted }}
                                            transition={{ delay: 0.2, duration: 0.4 }}
                                            style={{ background: 'var(--accent-primary)' }}
                                            className="h-full"
                                        />
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: model.wFailed }}
                                            transition={{ delay: 0.3, duration: 0.4 }}
                                            style={{ background: 'var(--accent-danger)' }}
                                            className="h-full"
                                        />
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: model.wPending }}
                                            transition={{ delay: 0.4, duration: 0.4 }}
                                            style={{ background: 'var(--border-default)' }}
                                            className="h-full"
                                        />
                                    </div>
                                    <div className="mt-2 flex justify-between text-xs">
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></span>
                                            <span className="text-[var(--text-muted)]">Выполнено</span>
                                            <span className="font-medium">{entry.tasksCompleted}</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-[var(--accent-danger)]"></span>
                                            <span className="text-[var(--text-muted)]">Провал</span>
                                            <span className="font-medium">{entry.tasksFailed}</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-[var(--border-default)]"></span>
                                            <span className="text-[var(--text-muted)]">Пропуск</span>
                                            <span className="font-medium">{model.pending}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Tier breakdown */}
                                <div>
                                    <div className="text-xs text-[var(--text-muted)] mb-3">Разбивка по тирам</div>
                                    <div className="space-y-2">
                                        {([
                                            { tier: 'T1', label: 'Разминка', c: entry.t1Completed ?? 0, f: entry.t1Failed ?? 0, color: 'var(--accent-primary)', opacity: 0.5, Icon: IconTier1 },
                                            { tier: 'T2', label: 'Рутина', c: entry.t2Completed ?? 0, f: entry.t2Failed ?? 0, color: 'var(--accent-primary)', opacity: 0.8, Icon: IconTier2 },
                                            { tier: 'T3', label: 'Фокус', c: entry.t3Completed ?? 0, f: entry.t3Failed ?? 0, color: 'var(--accent-xp)', opacity: 1, Icon: IconTier3 },
                                        ]).map((row, i) => {
                                            const total = row.c + row.f;
                                            if (total === 0) return null;
                                            const maxTotal = Math.max(1, total);
                                            
                                            return (
                                                <motion.div 
                                                    key={row.tier}
                                                    className="flex items-center gap-3"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.3 + i * 0.1 }}
                                                >
                                                    <div className="w-8 flex items-center justify-center">
                                                        <row.Icon size={16} color={row.color} style={{ opacity: row.opacity }} />
                                                    </div>
                                                    <div className="flex-1 h-2 rounded-full overflow-hidden flex bg-[var(--bg-secondary)]">
                                                        <div 
                                                            style={{ 
                                                                width: `${(row.c / maxTotal) * 100}%`, 
                                                                background: row.color, 
                                                                opacity: row.opacity 
                                                            }} 
                                                            className="h-full"
                                                        />
                                                        <div 
                                                            style={{ 
                                                                width: `${(row.f / maxTotal) * 100}%`, 
                                                                background: 'var(--accent-danger)' 
                                                            }} 
                                                            className="h-full"
                                                        />
                                                    </div>
                                                    <div className="w-16 text-right text-xs text-[var(--text-muted)]">
                                                        <span className="text-[var(--text-primary)]">{row.c}</span>
                                                        {row.f > 0 && <span className="text-[var(--accent-danger)]"> / {row.f}</span>}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});

// Stat box component
function StatBox({
    Icon,
    label,
    value,
}: {
    Icon: React.FC<{ size?: number; className?: string }>;
    label: string;
    value: string;
}) {
    return (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className="text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">{label}</span>
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)]">{value}</div>
        </div>
    );
}
