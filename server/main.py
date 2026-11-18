import os
import json
import time
import base64
import binascii
import hashlib
import hmac
from collections import deque
from typing import Any, Dict, Optional
import requests
from fastapi import (
    FastAPI,
    HTTPException,
    Depends,
    Header,
    Request,
)
from fastapi.responses import JSONResponse
from pydantic import BaseModel, conint, constr
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Integer,
    Text,
    Float,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

DEFAULT_DATABASE_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "local_fallback.db",
)
DEFAULT_DATABASE_URL = f"sqlite:///{DEFAULT_DATABASE_PATH.replace(os.sep, '/')}"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
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
app = FastAPI(title="Life Cloud & Community API")

MAX_FORUM_MEDIA_SIZE = 500 * 1024
MAX_FORUM_REQUEST_SIZE = 700 * 1024
FORUM_ALLOWED_MEDIA = {"image/png", "image/jpeg", "image/gif"}
FORUM_ALLOWED_REACTIONS = {"❤️", "👍", "😂", "🔥", "🙌", "🎯"}


MAX_REQUEST_SIZE = 1024 * 1024
MAX_BACKUP_REQUEST_SIZE = 3 * 1024 * 1024


@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    """Every write must declare its size and stay small – no memory exhaustion via huge or chunked bodies."""
    if request.method in ("POST", "PUT", "PATCH"):
        limit = MAX_BACKUP_REQUEST_SIZE if request.url.path == "/user/backup" else MAX_REQUEST_SIZE
        if request.url.path.startswith("/community/social/"):
            limit = MAX_FORUM_REQUEST_SIZE
        content_length = request.headers.get("content-length")
        if not content_length or not content_length.isdigit():
            return JSONResponse(status_code=411, content={"detail": "Die Anfragegröße fehlt."})
        if int(content_length) > limit:
            return JSONResponse(status_code=413, content={"detail": "Die Anfrage ist zu groß."})
    return await call_next(request)


