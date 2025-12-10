import { motion } from 'framer-motion';
import { getPercentage } from '../../lib/utils';

interface EnergyMeterProps {
    current: number;
    max: number;
}

export function EnergyMeter({ current, max }: EnergyMeterProps) {
    const percentage = getPercentage(current, max);

    // Color based on energy level
    const getColor = () => {
        if (percentage > 60) return 'var(--energy-full)';
        if (percentage > 30) return 'var(--energy-mid)';
        return 'var(--energy-low)';
    };

    return (
        <div className="flex flex-col gap-1 bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-default)]">
            <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)] flex items-center gap-1">
                    <span>⚡</span>
                    <span>Энергия</span>
                </span>
                <span className="font-mono font-bold" style={{ color: getColor() }}>
                    {current}/{max}
                </span>
            </div>

            <div className="h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden border border-[var(--border-default)]">
                <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: getColor() }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />
            </div>
        </div>
    );
}
