# 🔍 Rogue-Day MVP: Жёсткий Code Review

> **Цель:** Подготовка проекта к масштабированию, долгосрочной поддержке и HighLoad.

---

## 1. 🔴 RED FLAGS (Критическое)

### 1.1 🚨 БЕЗОПАСНОСТЬ: Telegram Auth — КАТАСТРОФА

**Проблема:** Любой может представиться любым пользователем.

```python
# backend/app/api/endpoints/tasks.py:21-24
@router.post("/", response_model=TaskResponse)
async def create_task(
    telegram_id: int,  # ← ЛЮБОЙ может передать ЛЮБОЙ ID!
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db)
):
```

**Frontend подтверждает проблему:**
```typescript
// app/src/lib/api.ts:16-22
const getTelegramUserId = (): number | null => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        return window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    // Dev mode fallback
    return 123456789;  // ← Hardcoded ID для всех!
};
```

**Что сломается:**
- Накрутка XP: `curl -X POST /api/v1/tasks/123/complete?telegram_id=1` — готово
- Кража прогресса других игроков
- Удаление чужих данных

**🩹 Исправление (критично внедрить до запуска):**

```python
# backend/app/api/dependencies.py (НОВЫЙ ФАЙЛ)
from fastapi import Depends, HTTPException, Header
from app.api.endpoints.auth import validate_telegram_data
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User

async def get_current_user(
    x_telegram_init_data: str = Header(..., alias="X-Telegram-Init-Data"),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency: извлекает и валидирует пользователя из initData."""
    user_data = validate_telegram_data(x_telegram_init_data)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid Telegram auth")
    
    telegram_id = user_data.get("id")
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user
```

```python
# backend/app/api/endpoints/tasks.py — БЫЛО → СТАЛО
# БЫЛО:
async def create_task(
    telegram_id: int,  # ← Доверяем клиенту
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db)
):

# СТАЛО:
async def create_task(
    task_data: TaskCreate,
    user: User = Depends(get_current_user),  # ← Валидация через initData
    db: AsyncSession = Depends(get_db)
):
```

---

### 1.2 ⏰ initData Expiration — НЕ ПРОВЕРЯЕТЕ auth_date

```python
# backend/app/api/endpoints/auth.py:14-61
def validate_telegram_data(init_data: str) -> Optional[dict]:
    # ... валидация hash ...
    # ❌ НЕТ ПРОВЕРКИ auth_date!
```

**Проблема:** Старый initData (например, 30-дневной давности) всё ещё валиден. Replay атака.

**🩹 Исправление:**
```python
import time

def validate_telegram_data(init_data: str) -> Optional[dict]:
    # ... existing validation ...
    
    # Проверка времени (макс 24 часа)
    auth_date = int(parsed.get('auth_date', [0])[0])
    if time.time() - auth_date > 86400:  # 24 hours
        return None  # Expired
    
    # ... rest of validation ...
```

---

### 1.3 🍝 SOLID Нарушения: Бизнес-логика в контроллерах

**Проблема:** XP-расчёты, энергия, штрафы — всё смешано в HTTP-хендлерах.

```python
# backend/app/api/endpoints/tasks.py:101-133 — 33 строки бизнес-логики в хендлере!
@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(task_id: int, telegram_id: int, db: ...):
    task = await _get_user_task(...)
    
    run_result = await db.execute(select(Run).where(Run.id == task.run_id))
    run = run_result.scalar_one()
    
    # ↓ ВСЁ ЭТО — БИЗНЕС-ЛОГИКА, НЕ МЕСТО ЕЙ В КОНТРОЛЛЕРЕ ↓
    run.daily_xp += task.xp_earned
    run.focus_energy = min(run.max_energy, run.focus_energy + task.energy_cost)
    run.total_focus_minutes += task.duration
    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.utcnow()
```

**Последствия:**
1. Дублирование: тот же расчёт XP в `constants.ts` на фронте
2. Невозможно unit-тестировать без поднятия БД
3. Добавление Boss Fight потребует копипасты во все хендлеры

---

### 1.4 📊 N+1 Query Problem

