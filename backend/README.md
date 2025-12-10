# Rogue-Day Backend

FastAPI backend для Rogue-Day Telegram Mini App.

## 🔗 Production

- **API:** https://rogue-day-production.up.railway.app
- **Docs:** https://rogue-day-production.up.railway.app/docs
- **Health:** https://rogue-day-production.up.railway.app/health

## 📚 API Endpoints

### Auth
- `POST /api/v1/auth/validate` — Валидация Telegram initData

### Users
- `GET /api/v1/users/me?telegram_id=...` — Получить пользователя
- `POST /api/v1/users/?telegram_id=...` — Создать/получить пользователя
- `PATCH /api/v1/users/me?telegram_id=...` — Обновить настройки

### Runs
- `GET /api/v1/runs/current?telegram_id=...` — Текущий ран
- `POST /api/v1/runs/?telegram_id=...` — Начать новый ран
- `POST /api/v1/runs/{run_id}/extract?telegram_id=...` — Экстракция

### Tasks
- `POST /api/v1/tasks/?telegram_id=...` — Создать задачу
- `POST /api/v1/tasks/{task_id}/start?telegram_id=...` — Начать
- `POST /api/v1/tasks/{task_id}/complete?telegram_id=...` — Выполнить
- `POST /api/v1/tasks/{task_id}/fail?telegram_id=...` — Провалить
- `DELETE /api/v1/tasks/{task_id}?telegram_id=...` — Удалить

## 🛠️ Локальная разработка

```bash
# Создать виртуальное окружение
python -m venv venv

# Активировать (Windows)
.\venv\Scripts\activate

# Установить зависимости
pip install -e ".[dev]"

# Скопировать env файл
cp .env.example .env
# Отредактировать .env с реальными значениями

# Запустить сервер
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## 🌍 Environment Variables

```
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=your_bot_token
WEBAPP_URL=https://rogue-day.vercel.app
SECRET_KEY=your-secret-key
CORS_ORIGINS=["https://rogue-day.vercel.app"]
```

## 📦 Деплой

Автоматический деплой на Railway при push в main.

Конфигурация в `railway.toml`:
- Root Directory: `backend`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
