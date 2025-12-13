import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptic } from '../../hooks/useTelegram';
import { useServerRunStore } from '../../store/useServerRunStore';
import api from '../../lib/api';
import type { PresetResponse, TaskTemplateResponse, PresetApplyResponse } from '../../lib/api';

interface PresetPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplied: (result: PresetApplyResponse) => void;
    currentEnergy: number;
}

type TabType = 'presets' | 'templates';

export function PresetPickerModal({ isOpen, onClose, onApplied, currentEnergy }: PresetPickerModalProps) {
    const { impact, notification } = useHaptic();
    
    const [activeTab, setActiveTab] = useState<TabType>('presets');
    const [presets, setPresets] = useState<PresetResponse[]>([]);
    const [templates, setTemplates] = useState<TaskTemplateResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [applyingId, setApplyingId] = useState<number | null>(null);

    // Load data when modal opens
    useEffect(() => {
        if (!isOpen) return;
        
        setIsLoading(true);
        Promise.all([
            api.preset.list(),
            api.template.list(),
        ])
            .then(([presetsData, templatesData]) => {
                setPresets(presetsData);
                setTemplates(templatesData);
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [isOpen]);

    const handleApplyPreset = useCallback(async (preset: PresetResponse) => {
        if (applyingId) return;
        setApplyingId(preset.id);
        impact('medium');

        try {
            const result = await api.preset.apply(preset.id);

            // Staggered haptic feedback
            for (let i = 0; i < result.tasks_created; i++) {
                setTimeout(() => impact('light'), i * 80);
            }

            await useServerRunStore.getState().refreshRun();
            notification('success');
            onApplied(result);
            onClose();
        } catch (err) {
            notification('error');
            console.error('Failed to apply preset:', err);
        } finally {
            setApplyingId(null);
        }
    }, [applyingId, impact, notification, onApplied, onClose]);

    const handleApplyTemplate = useCallback(async (template: TaskTemplateResponse) => {
        if (applyingId) return;
        
        // Check energy
        const tierEnergyCost = template.tier === 1 ? 0 : template.tier === 2 ? 5 : 15;
        if (currentEnergy < tierEnergyCost) {
            notification('error');
            return;
        }

        setApplyingId(template.id);
        impact('medium');

        try {
            await useServerRunStore.getState().addTask({
                title: template.title,
                tier: template.tier as 1 | 2 | 3,
                duration: template.duration,
                use_timer: template.use_timer,
            });

            notification('success');
            onApplied({
                tasks_created: 1,
                tasks_skipped: 0,
                total_energy_cost: tierEnergyCost,
                message: `Добавлена задача "${template.title}"`,
            });
            onClose();
        } catch (err) {
            notification('error');
            console.error('Failed to add task from template:', err);
        } finally {
            setApplyingId(null);
        }
    }, [applyingId, currentEnergy, impact, notification, onApplied, onClose]);

    const handleTabChange = useCallback((tab: TabType) => {
        impact('light');
        setActiveTab(tab);
    }, [impact]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />

            {/* Modal */}
            <motion.div
                className="fixed bottom-0 left-0 right-0 z-50 p-4 max-h-[80vh]"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] overflow-hidden flex flex-col max-h-[calc(80vh-2rem)]">
                    {/* Header */}
                    <div className="p-4 border-b border-[var(--border-default)]">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xl font-bold">Добавить из библиотеки</h2>
                            <motion.button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                ✕
                            </motion.button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2">
                            <TabButton
                                active={activeTab === 'presets'}
                                onClick={() => handleTabChange('presets')}
                                icon="📦"
                                label="Пресеты"
                                count={presets.length}
                            />
                            <TabButton
                                active={activeTab === 'templates'}
                                onClick={() => handleTabChange('templates')}
                                icon="📋"
                                label="Шаблоны"
                                count={templates.length}
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <motion.div
                                    className="w-8 h-8 border-3 border-[var(--accent-primary)] border-t-transparent rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                            </div>
                        ) : activeTab === 'presets' ? (
                            <PresetsTab
                                presets={presets}
                                applyingId={applyingId}
                                onApply={handleApplyPreset}
                            />
                        ) : (
                            <TemplatesTab
                                templates={templates}
                                applyingId={applyingId}
                                currentEnergy={currentEnergy}
                                onApply={handleApplyTemplate}
                            />
                        )}
                    </div>

                    {/* Footer hint */}
                    <div className="p-3 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]">
                        <p className="text-xs text-[var(--text-muted)] text-center">
                            {activeTab === 'presets' 
                                ? '💡 Пресет добавит все свои шаблоны сразу'
                                : '💡 Шаблон добавит одну задачу в текущий ран'
                            }
                        </p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// Tab button component
const TabButton = memo(function TabButton({
    active,
    onClick,
    icon,
    label,
    count,
}: {
    active: boolean;
    onClick: () => void;
    icon: string;
    label: string;
    count: number;
}) {
    return (
        <motion.button
            onClick={onClick}
            className={`flex-1 py-2 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                active
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
            whileTap={{ scale: 0.97 }}
        >
            <span>{icon}</span>
            <span>{label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                active ? 'bg-white/20' : 'bg-[var(--bg-card)]'
            }`}>
                {count}
            </span>
        </motion.button>
    );
});

// Presets tab content
const PresetsTab = memo(function PresetsTab({
    presets,
    applyingId,
    onApply,
}: {
    presets: PresetResponse[];
    applyingId: number | null;
    onApply: (preset: PresetResponse) => void;
}) {
    if (presets.length === 0) {
        return (
            <EmptyState
                icon="📦"
                title="Нет пресетов"
                description="Создай пресеты на странице Шаблоны"
            />
        );
    }

    // Sort favorites first
    const sortedPresets = [...presets].sort((a, b) => {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        return 0;
    });

    return (
        <div className="space-y-2">
            {sortedPresets.map((preset, index) => (
                <PresetCard
                    key={preset.id}
                    preset={preset}
                    index={index}
                    isApplying={applyingId === preset.id}
                    disabled={applyingId !== null}
                    onApply={() => onApply(preset)}
                />
            ))}
        </div>
    );
});

// Preset card
const PresetCard = memo(function PresetCard({
    preset,
    index,
    isApplying,
    disabled,
    onApply,
}: {
    preset: PresetResponse;
    index: number;
    isApplying: boolean;
    disabled: boolean;
    onApply: () => void;
}) {
    // Calculate total energy cost
    const totalEnergy = preset.templates.reduce((sum, t) => {
        const cost = t.tier === 1 ? 0 : t.tier === 2 ? 5 : 15;
        return sum + cost;
    }, 0);

    return (
        <motion.button
            onClick={onApply}
            disabled={disabled}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: disabled && !isApplying ? 0.5 : 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="w-full p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-left hover:border-[var(--accent-primary)] transition-colors"
            whileHover={{ scale: disabled ? 1 : 1.01 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center text-xl flex-shrink-0">
                        {preset.emoji || '📋'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{preset.name}</span>
                            {preset.is_favorite && <span className="text-sm">⭐</span>}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                            {preset.templates.length} задач • ⚡{totalEnergy}
                        </div>
                    </div>
                </div>

                {isApplying ? (
                    <motion.div
                        className="w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                ) : (
                    <div className="text-[var(--accent-primary)] text-sm font-medium">
                        Применить →
                    </div>
                )}
            </div>

            {/* Template previews */}
            {preset.templates.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                    {preset.templates.slice(0, 4).map((t) => (
                        <span
                            key={t.id}
                            className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-card)] text-[var(--text-muted)]"
                        >
                            T{t.tier} {t.title.slice(0, 15)}{t.title.length > 15 ? '…' : ''}
                        </span>
                    ))}
                    {preset.templates.length > 4 && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-card)] text-[var(--text-muted)]">
                            +{preset.templates.length - 4}
                        </span>
                    )}
                </div>
            )}
        </motion.button>
    );
});

