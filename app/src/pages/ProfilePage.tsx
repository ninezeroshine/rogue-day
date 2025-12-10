import { motion } from 'framer-motion';
import { useSync } from '../hooks/useSync';
import { useUserStore, useUserSettings } from '../store/useUserStore';
import { useHaptic } from '../hooks/useTelegram';
import { formatDuration } from '../lib/utils';
import api from '../lib/api';

export function ProfilePage() {
    const { displayName, username, photoUrl, stats, isOnline, isTMA } = useSync();
    const localSettings = useUserSettings();
    const { updateSettings: updateLocalSettings } = useUserStore();
    const { notification } = useHaptic();

    const handleToggle = async (key: 'sounds' | 'haptics' | 'notifications') => {
        // Update local first
        const newValue = !localSettings[key];
        updateLocalSettings({ [key]: newValue });

        // Sync to server if online
        if (isOnline) {
            try {
                const settingsMap = {
                    sounds: 'sounds_enabled',
                    haptics: 'haptics_enabled',
                    notifications: 'notifications_enabled',
                };
                await api.user.updateSettings({ [settingsMap[key]]: newValue });
            } catch (err) {
                console.error('Failed to sync settings:', err);
            }
        }
    };

    const handleReset = () => {
        if (confirm('Точно сбросить весь прогресс? Это действие необратимо!')) {
            useUserStore.getState().resetProgress();
            notification('warning');
        }
    };

    return (
        <div className="min-h-screen p-4">
            {/* Header / User info */}
            <header className="mb-6 text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-[var(--border-default)] overflow-hidden bg-[var(--bg-card)]">
                    {photoUrl ? (
                        <img
                            src={photoUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-3xl">👤</span>
                    )}
                </div>
                <h1 className="text-xl font-bold">{displayName}</h1>
                {username && (
                    <p className="text-sm text-[var(--text-muted)]">@{username}</p>
                )}

                {/* Connection status */}
                <div className="mt-2 flex items-center justify-center gap-2">
                    <span
                        className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}`}
                    />
                    <span className="text-xs text-[var(--text-muted)]">
                        {isOnline ? 'Синхронизировано' : 'Офлайн режим'}
                    </span>
                </div>
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
                        value={stats.total_xp.toLocaleString()}
                        color="var(--accent-xp)"
                    />
                    <StatCard
                        icon="🚁"
                        label="Экстракций"
                        value={stats.total_extractions.toString()}
                        color="var(--accent-primary)"
                    />
                    <StatCard
                        icon="✅"
                        label="Задач"
                        value={stats.total_tasks_completed.toString()}
                        color="var(--accent-secondary)"
                    />
                    <StatCard
                        icon="⏱️"
                        label="В фокусе"
                        value={formatDuration(stats.total_focus_minutes)}
                        color="var(--text-primary)"
                    />
                    <StatCard
                        icon="🔥"
                        label="Текущая серия"
                        value={`${stats.current_streak} дн`}
                        color="var(--accent-warning)"
                    />
                    <StatCard
                        icon="🏆"
                        label="Лучшая серия"
                        value={`${stats.best_streak} дн`}
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
                        value={localSettings.sounds}
                        onChange={() => handleToggle('sounds')}
                    />

                    <SettingToggle
                        icon="📳"
                        label="Вибрация"
                        description="Haptic feedback"
                        value={localSettings.haptics}
                        onChange={() => handleToggle('haptics')}
                    />

                    <SettingToggle
                        icon="🔔"
                        label="Уведомления"
                        description="Push-напоминания от бота"
                        value={localSettings.notifications}
                        onChange={() => handleToggle('notifications')}
                    />
                </div>
            </motion.section>

            {/* Info section */}
            <motion.section
                className="mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <div className="card bg-[var(--bg-secondary)] text-center py-4">
                    <p className="text-sm text-[var(--text-muted)]">
                        {isTMA ? '📱 Telegram Mini App' : '🖥️ Режим разработки'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                        Версия 0.1.0
                    </p>
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
                    🗑️ Сбросить локальные данные
                </button>
            </motion.section>
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
