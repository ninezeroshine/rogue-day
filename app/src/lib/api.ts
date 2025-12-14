/**
 * API Client for Rogue-Day Backend
 */

// Detect local development mode
// Use VITE_API_URL if set, otherwise default to localhost in dev mode or production URL
const API_BASE_URL = import.meta.env.VITE_API_URL || (
    import.meta.env.DEV
        ? 'http://localhost:8000'
        : 'https://rogue-day-production.up.railway.app'
);

// Get Telegram WebApp if available
const getTelegramInitData = (): string | null => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
        return window.Telegram.WebApp.initData;
    }
    return null;
};

interface ApiOptions {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body } = options;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    // Add Telegram init data for auth (single source of truth - no query params)
    const initData = getTelegramInitData();
    if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    let lastError: Error | null = null;

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });

            if (response.ok) {
                return response.json();
            }

            // Get error details
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            const errorMessage = errorData.detail || `API Error: ${response.status}`;

            // Retry on 429 (rate limit) or 5xx server errors
            if (response.status === 429 || response.status >= 500) {
                lastError = new Error(errorMessage);
                if (attempt < MAX_RETRIES - 1) {
                    const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
                    console.warn(`[API] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms: ${errorMessage}`);
                    await sleep(delay);
                    continue;
                }
            }

            // Don't retry on 4xx (client errors) - they won't change
            throw new Error(errorMessage);

        } catch (err) {
            // Network errors - retry with backoff
            if (err instanceof TypeError && err.message.includes('fetch')) {
                lastError = new Error('Network error. Check your connection.');
                if (attempt < MAX_RETRIES - 1) {
                    const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
                    console.warn(`[API] Network retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
                    await sleep(delay);
                    continue;
                }
            }

            // Re-throw non-network errors immediately
            throw err;
        }
    }

    throw lastError || new Error('Request failed after retries');
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
    xp_before_penalties: number;
    penalty_xp: number;
    tasks_completed: number;
    tasks_failed: number;
    tasks_total: number;
    total_focus_minutes: number;
    t1_completed: number;
    t2_completed: number;
    t3_completed: number;
    t1_failed: number;
    t2_failed: number;
    t3_failed: number;
    completed_with_timer: number;
    completed_without_timer: number;
    created_at: string;
}

export interface JournalEntryResponse {
    extraction: ExtractionResponse;
    run_date: string;
    started_at: string;
    extracted_at: string | null;
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

    listExtractions: async (limit = 30): Promise<ExtractionResponse[]> => {
        const url = `/api/v1/runs/extractions?limit=${encodeURIComponent(String(limit))}`;
        return apiRequest(url);
    },

    journal: async (limit = 30): Promise<JournalEntryResponse[]> => {
        const url = `/api/v1/runs/journal?limit=${encodeURIComponent(String(limit))}`;
        return apiRequest(url);
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
        const params = category ? `?category=${category}` : '';
        const url = `/api/v1/templates/${params}`;
        return apiRequest<TaskTemplateResponse[]>(url);
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
        return apiRequest<PresetResponse[]>('/api/v1/presets/');
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
