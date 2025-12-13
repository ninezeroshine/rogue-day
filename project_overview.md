# Rogue-Day: Technical Overview

> **TL;DR:** Telegram Mini App — геймифицированный планировщик задач с Roguelike-механиками. React 19/Vite 7 + FastAPI + PostgreSQL. Каждый день = новый "ран", задачи = XP/энергия, в конце дня — "эвакуация" прогресса.

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
| **React** | 19.x | UI Library |
| **Vite** | 7.x | Build tool, HMR |
| **TypeScript** | 5.9 | Строгая типизация |
| **Zustand** | 5.x | Server-synced state |
| **Framer Motion** | 12.x | Анимации (AnimatePresence, layout) |
| **Tailwind CSS** | 4.x | Utility-first CSS |
| **Lucide React** | 0.513 | Система иконок |
| **@twa-dev/sdk** | 8.x | Telegram Mini App API |

**Хостинг:** Vercel (auto-deploy из main)

### Backend
| Технология | Версия | Назначение |
|------------|--------|------------|
| **FastAPI** | 0.109+ | Async Python API framework |
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
│   │   │   ├── layout/           # AppLayout, BottomTabBar
│   │   │   ├── run/              # Task slots, modals, meters
│   │   │   └── journal/          # JournalDayCard, JournalEntryModal
│   │   ├── hooks/
│   │   │   ├── useTelegram.ts    # TMA SDK wrapper + HapticFeedback
│   │   │   ├── useTimer.ts       # Countdown timer
│   │   │   └── useSync.ts        # Backend sync
│   │   ├── lib/
│   │   │   ├── api.ts            # HTTP client
│   │   │   ├── constants.ts      # Game config (TIER_CONFIG)
│   │   │   └── icons.tsx         # Centralized Lucide icons
│   │   ├── pages/
│   │   │   ├── RunPage.tsx       # Main game screen
│   │   │   ├── TemplatesPage.tsx # Templates & presets
│   │   │   ├── JournalPage.tsx   # History by days
│   │   │   └── ProfilePage.tsx   # User stats & settings
│   │   └── store/
│   │       └── useServerRunStore.ts  # Server-synced state
│   └── vite.config.ts
│
└── backend/                      # Backend (FastAPI)
    └── app/
        ├── api/
        │   └── endpoints/
        │       ├── auth.py       # Telegram initData validation
        │       ├── users.py      # CRUD пользователей
        │       ├── runs.py       # Lifecycle ранов
        │       ├── tasks.py      # Task actions
        │       ├── templates.py  # Task templates
        │       └── presets.py    # Template presets
        ├── models.py             # SQLAlchemy ORM
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

Все эндпоинты используют `get_current_user` dependency с HMAC-SHA256 валидацией и проверкой `auth_date` (24h expiration).

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
                 │    ├─────────────┤       ┌─────────────┐  │
                 └───►│ user_id(FK) │       │ templates   │  │
                      │ run_id (FK) │◄──────│ presets     │  │
                      │ final_xp    │       └─────────────┘  │
                      │ tasks_*     │                        │
                      └─────────────┘◄───────────────────────┘
```

---

## 🎨 Дизайн-система

### Иконки
Централизованная система иконок на базе **Lucide React**:
- Расположение: `app/src/lib/icons.tsx`
- Экспортирует типизированные компоненты: `IconRun`, `IconEnergy`, `IconTier1`, etc.
- Цветовая система: `iconColors.primary`, `iconColors.xp`, etc.

### CSS Variables
```css
--accent-primary: #00FF88;    /* Зелёный основной */
--accent-secondary: #00D4FF;  /* Голубой */
--accent-xp: #FFD700;         /* Золотой для XP */
--accent-warning: #FF6B35;    /* Оранжевый */
--accent-danger: #FF4757;     /* Красный */
--bg-primary: #0D0D0D;        /* Фон */
--bg-card: #1A1A2E;           /* Карточки */
```

### Анимации
- **Framer Motion** для всех анимаций
- `AnimatePresence` для входа/выхода компонентов
- `layout` prop для анимации изменения размеров
- Staggered animations с `delay` для списков

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
| GET | `/api/v1/runs/journal` | История экстракций |
| POST | `/api/v1/tasks/` | Создать задачу |
| POST | `/api/v1/tasks/{id}/start` | Начать задачу |
| POST | `/api/v1/tasks/{id}/complete` | Завершить |
| POST | `/api/v1/tasks/{id}/fail` | Провалить |
| DELETE | `/api/v1/tasks/{id}` | Удалить pending |
| GET | `/api/v1/templates/` | Список шаблонов |
| POST | `/api/v1/templates/` | Создать шаблон |
| GET | `/api/v1/presets/` | Список пресетов |
| POST | `/api/v1/presets/` | Создать пресет |
| POST | `/api/v1/presets/{id}/apply` | Применить пресет |

---

## 🔮 Roadmap (запланировано)

1. **Boss Fights** — коллективные цели, урон за T3 задачи
2. **Co-op Raids** — групповые челленджи
3. **Loot System** — награды за стрики
4. **Achievements** — бейджи
5. **Analytics Dashboard** — статистика продуктивности
