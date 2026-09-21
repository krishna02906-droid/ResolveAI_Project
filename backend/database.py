import os
from typing import AsyncGenerator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker

# Database URL configuration
# Default fallback to SQLite for immediate local execution without external setup.
# In production with Azure SQL or PostgreSQL:
# e.g. mssql+aioodbc://... or postgresql+asyncpg://...
DEFAULT_ASYNC_SQLITE_URL = "sqlite+aiosqlite:///./resolveai.db"
DEFAULT_SYNC_SQLITE_URL = "sqlite:///./resolveai.db"

DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_ASYNC_SQLITE_URL)
SYNC_DATABASE_URL = os.getenv(
    "SYNC_DATABASE_URL",
    DATABASE_URL.replace("+aiosqlite", "").replace("+asyncpg", "").replace("+aioodbc", "")
)

# Async Engine & SessionFactory
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",
    future=True,
    # SQLite-specific connection args for concurrent safety
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Sync Engine & SessionFactory (for migrations, seed scripts, and admin utilities)
sync_engine = create_engine(
    SYNC_DATABASE_URL,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False} if "sqlite" in SYNC_DATABASE_URL else {},
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False,
)

# Declarative Base for models
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an asynchronous database session.
    Automatically handles commit/rollback and closes the session on finish.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
