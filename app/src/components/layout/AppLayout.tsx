import { Outlet } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';

export function AppLayout() {
    return (
        <div className="min-h-screen pb-20">
            {/* Page content */}
            <main>
                <Outlet />
            </main>

            {/* Bottom navigation */}
            <BottomTabBar />
        </div>
    );
}
