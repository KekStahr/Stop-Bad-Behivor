import asyncio
import os
import json
import time
import base64
import binascii
from collections import deque
from typing import Any, Dict, Optional
import requests
from fastapi import (
    FastAPI,
    HTTPException,
    Depends,
    Header,
    WebSocket,
    WebSocketDisconnect,
)
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


class SupportChatManager:
    """In-memory anonymous matchmaking for a single server process."""

    MAX_WAITING_PER_ROLE = 100
    MAX_MESSAGE_LENGTH = 1000
    MAX_IMAGE_SIZE = 500 * 1024
    MESSAGE_WINDOW_SECONDS = 10
    MAX_MESSAGES_PER_WINDOW = 8

    def __init__(self):
        self.waiting_seekers = []
        self.waiting_helpers = []
        self.partners = {}
        self.lock = asyncio.Lock()
        self.message_times = {}
        self.roles = {}

    async def connect(self, websocket: WebSocket, role: str):
        await websocket.accept()
        async with self.lock:
            waiting = (
                self.waiting_seekers if role == "seeker" else self.waiting_helpers
            )
            if len(waiting) >= self.MAX_WAITING_PER_ROLE:
                await websocket.close(code=1013, reason="Warteschlange ausgelastet")
                return False
            waiting.append(websocket)
            self.message_times[websocket] = deque()
            self.roles[websocket] = role

            other_queue = (
                self.waiting_helpers if role == "seeker" else self.waiting_seekers
            )
            if not other_queue:
                await websocket.send_json({"type": "waiting"})

            matches = []
            while self.waiting_seekers and self.waiting_helpers:
                seeker = self.waiting_seekers.pop(0)
                helper = self.waiting_helpers.pop(0)
                self.partners[seeker] = helper
                self.partners[helper] = seeker
                matches.append((seeker, helper))

        for seeker, helper in matches:
            await self._notify_match(seeker, helper)
        return True

    async def _notify_match(self, seeker: WebSocket, helper: WebSocket):
        try:
            await seeker.send_json({"type": "connected", "role": "seeker"})
            await helper.send_json({"type": "connected", "role": "helper"})
        except (RuntimeError, WebSocketDisconnect):
            await self.disconnect(seeker)
            await self.disconnect(helper)

    async def relay_packet(self, websocket: WebSocket, packet: dict):
        async with self.lock:
            partner = self.partners.get(websocket)
        if partner is None:
            await websocket.send_json(
                {"type": "error", "message": "Noch kein Partner verbunden."}
            )
            return
        try:
            await partner.send_json(packet)
        except (RuntimeError, WebSocketDisconnect):
            await self.disconnect(partner)

    def make_outgoing_packet(self, role: str, packet: dict):
        packet_type = packet.get("type")
        if packet_type == "user_info":
            username = packet.get("username")
            rank = packet.get("rank")
            streak = packet.get("streak")
            if (
                not isinstance(username, str)
                or not isinstance(rank, str)
                or len(username) > 40
                or len(rank) > 80
                or not username.isprintable()
                or not rank.isprintable()
                or not isinstance(streak, int)
                or isinstance(streak, bool)
                or not 0 <= streak <= 100000
            ):
                return None
            username = " ".join(username.split())
            rank = " ".join(rank.split())
            if not username or not rank:
                return None
            return {
                "type": "user_info",
                "username": username,
                "rank": rank,
                "streak": streak,
            }
        if packet_type in {"message", "sticker"}:
            text = packet.get("text")
            if not isinstance(text, str) or not text.strip() or not text.isprintable():
                return None
            if len(text) > self.MAX_MESSAGE_LENGTH:
                return None
            return {
                "type": packet_type,
                "text": text.strip(),
                "role": role,
            }
        if packet_type == "image":
            image_data = packet.get("image_data")
            content_type = packet.get("content_type")
            if (
                not isinstance(image_data, str)
                or content_type not in {"image/png", "image/jpeg"}
                or len(image_data) > ((self.MAX_IMAGE_SIZE + 2) // 3) * 4
            ):
                return None
            try:
                decoded = base64.b64decode(image_data, validate=True)
            except (binascii.Error, ValueError):
                return None
            if len(decoded) > self.MAX_IMAGE_SIZE:
                return None
            if content_type == "image/png" and not decoded.startswith(b"\x89PNG\r\n\x1a\n"):
                return None
            if content_type == "image/jpeg" and not decoded.startswith(b"\xff\xd8\xff"):
                return None
            return {
                "type": "image",
                "content_type": content_type,
                "image_data": image_data,
                "role": role,
            }
        return None

    async def allow_message(self, websocket: WebSocket) -> bool:
        now = time.monotonic()
        async with self.lock:
            times = self.message_times.get(websocket)
            if times is None:
                return False
            while times and now - times[0] > self.MESSAGE_WINDOW_SECONDS:
                times.popleft()
            if len(times) >= self.MAX_MESSAGES_PER_WINDOW:
                return False
            times.append(now)
            return True

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            for waiting in (self.waiting_seekers, self.waiting_helpers):
                if websocket in waiting:
                    waiting.remove(websocket)
            self.message_times.pop(websocket, None)
            self.roles.pop(websocket, None)
            partner = self.partners.pop(websocket, None)
            if partner is not None:
                self.partners.pop(partner, None)
                self.roles.pop(partner, None)

        if partner is not None:
            try:
                await partner.send_json({"type": "disconnected"})
            except (RuntimeError, WebSocketDisconnect):
                pass


chat_manager = SupportChatManager()


@app.websocket("/ws/support-chat/{role}")
async def support_chat_websocket(websocket: WebSocket, role: str):
    if role not in {"seeker", "helper"}:
        await websocket.close(code=1008, reason="Ungültige Chat-Rolle")
        return
    if websocket.headers.get("origin"):
        await websocket.close(code=1008, reason="Browser-Origin nicht erlaubt")
        return

    connected = await chat_manager.connect(websocket, role)
    if not connected:
        return
    try:
        while True:
            raw_packet = await websocket.receive_text()
            if len(raw_packet) > ((chat_manager.MAX_IMAGE_SIZE + 2) // 3) * 4 + 2048:
                await websocket.send_json(
                    {"type": "error", "message": "Nachricht ist zu lang."}
                )
                continue
            try:
                packet = json.loads(raw_packet)
            except json.JSONDecodeError:
                await websocket.send_json(
                    {"type": "error", "message": "Ungültiges Nachrichtenformat."}
                )
                continue
            if not isinstance(packet, dict):
                await websocket.send_json(
                    {"type": "error", "message": "Ungültiges Nachrichtenformat."}
                )
                continue
            packet_type = packet.get("type")
            if packet_type not in {"user_info", "message", "sticker", "image"}:
                await websocket.send_json(
                    {"type": "error", "message": "Unbekannter Nachrichtentyp."}
                )
                continue
            if not await chat_manager.allow_message(websocket):
                await websocket.send_json(
                    {"type": "error", "message": "Bitte sende langsamer."}
                )
                continue
            role = chat_manager.roles.get(websocket)
            outgoing = chat_manager.make_outgoing_packet(role, packet)
            if outgoing is None:
                await websocket.send_json(
                    {"type": "error", "message": "Ungültige oder zu große Nachricht."}
                )
                continue
            await chat_manager.relay_packet(websocket, outgoing)
    except WebSocketDisconnect:
        await chat_manager.disconnect(websocket)