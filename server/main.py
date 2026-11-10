import os
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Integer
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