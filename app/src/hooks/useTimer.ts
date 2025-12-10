import { useEffect, useRef, useState, useCallback } from 'react';

interface UseTimerOptions {
    duration: number; // in seconds
    onComplete?: () => void;
    onTick?: (remaining: number) => void;
}

interface UseTimerReturn {
    remaining: number;
    isRunning: boolean;
    progress: number; // 0-100
    start: () => void;
    pause: () => void;
    reset: () => void;
    stop: () => void;
}

export function useTimer({ duration, onComplete, onTick }: UseTimerOptions): UseTimerReturn {
    const [remaining, setRemaining] = useState(duration);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onCompleteRef = useRef(onComplete);
    const onTickRef = useRef(onTick);

    // Keep refs updated
    useEffect(() => {
        onCompleteRef.current = onComplete;
        onTickRef.current = onTick;
    }, [onComplete, onTick]);

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
        setIsRunning(true);
    }, []);

    const pause = useCallback(() => {
        setIsRunning(false);
    }, []);

    const reset = useCallback(() => {
        setIsRunning(false);
        setRemaining(duration);
    }, [duration]);

    const stop = useCallback(() => {
        setIsRunning(false);
        setRemaining(duration);
    }, [duration]);

    const progress = ((duration - remaining) / duration) * 100;

    return {
        remaining,
        isRunning,
        progress,
        start,
        pause,
        reset,
        stop,
    };
}
