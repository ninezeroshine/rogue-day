import { useEffect, useRef, useState, useMemo } from 'react';

interface UseServerTimerOptions {
    /** Task start time from server (ISO string) */
    startedAt: string | null | undefined;
    /** Task duration in minutes */
    durationMinutes: number;
    /** Is timer active (task status === 'active' && use_timer) */
    isActive: boolean;
    /** Callback when timer reaches zero */
    onComplete?: () => void;
}

interface UseServerTimerReturn {
    /** Remaining seconds (calculated from server time) */
    remaining: number;
    /** Is timer running */
    isRunning: boolean;
    /** Progress 0-100 (0 = just started, 100 = complete) */
    progress: number;
    /** Total duration in seconds */
    totalDuration: number;
    /** Formatted time string MM:SS */
    formatted: string;
}

/**
 * Server-synced timer hook.
 * 
 * ALWAYS calculates remaining time from server's started_at timestamp.
 * This ensures timer is accurate even after:
 * - Page reload
 * - Tab switching  
 * - App minimize/restore
 * - Network reconnection
 */
export function useServerTimer({
    startedAt,
    durationMinutes,
    isActive,
    onComplete,
}: UseServerTimerOptions): UseServerTimerReturn {
    // Tick counter to force re-render every second (starts at 0)
    const [tick, setTick] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onCompleteRef = useRef(onComplete);
    // Track if we already called onComplete for this timer session
    const completedForSessionRef = useRef<string | null>(null);
    // Track if timer has been running for at least 1 tick (prevents instant completion)
    const hasTickedRef = useRef(false);

    // Keep callback ref updated
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // Calculate remaining time from server timestamp
    const { remaining, totalDuration, progress, isValidTimer } = useMemo(() => {
        const total = (durationMinutes || 0) * 60;

        // Not active, no start time, or zero duration - not valid for completion
        if (!isActive || !startedAt || total <= 0) {
            return { remaining: total, totalDuration: total, progress: 0, isValidTimer: false };
        }

        // Parse start time - ensure UTC interpretation
        // Server sends ISO strings, but may not include 'Z' suffix
        // If no 'Z' and no timezone offset (+/-HH:MM), treat as UTC (server time is always UTC)
        // Check for timezone offset pattern: +HH:MM or -HH:MM at the end
        const hasTimezone = startedAt.endsWith('Z') || 
            /[+-]\d{2}:\d{2}$/.test(startedAt);
        const normalizedStartedAt = hasTimezone
            ? startedAt
            : startedAt + 'Z';
        const startTime = new Date(normalizedStartedAt).getTime();
        
        // Sanity check - if startTime is invalid, return full duration
        if (isNaN(startTime)) {
            console.warn('useServerTimer: Invalid startedAt:', startedAt);
            return { remaining: total, totalDuration: total, progress: 0, isValidTimer: false };
        }

        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        
        // Sanity check - if elapsed is negative (future start time), treat as just started
        if (elapsedSeconds < 0) {
            return { remaining: total, totalDuration: total, progress: 0, isValidTimer: true };
        }

        const remainingSeconds = Math.max(0, total - elapsedSeconds);
        const progressPercent = total > 0 ? ((total - remainingSeconds) / total) * 100 : 0;

        return {
            remaining: remainingSeconds,
            totalDuration: total,
            progress: progressPercent,
            isValidTimer: true,
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startedAt, durationMinutes, isActive, tick]);

    // Format time as MM:SS
    const formatted = useMemo(() => {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, [remaining]);

    // Start/stop interval based on isActive and startedAt
    useEffect(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Reset tracking when timer becomes inactive
        if (!isActive || !startedAt) {
            completedForSessionRef.current = null;
            hasTickedRef.current = false;
            setTick(0);
            return;
        }

        // Start ticking every second
        intervalRef.current = setInterval(() => {
            hasTickedRef.current = true;
            setTick(t => t + 1);
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isActive, startedAt]);

    // Check for completion
    useEffect(() => {
        // Don't complete if:
        // - Timer is not active or not valid
        // - Remaining time is not zero
        // - Already completed for this session
        if (!isActive || !isValidTimer || remaining !== 0) {
            return;
        }

        if (completedForSessionRef.current === startedAt) {
            return;
        }

        // IMPORTANT: Only auto-complete if timer has been ticking OR
        // if significant time has passed (timer expired while app was closed)
        // This prevents instant completion on fresh task start
        const hasTimezone = startedAt && (startedAt.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(startedAt));
        const normalizedStartedAt = startedAt && !hasTimezone
            ? startedAt + 'Z'
            : startedAt;
        const startTime = normalizedStartedAt ? new Date(normalizedStartedAt).getTime() : 0;
        const elapsed = Date.now() - startTime;
        const totalMs = durationMinutes * 60 * 1000;
        
        // If elapsed time is less than duration + 2 seconds buffer, wait for tick
        // This handles the case where task JUST started and remaining calculated as 0 due to race
        if (elapsed < totalMs + 2000 && !hasTickedRef.current) {
            return;
        }

        // Mark as completed for this session
        completedForSessionRef.current = startedAt ?? null;
        
        // Call completion callback
        onCompleteRef.current?.();
    }, [isActive, isValidTimer, remaining, startedAt, durationMinutes]);

    return {
        remaining,
        isRunning: isActive && isValidTimer && remaining > 0,
        progress,
        totalDuration,
        formatted,
    };
}
