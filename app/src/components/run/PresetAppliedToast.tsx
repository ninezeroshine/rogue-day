import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface PresetAppliedToastProps {
    message: string;
    tasksCreated: number;
    visible: boolean;
    onClose: () => void;
}

// Confetti colors matching the app theme
const CONFETTI_COLORS = [
    '#10b981', // accent-primary (green)
    '#f59e0b', // accent-warning (orange)
    '#8b5cf6', // purple
    '#06b6d4', // accent-secondary (cyan)
    '#ec4899', // pink
];

interface ConfettiParticle {
    id: number;
    color: string;
    x: number;
    y: number;
    rotation: number;
    scale: number;
}

function generateConfetti(count: number): ConfettiParticle[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        x: (Math.random() - 0.5) * 250,
        y: (Math.random() - 0.5) * 150 - 50, // Bias upward
        rotation: Math.random() * 720 - 360,
        scale: 0.5 + Math.random() * 0.5,
    }));
}

export function PresetAppliedToast({ message, tasksCreated, visible, onClose }: PresetAppliedToastProps) {
    const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);

    useEffect(() => {
        if (visible) {
            // Generate confetti particles
            setConfetti(generateConfetti(25));

            // Auto-hide after 3.5s
            const timer = setTimeout(onClose, 3500);
            return () => clearTimeout(timer);
        } else {
            setConfetti([]);
        }
    }, [visible, onClose]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed bottom-32 left-4 right-4 z-50 flex justify-center pointer-events-none"
                >
                    <div
                        className="relative bg-[var(--bg-card)] border-2 border-[var(--accent-primary)] rounded-2xl px-6 py-4 shadow-2xl overflow-visible pointer-events-auto"
                        style={{
                            boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)',
                        }}
                    >
                        {/* Confetti particles */}
                        {confetti.map((particle) => (
                            <motion.div
                                key={particle.id}
                                className="absolute rounded-sm"
                                style={{
                                    backgroundColor: particle.color,
                                    width: 8 * particle.scale,
                                    height: 8 * particle.scale,
                                    left: '50%',
                                    top: '50%',
                                }}
                                initial={{
                                    opacity: 1,
                                    scale: 1,
                                    x: 0,
                                    y: 0,
                                    rotate: 0,
                                }}
                                animate={{
                                    opacity: 0,
                                    scale: 0,
                                    x: particle.x,
                                    y: particle.y,
                                    rotate: particle.rotation,
                                }}
                                transition={{
                                    duration: 1 + Math.random() * 0.5,
                                    ease: 'easeOut'
                                }}
                            />
                        ))}

                        {/* Toast content */}
                        <div className="flex items-center gap-3">
                            <motion.span
                                className="text-3xl"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 15,
                                    delay: 0.1
                                }}
                            >
                                🎉
                            </motion.span>
                            <div>
                                <motion.div
                                    className="font-medium text-[var(--text-primary)]"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.15 }}
                                >
                                    {message}
                                </motion.div>
                                <motion.div
                                    className="text-sm text-[var(--text-muted)] flex items-center gap-1"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.25 }}
                                >
                                    <span className="text-[var(--accent-primary)] font-medium">
                                        +{tasksCreated}
                                    </span>
                                    <span>задач добавлено</span>
                                </motion.div>
                            </div>
                        </div>

                        {/* Progress bar auto-dismiss indicator */}
                        <motion.div
                            className="absolute bottom-0 left-0 h-1 bg-[var(--accent-primary)] rounded-b-2xl"
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: 3.5, ease: 'linear' }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