**⚠️ УТОЧНЕНИЕ:** Код в `runs.py:140-141` на самом деле **НЕ** N+1, т.к. запрос выше использует `selectinload(Run.tasks)` — задачи уже загружены в память.

**Реальная проблема N+1 находится в `tasks.py:114`:**
```python
# backend/app/api/endpoints/tasks.py:114 — НЕТ selectinload!
run_result = await db.execute(select(Run).where(Run.id == task.run_id))
run = run_result.scalar_one()
```

**Проблема:** При каждом вызове `complete_task`, `fail_task`, `delete_task` — отдельный запрос на Run без eager loading.

**🩹 Исправление:**
```python
# Добавить selectinload там, где нужны связанные данные
run_result = await db.execute(
    select(Run)
    .options(selectinload(Run.tasks))
    .where(Run.id == task.run_id)
)
```

---

### 1.5 🔄 Дублирование TIER_CONFIG

```python
# backend/app/api/endpoints/tasks.py:11-15
TIER_CONFIG = {
    1: {"energy_cost": 0, "base_xp": 15, "can_fail": False},
    2: {"energy_cost": 5, "base_xp": 65, "can_fail": True},
    3: {"energy_cost": 15, "base_xp": 175, "can_fail": True},
}
```

```typescript
// app/src/lib/constants.ts:9-41
export const TIER_CONFIG: Record<TierLevel, TierConfig> = {
    1: { name: "Разминка", energyCost: 0, baseXP: 15, ... },
    2: { name: "Рутина", energyCost: 5, baseXP: 65, ... },
    3: { name: "Фокус", energyCost: 15, baseXP: 175, ... },
};
```

**Проблема:** Два источника правды. Изменили на бэке — забыли на фронте.

---

### 1.6 🗄️ Отсутствие индексов БД

```python
# backend/app/models.py — Нет составных индексов!
class Run(Base):
    user_id = Column(Integer, ForeignKey("users.id", ...))
    status = Column(SQLEnum(RunStatus), default=RunStatus.ACTIVE)
    # ❌ Нет индекса (user_id, status) — а это самый частый запрос!
```

**Запрос без индекса:**
```python
# runs.py:73-74 — FULL TABLE SCAN при 100k записей
select(Run).where(Run.user_id == user.id, Run.status == RunStatus.ACTIVE)
```

---

### 1.7 🔢 Hardcoded значения вместо конфигов

```python
# backend/app/api/endpoints/runs.py:84-87
run = Run(
    user_id=user.id,
    run_date=today,
    daily_xp=0,
    focus_energy=50,  # ❌ Hardcoded!
    max_energy=50,    # ❌ Hardcoded!
    # ...
)
```

**Проблема:** Значения 50 захардкожены вместо использования `GAME_CONFIG.BASE_MAX_ENERGY`.

---

### 1.8 ❌ Неправильный расчёт XP на бэкенде

```python
# backend/app/api/endpoints/tasks.py:55
duration_multiplier = task_data.duration / 5  # ❌ Почему 5?
```

**Проблема:** На фронте XP рассчитывается как `duration / config.duration.min`, а на бэке — `duration / 5`. При T2/T3 формула будет некорректной:
- T2: min=10, бэкенд делит на 5 → x2 XP вместо x1
- T3: min=25, бэкенд делит на 5 → x5 XP вместо x1

**🩹 Исправление:**
```python
TIER_CONFIG = {
    1: {"energy_cost": 0, "base_xp": 15, "duration_min": 2, "can_fail": False},
    2: {"energy_cost": 5, "base_xp": 65, "duration_min": 10, "can_fail": True},
    3: {"energy_cost": 15, "base_xp": 175, "duration_min": 25, "can_fail": True},
}

# В create_task:
duration_multiplier = task_data.duration / config["duration_min"]
```

---

### 1.9 🔥 Streak никогда не сбрасывается

```python
# backend/app/api/endpoints/runs.py:163
user.current_streak += 1  # ❌ Всегда +1, даже если был перерыв!
```

**Проблема:** Нет проверки, был ли вчера ран. Если пользователь пропустил день — streak должен сброситься.

