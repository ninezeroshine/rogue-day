import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useHaptic } from '../../hooks/useTelegram';
import { useServerRunStore } from '../../store/useServerRunStore';
import api from '../../lib/api';
import type { PresetResponse, PresetApplyResponse } from '../../lib/api';

interface QuickStartCardProps {
    onApplied: (result: PresetApplyResponse) => void;
}

export function QuickStartCard({ onApplied }: QuickStartCardProps) {
    const { impact, notification } = useHaptic();
    const [presets, setPresets] = useState<PresetResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [applyingId, setApplyingId] = useState<number | null>(null);

    useEffect(() => {
        api.preset.list()
            .then(setPresets)
            .catch(() => setPresets([]))
            .finally(() => setIsLoading(false));
    }, []);

    const handleApply = useCallback(async (preset: PresetResponse) => {
        if (applyingId) return;
        setApplyingId(preset.id);

        try {
            const result = await api.preset.apply(preset.id);

            // Staggered haptic feedback for each task added
            for (let i = 0; i < result.tasks_created; i++) {
                setTimeout(() => impact('light'), i * 100);
            }

            // Refresh run to get new tasks
            await useServerRunStore.getState().refreshRun();

            notification('success');
            onApplied(result);
        } catch (err) {
            notification('error');
            console.error('Failed to apply preset:', err);
        } finally {
            setApplyingId(null);
        }
    }, [applyingId, impact, notification, onApplied]);

    // Don't show if no presets
    if (isLoading || presets.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-card)] border border-[var(--border-default)]"
        >
            <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚡</span>
                <span className="font-medium text-sm text-[var(--text-primary)]">
                    Быстрый старт
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                    — применить пресет
                </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <AnimatePresence mode="popLayout">
                    {presets.map((preset, index) => (
                        <motion.button
                            key={preset.id}
                            onClick={() => handleApply(preset)}
                            disabled={applyingId !== null}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                                opacity: applyingId === preset.id ? 0.5 : 1,
                                scale: 1
                            }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex-shrink-0 px-4 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] text-sm font-medium whitespace-nowrap transition-colors"
                            whileHover={{
                                scale: 1.05,
                                borderColor: 'var(--accent-primary)',
                                boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span className="mr-1.5">{preset.emoji || '📋'}</span>
                            <span>{preset.name}</span>
                            <span className="ml-2 text-xs text-[var(--text-muted)]">
                                ({preset.templates.length})
                            </span>

                            {/* Loading spinner */}
                            {applyingId === preset.id && (
                                <motion.span
                                    className="ml-2 inline-block w-3 h-3 border-2 border-[var(--text-muted)] border-t-transparent rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                            )}
                        </motion.button>
                    ))}
                </AnimatePresence>
            </div>

            {/* Favorite indicator */}
            {presets.some(p => p.is_favorite) && (
                <div className="mt-2 text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <span>⭐</span>
                    <span>Избранные пресеты отображаются первыми</span>
                </div>
            )}
        </motion.div>
    );
}
