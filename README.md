# Rogue-Day 🎯

> Roguelike ToDo App для людей с СДВГ — каждый день новый "ран"

## 🎮 Концепция

Геймифицированный планировщик, использующий механики Roguelike и Extraction для создания устойчивой мотивации:

- **Tabula Rasa** — каждый день начинается с чистого листа
- **Tiers** — задачи разной сложности (T1 разминка → T3 фокус)
- **Экстракция** — сохранение прогресса в конце дня
- **XP + Энергия** — игровая экономика
- **Шаблоны & Пресеты** — сохраняй любимые задачи для быстрого старта

## 🔗 Ссылки

| Компонент | URL |
|-----------|-----|
| 📱 Mini App | https://rogue-day.vercel.app |
| 🤖 Telegram Bot | https://t.me/RogueDay_bot |
| 🖥️ API | https://rogue-day-production.up.railway.app |
| 📚 API Docs | https://rogue-day-production.up.railway.app/docs |
| 💻 GitHub | https://github.com/ninezeroshine/rogue-day |

## 🛠️ Стек

### Frontend (Telegram Mini App)
| Технология | Версия | Назначение |
|------------|--------|------------|
| **React** | 19.x | UI Library |
| **Vite** | 7.x | Build tool, HMR |
| **TypeScript** | 5.9 | Строгая типизация |
| **Zustand** | 5.x | Server-synced state |
| **Framer Motion** | 12.x | Анимации |
| **Tailwind CSS** | 4.x | Utility-first CSS |
| **Lucide React** | 0.513 | Иконки |
| **@twa-dev/sdk** | 8.x | Telegram Mini App SDK |

### Backend
| Технология | Версия | Назначение |
|------------|--------|------------|
| **FastAPI** | 0.109+ | Async Python API |
| **PostgreSQL** | 15+ | Primary DB (Railway) |
| **SQLAlchemy** | 2.x | Async ORM (asyncpg) |
| **Pydantic** | 2.x | Validation, schemas |

## 🔐 Безопасность

- ✅ Telegram `initData` валидация через HMAC-SHA256
- ✅ Проверка `auth_date` (24h expiration)
- ✅ Dependency Injection через `get_current_user`
- ✅ Составные индексы БД для производительности

## 📂 Структура проекта

```
rogue-day/
├── app/                    # Frontend (TMA)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/     # AppLayout, BottomTabBar
│   │   │   ├── run/        # TaskSlot, Modals, EnergyMeter, XPCounter
│   │   │   └── journal/    # JournalDayCard, JournalEntryModal
│   │   ├── pages/          # RunPage, JournalPage, ProfilePage, TemplatesPage
│   │   ├── store/          # Zustand server-synced store
│   │   ├── hooks/          # useTelegram, useTimer, useSync
│   │   └── lib/
│   │       ├── api.ts      # API client + auto-generated types
│   │       ├── constants.ts # Game config (frontend mirror)
│   │       └── icons.tsx   # Centralized Lucide icons
│   └── vercel.json         # SPA routing config
│
├── backend/                # Backend (FastAPI)
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/  # REST API routes
│   │   │   └── dependencies.py  # Auth dependency
│   │   ├── core/           # Game config (TIER_CONFIG)
│   │   ├── models.py       # SQLAlchemy models
│   │   └── main.py         # FastAPI app
│   └── railway.toml        # Railway config (auto-migrations)
│
├── start-dev.bat           # Windows dev launcher
├── LOCAL_DEV.md            # Local development guide
└── README.md
```

## 🚀 Локальная разработка

### Quick Start (Windows)
```bash
# Запустить оба сервера одной командой
start-dev.bat
```

### Manual Setup

#### Frontend
```bash
cd app
npm install
npm run dev
# Открыть: http://127.0.0.1:5173

# Сгенерировать типы из OpenAPI:
npm run generate:api
```

#### Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -e .
cp .env.example .env

# Добавить в .env для dev-режима:
ALLOW_DEV_MODE=true

uvicorn app.main:app --reload
# Открыть: http://127.0.0.1:8000
```

## 📊 Игровые механики

| Tier | Название | Длительность | Энергия | Базовый XP | Провал |
|------|----------|--------------|---------|------------|--------|
| T1 | Разминка | 2-5 мин | 0 | 15 | Невозможен |
| T2 | Рутина | 10-15 мин | 5 | 65 | -энергия |
| T3 | Фокус | 25-30 мин | 15 | 175 | -10% XP |

### Формула XP
```
xp = base_xp × (duration / duration_min) × timer_multiplier
// timer_multiplier: 1.0 с таймером, 0.8 без
```

## 📱 Страницы приложения

| Страница | Описание |
|----------|----------|
| **Run** | Главный экран — управление задачами, энергией, XP |
| **Templates** | Шаблоны задач и пресеты для быстрого старта |
| **Journal** | История экстракций, группировка по дням |
| **Profile** | Статистика, настройки, аватар |

## 🎨 Дизайн-система

- **Тёмная тема** — зелёный акцент (`#00FF88`)
- **Lucide Icons** — единая система стилизованных иконок
- **Framer Motion** — анимации и переходы
- **CSS Variables** — `var(--accent-primary)`, `var(--bg-card)`, etc.
- **Haptic Feedback** — тактильная обратная связь в Telegram

## 📄 Лицензия

MIT
