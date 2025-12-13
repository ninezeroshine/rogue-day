
import asyncio
import os
import sys

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

try:
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
except ImportError:
    print("❌ SQLAlchemy not installed or environment not active.")
    sys.exit(1)

async def check_db():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not found.")
        print("   Are you running this with `railway run python debug_db.py`?")
        return

    print(f"🔄 Connecting to database...")
    
    # Create engine (echo=False to reduce noise)
    engine = create_async_engine(database_url, echo=False)
    
    try:
        async with engine.connect() as conn:
            print("✅ Connection successful!")
            
            # Check Tables
            print("\n📊 Checking Tables:")
            tables = ["users", "runs", "tasks", "task_templates", "presets", "preset_templates"]
            
            for table in tables:
                try:
                    result = await conn.execute(text(f"SELECT count(*) FROM {table}"))
                    count = result.scalar()
                    print(f"  ✅ Table '{table}' exists. Rows: {count}")
                except Exception as e:
                    print(f"  ❌ Table '{table}' MISSING or invalid. Error: {str(e)}")
            
            # Check specific user existence if possible
            # We can't check current user as we don't have initData here, 
            # but we can see if *any* users exist.
            
    except Exception as e:
        print(f"\n❌ Connection failed: {str(e)}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_db())
