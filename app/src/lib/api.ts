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

    // #region agent log
    const logEntry = { location: 'api.ts:29', message: 'apiRequest entry', data: { endpoint, method, hasBody: !!body }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' };
    fetch('http://127.0.0.1:7242/ingest/fe2f8581-aef0-4e79-a7b4-aa9c2698f4ab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logEntry) }).catch(() => {});
    // #endregion

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

    // #region agent log
    const logBeforeFetch = { location: 'api.ts:52', message: 'apiRequest before fetch', data: { finalUrl: url.toString(), hasInitData: !!initData, telegramId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' };
    fetch('http://127.0.0.1:7242/ingest/fe2f8581-aef0-4e79-a7b4-aa9c2698f4ab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logBeforeFetch) }).catch(() => {});
    // #endregion

    const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    // #region agent log
    const logAfterFetch = { location: 'api.ts:60', message: 'apiRequest after fetch', data: { status: response.status, statusText: response.statusText, ok: response.ok, endpoint }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' };
    fetch('http://127.0.0.1:7242/ingest/fe2f8581-aef0-4e79-a7b4-aa9c2698f4ab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logAfterFetch) }).catch(() => {});
    // #endregion

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        // #region agent log
        const logError = { location: 'api.ts:66', message: 'apiRequest error', data: { status: response.status, error, endpoint }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' };
        fetch('http://127.0.0.1:7242/ingest/fe2f8581-aef0-4e79-a7b4-aa9c2698f4ab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logError) }).catch(() => {});
        // #endregion
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

// ===== TEMPLATE API =====

export interface TaskTemplateResponse {
    id: number;
    title: string;
    tier: number;
    duration: number;
    use_timer: boolean;
    category: string | null;
    source: string;
    times_used: number;
    created_at: string;
}

export interface TaskTemplateCreate {
    title: string;
    tier: number;
    duration: number;
    use_timer: boolean;
    category?: string;
}

export const templateApi = {
    list: async (category?: string): Promise<TaskTemplateResponse[]> => {
        // #region agent log
        const logData = { location: 'api.ts:272', message: 'template.list called', data: { category }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' };
        fetch('http://127.0.0.1:7242/ingest/fe2f8581-aef0-4e79-a7b4-aa9c2698f4ab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData) }).catch(() => {});
        console.log('[API] template.list() called, category:', category);
        // #endregion
        const params = category ? `?category=${category}` : '';
        const url = `/api/v1/templates${params}`;
        // #region agent log
        const logData2 = { location: 'api.ts:276', message: 'template.list URL formed', data: { url, params, category }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' };
        fetch('http://127.0.0.1:7242/ingest/fe2f8581-aef0-4e79-a7b4-aa9c2698f4ab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData2) }).catch(() => {});
        console.log('[API] template.list() URL:', url);
        // #endregion
        try {
            const result = await apiRequest<TaskTemplateResponse[]>(url);
            console.log('[API] template.list() success:', result.length, 'templates');
            return result;
        } catch (error) {
            console.error('[API] template.list() error:', error);
            throw error;
        }
    },

    create: async (data: TaskTemplateCreate): Promise<TaskTemplateResponse> => {
        return apiRequest('/api/v1/templates/', { method: 'POST', body: data });
    },

    createFromTask: async (taskId: number, category?: string): Promise<TaskTemplateResponse> => {
        return apiRequest('/api/v1/templates/from-task', {
            method: 'POST',
            body: { task_id: taskId, category },
        });
    },

    delete: async (id: number): Promise<void> => {
        return apiRequest(`/api/v1/templates/${id}`, { method: 'DELETE' });
    },
};

// ===== PRESET API =====

export interface PresetResponse {
    id: number;
    name: string;
    emoji: string | null;
    is_favorite: boolean;
    templates: TaskTemplateResponse[];
    created_at: string;
}

export interface PresetCreate {
    name: string;
    emoji?: string;
    is_favorite?: boolean;
    template_ids?: number[];
}

export interface PresetApplyResponse {
    tasks_created: number;
    tasks_skipped: number;
    total_energy_cost: number;
    message: string;
}

export const presetApi = {
    list: async (): Promise<PresetResponse[]> => {
        // #region agent log
        const logData = { location: 'api.ts:319', message: 'preset.list called', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' };
        fetch('http://127.0.0.1:7242/ingest/fe2f8581-aef0-4e79-a7b4-aa9c2698f4ab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData) }).catch(() => {});
        console.log('[API] preset.list() called');
        // #endregion
        try {
            const result = await apiRequest<PresetResponse[]>('/api/v1/presets/');
            console.log('[API] preset.list() success:', result.length, 'presets');
            return result;
        } catch (error) {
            console.error('[API] preset.list() error:', error);
            throw error;
        }
    },

    create: async (data: PresetCreate): Promise<PresetResponse> => {
        return apiRequest('/api/v1/presets/', { method: 'POST', body: data });
    },

    get: async (id: number): Promise<PresetResponse> => {
        return apiRequest(`/api/v1/presets/${id}`);
    },

    update: async (id: number, data: Partial<PresetCreate>): Promise<PresetResponse> => {
        return apiRequest(`/api/v1/presets/${id}`, { method: 'PATCH', body: data });
    },

    apply: async (presetId: number): Promise<PresetApplyResponse> => {
        // #region agent log
        const logData = { location: 'api.ts:335', message: 'preset.apply called', data: { presetId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' };
        fetch('http://127.0.0.1:7242/ingest/fe2f8581-aef0-4e79-a7b4-aa9c2698f4ab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData) }).catch(() => {});
        // #endregion
        return apiRequest(`/api/v1/presets/${presetId}/apply`, { method: 'POST' });
    },

    delete: async (id: number): Promise<void> => {
        return apiRequest(`/api/v1/presets/${id}`, { method: 'DELETE' });
    },
};

export default {
    user: userApi,
    run: runApi,
    task: taskApi,
    sync: syncApi,
    avatar: avatarApi,
    template: templateApi,
    preset: presetApi,
};