// Templates tab content
const TemplatesTab = memo(function TemplatesTab({
    templates,
    applyingId,
    currentEnergy,
    onApply,
}: {
    templates: TaskTemplateResponse[];
    applyingId: number | null;
    currentEnergy: number;
    onApply: (template: TaskTemplateResponse) => void;
}) {
    if (templates.length === 0) {
        return (
            <EmptyState
                icon="📋"
                title="Нет шаблонов"
                description="Шаблоны создаются из завершённых задач"
            />
        );
    }

    // Group by tier
    const byTier = {
        1: templates.filter(t => t.tier === 1),
        2: templates.filter(t => t.tier === 2),
        3: templates.filter(t => t.tier === 3),
    };

    const tierNames = { 1: 'Разминка', 2: 'Рутина', 3: 'Фокус' };
    const tierEmojis = { 1: '🌱', 2: '⚡', 3: '🔥' };

    return (
        <div className="space-y-4">
            {([1, 2, 3] as const).map(tier => {
                const tierTemplates = byTier[tier];
                if (tierTemplates.length === 0) return null;

                const energyCost = tier === 1 ? 0 : tier === 2 ? 5 : 15;
                const hasEnergy = currentEnergy >= energyCost;

                return (
                    <div key={tier}>
                        <div className="flex items-center gap-2 mb-2">
                            <span>{tierEmojis[tier]}</span>
                            <span className="text-sm font-medium text-[var(--text-secondary)]">
                                T{tier} — {tierNames[tier]}
                            </span>
                            {!hasEnergy && energyCost > 0 && (
                                <span className="text-xs text-[var(--accent-danger)]">
                                    (нужно ⚡{energyCost})
                                </span>
                            )}
                        </div>
                        <div className="space-y-1">
                            {tierTemplates.map((template, index) => (
                                <TemplateCard
                                    key={template.id}
                                    template={template}
                                    index={index}
                                    isApplying={applyingId === template.id}
                                    disabled={applyingId !== null || !hasEnergy}
                                    onApply={() => onApply(template)}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

// Template card
const TemplateCard = memo(function TemplateCard({
    template,
    index,
    isApplying,
    disabled,
    onApply,
}: {
    template: TaskTemplateResponse;
    index: number;
    isApplying: boolean;
    disabled: boolean;
    onApply: () => void;
}) {
    return (
        <motion.button
            onClick={onApply}
            disabled={disabled}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: disabled && !isApplying ? 0.4 : 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
            className="w-full p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-left hover:border-[var(--accent-secondary)] transition-colors flex items-center justify-between gap-3"
            whileTap={{ scale: disabled ? 1 : 0.98 }}
        >
            <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{template.title}</div>
                <div className="text-xs text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                    <span>{template.duration} мин</span>
                    <span>•</span>
                    <span>{template.use_timer ? '⏱️ Таймер' : '🎯 Без таймера'}</span>
                    {template.times_used > 0 && (
                        <>
                            <span>•</span>
                            <span>×{template.times_used}</span>
                        </>
                    )}
                </div>
            </div>

            {isApplying ? (
                <motion.div
                    className="w-4 h-4 border-2 border-[var(--accent-secondary)] border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
            ) : (
                <div className="text-lg">+</div>
            )}
        </motion.button>
    );
});

// Empty state
function EmptyState({
    icon,
    title,
    description,
}: {
    icon: string;
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
                <span className="text-3xl">{icon}</span>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-1">
                {title}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
                {description}
            </p>
        </div>
    );
}

