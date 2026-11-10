import os
import json
from typing import Any, Dict, Optional
import requests
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Integer, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local_fallback.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class UserStatsDB(Base):
    __tablename__ = "user_stats"
    username = Column(String, primary_key=True, index=True)
    streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    total_focus_minutes = Column(Integer, default=0)
    habits_prevented = Column(Integer, default=0)


class FullUserBackupDB(Base):
    __tablename__ = "full_user_backups"
    google_sub = Column(String, primary_key=True, index=True)
    stats_json = Column(Text, nullable=False)


Base.metadata.create_all(bind=engine)
app = FastAPI(title="Reşo Cloud & Community API")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class UserStatsSchema(BaseModel):
    username: str
    streak: int
    longest_streak: int
    total_focus_minutes: int
    habits_prevented: int


class FullUserDataSchema(BaseModel):
    stats_data: Dict[str, Any]


PRIVATE_BACKUP_KEYS = {
    "account_id",
    "google_account_email",
    "cloud_backup_initialized",
    "cloud_backup_dirty",
    "google_refresh_token",
    "access_token",
    "refresh_token",
    "pin_code",
    "webhook_url",
}


def get_google_user_id(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Google-Anmeldung erforderlich")

    access_token = authorization[7:].strip()
    if not access_token:
        raise HTTPException(status_code=401, detail="Ungültiges Google-Token")

    try:
        response = requests.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=5,
        )
        response.raise_for_status()
        userinfo = response.json()
    except (requests.RequestException, ValueError):
        raise HTTPException(status_code=401, detail="Google-Token ist ungültig")

    google_sub = userinfo.get("sub")
    if not google_sub:
        raise HTTPException(status_code=401, detail="Google-Konto konnte nicht bestätigt werden")
    return google_sub


@app.post("/sync")
def sync_stats(stats: UserStatsSchema, db: Session = Depends(get_db)):
    db_user = db.query(UserStatsDB).filter(UserStatsDB.username == stats.username).first()
    if not db_user:
        db_user = UserStatsDB(username=stats.username)
        db.add(db_user)
    
    db_user.streak = stats.streak
    db_user.longest_streak = stats.longest_streak
    db_user.total_focus_minutes = stats.total_focus_minutes
    db_user.habits_prevented = stats.habits_prevented
    db.commit()
    return {"status": "success"}


@app.post("/user/backup")
def save_user_backup(
    data: FullUserDataSchema,
    google_sub: str = Depends(get_google_user_id),
    db: Session = Depends(get_db),
):
    safe_stats = {
        key: value
        for key, value in data.stats_data.items()
        if key not in PRIVATE_BACKUP_KEYS
    }
    db_backup = (
        db.query(FullUserBackupDB)
        .filter(FullUserBackupDB.google_sub == google_sub)
        .first()
    )
    if db_backup is None:
        db_backup = FullUserBackupDB(google_sub=google_sub, stats_json="{}")
        db.add(db_backup)
    db_backup.stats_json = json.dumps(safe_stats)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Backup konnte nicht gespeichert werden")
    return {"status": "backup_success"}


@app.get("/user/restore")
def restore_user_backup(
    google_sub: str = Depends(get_google_user_id),
    db: Session = Depends(get_db),
):
    db_backup = (
        db.query(FullUserBackupDB)
        .filter(FullUserBackupDB.google_sub == google_sub)
        .first()
    )
    if db_backup is None:
        raise HTTPException(status_code=404, detail="Kein Backup gefunden")
    return {
        "stats_data": json.loads(db_backup.stats_json),
    }


@app.get("/sync/{username}")
def get_stats(username: str, db: Session = Depends(get_db)):
    db_user = db.query(UserStatsDB).filter(UserStatsDB.username == username).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Nutzer nicht gefunden")
    return {
        "username": db_user.username,
        "streak": db_user.streak,
        "longest_streak": db_user.longest_streak,
        "total_focus_minutes": db_user.total_focus_minutes,
        "habits_prevented": db_user.habits_prevented,
    }

def _community_totals(db: Session):
    users = db.query(UserStatsDB).all()
    total_minutes = sum(user.total_focus_minutes for user in users)
    return {
        "active_users": len(users),
        "total_focus_minutes": total_minutes,
        "total_habits_prevented": sum(user.habits_prevented for user in users),
        "community_streak_hours": sum(user.streak for user in users) * 24,
        "total_active_users": len(users),
        "total_community_focus_minutes": total_minutes,
    }

@app.get("/community")
def get_community(db: Session = Depends(get_db)):
    return _community_totals(db)

@app.get("/community/stats")
def get_community_stats(db: Session = Depends(get_db)):
    return _community_totals(db)