import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptic, useBackButton } from '../hooks/useTelegram';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { TaskTemplateResponse, PresetResponse } from '../lib/api';
import { getTierEmoji, getTierColor, TIER_CONFIG } from '../lib/constants';
import type { TierLevel } from '../store/types';

type Tab = 'templates' | 'presets';

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
            api.template.list(),
            api.preset.list()
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
                    <div className="text-4xl mb-4 animate-pulse">📋</div>
                    <div className="text-[var(--text-muted)]">Загрузка...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 pb-24">
            {/* Header */}
            <header className="mb-6">
                <h1 className="text-2xl font-bold mb-1">Шаблоны</h1>
                <p className="text-sm text-[var(--text-muted)]">
                    Сохраняй задачи и создавай пресеты для быстрого старта
                </p>
            </header>

            {/* Tab switcher */}
            <div className="flex gap-2 mb-6 p-1 bg-[var(--bg-secondary)] rounded-xl">
                <button
                    onClick={() => setActiveTab('presets')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'presets'
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)]'
                        }`}
                >
                    🎯 Пресеты ({presets.length})
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'templates'
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)]'
                        }`}
                >
                    📝 Шаблоны ({templates.length})
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
                                emoji="🎯"
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
                                    className="w-full py-4 rounded-xl border-2 border-dashed border-[var(--border-default)] text-[var(--text-muted)] font-medium hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                >
                                    + Новый пресет
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
                                emoji="📝"
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
                                    className="w-full py-3 rounded-xl border-2 border-dashed border-[var(--border-default)] text-[var(--text-muted)] font-medium hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                >
                                    + Новый шаблон
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
    emoji,
    title,
    description,
    actionLabel,
    onAction
}: {
    emoji: string;
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
            <div className="text-5xl mb-4">{emoji}</div>
            <h3 className="text-lg font-medium mb-2">{title}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xs mx-auto">
                {description}
            </p>
            <motion.button
                onClick={onAction}
                className="px-6 py-3 rounded-xl bg-[var(--accent-primary)] text-white font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {actionLabel}
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
    const tierEmoji = getTierEmoji(tier);
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
                    <span className="text-xl flex-shrink-0">{tierEmoji}</span>
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
                            {template.use_timer && <span>⏱️</span>}
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
                        🗑️
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
                    <span className="text-2xl">{preset.emoji || '📋'}</span>
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            {preset.name}
                            {preset.is_favorite && (
                                <span className="text-yellow-500">⭐</span>
                            )}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                            {preset.templates.length} шаблонов
                        </div>
                    </div>
                </div>

                <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    className="text-[var(--text-muted)]"
                >
                    ▼
                </motion.span>
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
                                {preset.templates.map((template, idx) => (
                                    <div
                                        key={template.id}
                                        className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                                    >
                                        <span className="text-[var(--text-muted)]">{idx + 1}.</span>
                                        <span>{getTierEmoji(template.tier as TierLevel)}</span>
                                        <span className="truncate">{template.title}</span>
                                        <span className="text-[var(--text-muted)]">
                                            {template.duration}м
                                        </span>
                                    </div>
                                ))}

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
                                    className="flex-1 py-2 rounded-lg bg-[var(--bg-secondary)] text-sm font-medium"
                                    whileTap={{ scale: 0.97 }}
                                >
                                    {preset.is_favorite ? '⭐ Убрать' : '☆ Избранное'}
                                </motion.button>
                                <motion.button
                                    onClick={onEdit}
                                    className="flex-1 py-2 rounded-lg bg-[var(--bg-secondary)] text-sm font-medium"
                                    whileTap={{ scale: 0.97 }}
                                >
                                    ✏️ Изменить
                                </motion.button>
                                <motion.button
                                    onClick={onDelete}
                                    className="py-2 px-4 rounded-lg bg-[var(--bg-secondary)] text-sm font-medium text-[var(--accent-danger)]"
                                    whileTap={{ scale: 0.97 }}
                                >
                                    🗑️
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

    const tierConfig = TIER_CONFIG[tier];

    const handleSubmit = async () => {
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
        } catch {
            notification('error');
            setIsSubmitting(false);
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Новый шаблон</h2>

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
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                        autoFocus
                    />
                </div>

                {/* Tier selector */}
                <div className="mb-4">
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                        Тир
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {([1, 2, 3] as TierLevel[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTier(t)}
                                className={`py-3 rounded-xl border-2 transition-all ${tier === t
                                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]10'
                                    : 'border-[var(--border-default)]'
                                    }`}
                            >
                                <div className="text-lg">{getTierEmoji(t)}</div>
                                <div className="text-xs">{TIER_CONFIG[t].name}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Duration */}
                <div className="mb-4">
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                        Длительность: {duration} мин
                    </label>
                    <input
                        type="range"
                        min={tierConfig.duration.min}
                        max={tierConfig.duration.max}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full"
                    />
                </div>

                {/* Timer toggle (T2 only) */}
                {tier === 2 && (
                    <div className="mb-4 flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)]">
                        <span className="text-sm">⏱️ Использовать таймер</span>
                        <button
                            onClick={() => setUseTimer(!useTimer)}
                            className={`w-12 h-6 rounded-full transition-colors ${useTimer ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-default)]'
                                }`}
                        >
                            <motion.div
                                className="w-5 h-5 rounded-full bg-white shadow"
                                animate={{ x: useTimer ? 24 : 2 }}
                            />
                        </button>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-[var(--bg-secondary)] font-medium"
                    >
                        Отмена
                    </button>
                    <motion.button
                        onClick={handleSubmit}
                        disabled={!title.trim() || isSubmitting}
                        className="flex-1 py-3 rounded-xl bg-[var(--accent-primary)] text-white font-medium disabled:opacity-50"
                        whileTap={{ scale: 0.97 }}
                    >
                        {isSubmitting ? '...' : 'Создать'}
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
    const [emoji, setEmoji] = useState('🎯');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
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
            const preset = await api.preset.create({
                name: name.trim(),
                emoji,
                template_ids: selectedIds,
            });
            notification('success');
            onCreated(preset);
        } catch {
            notification('error');
            setIsSubmitting(false);
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Новый пресет</h2>

                {/* Name + Emoji */}
                <div className="flex gap-3 mb-4">
                    <input
                        type="text"
                        value={emoji}
                        onChange={(e) => setEmoji(e.target.value.slice(-2))}
                        className="w-14 text-center text-2xl py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)]"
                    />
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Название пресета"
                        className="flex-1 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)]"
                        autoFocus
                    />
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
                            {templates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => toggleTemplate(template.id)}
                                    className={`w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all ${selectedIds.includes(template.id)
                                        ? 'bg-[var(--accent-primary)]15 border-2 border-[var(--accent-primary)]'
                                        : 'bg-[var(--bg-secondary)] border-2 border-transparent'
                                        }`}
                                >
                                    <span>{getTierEmoji(template.tier as TierLevel)}</span>
                                    <span className="flex-1 truncate">{template.title}</span>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        {template.duration}м
                                    </span>
                                    {selectedIds.includes(template.id) && (
                                        <span className="text-[var(--accent-primary)]">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-[var(--bg-secondary)] font-medium"
                    >
                        Отмена
                    </button>
                    <motion.button
                        onClick={handleSubmit}
                        disabled={!name.trim() || isSubmitting}
                        className="flex-1 py-3 rounded-xl bg-[var(--accent-primary)] text-white font-medium disabled:opacity-50"
                        whileTap={{ scale: 0.97 }}
                    >
                        {isSubmitting ? '...' : 'Создать'}
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
    const [emoji, setEmoji] = useState(preset.emoji || '📋');
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
                emoji,
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

                {/* Name + Emoji */}
                <div className="flex gap-3 mb-4">
                    <input
                        type="text"
                        value={emoji}
                        onChange={(e) => setEmoji(e.target.value.slice(-2))}
                        className="w-14 text-center text-2xl py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)]"
                    />
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)]"
                    />
                </div>

                {/* Template selection */}
                <div className="mb-4">
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                        Шаблоны в пресете ({selectedIds.length})
                    </label>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => toggleTemplate(template.id)}
                                className={`w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all ${selectedIds.includes(template.id)
                                    ? 'bg-[var(--accent-primary)]15 border-2 border-[var(--accent-primary)]'
                                    : 'bg-[var(--bg-secondary)] border-2 border-transparent'
                                    }`}
                            >
                                <span>{getTierEmoji(template.tier as TierLevel)}</span>
                                <span className="flex-1 truncate">{template.title}</span>
                                <span className="text-xs text-[var(--text-muted)]">
                                    {template.duration}м
                                </span>
                                {selectedIds.includes(template.id) && (
                                    <span className="text-[var(--accent-primary)]">✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-[var(--bg-secondary)] font-medium"
                    >
                        Отмена
                    </button>
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
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </motion.div>
        </motion.div>
    );
}
