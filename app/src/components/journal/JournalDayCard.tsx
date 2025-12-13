import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDuration } from '../../lib/utils';
import { IconCheck, IconX, IconChevronDown, IconExtraction } from '../../lib/icons';
import type { ExtractionResult } from '../../store/types';

interface DayGroup {
    date: string;
    dateLabel: string;
    totalXP: number;
    totalTasks: number;
    totalFailed: number;
    totalFocusMinutes: number;
    runs: ExtractionResult[];
}

interface JournalDayCardProps {
    group: DayGroup;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
    onRunClick: (entry: ExtractionResult) => void;
}

export const JournalDayCard = memo(function JournalDayCard({
    group,
    index,
    isExpanded,
    onToggle,
    onRunClick,
}: JournalDayCardProps) {
    const hasMultipleRuns = group.runs.length > 1;

    // Tier breakdown for the whole day
    const tierStats = useMemo(() => {
        let t1 = 0, t2 = 0, t3 = 0;
        for (const run of group.runs) {
            t1 += run.t1Completed ?? 0;
            t2 += run.t2Completed ?? 0;
            t3 += run.t3Completed ?? 0;
        }
        const total = Math.max(1, t1 + t2 + t3);
        return {
            t1, t2, t3,
            w1: `${(t1 / total) * 100}%`,
            w2: `${(t2 / total) * 100}%`,
            w3: `${(t3 / total) * 100}%`,
            show: t1 + t2 + t3 > 0,
        };
    }, [group.runs]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.04, layout: { type: 'spring', stiffness: 500, damping: 35 } }}
        >
            {/* Main day card */}
            <motion.div
                className={`card cursor-pointer select-none transition-colors ${
                    isExpanded ? 'border-[var(--accent-primary)]' : ''
                }`}
                onClick={hasMultipleRuns ? onToggle : () => onRunClick(group.runs[0])}
                whileHover={{ borderColor: 'var(--accent-primary)' }}
                whileTap={{ scale: 0.985 }}
            >
                <div className="flex items-center justify-between gap-3">
                    {/* Left: Date & stats */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-[var(--text-primary)]">
                                {group.dateLabel}
                            </span>
                            {hasMultipleRuns && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] font-medium">
                                    {group.runs.length} ранов
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                            <span className="flex items-center gap-1">
                                <IconCheck size={14} className="text-[var(--accent-primary)]" />
                                {group.totalTasks}
                            </span>
                            {group.totalFailed > 0 && (
                                <span className="flex items-center gap-1 text-[var(--accent-danger)]">
                                    <IconX size={14} />
                                    {group.totalFailed}
                                </span>
                            )}
                            <span className="text-[var(--text-muted)]">•</span>
                            <span>{formatDuration(group.totalFocusMinutes)}</span>
                        </div>
                    </div>

                    {/* Right: XP & expand indicator */}
                    <div className="text-right flex items-center gap-3">
                        <div>
                            <div 
                                className="text-xl font-bold font-mono"
                                style={{ color: 'var(--accent-xp)' }}
                            >
                                +{group.totalXP}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">XP</div>
                        </div>
                        
                        {hasMultipleRuns && (
                            <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                className="text-[var(--text-muted)]"
                            >
                                <IconChevronDown size={20} />
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Tier progress bar */}
                {tierStats.show && (
                    <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--bg-secondary)] overflow-hidden flex">
                        <div
                            className="h-full transition-all"
                            style={{ width: tierStats.w1, background: 'var(--accent-primary)', opacity: 0.5 }}
                        />
                        <div
                            className="h-full transition-all"
                            style={{ width: tierStats.w2, background: 'var(--accent-primary)', opacity: 0.8 }}
                        />
                        <div
                            className="h-full transition-all"
                            style={{ width: tierStats.w3, background: 'var(--accent-xp)' }}
                        />
                    </div>
                )}
            </motion.div>

            {/* Expanded runs list */}
            <AnimatePresence>
                {isExpanded && hasMultipleRuns && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-2 pl-4 space-y-2">
                            {group.runs.map((run, runIndex) => (
                                <RunSubCard
                                    key={run.id}
                                    run={run}
                                    index={runIndex}
                                    onClick={() => onRunClick(run)}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});

// Sub-card for individual runs within a day
const RunSubCard = memo(function RunSubCard({
    run,
    index,
    onClick,
}: {
    run: ExtractionResult;
    index: number;
    onClick: () => void;
}) {
    const timeLabel = useMemo(() => {
        const date = new Date(run.extractedAt || run.createdAt);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }, [run.extractedAt, run.createdAt]);

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={onClick}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] cursor-pointer hover:border-[var(--accent-secondary)] transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] flex items-center justify-center">
                    <IconExtraction size={16} className="text-[var(--text-muted)]" />
                </div>
                <div>
                    <div className="text-sm font-medium">
                        Ран #{index + 1}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                        {timeLabel} • {run.tasksCompleted} задач • {formatDuration(run.totalFocusMinutes)}
                    </div>
                </div>
            </div>

            <div className="text-right">
                <div 
                    className="font-bold font-mono text-sm"
                    style={{ color: 'var(--accent-xp)' }}
                >
                    +{run.finalXP}
                </div>
            </div>
        </motion.div>
    );
});
