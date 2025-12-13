import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, memo, type FC } from 'react';
import { useSync } from '../hooks/useSync';
import { useUserStore, useUserSettings } from '../store/useUserStore';
import { useHaptic, useTelegram } from '../hooks/useTelegram';
import { formatDuration } from '../lib/utils';
import { 
    IconXP, IconExtraction, IconCheckCircle, IconClock, IconFire, IconTrophy,
    IconTrending, IconSound, IconVibrate, IconBell, IconInfo, IconWarning, IconTrash, IconRun
} from '../lib/icons';
import api from '../lib/api';

export function ProfilePage() {
    const { displayName, username, stats, isOnline, isTMA, telegramUser } = useSync();
    const { user: tgUser } = useTelegram();
    const localSettings = useUserSettings();
    const { updateSettings: updateLocalSettings } = useUserStore();
    const { notification, impact } = useHaptic();

    // Avatar state
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [avatarLoading, setAvatarLoading] = useState(true);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    // Load avatar from server
    useEffect(() => {
        const loadAvatar = async () => {
            const telegramId = tgUser?.id || telegramUser?.id;
            if (!telegramId) {
                setAvatarLoading(false);
                return;
            }

            try {
                const response = await api.avatar.getAvatar(telegramId);
                if (response.photo_url) {
                    setPhotoUrl(response.photo_url);
                }
            } catch (err) {
                console.error('Failed to load avatar:', err);
            } finally {
                setAvatarLoading(false);
            }
        };

        loadAvatar();
    }, [tgUser?.id, telegramUser?.id]);

    const handleToggle = useCallback(async (key: 'sounds' | 'haptics' | 'notifications') => {
        impact('light');
        const newValue = !localSettings[key];
        updateLocalSettings({ [key]: newValue });

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
    }, [localSettings, updateLocalSettings, isOnline, impact]);

    const handleReset = useCallback(() => {
        useUserStore.getState().resetProgress();
        notification('warning');
        setShowResetConfirm(false);
    }, [notification]);

    return (
        <div className="min-h-screen p-4 pb-24">
            {/* Header / User info */}
            <motion.header 
                className="mb-8 text-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {/* Avatar with ring */}
                <motion.div 
                    className="relative w-24 h-24 mx-auto mb-4"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                >
                    {/* Outer ring */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-xp)] opacity-30 blur-sm" />
                    <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-xp)] p-0.5">
                        <div className="w-full h-full rounded-full bg-[var(--bg-card)] flex items-center justify-center overflow-hidden">
                            {avatarLoading ? (
                                <div className="animate-pulse bg-[var(--bg-secondary)] w-full h-full" />
                            ) : photoUrl ? (
                                <img
                                    src={photoUrl}
                                    alt={displayName}
                                    className="w-full h-full object-cover"
                                    onError={() => setPhotoUrl(null)}
                                />
                            ) : (
                                <IconRun size={32} className="text-[var(--text-muted)]" />
                            )}
                        </div>
                    </div>
                    
                    {/* Online indicator */}
                    <motion.div 
                        className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-3 border-[var(--bg-primary)] ${
                            isOnline ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                        style={{
                            boxShadow: isOnline 
                                ? '0 0 8px rgba(34, 197, 94, 0.6)' 
                                : '0 0 8px rgba(234, 179, 8, 0.6)'
                        }}
                    />
                </motion.div>

                <motion.h1 
                    className="text-2xl font-bold mb-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                >
                    {displayName}
                </motion.h1>
                
                {username && (
                    <motion.p 
                        className="text-sm text-[var(--text-muted)]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        @{username}
                    </motion.p>
                )}

                {/* Connection status badge */}
                <motion.div 
                    className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <span
                        className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{
                            boxShadow: isOnline 
                                ? '0 0 6px rgba(34, 197, 94, 0.6)' 
                                : undefined
                        }}
                    />
                    <span className="text-xs text-[var(--text-muted)]">
                        {isOnline ? 'Синхронизировано' : 'Офлайн режим'}
                    </span>
                </motion.div>
            </motion.header>

            {/* Stats grid */}
            <motion.section
                className="mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <h2 className="text-sm text-[var(--text-muted)] mb-4 uppercase tracking-wide flex items-center gap-2">
                    <IconTrending size={14} /> Статистика
                </h2>

                <div className="grid grid-cols-2 gap-3">
                    <StatCard
                        Icon={IconXP}
                        label="Всего XP"
                        value={stats.total_xp.toLocaleString()}
                        color="var(--accent-xp)"
                        index={0}
                    />
                    <StatCard
                        Icon={IconExtraction}
                        label="Эвакуаций"
                        value={stats.total_extractions.toString()}
                        color="var(--accent-primary)"
                        index={1}
                    />
                    <StatCard
                        Icon={IconCheckCircle}
                        label="Задач"
                        value={stats.total_tasks_completed.toString()}
                        color="var(--accent-secondary)"
                        index={2}
                    />
                    <StatCard
                        Icon={IconClock}
                        label="В фокусе"
                        value={formatDuration(stats.total_focus_minutes)}
                        color="var(--text-primary)"
                        index={3}
                    />
                    <StatCard
                        Icon={IconFire}
                        label="Текущая серия"
                        value={`${stats.current_streak} дн`}
                        color="var(--accent-warning)"
                        index={4}
                    />
                    <StatCard
                        Icon={IconTrophy}
                        label="Лучшая серия"
                        value={`${stats.best_streak} дн`}
                        color="var(--accent-xp)"
                        index={5}
                    />
                </div>
            </motion.section>

            {/* Settings */}
            <motion.section
                className="mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <h2 className="text-sm text-[var(--text-muted)] mb-4 uppercase tracking-wide flex items-center gap-2">
                    <IconInfo size={14} /> Настройки
                </h2>

                <div className="card space-y-1">
                    <SettingToggle
                        Icon={IconSound}
                        label="Звуки"
                        description="Аудио при выполнении задач"
                        value={localSettings.sounds}
                        onChange={() => handleToggle('sounds')}
                    />

                    <div className="h-px bg-[var(--border-default)] my-3" />

                    <SettingToggle
                        Icon={IconVibrate}
                        label="Вибрация"
                        description="Haptic feedback"
                        value={localSettings.haptics}
                        onChange={() => handleToggle('haptics')}
                    />

                    <div className="h-px bg-[var(--border-default)] my-3" />

                    <SettingToggle
                        Icon={IconBell}
                        label="Уведомления"
                        description="Push-напоминания от бота"
                        value={localSettings.notifications}
                        onChange={() => handleToggle('notifications')}
                    />
                </div>
            </motion.section>

            {/* App info */}
            <motion.section
                className="mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h2 className="text-sm text-[var(--text-muted)] mb-4 uppercase tracking-wide flex items-center gap-2">
                    <IconInfo size={14} /> О приложении
                </h2>

                <div className="card bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-secondary)]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] flex items-center justify-center">
                            <IconRun size={24} color="var(--accent-primary)" />
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-[var(--text-primary)]">Rogue-Day</div>
                            <div className="text-xs text-[var(--text-muted)]">
                                {isTMA ? 'Telegram Mini App' : 'Режим разработки'}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-mono text-[var(--accent-primary)]">v0.1.0</div>
                            <div className="text-xs text-[var(--text-muted)]">beta</div>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* Danger zone */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
            >
                <h2 className="text-sm text-[var(--text-muted)] mb-4 uppercase tracking-wide flex items-center gap-2">
                    <IconWarning size={14} /> Опасная зона
                </h2>

                <motion.button
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-3 px-4 text-[var(--accent-danger)] bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/30 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[var(--accent-danger)]/20 hover:border-[var(--accent-danger)]/50 transition-colors"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <IconTrash size={18} />
                    Сбросить локальные данные
                </motion.button>
            </motion.section>

            {/* Reset confirmation modal */}
            <AnimatePresence>
                {showResetConfirm && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowResetConfirm(false)}
                        />
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-default)] max-w-sm w-full"
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 rounded-full bg-[var(--accent-danger)]/20 flex items-center justify-center mx-auto mb-4">
                                        <IconWarning size={32} color="var(--accent-danger)" />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">Сбросить данные?</h3>
                                    <p className="text-sm text-[var(--text-muted)]">
                                        Это удалит все локальные настройки и кэш. Серверные данные останутся.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <motion.button
                                        onClick={() => setShowResetConfirm(false)}
                                        className="py-3 px-4 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl font-medium"
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Отмена
                                    </motion.button>
                                    <motion.button
                                        onClick={handleReset}
                                        className="py-3 px-4 bg-[var(--accent-danger)] text-white rounded-xl font-medium"
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Сбросить
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

