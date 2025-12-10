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
- React 18 + TypeScript + Vite
- Tailwind CSS
- Zustand (state management)
- Framer Motion (анимации)

### Backend
- FastAPI + Python 3.12
- PostgreSQL (Railway)
- SQLAlchemy (async)

## 📂 Структура

```
rouge_like_todo/
├── app/                    # Frontend (TMA)
│   ├── src/
│   │   ├── components/     # UI компоненты
│   │   ├── pages/          # Страницы (Run, Journal, Profile)
│   │   ├── store/          # Zustand stores
│   │   ├── hooks/          # React hooks
│   │   └── lib/            # Утилиты и API
│   └── vercel.json         # SPA routing config
│
├── backend/                # Backend (FastAPI)
│   ├── app/
│   │   ├── api/endpoints/  # REST API
│   │   ├── models.py       # SQLAlchemy models
│   │   └── main.py         # FastAPI app
│   └── railway.toml        # Railway config
│
└── README.md
```

## 🚀 Локальная разработка

### Frontend
```bash
cd app
npm install
npm run dev
```
Открыть: http://127.0.0.1:5173

### Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -e .
cp .env.example .env
# Настроить .env
uvicorn app.main:app --reload
```
Открыть: http://127.0.0.1:8000

## ⚠️ Известные ограничения

- Telegram user data не подтягивается корректно (в разработке)
- Аватар пользователя недоступен (ограничение Telegram API)
- Синхронизация работает частично

## 📄 Лицензия

MIT
