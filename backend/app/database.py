from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

engine = create_engine("sqlite:///./inquira.db", connect_args={"check_same_thread": False})


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
