from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from .settings import settings

is_sqlite = settings.database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}
engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=not is_sqlite,
)

if is_sqlite:
    @event.listens_for(engine, "connect")
    def _configure_sqlite(conn, _):
        conn.execute("PRAGMA foreign_keys=ON")
        if settings.database_url != "sqlite://" and ":memory:" not in settings.database_url:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA busy_timeout=5000")

SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


def get_db():
    """Yield a scoped SQLAlchemy session per HTTP request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _run_migrations() -> None:
    """Apply additive column migrations for pre-existing databases."""
    inspector = inspect(engine)
    datetime_type = "DATETIME" if is_sqlite else "TIMESTAMP"

    migrations = {
        "prompts": {
            "page": "ALTER TABLE prompts ADD COLUMN page JSON",
            "properties": "ALTER TABLE prompts ADD COLUMN properties JSON",
            "logic_rules": "ALTER TABLE prompts ADD COLUMN logic_rules JSON",
        },
        "inquiries": {
            "workspace_id": "ALTER TABLE inquiries ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id)",
            "theme": "ALTER TABLE inquiries ADD COLUMN theme VARCHAR(50) DEFAULT 'Pearl white'",
            "settings": "ALTER TABLE inquiries ADD COLUMN settings JSON",
        },
        "workspaces": {
            "order_index": "ALTER TABLE workspaces ADD COLUMN order_index INTEGER DEFAULT 0",
            "last_visited_at": f"ALTER TABLE workspaces ADD COLUMN last_visited_at {datetime_type}",
        },
    }

    with engine.begin() as connection:
        for table_name, columns_sql in migrations.items():
            existing_cols = {col["name"] for col in inspector.get_columns(table_name)}
            for col_name, ddl in columns_sql.items():
                if col_name not in existing_cols:
                    connection.execute(text(ddl))


def init_db() -> None:
    """Initialize database tables, run migrations, and ensure default seed data."""
    # Import models so all metadata tables are registered before create_all.
    from .. import models  # noqa: F401
    from ..lib.seed import ensure_default_data

    Base.metadata.create_all(engine)
    _run_migrations()
    with SessionLocal() as db:
        ensure_default_data(db, seed_demo=settings.seed_demo_data)
