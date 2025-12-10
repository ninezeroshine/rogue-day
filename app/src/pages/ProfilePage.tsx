import { motion } from 'framer-motion';
import { useUserStore, useUserStats, useUserSettings } from '../store/useUserStore';
import { useTelegram, useHaptic } from '../hooks/useTelegram';
import { formatDuration } from '../lib/utils';

export function ProfilePage() {
    const { user } = useTelegram();
    const stats = useUserStats();
    const settings = useUserSettings();
    const { updateSettings, resetProgress } = useUserStore();
    const { notification } = useHaptic();

    const handleToggle = (key: keyof typeof settings) => {
        if (typeof settings[key] === 'boolean') {
            updateSettings({ [key]: !settings[key] });
        }
    };

    const handleReset = () => {
        if (confirm('Точно сбросить весь прогресс? Это действие необратимо!')) {
            resetProgress();
            notification('warning');
        }
    };

    return (
        <div className="min-h-screen p-4">
            {/* Header / User info */}
            <header className="mb-6 text-center">
                <div className="w-20 h-20 bg-[var(--bg-card)] rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-[var(--border-default)]">
                    <span className="text-3xl">👤</span>
                </div>
                <h1 className="text-xl font-bold">
                    {user?.first_name || 'Оператор'}
                </h1>
                {user?.username && (
                    <p className="text-sm text-[var(--text-muted)]">@{user.username}</p>
                )}
            </header>

            {/* Stats grid */}
            <motion.section
                className="mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2 className="text-sm text-[var(--text-muted)] mb-3 uppercase tracking-wide">
                    📈 Статистика
                </h2>

                <div className="grid grid-cols-2 gap-3">
                    <StatCard
                        icon="✨"
                        label="Всего XP"
                        value={stats.totalXP.toLocaleString()}
                        color="var(--accent-xp)"
                    />
                    <StatCard
                        icon="🚁"
                        label="Экстракций"
                        value={stats.totalExtractions.toString()}
                        color="var(--accent-primary)"
                    />
                    <StatCard
                        icon="✅"
                        label="Задач"
                        value={stats.totalTasksCompleted.toString()}
                        color="var(--accent-secondary)"
                    />
                    <StatCard
                        icon="⏱️"
                        label="В фокусе"
                        value={formatDuration(stats.totalFocusMinutes)}
                        color="var(--text-primary)"
                    />
                    <StatCard
                        icon="🔥"
                        label="Текущая серия"
                        value={`${stats.currentStreak} дн`}
                        color="var(--accent-warning)"
                    />
                    <StatCard
                        icon="🏆"
                        label="Лучшая серия"
                        value={`${stats.bestStreak} дн`}
                        color="var(--accent-xp)"
                    />
                </div>
            </motion.section>

            {/* Settings */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <h2 className="text-sm text-[var(--text-muted)] mb-3 uppercase tracking-wide">
                    ⚙️ Настройки
                </h2>

                <div className="card space-y-4">
                    <SettingToggle
                        icon="🔊"
                        label="Звуки"
                        description="Аудио при выполнении задач"
                        value={settings.sounds}
                        onChange={() => handleToggle('sounds')}
                    />

                    <SettingToggle
                        icon="📳"
                        label="Вибрация"
                        description="Haptic feedback"
                        value={settings.haptics}
                        onChange={() => handleToggle('haptics')}
                    />

                    <SettingToggle
                        icon="🔔"
                        label="Уведомления"
                        description="Push-напоминания от бота"
                        value={settings.notifications}
                        onChange={() => handleToggle('notifications')}
                    />

                    {/* Future: Ghost System toggle */}
                    {/* <SettingToggle ... /> */}
                </div>
            </motion.section>

            {/* Danger zone */}
            <motion.section
                className="mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <button
                    onClick={handleReset}
                    className="w-full py-3 text-[var(--accent-danger)] border border-[var(--accent-danger)] rounded-xl opacity-50 hover:opacity-100 transition-opacity"
                >
                    🗑️ Сбросить прогресс
                </button>
            </motion.section>

            {/* Future sections placeholder */}
            {/* Achievements, Tech Tree, etc. */}
        </div>
    );
}

// Stat card component
function StatCard({
    icon,
    label,
    value,
    color
}: {
    icon: string;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div className="card flex flex-col items-center py-4">
            <span className="text-2xl mb-1">{icon}</span>
            <span className="text-xl font-bold font-mono" style={{ color }}>
                {value}
            </span>
            <span className="text-xs text-[var(--text-muted)]">{label}</span>
        </div>
    );
}

// Setting toggle component
function SettingToggle({
    icon,
    label,
    description,
    value,
    onChange,
}: {
    icon: string;
    label: string;
    description: string;
    value: boolean;
    onChange: () => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-[var(--text-muted)]">{description}</div>
                </div>
            </div>

            <button
                onClick={onChange}
                className={`
          w-12 h-6 rounded-full transition-colors relative
          ${value ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-secondary)]'}
        `}
            >
                <div
                    className={`
            absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
            ${value ? 'translate-x-7' : 'translate-x-1'}
          `}
                />
            </button>
        </div>
    );
}
