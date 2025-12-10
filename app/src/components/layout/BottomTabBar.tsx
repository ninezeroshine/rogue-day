import { NavLink } from 'react-router-dom';
import { useHaptic } from '../../hooks/useTelegram';

interface TabItem {
    path: string;
    label: string;
    icon: string;
    activeIcon: string;
}

const TABS: TabItem[] = [
    { path: '/', label: 'Ран', icon: '🎯', activeIcon: '🎯' },
    { path: '/journal', label: 'Журнал', icon: '📊', activeIcon: '📊' },
    { path: '/profile', label: 'Профиль', icon: '👤', activeIcon: '👤' },
];

export function BottomTabBar() {
    const { selection } = useHaptic();

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] border-t border-[var(--border-default)] safe-area-bottom">
            <div className="flex justify-around items-center h-16">
                {TABS.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        onClick={() => selection()}
                        className={({ isActive }) => `
              flex flex-col items-center justify-center flex-1 h-full
              transition-colors duration-200
              ${isActive
                                ? 'text-[var(--accent-primary)]'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                            }
            `}
                    >
                        {({ isActive }) => (
                            <>
                                <span className="text-xl mb-0.5">
                                    {isActive ? tab.activeIcon : tab.icon}
                                </span>
                                <span className="text-xs font-medium">{tab.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
