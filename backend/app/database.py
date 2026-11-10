import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if not DATABASE_URL:
    # Default to inquira.db in the backend folder
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    db_file = os.path.join(base_dir, "inquira.db")
    DATABASE_URL = f"sqlite:///{db_file}"

if DATABASE_URL.startswith("sqlite"):
    # Strip sqlite prefix to inspect and prepare directory
    clean_path = DATABASE_URL.replace("sqlite:////", "/").replace("sqlite:///", "")
    db_dir = os.path.dirname(os.path.abspath(clean_path))

    # Ensure target directory exists and is writable; fallback if read-only (e.g. unmounted /data on Render)
    try:
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
        # Test creating / opening file
        test_file = os.path.abspath(clean_path)
        with open(test_file, "a"):
            pass
    except (OSError, IOError):
        fallback_dir = "/tmp" if os.path.exists("/tmp") else os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        clean_path = os.path.join(fallback_dir, "inquira.db")
        DATABASE_URL = f"sqlite:///{clean_path}"

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _fk_on(conn, _):
        conn.execute("PRAGMA foreign_keys=ON")

SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
