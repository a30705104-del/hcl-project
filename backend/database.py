from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from backend import models
    Base.metadata.create_all(bind=engine)
    # Seed initial machine if not exists
    db = SessionLocal()
    try:
        existing = db.query(models.Machine).filter_by(machine_id=settings.MACHINE_ID).first()
        if not existing:
            m = models.Machine(
                machine_id=settings.MACHINE_ID,
                name="Industrial Motor Unit",
                type="3-Phase Induction Motor",
                location="Sector 4 - Line B",
                rated_power=5.5,
                status="RUNNING"
            )
            db.add(m)
            db.commit()
    finally:
        db.close()
