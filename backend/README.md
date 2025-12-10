# Rogue-Day Backend

FastAPI backend for Rogue-Day Telegram Mini App.

## Local Development

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Copy env file
cp .env.example .env
# Edit .env with your values

# Run server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## API Docs

After running, visit: http://127.0.0.1:8000/docs

## Deployment

Deployed on Railway with PostgreSQL and Redis.