// Stat card component with animations
const StatCard = memo(function StatCard({
    Icon,
    label,
    value,
    color,
    index,
}: {
    Icon: FC<{ size?: number; color?: string }>;
    label: string;
    value: string;
    color: string;
    index: number;
}) {
    return (
        <motion.div 
            className="card flex flex-col items-center py-4 cursor-default"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.03 }}
            whileHover={{ scale: 1.02, borderColor: color }}
        >
            <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                style={{ backgroundColor: `${color}15` }}
            >
                <Icon size={22} color={color} />
            </div>
            <span className="text-xl font-bold font-mono" style={{ color }}>
                {value}
            </span>
            <span className="text-xs text-[var(--text-muted)]">{label}</span>
        </motion.div>
    );
});

// Setting toggle component with animated switch
const SettingToggle = memo(function SettingToggle({
    Icon,
    label,
    description,
    value,
    onChange,
}: {
    Icon: FC<{ size?: number; className?: string }>;
    label: string;
    description: string;
    value: boolean;
    onChange: () => void;
}) {
    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                    <Icon size={18} className="text-[var(--text-secondary)]" />
                </div>
                <div>
                    <div className="font-medium text-[var(--text-primary)]">{label}</div>
                    <div className="text-xs text-[var(--text-muted)]">{description}</div>
                </div>
            </div>

            <motion.button
                onClick={onChange}
                className={`w-12 h-7 rounded-full relative transition-colors ${
                    value ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-secondary)]'
                }`}
                whileTap={{ scale: 0.95 }}
                style={{
                    boxShadow: value ? '0 0 12px rgba(0, 255, 136, 0.3)' : undefined
                }}
            >
                <motion.div
                    className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
                    animate={{ x: value ? 24 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            </motion.button>
        </div>
    );
});
