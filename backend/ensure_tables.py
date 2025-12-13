"""
Script to ensure all database tables exist.
Can be run on Railway to create missing tables.
"""
import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
except ImportError:
    print("❌ SQLAlchemy not installed or environment not active.")
    sys.exit(1)

from app.database import Base, engine
from app.models import (
    User, Run, Task, Extraction,
    TaskTemplate, Preset, PresetTemplate
)

async def ensure_tables():
    """Ensure all tables exist in the database."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not found.")
        print("   Set DATABASE_URL environment variable.")
        return False

    print(f"🔄 Connecting to database...")
    
    try:
        async with engine.begin() as conn:
            print("✅ Connection successful!")
            
            # Check existing tables using SQL query
            result = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """))
            existing_tables = {row[0] for row in result}
            
            print(f"\n📊 Existing tables: {sorted(existing_tables)}")
            
            # Expected tables
            expected_tables = {
                "users", "runs", "tasks", "extractions",
                "task_templates", "presets", "preset_templates"
            }
            
            missing_tables = expected_tables - existing_tables
            
            if missing_tables:
                print(f"\n⚠️  Missing tables: {sorted(missing_tables)}")
                print("🔄 Creating missing tables...")
                
                # Create all tables using Base.metadata
                await conn.run_sync(Base.metadata.create_all)
                
                # Verify creation
                result = await conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                """))
                new_tables = {row[0] for row in result}
                still_missing = expected_tables - new_tables
                
                if still_missing:
                    print(f"❌ Failed to create tables: {sorted(still_missing)}")
                    return False
                else:
                    print(f"✅ All tables created successfully!")
                    print(f"📊 Tables now: {sorted(new_tables)}")
            else:
                print(f"✅ All required tables exist!")
            
            # Check table row counts
            print("\n📈 Table row counts:")
            for table in sorted(expected_tables):
                try:
                    result = await conn.execute(text(f"SELECT count(*) FROM {table}"))
                    count = result.scalar()
                    print(f"  {table}: {count} rows")
                except Exception as e:
                    print(f"  ❌ {table}: Error - {str(e)}")
            
            return True
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    success = asyncio.run(ensure_tables())
    sys.exit(0 if success else 1)

