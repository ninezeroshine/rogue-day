import { useState, useEffect, useCallback, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptic, useBackButton } from '../hooks/useTelegram';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { TaskTemplateResponse, PresetResponse } from '../lib/api';
import { getTierColor, TIER_CONFIG } from '../lib/constants';
import { 
    IconTemplates, IconPreset, IconTemplate, IconStar, IconTrash, IconPlus,
    IconTier1, IconTier2, IconTier3, IconTimer, IconChevronDown, IconWarning, IconCheck,
    IconRun, IconRocket, IconTrophy, IconFire, IconEnergy, IconCalendar, IconBook,
    type IconProps
} from '../lib/icons';
import type { TierLevel } from '../store/types';

// Available preset icons
const PRESET_ICONS: { id: string; Icon: FC<IconProps>; label: string }[] = [
    { id: 'target', Icon: IconRun, label: 'Цель' },
    { id: 'rocket', Icon: IconRocket, label: 'Ракета' },
    { id: 'trophy', Icon: IconTrophy, label: 'Трофей' },
    { id: 'fire', Icon: IconFire, label: 'Огонь' },
    { id: 'energy', Icon: IconEnergy, label: 'Молния' },
    { id: 'star', Icon: IconStar, label: 'Звезда' },
    { id: 'calendar', Icon: IconCalendar, label: 'Календарь' },
    { id: 'book', Icon: IconBook, label: 'Книга' },
    { id: 'preset', Icon: IconPreset, label: 'Пакет' },
    { id: 'template', Icon: IconTemplate, label: 'Документ' },
];

function getPresetIcon(iconId: string | null): FC<IconProps> {
    const found = PRESET_ICONS.find(i => i.id === iconId);
    return found?.Icon ?? IconPreset;
}

type Tab = 'templates' | 'presets';

// Get tier icon component
function getTierIcon(tier: TierLevel): FC<{ size?: number; color?: string }> {
    switch (tier) {
        case 1: return IconTier1;
        case 2: return IconTier2;
        case 3: return IconTier3;
    }
}

