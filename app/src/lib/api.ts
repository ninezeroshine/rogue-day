/**
 * API Client for Rogue-Day Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://rogue-day-production.up.railway.app';

// Get Telegram WebApp if available
const getTelegramInitData = (): string | null => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
        return window.Telegram.WebApp.initData;
    }
    return null;
};

// Get Telegram user ID for dev mode
const getTelegramUserId = (): number | null => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        return window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    // Dev mode fallback
    return 123456789;
};

interface ApiOptions {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
}

async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body } = options;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    // Add Telegram init data for auth
    const initData = getTelegramInitData();
    if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
    }

    const url = new URL(`${API_BASE_URL}${endpoint}`);

    // Add telegram_id as query param for now (simplified auth)
    const telegramId = getTelegramUserId();
    if (telegramId) {
        url.searchParams.set('telegram_id', telegramId.toString());
    }

    const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `API Error: ${response.status}`);
    }

    return response.json();
}

// ===== USER API =====

export interface UserStats {
    total_xp: number;
    total_extractions: number;
    total_tasks_completed: number;
    total_focus_minutes: number;
    current_streak: number;
    best_streak: number;
}

export interface UserResponse {
    id: number;
    telegram_id: number;
    username: string | null;
    first_name: string | null;
    stats: UserStats;
    created_at: string;
}

export interface UserSettings {
    notifications_enabled?: boolean;
    sounds_enabled?: boolean;
    haptics_enabled?: boolean;
}

export const userApi = {
    getOrCreate: async (username?: string, firstName?: string): Promise<UserResponse> => {
        const params = new URLSearchParams();
        if (username) params.set('username', username);
        if (firstName) params.set('first_name', firstName);

        return apiRequest(`/api/v1/users/?${params.toString()}`, { method: 'POST' });
    },

    getMe: async (): Promise<UserResponse> => {
        return apiRequest('/api/v1/users/me');
    },

    updateSettings: async (settings: UserSettings): Promise<UserResponse> => {
        return apiRequest('/api/v1/users/me', { method: 'PATCH', body: settings });
    },
};

// ===== RUN API =====

export interface TaskResponse {
    id: number;
    run_id: number;
    title: string;
    tier: number;
    duration: number;
    status: 'pending' | 'active' | 'completed' | 'failed';
    xp_earned: number;
    energy_cost: number;
    use_timer: boolean;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
}

export interface RunResponse {
    id: number;
    user_id: number;
    run_date: string;
    daily_xp: number;
    focus_energy: number;
    max_energy: number;
    total_focus_minutes: number;
    status: 'active' | 'extracted' | 'abandoned';
    tasks: TaskResponse[];
    started_at: string;
    extracted_at: string | null;
}

export interface ExtractionResponse {
    id: number;
    run_id: number;
    final_xp: number;
    tasks_completed: number;
    tasks_failed: number;
    total_focus_minutes: number;
    created_at: string;
}

export const runApi = {
    getCurrent: async (): Promise<RunResponse> => {
        return apiRequest('/api/v1/runs/current');
    },

    startNew: async (): Promise<RunResponse> => {
        return apiRequest('/api/v1/runs/', { method: 'POST' });
    },

    extract: async (runId: number): Promise<ExtractionResponse> => {
        return apiRequest(`/api/v1/runs/${runId}/extract`, { method: 'POST' });
    },
};

// ===== TASK API =====

export interface TaskCreate {
    title: string;
    tier: number;
    duration: number;
    use_timer: boolean;
}

export const taskApi = {
    create: async (task: TaskCreate): Promise<TaskResponse> => {
        return apiRequest('/api/v1/tasks/', { method: 'POST', body: task });
    },

    start: async (taskId: number): Promise<TaskResponse> => {
        return apiRequest(`/api/v1/tasks/${taskId}/start`, { method: 'POST' });
    },

    complete: async (taskId: number): Promise<TaskResponse> => {
        return apiRequest(`/api/v1/tasks/${taskId}/complete`, { method: 'POST' });
    },

    fail: async (taskId: number): Promise<TaskResponse> => {
        return apiRequest(`/api/v1/tasks/${taskId}/fail`, { method: 'POST' });
    },

    delete: async (taskId: number): Promise<void> => {
        return apiRequest(`/api/v1/tasks/${taskId}`, { method: 'DELETE' });
    },
};

// ===== SYNC HELPERS =====

export const syncApi = {
    /**
     * Initialize user and load current run if exists
     */
    initialize: async (): Promise<{
        user: UserResponse;
        run: RunResponse | null;
    }> => {
        const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

        // Create or get user
        const user = await userApi.getOrCreate(
            telegramUser?.username,
            telegramUser?.first_name
        );

        // Try to get current run
        let run: RunResponse | null = null;
        try {
            run = await runApi.getCurrent();
        } catch {
            // No active run
        }

        return { user, run };
    },
};

// ===== AVATAR API =====

export interface AvatarResponse {
    photo_url: string | null;
    width?: number;
    height?: number;
    error?: string;
}

export const avatarApi = {
    /**
     * Get user avatar URL via Bot API
     */
    getAvatar: async (telegramId: number): Promise<AvatarResponse> => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/v1/avatar/${telegramId}`
            );
            return response.json();
        } catch {
            return { photo_url: null };
        }
    },
};

export default {
    user: userApi,
    run: runApi,
    task: taskApi,
    sync: syncApi,
    avatar: avatarApi,
};

