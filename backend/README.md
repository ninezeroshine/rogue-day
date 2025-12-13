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
- `GET /api/v1/users/me` — Получить текущего пользователя
- `POST /api/v1/users/` — Создать/получить пользователя
- `PATCH /api/v1/users/me` — Обновить настройки

### Runs
- `GET /api/v1/runs/current` — Текущий активный ран
- `POST /api/v1/runs/` — Начать новый ран
- `POST /api/v1/runs/{run_id}/extract` — Экстракция прогресса
- `GET /api/v1/runs/journal` — История экстракций

### Tasks
- `POST /api/v1/tasks/` — Создать задачу
- `POST /api/v1/tasks/from-template` — Создать из шаблона
- `POST /api/v1/tasks/{task_id}/start` — Начать выполнение
- `POST /api/v1/tasks/{task_id}/complete` — Завершить задачу
- `POST /api/v1/tasks/{task_id}/fail` — Провалить задачу
- `DELETE /api/v1/tasks/{task_id}` — Удалить задачу

### Templates
- `GET /api/v1/templates/` — Список шаблонов
- `POST /api/v1/templates/` — Создать шаблон
- `DELETE /api/v1/templates/{id}` — Удалить шаблон

### Presets
- `GET /api/v1/presets/` — Список пресетов
- `POST /api/v1/presets/` — Создать пресет
- `PATCH /api/v1/presets/{id}` — Обновить пресет
- `DELETE /api/v1/presets/{id}` — Удалить пресет
- `POST /api/v1/presets/{id}/apply` — Применить пресет к текущему рану

### Avatar
- `GET /api/v1/avatar/{telegram_id}` — Получить аватар пользователя

## 🔐 Аутентификация

Все эндпоинты (кроме `/health`) требуют заголовок:
```
X-Telegram-Init-Data: <initData from Telegram WebApp>
```

Backend валидирует подпись через HMAC-SHA256 с `TELEGRAM_BOT_TOKEN`.

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

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rogue_day

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# Security
SECRET_KEY=your-secret-key

# CORS
CORS_ORIGINS=["https://rogue-day.vercel.app","http://localhost:5173"]

# Dev Mode (ONLY for local development!)
ALLOW_DEV_MODE=true
DEV_TELEGRAM_ID=123456789
```

## 📦 Деплой

Автоматический деплой на Railway при push в main.

Конфигурация в `railway.toml`:
- Root Directory: `backend`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## 🗄️ Миграции

```bash
# Создать новую миграцию
alembic revision --autogenerate -m "description"

# Применить миграции
alembic upgrade head
```

## 📊 Game Config

Источник истины для игровых механик: `app/core/game_config.py`

```python
TIER_CONFIG = {
    1: TierConfig(name="Разминка", energy=0, base_xp=15, ...),
    2: TierConfig(name="Рутина", energy=5, base_xp=65, ...),
    3: TierConfig(name="Фокус", energy=15, base_xp=175, ...),
}
```