def client_ip(request: Request):
    """Render sits in front of the app; its first X-Forwarded-For entry is the real client."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return request.client.host if request.client else "unknown"


sync_times = {}


def _validate_forum_identity(author_id, author_name):
    if (
        not isinstance(author_id, str)
        or len(author_id) != 32
        or any(character not in "0123456789abcdef" for character in author_id.lower())
    ):
        raise HTTPException(status_code=400, detail="Ungültige Community-ID.")
    if (
        not isinstance(author_name, str)
        or not author_name.strip()
        or len(author_name) > 32
        or not author_name.isprintable()
    ):
        raise HTTPException(
            status_code=400,
            detail="Der Name muss 1 bis 32 Zeichen enthalten.",
        )
    return " ".join(author_name.split())


def _validate_forum_media(media_type, media_data):
    if media_type is None and media_data is None:
        return None, None
    if media_type not in FORUM_ALLOWED_MEDIA or not isinstance(media_data, str):
        raise HTTPException(
            status_code=400,
            detail="Nur PNG-, JPEG- und GIF-Bilder sind erlaubt.",
        )
    if len(media_data) > ((MAX_FORUM_MEDIA_SIZE + 2) // 3) * 4:
        raise HTTPException(
            status_code=413,
            detail="Bilder dürfen höchstens 500 KB groß sein.",
        )
    try:
        decoded = base64.b64decode(media_data, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="Ungültige Bilddatei.")
    if len(decoded) > MAX_FORUM_MEDIA_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Bilder dürfen höchstens 500 KB groß sein.",
        )
    signatures = {
        "image/png": b"\x89PNG\r\n\x1a\n",
        "image/jpeg": b"\xff\xd8\xff",
        "image/gif": (b"GIF87a", b"GIF89a"),
    }
    signature = signatures[media_type]
    valid_signature = (
        decoded.startswith(signature)
        if isinstance(signature, bytes)
        else any(decoded.startswith(value) for value in signature)
    )
    if not valid_signature:
        raise HTTPException(
            status_code=400,
            detail="Dateiinhalt und Bildformat stimmen nicht überein.",
        )
    return media_type, media_data


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class UserStatsSchema(BaseModel):
    username: constr(pattern=r"^u-[0-9a-f]{16}$")
    streak: conint(ge=0, le=36500)
    longest_streak: conint(ge=0, le=36500)
    total_focus_minutes: conint(ge=0, le=10_000_000)
    habits_prevented: conint(ge=0, le=10_000_000)


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
    "last_trigger_at",
    "last_trigger_category",
    "reframing_entries",
    "emotion_stats",
    "weekday_hour_matrix",
    "daily_incidents",
    "relapse_reflections",
    "shadow_letter",
    "discipline_codex",
    "stress_detection_enabled",
    "codex_completed",
    "community_chat_settings",
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
def sync_stats(stats: UserStatsSchema, request: Request, db: Session = Depends(get_db)):
    now = time.monotonic()
    stamps = sync_times.setdefault(client_ip(request), deque())
    while stamps and now - stamps[0] > 600:
        stamps.popleft()
    if len(stamps) >= 10:
        raise HTTPException(status_code=429, detail="Bitte etwas langsamer.")
    stamps.append(now)
    if len(sync_times) > 20000:
        sync_times.clear()
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


@app.get("/community/leaderboard")
def get_community_leaderboard(db: Session = Depends(get_db)):
    users = (
        db.query(UserStatsDB)
        .order_by(UserStatsDB.streak.desc(), UserStatsDB.total_focus_minutes.desc())
        .limit(5)
        .all()
    )
    return {
        "leaderboard": [
            {
                "rank": rank,
                "username": f"Fokus-Krieger #{rank}",
                "streak": user.streak,
                "focus_minutes": user.total_focus_minutes,
            }
            for rank, user in enumerate(users, start=1)
        ]
    }


# ---- feedback from the app to the developer --------------------------------------------
FEEDBACK_AREAS = {"overview", "focus", "community", "stats", "faith", "prayer", "protection", "settings", "language", "design", "android", "other"}
feedback_times = {}


class FeedbackDB(Base):
    __tablename__ = "app_feedback"
    id = Column(Integer, primary_key=True, index=True)
    area = Column(String(20), nullable=False)
    text = Column(String(2000), nullable=False)
    version = Column(String(20), nullable=True)
    language = Column(String(8), nullable=True)
    created_at = Column(Float, nullable=False, index=True)


Base.metadata.create_all(bind=engine)


class FeedbackSchema(BaseModel):
    area: str
    text: constr(min_length=5, max_length=2000)
    version: constr(max_length=20) = ""
    language: constr(max_length=8) = ""


@app.post("/feedback")
def send_feedback(data: FeedbackSchema, request: Request, db: Session = Depends(get_db)):
    now = time.monotonic()
    stamps = feedback_times.setdefault(client_ip(request), deque())
    while stamps and now - stamps[0] > 3600:
        stamps.popleft()
    if len(stamps) >= 5:
        raise HTTPException(status_code=429, detail="Danke! Du hast in der letzten Stunde schon genug Feedback geschickt.")
    stamps.append(now)
    if len(feedback_times) > 20000:
        feedback_times.clear()
    if data.area not in FEEDBACK_AREAS:
        raise HTTPException(status_code=400, detail="Bitte wähle einen Bereich.")
    text_value = data.text.replace("\r\n", "\n").strip()
    if any(not c.isprintable() and c not in "\n\t" for c in text_value):
        raise HTTPException(status_code=400, detail="Der Text enthält ungültige Zeichen.")
    db.add(FeedbackDB(area=data.area, text=text_value, version=data.version, language=data.language, created_at=time.time()))
    db.commit()
    return {"status": "thanks"}


@app.get("/admin/feedback")
def read_feedback(x_admin_token: Optional[str] = Header(default=None), db: Session = Depends(get_db)):
    """Only for the developer: set FEEDBACK_ADMIN_TOKEN on the server and send it as X-Admin-Token."""
    expected = os.getenv("FEEDBACK_ADMIN_TOKEN", "")
    if len(expected) < 16 or not x_admin_token or not hmac.compare_digest(x_admin_token, expected):
        raise HTTPException(status_code=404, detail="Not Found")
    rows = db.query(FeedbackDB).order_by(FeedbackDB.id.desc()).limit(300).all()
    return {"feedback": [{"id": row.id, "area": row.area, "text": row.text, "version": row.version, "language": row.language, "created_at": row.created_at} for row in rows]}


import social  # noqa: E402,F401  (registers the /community/social/* routes)
