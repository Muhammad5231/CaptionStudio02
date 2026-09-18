import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger("captionstudio.database")

is_sqlite = "sqlite" in settings.DATABASE_URL.lower()

if is_sqlite:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL configuration with connection pooling
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _migrate_existing_schema():
    """Dynamically applies non-destructive column additions to existing tables."""
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if "projects" in tables:
            columns = [c["name"] for c in inspector.get_columns("projects")]
            with engine.begin() as conn:
                if "user_id" not in columns:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN user_id VARCHAR(36)"))
                if "aspect_ratio" not in columns:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN aspect_ratio VARCHAR(20) DEFAULT '9:16'"))
                if "active_track_id" not in columns:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN active_track_id VARCHAR(36)"))
                if "is_deleted" not in columns:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN is_deleted BOOLEAN DEFAULT 0"))

        if "export_jobs" in tables:
            columns = [c["name"] for c in inspector.get_columns("export_jobs")]
            with engine.begin() as conn:
                if "user_id" not in columns:
                    conn.execute(text("ALTER TABLE export_jobs ADD COLUMN user_id VARCHAR(36)"))
                if "track_id" not in columns:
                    conn.execute(text("ALTER TABLE export_jobs ADD COLUMN track_id VARCHAR(36)"))
                if "retry_count" not in columns:
                    conn.execute(text("ALTER TABLE export_jobs ADD COLUMN retry_count INTEGER DEFAULT 0"))
                if "max_retries" not in columns:
                    conn.execute(text("ALTER TABLE export_jobs ADD COLUMN max_retries INTEGER DEFAULT 3"))
                if "cancel_requested" not in columns:
                    conn.execute(text("ALTER TABLE export_jobs ADD COLUMN cancel_requested BOOLEAN DEFAULT 0"))
                if "started_at" not in columns:
                    conn.execute(text("ALTER TABLE export_jobs ADD COLUMN started_at DATETIME"))
    except Exception as e:
        logger.warning(f"Schema migration warning: {e}")

def init_db():
    """Initializes tables, migrates missing columns, and seeds default administrator."""
    from app.models.models import UserModel, SubscriptionModel
    from app.core.security import get_password_hash
    
    # 1. Run dynamic schema sync for existing tables
    _migrate_existing_schema()

    # 2. Create any missing new tables
    Base.metadata.create_all(bind=engine)
    
    # 3. Seed default admin if needed
    db = SessionLocal()
    try:
        admin_email = settings.DEFAULT_ADMIN_EMAIL.lower().strip()
        existing_admin = db.query(UserModel).filter(UserModel.email == admin_email).first()
        if not existing_admin:
            admin_user = UserModel(
                name="Admin",
                email=admin_email,
                password_hash=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                role="admin",
                status="active"
            )
            db.add(admin_user)
            db.flush()
            
            sub = SubscriptionModel(
                user_id=admin_user.id,
                plan_id="enterprise",
                status="active"
            )
            db.add(sub)
            db.commit()
            logger.info(f"Initialized default administrator: {admin_email}")
    except Exception as e:
        logger.warning(f"Database seed warning: {e}")
        db.rollback()
    finally:
        db.close()
