import { AnimatePresence } from 'framer-motion';
import { useTasks } from '../../store/useRunStore';
import { TaskSlot } from './TaskSlot';

export function TaskList() {
    const tasks = useTasks();

    // Sort tasks: active first, then pending, then completed/failed
    const sortedTasks = [...tasks].sort((a, b) => {
        const statusOrder = { active: 0, pending: 1, completed: 2, failed: 3 };
        return statusOrder[a.status] - statusOrder[b.status];
    });

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-4xl mb-4">🎯</span>
                <h3 className="text-lg font-semibold text-[var(--text-secondary)]">
                    Нет задач
                </h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                    Добавь первую задачу, чтобы начать ран
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
                {sortedTasks.map((task) => (
                    <TaskSlot key={task.id} task={task} />
                ))}
            </AnimatePresence>
        </div>
    );
}
