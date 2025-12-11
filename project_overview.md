# Rogue-Day: Technical Overview для Senior Developer

> **TL;DR:** Telegram Mini App — геймифицированный планировщик задач с Roguelike-механиками. React/Vite + FastAPI + PostgreSQL. Каждый день = новый "ран", задачи = XP/энергия, в конце дня — "эвакуация" прогресса.

---

## 🎯 Продукт и УТП

**Целевая аудитория:** Люди с СДВГ / проблемами с фокусом

**Ключевая метафора:** День = Roguelike Run
- Утром начинаешь "ран" с полной энергией (50 ед.)
- Добавляешь задачи разных уровней сложности (Tier 1-3)
- Выполняешь → получаешь XP
- Провалил сложную задачу → теряешь энергию/XP
- Вечером "эвакуируешь" прогресс → XP сохраняется навсегда
- Не эвакуировал → XP сгорает (как в Escape from Tarkov)

**Отличие от конкурентов:**
1. Риск-менеджмент: сложные задачи = больше XP, но можно провалить
2. Ежедневный сброс — нет накопления техдолга задач
3. Telegram-native: мгновенный доступ, без установки

---

## 🛠 Tech Stack

### Frontend
| Технология | Версия | Назначение |
|------------|--------|------------|
| **React** | 18.x | UI Library |
| **Vite** | 5.x | Build tool, HMR |
| **TypeScript** | 5.x | Типизация |
| **Zustand** | 5.x | State management (server-synced) |
| **Framer Motion** | 11.x | Анимации (AnimatePresence, layout) |
| **Telegram WebApp SDK** | - | Mini App API (`window.Telegram.WebApp`) |

**Хостинг:** Vercel (auto-deploy из main)

### Backend
| Технология | Версия | Назначение |
|------------|--------|------------|
| **FastAPI** | 0.100+ | Async Python API framework |
| **SQLAlchemy** | 2.x | Async ORM (`asyncpg`) |
| **PostgreSQL** | 15+ | Primary DB |
| **Pydantic** | 2.x | Validation, schemas |
| **Pydantic-Settings** | - | Environment config |

**Хостинг:** Railway (auto-deploy, managed PostgreSQL)

### Интеграции
- **Telegram Bot API** — валидация `initData`, получение аватарок
- Планируется: **Redis** для кэширования сессий

---

## 📁 Структура проекта

```
rogue-day/
├── app/                          # Frontend (React/Vite)
│   ├── src/
│   │   ├── components/
│   │   │   └── run/              # Task slots, modals, meters
│   │   ├── hooks/
│   │   │   ├── useTelegram.ts    # TMA SDK wrapper
│   │   │   ├── useTimer.ts       # Countdown timer
│   │   │   └── useSync.ts        # Backend sync
│   │   ├── lib/
│   │   │   ├── api.ts            # HTTP client
│   │   │   └── constants.ts      # Game config (TIER_CONFIG)
│   │   ├── pages/
│   │   │   ├── RunPage.tsx       # Main game screen
│   │   │   ├── ProfilePage.tsx   # User stats
│   │   │   └── JournalPage.tsx   # History
│   │   └── store/
│   │       ├── useRunStore.ts    # Local-first state (persist)
│   │       └── useServerRunStore.ts  # Server-synced state (единственный store)
│   └── vite.config.ts
│
└── backend/                      # Backend (FastAPI)
    └── app/
        ├── api/
        │   └── endpoints/
        │       ├── auth.py       # Telegram initData validation
        │       ├── users.py      # CRUD пользователей
        │       ├── runs.py       # Lifecycle ранов
        │       └── tasks.py      # Task actions (create/start/complete/fail)
        ├── models.py             # SQLAlchemy ORM (User, Run, Task, Extraction)
        ├── schemas.py            # Pydantic request/response
        ├── database.py           # Async session factory
        ├── config.py             # Settings from .env
        └── main.py               # FastAPI app + CORS + lifespan
```

---

## 🎮 Игровые механики

### Tier System (задачи)
| Tier | Название | Длительность | Энергия | Базовый XP | Таймер | Провал |
|------|----------|--------------|---------|------------|--------|--------|
| T1 | Разминка | 2-5 мин | 0 | 15 | Нет | Невозможен |
| T2 | Рутина | 10-15 мин | 5 | 65 | Опционально | -энергия |
| T3 | Фокус | 25-30 мин | 15 | 175 | Обязательно | -10% daily XP |

### Формула XP
```typescript
xp = baseXP × (duration / minDuration) × timerMultiplier
// timerMultiplier: 1.0 с таймером, 0.8 без
```

### Lifecycle Task
```
PENDING → [start] → ACTIVE → [complete/fail] → COMPLETED/FAILED
```

### Lifecycle Run
```
(no run) → [startNewRun] → ACTIVE → [extractRun] → EXTRACTED
                                  → [abandon] → ABANDONED (XP lost)
```

---

## 🔐 Аутентификация

**Telegram Mini App initData:**
1. Frontend получает `window.Telegram.WebApp.initData` (строка с hash)
2. Отправляет в header `X-Telegram-Init-Data`
3. Backend валидирует HMAC-SHA256 с bot_token
4. Извлекает `user.id` из parsed data