**🩹 Исправление:**
```python
from datetime import date, timedelta

# В extract_run:
if user.last_run_at:
    last_run_date = user.last_run_at.date()
    yesterday = date.today() - timedelta(days=1)
    if last_run_date < yesterday:
        user.current_streak = 1  # Сброс
    else:
        user.current_streak += 1
else:
    user.current_streak = 1
```

---

## 2. 🏗 ARCHITECTURE REFACTORING

### 2.1 Предлагаемая структура (Clean Architecture + Feature-based)

```
backend/
├── app/
│   ├── core/                    # Ядро (не зависит ни от чего)
│   │   ├── config.py           # Настройки
│   │   ├── security.py         # Telegram auth, hashing
│   │   └── exceptions.py       # Доменные исключения
│   │
│   ├── domain/                  # Бизнес-логика (чистая)
│   │   ├── entities/           # Pydantic-модели (не ORM!)
│   │   │   ├── user.py
│   │   │   ├── run.py
│   │   │   └── task.py
│   │   ├── services/           # Бизнес-операции
│   │   │   ├── xp_calculator.py
│   │   │   ├── energy_manager.py
│   │   │   └── run_service.py
│   │   └── game_rules/         # Константы игры
│   │       └── tier_config.py  # Единственный источник правды
│   │
│   ├── infrastructure/          # Внешние зависимости
│   │   ├── database/
│   │   │   ├── models.py       # SQLAlchemy ORM
│   │   │   ├── session.py
│   │   │   └── repositories/   # Data Access Layer
│   │   │       ├── user_repo.py
│   │   │       ├── run_repo.py
│   │   │       └── task_repo.py
│   │   └── telegram/
│   │       └── auth.py
│   │
│   ├── api/                     # HTTP слой (тонкие контроллеры)
│   │   ├── dependencies.py     # FastAPI Depends
│   │   ├── v1/
│   │   │   ├── users.py
│   │   │   ├── runs.py
│   │   │   └── tasks.py
│   │   └── schemas/            # API Request/Response
│   │       └── ...
│   │
│   └── main.py
```

---

### 2.2 Сервисный слой: Пример рефакторинга `complete_task`

**🔴 БЫЛО (33 строки в хендлере):**
```python
# tasks.py:101-133
@router.post("/{task_id}/complete")
async def complete_task(task_id: int, telegram_id: int, db: AsyncSession):
    task = await _get_user_task(task_id, telegram_id, db)
    
    if task.status not in [TaskStatus.PENDING, TaskStatus.ACTIVE]:
        raise HTTPException(status_code=400, detail="Task already finished")
    
    run_result = await db.execute(select(Run).where(Run.id == task.run_id))
    run = run_result.scalar_one()
    
    run.daily_xp += task.xp_earned
    run.focus_energy = min(run.max_energy, run.focus_energy + task.energy_cost)
    run.total_focus_minutes += task.duration
    
    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.utcnow()
    
    await db.flush()
    await db.refresh(task)
    
    return TaskResponse.model_validate(task)
```

**🟢 СТАЛО:**

```python
# domain/services/task_service.py
from dataclasses import dataclass
from typing import Protocol

class TaskRepository(Protocol):
    async def get_by_id(self, task_id: int, user_id: int) -> Task | None: ...
    async def save(self, task: Task) -> Task: ...

class RunRepository(Protocol):
    async def get_by_id(self, run_id: int) -> Run | None: ...
    async def save(self, run: Run) -> Run: ...

@dataclass
class TaskCompleteResult:
    task: Task
    xp_gained: int
    energy_restored: int

class TaskService:
    def __init__(self, task_repo: TaskRepository, run_repo: RunRepository):
        self._task_repo = task_repo
        self._run_repo = run_repo
    
    async def complete_task(self, task_id: int, user_id: int) -> TaskCompleteResult:
        task = await self._task_repo.get_by_id(task_id, user_id)
        if not task:
            raise TaskNotFoundError(task_id)
        
        if not task.can_complete():
            raise InvalidTaskStateError(f"Task {task_id} cannot be completed")
        
        run = await self._run_repo.get_by_id(task.run_id)
        
        # Бизнес-логика теперь в доменных объектах
        xp_gained = task.complete()  # Меняет статус, возвращает XP
        energy_restored = run.restore_energy(task.energy_cost)
        run.add_xp(xp_gained)
        run.add_focus_minutes(task.duration)
        
        await self._task_repo.save(task)
        await self._run_repo.save(run)
        
        return TaskCompleteResult(task, xp_gained, energy_restored)
```

