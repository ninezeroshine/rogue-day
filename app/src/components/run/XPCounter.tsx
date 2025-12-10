import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface XPCounterProps {
    xp: number;
}

export function XPCounter({ xp }: XPCounterProps) {
    const [previousXP, setPreviousXP] = useState(xp);
    const [xpDelta, setXpDelta] = useState(0);
    const [showDelta, setShowDelta] = useState(false);

    useEffect(() => {
        if (xp !== previousXP) {
            const delta = xp - previousXP;
            setXpDelta(delta);
            setShowDelta(true);
            setPreviousXP(xp);

            // Hide delta after animation
            const timer = setTimeout(() => setShowDelta(false), 1500);
            return () => clearTimeout(timer);
        }
    }, [xp, previousXP]);

    return (
        <div className="relative flex items-center gap-2 bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-default)]">
            <span className="text-2xl">✨</span>

            <div className="flex flex-col">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                    Дневной XP
                </span>
                <motion.span
                    key={xp}
                    className="text-2xl font-bold font-mono"
                    style={{ color: 'var(--accent-xp)' }}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    {xp.toLocaleString()}
                </motion.span>
            </div>

            {/* XP Delta popup */}
            <AnimatePresence>
                {showDelta && xpDelta !== 0 && (
                    <motion.div
                        className="absolute -top-2 right-0 font-bold text-lg"
                        style={{
                            color: xpDelta > 0 ? 'var(--accent-primary)' : 'var(--accent-danger)'
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {xpDelta > 0 ? '+' : ''}{xpDelta}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
