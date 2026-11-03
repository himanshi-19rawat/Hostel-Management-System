from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

engine_options = {"pool_pre_ping": True}
if settings.SQLALCHEMY_DATABASE_URI.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}
else:
    engine_options.update({"pool_recycle": 3600, "pool_size": 10, "max_overflow": 20})

engine = create_engine(settings.SQLALCHEMY_DATABASE_URI, **engine_options)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