```python
# api/v1/tasks.py — Тонкий контроллер
@router.post("/{task_id}/complete")
async def complete_task(
    task_id: int,
    user: User = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
):
    result = await task_service.complete_task(task_id, user.id)
    return TaskResponse.from_domain(result.task)
```

**Преимущества:**
- Unit-тесты без БД (mock репозитории)
- Логика переиспользуется для Boss Fights, Co-op
- Один источник правды

---

### 2.3 Фронтенд: Два store — это проблема

```typescript
// У вас ДВА store для одного и того же:
// 1. useRunStore.ts     — локальный с persist
// 2. useServerRunStore.ts — серверный

// Это создаёт рассинхрон!
```

**Рекомендация:** Единый store с offline-first паттерном:
```typescript
// store/useGameStore.ts
interface GameState {
    // Серверное состояние
    serverRun: RunResponse | null;
    
    // Pending operations (optimistic updates)
    pendingOperations: Operation[];
    
    // Sync status
    syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
}
```

---

## 3. ⚡ PERFORMANCE & OPTIMIZATION

### 3.1 Frontend: Re-render оптимизация

**Проблема в `RunPage.tsx`:**
```typescript
// Каждый рендер — новый массив!
const totalFocusMinutes = tasks
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + (t.duration || 0), 0);
```

**🩹 Исправление:**
```typescript
// Вынести в selector
export const useServerTotalFocusMinutes = () => 
    useServerRunStore(state => 
        (state.run?.tasks ?? [])
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + t.duration, 0)
    );
```

**Проблема: Framer Motion на каждом таске:**
```typescript
// ServerTaskList.tsx — AnimatePresence + motion.div на каждый элемент
{sortedTasks.map((task) => (
    <motion.div
        key={task.id}
        layout                    // ← ОЧЕНЬ дорого!
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
```

**🩹 Исправление:**
```typescript
// Использовать layout только когда нужно
<motion.div
    key={task.id}
    layout={false}  // Отключить layout recalc
    initial={false}  // Не анимировать при первом рендере
    // ...
>
```

---

### 3.2 Timer в setInterval — блокирует UI

```typescript
// hooks/useTimer.ts:44-57
intervalRef.current = setInterval(() => {
    setRemaining(prev => {
        const newRemaining = prev - 1;
        onTickRef.current?.(newRemaining);
        // ...
    });
}, 1000);
```

**Проблема:** `setInterval` в главном потоке. При сложных анимациях — лаги.

**🩹 Решение с Web Worker:**
```typescript
// workers/timer.worker.ts
let timerId: number | null = null;

self.onmessage = (e: MessageEvent) => {
    if (e.data.type === 'start') {
        const endTime = Date.now() + e.data.duration * 1000;
        timerId = self.setInterval(() => {
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            self.postMessage({ type: 'tick', remaining });
            if (remaining <= 0) {
                self.clearInterval(timerId!);
                self.postMessage({ type: 'complete' });
            }
        }, 100);
    }
};
```

---

### 3.3 Backend: Индексы БД

```python
# backend/app/models.py — Добавить:
from sqlalchemy import Index

class Run(Base):
    __tablename__ = "runs"
    __table_args__ = (
        Index('ix_runs_user_status', 'user_id', 'status'),
        Index('ix_runs_user_date', 'user_id', 'run_date'),
    )
    # ...

class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        Index('ix_tasks_run_status', 'run_id', 'status'),
    )
    # ...
```

---

### 3.4 Redis для сессий

Сейчас нет кэширования. При каждом запросе — поход в PostgreSQL.