export function TemplatesPage() {
    const navigate = useNavigate();
    const { impact, notification } = useHaptic();

    // Back button navigation
    useBackButton(() => navigate('/'), true);

    const [activeTab, setActiveTab] = useState<Tab>('presets');
    const [templates, setTemplates] = useState<TaskTemplateResponse[]>([]);
    const [presets, setPresets] = useState<PresetResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal states
    const [showCreateTemplate, setShowCreateTemplate] = useState(false);
    const [showCreatePreset, setShowCreatePreset] = useState(false);
    const [editingPreset, setEditingPreset] = useState<PresetResponse | null>(null);

    // Load data
    useEffect(() => {
        Promise.all([
            api.template.list().catch(() => []),
            api.preset.list().catch(() => [])
        ])
            .then(([t, p]) => {
                setTemplates(t);
                setPresets(p);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const handleDeleteTemplate = useCallback(async (id: number) => {
        try {
            await api.template.delete(id);
            setTemplates(prev => prev.filter(t => t.id !== id));
            notification('success');
        } catch {
            notification('error');
        }
    }, [notification]);

    const handleDeletePreset = useCallback(async (id: number) => {
        try {
            await api.preset.delete(id);
            setPresets(prev => prev.filter(p => p.id !== id));
            notification('success');
        } catch {
            notification('error');
        }
    }, [notification]);

    const handleToggleFavorite = useCallback(async (preset: PresetResponse) => {
        try {
            const updated = await api.preset.update(preset.id, {
                is_favorite: !preset.is_favorite
            });
            setPresets(prev => prev.map(p =>
                p.id === preset.id ? updated : p
            ));
            impact('light');
        } catch {
            notification('error');
        }
    }, [impact, notification]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <motion.div 
                        className="mb-4 flex justify-center"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        <IconTemplates size={48} color="var(--accent-primary)" />
                    </motion.div>
                    <div className="text-[var(--text-muted)]">Загрузка...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 pb-24">
            {/* Header */}
            <motion.header 
                className="mb-6"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/15 flex items-center justify-center">
                        <IconTemplates size={22} color="var(--accent-primary)" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Шаблоны</h1>
                        <p className="text-sm text-[var(--text-muted)]">
                            Сохраняй задачи и создавай пресеты
                        </p>
                    </div>
                </div>
            </motion.header>

            {/* Tab switcher */}
            <div className="flex gap-2 mb-6 p-1 bg-[var(--bg-secondary)] rounded-xl">
                <button
                    onClick={() => setActiveTab('presets')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'presets'
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)]'
                        }`}
                >
                    <IconPreset size={16} />
                    <span>Пресеты ({presets.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'templates'
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)]'
                        }`}
                >
                    <IconTemplate size={16} />
                    <span>Шаблоны ({templates.length})</span>
                </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'presets' ? (
                    <motion.div
                        key="presets"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                    >
                        {presets.length === 0 ? (
                            <EmptyState
                                Icon={IconPreset}
                                title="Нет пресетов"
                                description="Создай набор шаблонов для быстрого старта дня"
                                actionLabel="Создать пресет"
                                onAction={() => setShowCreatePreset(true)}
                            />
                        ) : (
                            <>
                                {presets.map((preset) => (
                                    <PresetCard
                                        key={preset.id}
                                        preset={preset}
                                        onEdit={() => setEditingPreset(preset)}
                                        onDelete={() => handleDeletePreset(preset.id)}
                                        onToggleFavorite={() => handleToggleFavorite(preset)}
                                    />
                                ))}

                                <motion.button
                                    onClick={() => setShowCreatePreset(true)}
                                    className="w-full py-4 rounded-xl border-2 border-dashed border-[var(--border-default)] text-[var(--text-muted)] font-medium hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors flex items-center justify-center gap-2"
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                >
                                    <IconPlus size={18} />
                                    <span>Новый пресет</span>
                                </motion.button>
                            </>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="templates"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-3"
                    >
                        {templates.length === 0 ? (
                            <EmptyState
                                Icon={IconTemplate}
                                title="Нет шаблонов"
                                description="Завершай задачи и сохраняй их как шаблоны"
                                actionLabel="Создать шаблон"
                                onAction={() => setShowCreateTemplate(true)}
                            />
                        ) : (
                            <>
                                {templates.map((template) => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onDelete={() => handleDeleteTemplate(template.id)}
                                    />
                                ))}

                                <motion.button
                                    onClick={() => setShowCreateTemplate(true)}
                                    className="w-full py-3 rounded-xl border-2 border-dashed border-[var(--border-default)] text-[var(--text-muted)] font-medium hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors flex items-center justify-center gap-2"
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                >
                                    <IconPlus size={18} />
                                    <span>Новый шаблон</span>
                                </motion.button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            {showCreateTemplate && (
                <CreateTemplateModal
                    onClose={() => setShowCreateTemplate(false)}
                    onCreated={(t) => {
                        setTemplates(prev => [t, ...prev]);
                        setShowCreateTemplate(false);
                    }}
                />
            )}

            {showCreatePreset && (
                <CreatePresetModal
                    templates={templates}
                    onClose={() => setShowCreatePreset(false)}
                    onCreated={(p) => {
                        setPresets(prev => [p, ...prev]);
                        setShowCreatePreset(false);
                    }}
                />
            )}

            {editingPreset && (
                <EditPresetModal
                    preset={editingPreset}
                    templates={templates}
                    onClose={() => setEditingPreset(null)}
                    onUpdated={(p) => {
                        setPresets(prev => prev.map(preset =>
                            preset.id === p.id ? p : preset
                        ));
                        setEditingPreset(null);
                    }}
                />
            )}
        </div>
    );
}

// ===== SUB-COMPONENTS =====

function EmptyState({
    Icon,
    title,
    description,
    actionLabel,
    onAction
}: {
    Icon: FC<{ size?: number; className?: string }>;
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
        >
            <div className="w-20 h-20 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-4">
                <Icon size={32} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-medium mb-2">{title}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xs mx-auto">
                {description}
            </p>
            <motion.button
                onClick={onAction}
                className="px-6 py-3 rounded-xl bg-[var(--accent-primary)] text-white font-medium flex items-center gap-2 mx-auto"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <IconPlus size={18} />
                <span>{actionLabel}</span>
            </motion.button>
        </motion.div>
    );
}

function TemplateCard({
    template,
    onDelete
}: {
    template: TaskTemplateResponse;
    onDelete: () => void;
}) {
    const tier = template.tier as TierLevel;
    const tierColor = getTierColor(tier);
    const TierIcon = getTierIcon(tier);
    const tierConfig = TIER_CONFIG[tier];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]"
            style={{ borderLeftWidth: 4, borderLeftColor: tierColor }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${tierColor}15` }}
                    >
                        <TierIcon size={20} color={tierColor} />
                    </div>
                    <div className="min-w-0">
                        <div className="font-medium truncate">{template.title}</div>
                        <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                            <span
                                className="px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
                            >
                                {tierConfig.name}
                            </span>
                            <span>{template.duration} мин</span>
                            {template.use_timer && <IconTimer size={12} />}
                            {template.source === 'from_task' && (
                                <span className="text-[var(--accent-secondary)]">Из истории</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">
                        ×{template.times_used}
                    </span>
                    <motion.button
                        onClick={onDelete}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--bg-secondary)] transition-colors"
                        whileTap={{ scale: 0.9 }}
                    >
                        <IconTrash size={16} />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}

function PresetCard({
    preset,
    onEdit,
    onDelete,
    onToggleFavorite,
}: {
    preset: PresetResponse;
    onEdit: () => void;
    onDelete: () => void;
    onToggleFavorite: () => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden"
        >
            {/* Header */}
            <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/15 flex items-center justify-center">
                        {(() => {
                            const PresetIcon = getPresetIcon(preset.emoji);
                            return <PresetIcon size={20} color="var(--accent-primary)" />;
                        })()}
                    </div>
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            {preset.name}
                            {preset.is_favorite && (
                                <IconStar size={14} color="var(--accent-xp)" />
                            )}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                            {preset.templates.length} шаблонов
                        </div>
                    </div>
                </div>

                <motion.div
                    animate={{ rotate: expanded ? 180 : 0 }}
                    className="text-[var(--text-muted)]"
                >
                    <IconChevronDown size={20} />
                </motion.div>
            </div>

            {/* Expanded content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 border-t border-[var(--border-default)]">
                            {/* Templates list */}
                            <div className="mt-3 space-y-2">
                                {preset.templates.map((template, idx) => {
                                    const TierIcon = getTierIcon(template.tier as TierLevel);
                                    const tierColor = getTierColor(template.tier as TierLevel);
                                    return (
                                        <div
                                            key={template.id}
                                            className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                                        >
                                            <span className="text-[var(--text-muted)] w-4">{idx + 1}.</span>
                                            <TierIcon size={14} color={tierColor} />
                                            <span className="truncate flex-1">{template.title}</span>
                                            <span className="text-[var(--text-muted)]">
                                                {template.duration}м
                                            </span>
                                        </div>
                                    );
                                })}

                                {preset.templates.length === 0 && (
                                    <div className="text-sm text-[var(--text-muted)] py-2">
                                        Пусто — добавьте шаблоны
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-4">
                                <motion.button
                                    onClick={onToggleFavorite}
                                    className="flex-1 py-2 rounded-lg bg-[var(--bg-secondary)] text-sm font-medium flex items-center justify-center gap-1.5"
                                    whileTap={{ scale: 0.97 }}
                                >
                                    <IconStar size={14} color={preset.is_favorite ? 'var(--accent-xp)' : undefined} />
                                    <span>{preset.is_favorite ? 'Убрать' : 'Избранное'}</span>
                                </motion.button>
                                <motion.button
                                    onClick={onEdit}
                                    className="flex-1 py-2 rounded-lg bg-[var(--bg-secondary)] text-sm font-medium"
                                    whileTap={{ scale: 0.97 }}
                                >
                                    Изменить
                                </motion.button>
                                <motion.button
                                    onClick={onDelete}
                                    className="py-2 px-4 rounded-lg bg-[var(--bg-secondary)] text-sm font-medium text-[var(--accent-danger)]"
                                    whileTap={{ scale: 0.97 }}
                                >
                                    <IconTrash size={16} />
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ===== MODALS =====

function CreateTemplateModal({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: (template: TaskTemplateResponse) => void;
}) {
    const { notification } = useHaptic();
    const [title, setTitle] = useState('');
    const [tier, setTier] = useState<TierLevel>(1);
    const [duration, setDuration] = useState(5);
    const [useTimer, setUseTimer] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const tierConfig = TIER_CONFIG[tier];

    const handleSubmit = async () => {
        setError(null);
        if (!title.trim() || isSubmitting) return;
        setIsSubmitting(true);

        try {
            const template = await api.template.create({
                title: title.trim(),
                tier,
                duration,
                use_timer: useTimer,
            });
            notification('success');
            onCreated(template);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ошибка создания';
            setError(errorMessage);
            notification('error');
            setIsSubmitting(false);
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <IconPlus size={20} color="var(--accent-primary)" />
                    Новый шаблон
                </h2>

                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 text-sm flex items-center gap-2">
                        <IconWarning size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Title */}
                <div className="mb-4">
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                        Название задачи
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Например: Утренняя зарядка"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                        autoFocus
                    />
                </div>

                {/* Tier selector */}
                <div className="mb-4">
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                        Тир
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {([1, 2, 3] as TierLevel[]).map((t) => {
                            const TierIcon = getTierIcon(t);
                            const tierColor = getTierColor(t);
                            return (
                                <button
                                    key={t}
                                    onClick={() => setTier(t)}
                                    className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center ${tier === t
                                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                                        : 'border-[var(--border-default)]'
                                        }`}
                                >
                                    <TierIcon size={20} color={tierColor} />
                                    <div className="text-xs mt-1">{TIER_CONFIG[t].name}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Duration */}
                <div className="mb-4">
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                        Длительность: <span className="font-bold text-[var(--text-primary)]">{duration} мин</span>
                    </label>
                    <input
                        type="range"
                        min={tierConfig.duration.min}
                        max={tierConfig.duration.max}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full accent-[var(--accent-primary)]"
                    />
                </div>

                {/* Timer toggle (T2 only) */}
                {tier === 2 && (
                    <div className="mb-4 flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)]">
                        <span className="text-sm flex items-center gap-2">
                            <IconTimer size={16} />
                            Использовать таймер
                        </span>
                        <motion.button
                            onClick={() => setUseTimer(!useTimer)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${useTimer ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-default)]'}`}
                            whileTap={{ scale: 0.95 }}
                        >
                            <motion.div
                                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
                                animate={{ x: useTimer ? 24 : 2 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        </motion.button>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <motion.button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-[var(--bg-secondary)] font-medium"
                        whileTap={{ scale: 0.95 }}
                    >
                        Отмена
                    </motion.button>
                    <motion.button
                        onClick={handleSubmit}
                        disabled={!title.trim() || isSubmitting}
                        className="flex-1 py-3 rounded-xl bg-[var(--accent-primary)] text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                        whileTap={{ scale: 0.97 }}
                    >
                        <IconPlus size={18} />
                        <span>{isSubmitting ? '...' : 'Создать'}</span>
                    </motion.button>
                </div>
            </div>
        </ModalOverlay>
    );
}

function CreatePresetModal({
    templates,
    onClose,
    onCreated,
}: {
    templates: TaskTemplateResponse[];
    onClose: () => void;
    onCreated: (preset: PresetResponse) => void;
}) {
    const { notification } = useHaptic();
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('target');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleTemplate = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        setError(null);
        if (!name.trim() || isSubmitting) return;
        setIsSubmitting(true);

        try {
            const preset = await api.preset.create({
                name: name.trim(),
                emoji: selectedIcon, // Using icon ID instead of emoji
                template_ids: selectedIds,
            });
            notification('success');
            onCreated(preset);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ошибка создания';
            setError(errorMessage);
            notification('error');
            setIsSubmitting(false);
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <IconPlus size={20} color="var(--accent-primary)" />
                    Новый пресет
                </h2>

                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 text-sm flex items-center gap-2">
                        <IconWarning size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Name */}
                <div className="mb-4">
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                        Название пресета
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Например: Утренняя рутина"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                        autoFocus
                    />
                </div>

                {/* Icon selector */}
                <div className="mb-4">
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                        Иконка
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                        {PRESET_ICONS.map(({ id, Icon }) => (
                            <button
                                key={id}
                                onClick={() => setSelectedIcon(id)}
                                className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center ${
                                    selectedIcon === id
                                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15'
                                        : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
                                }`}
                            >
                                <Icon 
                                    size={20} 
                                    color={selectedIcon === id ? 'var(--accent-primary)' : 'var(--text-muted)'} 
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Template selection */}
                <div className="mb-4">
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                        Выбери шаблоны ({selectedIds.length})
                    </label>

                    {templates.length === 0 ? (
                        <div className="text-sm text-[var(--text-muted)] py-4 text-center">
                            Сначала создай шаблоны задач
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {templates.map((template) => {
                                const TierIcon = getTierIcon(template.tier as TierLevel);
                                const tierColor = getTierColor(template.tier as TierLevel);
                                const isSelected = selectedIds.includes(template.id);
                                return (
                                    <button
                                        key={template.id}
                                        onClick={() => toggleTemplate(template.id)}
                                        className={`w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all ${isSelected
                                            ? 'bg-[var(--accent-primary)]/15 border-2 border-[var(--accent-primary)]'
                                            : 'bg-[var(--bg-secondary)] border-2 border-transparent'
                                            }`}
                                    >
                                        <TierIcon size={16} color={tierColor} />
                                        <span className="flex-1 truncate">{template.title}</span>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            {template.duration}м
                                        </span>
                                        {isSelected && (
                                            <IconCheck size={16} color="var(--accent-primary)" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <motion.button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-[var(--bg-secondary)] font-medium"
                        whileTap={{ scale: 0.95 }}
                    >
                        Отмена
                    </motion.button>
                    <motion.button
                        onClick={handleSubmit}
                        disabled={!name.trim() || isSubmitting}
                        className="flex-1 py-3 rounded-xl bg-[var(--accent-primary)] text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                        whileTap={{ scale: 0.97 }}
                    >
                        <IconPlus size={18} />
                        <span>{isSubmitting ? '...' : 'Создать'}</span>
                    </motion.button>
                </div>
            </div>
        </ModalOverlay>
    );
}

function EditPresetModal({
    preset,
    templates,
    onClose,
    onUpdated,
}: {
    preset: PresetResponse;
    templates: TaskTemplateResponse[];
    onClose: () => void;
    onUpdated: (preset: PresetResponse) => void;
}) {
    const { notification } = useHaptic();
    const [name, setName] = useState(preset.name);
    const [selectedIcon, setSelectedIcon] = useState(preset.emoji || 'preset');
    const [selectedIds, setSelectedIds] = useState<number[]>(
        preset.templates.map(t => t.id)
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleTemplate = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (!name.trim() || isSubmitting) return;
        setIsSubmitting(true);

        try {
            const updated = await api.preset.update(preset.id, {
                name: name.trim(),
                emoji: selectedIcon,
                template_ids: selectedIds,
            });
            notification('success');
            onUpdated(updated);
        } catch {
            notification('error');
            setIsSubmitting(false);
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Редактировать пресет</h2>

                {/* Name */}
                <div className="mb-4">
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                        Название
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                </div>

                {/* Icon selector */}
                <div className="mb-4">
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                        Иконка
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                        {PRESET_ICONS.map(({ id, Icon }) => (
                            <button
                                key={id}
                                onClick={() => setSelectedIcon(id)}
                                className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center ${
                                    selectedIcon === id
                                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15'
                                        : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
                                }`}
                            >
                                <Icon 
                                    size={20} 
                                    color={selectedIcon === id ? 'var(--accent-primary)' : 'var(--text-muted)'} 
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Template selection */}
                <div className="mb-4">
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                        Шаблоны в пресете ({selectedIds.length})
                    </label>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {templates.map((template) => {
                            const TierIcon = getTierIcon(template.tier as TierLevel);
                            const tierColor = getTierColor(template.tier as TierLevel);
                            const isSelected = selectedIds.includes(template.id);
                            return (
                                <button
                                    key={template.id}
                                    onClick={() => toggleTemplate(template.id)}
                                    className={`w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all ${isSelected
                                        ? 'bg-[var(--accent-primary)]/15 border-2 border-[var(--accent-primary)]'
                                        : 'bg-[var(--bg-secondary)] border-2 border-transparent'
                                        }`}
                                >
                                    <TierIcon size={16} color={tierColor} />
                                    <span className="flex-1 truncate">{template.title}</span>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        {template.duration}м
                                    </span>
                                    {isSelected && (
                                        <IconCheck size={16} color="var(--accent-primary)" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <motion.button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-[var(--bg-secondary)] font-medium"
                        whileTap={{ scale: 0.95 }}
                    >
                        Отмена
                    </motion.button>
                    <motion.button
                        onClick={handleSubmit}
                        disabled={!name.trim() || isSubmitting}
                        className="flex-1 py-3 rounded-xl bg-[var(--accent-primary)] text-white font-medium disabled:opacity-50"
                        whileTap={{ scale: 0.97 }}
                    >
                        {isSubmitting ? '...' : 'Сохранить'}
                    </motion.button>
                </div>
            </div>
        </ModalOverlay>
    );
}

function ModalOverlay({
    children,
    onClose
}: {
    children: React.ReactNode;
    onClose: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-lg bg-[var(--bg-card)] rounded-t-3xl border-t border-[var(--border-default)]"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </motion.div>
        </motion.div>
    );
}