**✅ Исправлено:** Все эндпоинты теперь используют `get_current_user` dependency, которая валидирует `initData` через HMAC-SHA256 и проверяет `auth_date` (24h expiration).

---

## 🗄 Database Schema

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │    runs     │       │   tasks     │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │──┐    │ id (PK)     │──┐    │ id (PK)     │
│ telegram_id │  │    │ user_id(FK) │◄─┘    │ run_id (FK) │◄─┐
│ username    │  │    │ run_date    │       │ title       │  │
│ total_xp    │  │    │ daily_xp    │       │ tier        │  │
│ total_*     │  │    │ focus_energy│       │ duration    │  │
│ streaks     │  │    │ status      │       │ status      │  │
│ settings    │  │    │ started_at  │       │ xp_earned   │  │
└─────────────┘  │    └─────────────┘       │ energy_cost │  │
                 │                          │ use_timer   │  │
                 │    ┌─────────────┐       └─────────────┘  │
                 │    │ extractions │                        │
                 │    ├─────────────┤                        │
                 └───►│ user_id(FK) │                        │
                      │ run_id (FK) │◄───────────────────────┘
                      │ final_xp    │
                      │ tasks_*     │
                      └─────────────┘
```

---

## 🔄 Data Flow

```
┌──────────────┐     HTTP + Header      ┌──────────────┐
│   Frontend   │  ─────────────────────►│   Backend    │
│  (Zustand)   │   X-Telegram-Init-Data │  (FastAPI)   │
│              │◄───────────────────────│              │
└──────────────┘      JSON Response     └──────────────┘
       │                                       │
       ▼                                       ▼
┌──────────────┐                        ┌──────────────┐
│ localStorage │                        │  PostgreSQL  │
│  (persist)   │                        │              │
└──────────────┘                        └──────────────┘
```

**Паттерн:** Optimistic UI с server reconciliation
- Действия сначала обновляют UI
- Затем синхронизируются с сервером
- При ошибке — откат

---

## 🚀 Deployment

### Frontend (Vercel)
```json
// vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
- Auto-deploy из `main` branch
- Environment: `VITE_API_URL`

### Backend (Railway)
```toml
# railway.toml
[build]
builder = "NIXPACKS"
buildCommand = "pip install -e ."

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
```
- Managed PostgreSQL addon
- Environment: `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `CORS_ORIGINS`

---

## 📝 API Endpoints (v1)

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/v1/auth/validate` | Валидация initData |
| GET | `/api/v1/users/me` | Текущий пользователь |
| POST | `/api/v1/users/` | Создать/получить пользователя |
| GET | `/api/v1/runs/current` | Активный ран |
| POST | `/api/v1/runs/` | Начать новый ран |
| POST | `/api/v1/runs/{id}/extract` | Эвакуация |
| POST | `/api/v1/tasks/` | Создать задачу |
| POST | `/api/v1/tasks/{id}/start` | Начать задачу |
| POST | `/api/v1/tasks/{id}/complete` | Завершить |
| POST | `/api/v1/tasks/{id}/fail` | Провалить |
| DELETE | `/api/v1/tasks/{id}` | Удалить pending |

---

## 🎨 UI/UX особенности

- **Тёмная тема** — Telegram native palette (`var(--tg-theme-*)`)
- **Haptic feedback** — `HapticFeedback.impactOccurred()` на действиях
- **Анимации** — Framer Motion для карточек задач, XP counter
- **Localization** — Русский язык (hardcoded)

---

## 📊 Метрики (планируемые)

- Retention Day 1/7/30
- Avg tasks per run
- Extraction rate (vs abandon)
- T3 task success rate

---

## 🔮 Roadmap (запланировано)

1. **Boss Fights** — коллективные цели, урон за T3 задачи
2. **Co-op Raids** — групповые челленджи
3. **Loot System** — награды за стрики
4. **Achievements** — бейджи
5. **Analytics Dashboard** — статистика продуктивности

---

## ⚠️ Исправленные проблемы (из code_review.md)

| Проблема | Статус | Решение |
|----------|--------|---------|
| 🔴 Auth: telegram_id без валидации | ✅ **Исправлено** | `get_current_user` dependency с HMAC |
| 🔴 XP расчёт `duration/5` | ✅ **Исправлено** | `duration/duration_min` |
| 🔴 Streak всегда +1 | ✅ **Исправлено** | Проверка `last_run_at` |
| 🟠 Дублирование TIER_CONFIG | ✅ **Исправлено** | Централизованный `game_config.py` |
| 🟠 Два Zustand store | ✅ **Исправлено** | Удалён `useRunStore`, остался `useServerRunStore` |
| 🟡 Нет DB индексов | ✅ **Исправлено** | Добавлены `ix_runs_*`, `ix_tasks_*` |
| 🟢 OpenAPI codegen | ✅ **Исправлено** | `npm run generate:api` |

---

## 🔮 Roadmap (запланировано)

1. **Boss Fights** — коллективные цели, урон за T3 задачи (потребует Event-driven)
2. **Co-op Raids** — групповые челленджи
3. **Loot System** — награды за стрики
4. **Achievements** — бейджи
5. **Analytics Dashboard** — статистика продуктивности

