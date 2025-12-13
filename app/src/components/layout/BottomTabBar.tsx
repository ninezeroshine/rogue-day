import { NavLink } from 'react-router-dom';
import { useHaptic } from '../../hooks/useTelegram';
import { IconRun, IconTemplates, IconJournal, IconProfile } from '../../lib/icons';
import type { FC } from 'react';

interface TabItem {
    path: string;
    label: string;
    Icon: FC<{ size?: number; className?: string }>;
}

const TABS: TabItem[] = [
    { path: '/', label: 'Ран', Icon: IconRun },
    { path: '/templates', label: 'Шаблоны', Icon: IconTemplates },
    { path: '/journal', label: 'Журнал', Icon: IconJournal },
    { path: '/profile', label: 'Профиль', Icon: IconProfile },
];

export function BottomTabBar() {
    const { selection } = useHaptic();

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] border-t border-[var(--border-default)] safe-area-bottom z-40">
            <div className="flex justify-around items-center h-16">
                {TABS.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        onClick={() => selection()}
                        className={({ isActive }) => `
                            flex flex-col items-center justify-center flex-1 h-full
                            transition-all duration-200
                            ${isActive
                                ? 'text-[var(--accent-primary)]'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                            }
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <tab.Icon 
                                    size={22} 
                                    className={`mb-0.5 transition-transform ${isActive ? 'scale-110' : ''}`}
                                />
                                <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                                    {tab.label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
