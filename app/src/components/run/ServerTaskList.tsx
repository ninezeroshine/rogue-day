import { motion, AnimatePresence } from 'framer-motion';
import { useServerRunStore } from '../../store/useServerRunStore';
import { useHaptic } from '../../hooks/useTelegram';
import type { TaskResponse } from '../../lib/api';

interface ServerTaskListProps {
    tasks: TaskResponse[];
}

export function ServerTaskList({ tasks }: ServerTaskListProps) {
    // Sort: active first, then pending, then completed/failed
    const sortedTasks = [...tasks].sort((a, b) => {
        const order = { active: 0, pending: 1, completed: 2, failed: 3 };
        return order[a.status] - order[b.status];
    });

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-4xl mb-4">📝</span>
                <p className="text-[var(--text-muted)]">
                    Пока нет задач. Добавь первую!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <AnimatePresence mode="popLayout">
                {sortedTasks.map((task) => (
                    <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                    >
                        <ServerTaskSlot task={task} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

interface ServerTaskSlotProps {
    task: TaskResponse;
}

function ServerTaskSlot({ task }: ServerTaskSlotProps) {
    const { startTask, completeTask, failTask } = useServerRunStore();
    const { impact, notification } = useHaptic();

    const tierColors = {
        1: 'var(--accent-secondary)',
        2: 'var(--accent-primary)',
        3: 'var(--accent-xp)',
    };

    const tierLabels = {
        1: '🌱 T1',
        2: '⚡ T2',
        3: '🔥 T3',
    };

    const handleStart = async () => {
        impact('medium');
        await startTask(task.id);
    };

    const handleComplete = async () => {
        notification('success');
        await completeTask(task.id);
    };

    const handleFail = async () => {
        notification('error');
        await failTask(task.id);
    };

    const isCompleted = task.status === 'completed';
    const isFailed = task.status === 'failed';
    const isActive = task.status === 'active';
    const isPending = task.status === 'pending';

    return (
        <div
            className={`card transition-all ${isCompleted ? 'opacity-60 bg-[var(--bg-secondary)]' : ''
                } ${isFailed ? 'opacity-40 border-[var(--accent-danger)]' : ''}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    {/* Task title */}
                    <h3
                        className={`font-medium truncate ${isCompleted ? 'line-through text-[var(--text-muted)]' : ''
                            }`}
                    >
                        {task.title}
                    </h3>

                    {/* Task meta */}
                    <div className="flex items-center gap-2 mt-1 text-sm">
                        <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                                backgroundColor: `${tierColors[task.tier as 1 | 2 | 3]}20`,
                                color: tierColors[task.tier as 1 | 2 | 3],
                            }}
                        >
                            {tierLabels[task.tier as 1 | 2 | 3]}
                        </span>
                        <span className="text-[var(--text-muted)]">
                            {task.duration} мин
                        </span>
                        {task.use_timer && (
                            <span className="text-[var(--text-muted)]">⏱️</span>
                        )}
                    </div>
                </div>

                {/* XP */}
                <div className="text-right">
                    <div
                        className="text-lg font-bold font-mono"
                        style={{ color: 'var(--accent-xp)' }}
                    >
                        +{task.xp_earned}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">XP</div>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-3 flex gap-2">
                {isPending && (
                    <button
                        onClick={handleStart}
                        className="flex-1 py-2 rounded-lg bg-[var(--accent-primary)] text-white font-medium"
                    >
                        ▶ Начать
                    </button>
                )}

                {isActive && (
                    <>
                        <button
                            onClick={handleComplete}
                            className="flex-1 py-2 rounded-lg bg-[var(--accent-secondary)] text-white font-medium"
                        >
                            ✓ Выполнено
                        </button>
                        {task.tier > 1 && (
                            <button
                                onClick={handleFail}
                                className="px-4 py-2 rounded-lg bg-[var(--accent-danger)] text-white font-medium"
                            >
                                ✗
                            </button>
                        )}
                    </>
                )}

                {isCompleted && (
                    <div className="flex-1 py-2 text-center text-[var(--accent-secondary)] font-medium">
                        ✓ Выполнено
                    </div>
                )}

                {isFailed && (
                    <div className="flex-1 py-2 text-center text-[var(--accent-danger)] font-medium">
                        ✗ Провалено
                    </div>
                )}
            </div>
        </div>
    );
}
