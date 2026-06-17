from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

connect_args = {}
if settings.database_url.startswith("sqlite"):
    # Allow the connection to be shared across FastAPI's threadpool workers.
    connect_args["check_same_thread"] = False

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema() -> None:
    """Lightweight, idempotent migration so existing SQLite databases gain
    columns added after they were first seeded. New databases get the full
    schema from ``Base.metadata.create_all`` in seed.py, so this only patches
    older ones."""
    if not settings.database_url.startswith("sqlite"):
        return
    # column name -> SQLite type for columns added after initial seeding.
    wanted = {"phases": "TEXT", "inspection_ms": "INTEGER"}
    with engine.begin() as conn:
        rows = conn.exec_driver_sql("PRAGMA table_info(solves)").fetchall()
        if not rows:
            return  # table doesn't exist yet; nothing to migrate
        columns = {row[1] for row in rows}
        for name, col_type in wanted.items():
            if name not in columns:
                conn.exec_driver_sql(f"ALTER TABLE solves ADD COLUMN {name} {col_type}")
