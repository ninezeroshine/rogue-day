# Rogue-Day 🎯

> Roguelike ToDo App для людей с СДВГ — каждый день новый "ран"

## 🎮 Концепция

Геймифицированный планировщик, использующий механики Roguelike и Extraction для создания устойчивой мотивации:

- **Tabula Rasa** — каждый день начинается с чистого листа
- **Tiers** — задачи разной сложности (T1 разминка → T3 фокус)
- **Экстракция** — сохранение прогресса в конце дня
- **XP + Энергия** — игровая экономика

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
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Zustand (server-synced state)
- Framer Motion (анимации)
- OpenAPI TypeScript codegen

### Backend
- FastAPI + Python 3.12
- PostgreSQL (Railway)
- SQLAlchemy 2.x (async)
- Secure Telegram auth (HMAC-SHA256)

## 🔐 Безопасность

- ✅ Telegram `initData` валидация через HMAC-SHA256
- ✅ Проверка `auth_date` (24h expiration)
- ✅ Dependency Injection через `get_current_user`
- ✅ Составные индексы БД для производительности

## 📂 Структура

```
rogue-day/
├── app/                    # Frontend (TMA)
│   ├── src/
│   │   ├── components/     # UI компоненты
│   │   ├── pages/          # Страницы (Run, Journal, Profile)
│   │   ├── store/          # Zustand server-synced store
│   │   ├── hooks/          # React hooks (useTelegram, useTimer)
│   │   └── lib/            # API client + auto-generated types
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
└── README.md
```

## 🚀 Локальная разработка

### Frontend
```bash
cd app
npm install
npm run dev
# Открыть: http://127.0.0.1:5173

# Сгенерировать типы из OpenAPI:
npm run generate:api
```

### Backend
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

## 📄 Лицензия

MIT

