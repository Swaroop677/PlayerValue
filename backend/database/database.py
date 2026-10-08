"""
Database connection and session management.

Creates the SQLAlchemy engine, session factory, and provides
a dependency function for FastAPI route handlers.

Supports both PostgreSQL and SQLite backends.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from backend.config import settings

db_url = settings.effective_database_url
is_sqlite = db_url.startswith("sqlite")

# Create the database engine
if is_sqlite:
    # SQLite needs check_same_thread=False for FastAPI's threading model
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
    )

    # Enable WAL mode and foreign keys for SQLite
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

# Session factory — each call to SessionLocal() creates a new database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session.

    Usage in a route:
        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            ...

    The session is automatically closed after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
