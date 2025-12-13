import { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ServerTaskSlot } from './ServerTaskSlot';
import type { TaskResponse } from '../../lib/api';

interface ServerTaskListProps {
    tasks: TaskResponse[];
}

export function ServerTaskList({ tasks }: ServerTaskListProps) {
    // Sort: active first, then pending, then completed/failed
    // Memoize to avoid recreating array on each render
    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            const order = { active: 0, pending: 1, completed: 2, failed: 3 };
            return order[a.status] - order[b.status];
        });
    }, [tasks]);

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-5xl mb-4">🎯</span>
                <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">
                    Нет задач
                </h3>
                <p className="text-sm text-[var(--text-muted)] max-w-xs">
                    Добавь первую задачу, чтобы начать зарабатывать XP и прокачивать свой день!
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
                {sortedTasks.map((task) => (
                    <ServerTaskSlot key={task.id} task={task} />
                ))}
            </AnimatePresence>
        </div>
    );
}