```python
# Добавить кэширование активного рана:
# domain/services/run_service.py

class RunService:
    def __init__(self, run_repo, redis):
        self._redis = redis
    
    async def get_active_run(self, user_id: int) -> Run | None:
        cache_key = f"active_run:{user_id}"
        
        # Try cache
        cached = await self._redis.get(cache_key)
        if cached:
            return Run.model_validate_json(cached)
        
        # DB fallback
        run = await self._run_repo.get_active(user_id)
        if run:
            await self._redis.set(cache_key, run.model_dump_json(), ex=300)
        
        return run
```

---

## 4. 🛡 SCALABILITY ROADMAP

### 4.1 Паттерн для новых механик: Event-Driven

Чтобы добавить Boss Fight за 2 часа — нужна событийная модель.

```python
# domain/events.py
from dataclasses import dataclass
from typing import List

@dataclass
class TaskCompletedEvent:
    user_id: int
    task_id: int
    xp_earned: int
    tier: int

@dataclass
class RunExtractedEvent:
    user_id: int
    run_id: int
    total_xp: int
    tasks_completed: int

# domain/services/task_service.py
class TaskService:
    def __init__(self, event_bus: EventBus, ...):
        self._event_bus = event_bus
    
    async def complete_task(self, ...):
        # ... existing logic ...
        
        # Публикуем событие
        await self._event_bus.publish(TaskCompletedEvent(
            user_id=user_id,
            task_id=task.id,
            xp_earned=xp_gained,
            tier=task.tier,
        ))

# Теперь Boss Fight подписывается на события:
# features/boss_fight/handlers.py
class BossFightHandler:
    @subscribe(TaskCompletedEvent)
    async def on_task_completed(self, event: TaskCompletedEvent):
        # Нанести урон боссу при T3 таске
        if event.tier == 3:
            await self._boss_service.deal_damage(event.user_id, event.xp_earned)
```

---

### 4.2 Типизация Frontend ↔ Backend: OpenAPI + codegen

**Проблема:** Типы дублируются:
- `backend/app/schemas.py` — Pydantic
- `app/src/lib/api.ts` — TypeScript interfaces (вручную!)

**Решение:**

```yaml
# openapi-codegen.yaml
schema: http://localhost:8000/openapi.json
generates:
  ./app/src/lib/generated-api.ts:
    preset: typescript-react-query
```

```bash
npx openapi-typescript http://localhost:8000/openapi.json -o ./app/src/lib/api-types.ts
```

---

### 4.3 Feature Flags для A/B тестов механик

```python
# core/feature_flags.py
from enum import Enum

class Feature(Enum):
    BOSS_FIGHTS = "boss_fights"
    COOP_RAIDS = "coop_raids"
    XP_MULTIPLIER_EVENT = "xp_multiplier_event"

class FeatureFlagService:
    async def is_enabled(self, feature: Feature, user_id: int) -> bool:
        # Проверка Redis/DB
        ...
```

---

## 📋 Итого: Приоритеты

| Приоритет | Задача | Время | Риск |
|-----------|--------|-------|------|
| 🔴 P0 | Исправить Telegram auth (dependency injection) | 2-4h | Взлом аккаунтов |
| 🔴 P0 | Проверка auth_date в initData | 30min | Replay атаки |
| 🔴 P0 | Исправить расчёт XP (duration / 5 → duration / duration_min) | 30min | Неверные начисления XP |
| 🔴 P0 | Исправить логику streak (сброс при пропуске дня) | 30min | Некорректная статистика |
| 🟠 P1 | Вынести бизнес-логику в сервисы | 1-2 дня | Техдолг |
| 🟠 P1 | Добавить индексы в БД | 30min | Slow queries |
| 🟠 P1 | Убрать hardcoded значения (50 → GAME_CONFIG) | 30min | Рассинхрон конфигов |
| 🟡 P2 | Унифицировать TIER_CONFIG (один источник) | 2h | Баги |
| 🟡 P2 | Объединить два store в один | 4h | Рассинхрон |
| 🟢 P3 | OpenAPI codegen | 2h | Удобство |
| 🟢 P3 | Event-driven для новых фич | 1 день | Масштабируемость |

---

> **Вердикт:** Код рабочий, но **не production-ready**. Критические дыры в безопасности + логические ошибки в расчётах (XP, streak). Архитектура затруднит масштабирование. Рекомендую **4-6 дней рефакторинга** перед активным ростом.
