import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTelegram } from './useTelegram';
import api from '../lib/api';
import type { UserResponse, RunResponse } from '../lib/api';

interface SyncState {
    isLoading: boolean;
    isOnline: boolean;
    error: string | null;
    user: UserResponse | null;
    serverRun: RunResponse | null;
}

/**
 * Hook for syncing with the backend server.
 * Handles user initialization and run synchronization.
 */
export function useSync() {
    const { isTMA, user: telegramUser, isReady } = useTelegram();

    const [state, setState] = useState<SyncState>({
        isLoading: true,
        isOnline: false,
        error: null,
        user: null,
        serverRun: null,
    });

    // Initialize user on mount
    const initialize = useCallback(async () => {
        if (!isReady) return;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const { user, run } = await api.sync.initialize();

            setState({
                isLoading: false,
                isOnline: true,
                error: null,
                user,
                serverRun: run,
            });

            return { user, run };
        } catch (err) {
            console.error('Sync initialization failed:', err);

            setState(prev => ({
                ...prev,
                isLoading: false,
                isOnline: false,
                error: err instanceof Error ? err.message : 'Sync failed',
            }));

            return null;
        }
    }, [isReady]);

    // Sync on mount
    useEffect(() => {
        initialize();
    }, [initialize]);

    // Get user display info - prioritize Telegram data (most fresh), then server
    const displayName = telegramUser?.first_name || state.user?.first_name || 'Оператор';
    const username = telegramUser?.username || state.user?.username || null;

    // Note: photo_url is NOT provided in initDataUnsafe by Telegram
    // To get photo, you need to use Bot API getUserProfilePhotos on backend
    const photoUrl = null;

    // User stats from server - memoized to prevent creating new object on each render
    const stats = useMemo(() => state.user?.stats || {
        total_xp: 0,
        total_extractions: 0,
        total_tasks_completed: 0,
        total_focus_minutes: 0,
        current_streak: 0,
        best_streak: 0,
    }, [state.user?.stats]);

    // Return object - no need for useMemo here as all dependencies are stable
    // (displayName, username are primitives, initialize is useCallback)
    return {
        ...state,
        displayName,
        username,
        photoUrl,
        stats,
        isTMA,
        telegramUser,
        refetch: initialize,
    };
}

/**
 * Hook for syncing run state with the server.
 */
export function useRunSync() {
    const [isSyncing, setIsSyncing] = useState(false);

    const startRun = useCallback(async () => {
        setIsSyncing(true);
        try {
            const run = await api.run.startNew();
            return run;
        } finally {
            setIsSyncing(false);
        }
    }, []);

    const extractRun = useCallback(async (runId: number) => {
        setIsSyncing(true);
        try {
            const extraction = await api.run.extract(runId);
            return extraction;
        } finally {
            setIsSyncing(false);
        }
    }, []);

    const addTask = useCallback(async (task: {
        title: string;
        tier: number;
        duration: number;
        use_timer: boolean;
    }) => {
        setIsSyncing(true);
        try {
            const newTask = await api.task.create(task);
            return newTask;
        } finally {
            setIsSyncing(false);
        }
    }, []);

    const startTask = useCallback(async (taskId: number) => {
        const task = await api.task.start(taskId);
        return task;
    }, []);

    const completeTask = useCallback(async (taskId: number) => {
        const task = await api.task.complete(taskId);
        return task;
    }, []);

    const failTask = useCallback(async (taskId: number) => {
        const task = await api.task.fail(taskId);
        return task;
    }, []);

    const deleteTask = useCallback(async (taskId: number) => {
        await api.task.delete(taskId);
    }, []);

    // Return object - no need for useMemo as all functions are already useCallback
    return {
        isSyncing,
        startRun,
        extractRun,
        addTask,
        startTask,
        completeTask,
        failTask,
        deleteTask,
    };
}
