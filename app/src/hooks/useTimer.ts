import { useEffect, useRef, useState, useCallback } from 'react';

interface UseTimerOptions {
    duration: number; // in seconds
    onComplete?: () => void;
    onTick?: (remaining: number) => void;
    autoStart?: boolean; // Auto-start timer when duration > 0
}

interface UseTimerReturn {
    remaining: number;
    isRunning: boolean;
    progress: number; // 0-100
    totalDuration: number; // Original duration for progress calculation
    start: () => void;
    pause: () => void;
    reset: () => void;
    stop: () => void;
    setRemainingTime: (seconds: number) => void; // Manual override
}

export function useTimer({ duration, onComplete, onTick, autoStart = false }: UseTimerOptions): UseTimerReturn {
    const [remaining, setRemaining] = useState(duration);
    const [totalDuration, setTotalDuration] = useState(duration);
    const [isRunning, setIsRunning] = useState(autoStart && duration > 0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onCompleteRef = useRef(onComplete);
    const onTickRef = useRef(onTick);

    // Keep refs updated
    useEffect(() => {
        onCompleteRef.current = onComplete;
        onTickRef.current = onTick;
    }, [onComplete, onTick]);

    // Update remaining when duration changes (for server sync)
    useEffect(() => {
        setRemaining(duration);
        setTotalDuration(duration);
        if (autoStart && duration > 0) {
            setIsRunning(true);
        }
    }, [duration, autoStart]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // Timer logic
    useEffect(() => {
        if (isRunning && remaining > 0) {
            intervalRef.current = setInterval(() => {
                setRemaining(prev => {
                    const newRemaining = prev - 1;
                    onTickRef.current?.(newRemaining);

                    if (newRemaining <= 0) {
                        setIsRunning(false);
                        onCompleteRef.current?.();
                        return 0;
                    }

                    return newRemaining;
                });
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isRunning, remaining]);

    const start = useCallback(() => {
        if (remaining > 0) {
            setIsRunning(true);
        }
    }, [remaining]);

    const pause = useCallback(() => {
        setIsRunning(false);
    }, []);

    const reset = useCallback(() => {
        setIsRunning(false);
        setRemaining(totalDuration);
    }, [totalDuration]);

    const stop = useCallback(() => {
        setIsRunning(false);
        setRemaining(totalDuration);
    }, [totalDuration]);

    const setRemainingTime = useCallback((seconds: number) => {
        setRemaining(Math.max(0, seconds));
    }, []);

    // Progress: 0 at start, 100 at end
    const progress = totalDuration > 0
        ? ((totalDuration - remaining) / totalDuration) * 100
        : 0;

    return {
        remaining,
        isRunning,
        progress,
        totalDuration,
        start,
        pause,
        reset,
        stop,
        setRemainingTime,
    };
}
