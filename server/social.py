"""Community: friends, chats (with images), blocking/reporting, reactions,
shared challenges and the trusted-person ("Vertrauensperson") help system.

The secret author_id never leaves the server; others only see the derived public code.
"""
import hashlib
import json
import random
import re
import time
from collections import deque
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import Column, Float, Integer, String, Text, UniqueConstraint, inspect, text
from sqlalchemy.orm import Session

from main import Base, _validate_forum_identity, _validate_forum_media, app, client_ip, engine, get_db

SOCIAL_CHANNELS = [
    {"id": "general", "name": "Allgemein", "emoji": "💬"},
    {"id": "alcohol", "name": "Alkohol", "emoji": "🍷"},
    {"id": "nicotine", "name": "Nikotin", "emoji": "🚭"},
    {"id": "drugs", "name": "Drogen", "emoji": "💊"},
    {"id": "gambling", "name": "Glücksspiel", "emoji": "🎰"},
    {"id": "gaming", "name": "Gaming", "emoji": "🎮"},
    {"id": "porn", "name": "Pornografie", "emoji": "🔞"},
    {"id": "social", "name": "Social Media", "emoji": "📱"},
    {"id": "food", "name": "Essen", "emoji": "🍔"},
    {"id": "shopping", "name": "Kaufsucht", "emoji": "🛍️"},
    {"id": "relatives", "name": "Angehörige", "emoji": "🤝"},
]
SOCIAL_CHANNEL_IDS = {channel["id"] for channel in SOCIAL_CHANNELS}
# Hidden rooms for believers. Only listed for clients that enabled the faith area; the server
# never stores anyone's religion – the client sends it with each request.
FAITH_CHANNELS = [
    {"id": "christian", "name": "Christlicher Raum", "emoji": "✝", "religion": "christian"},
    {"id": "islam", "name": "Muslimischer Raum", "emoji": "☪", "religion": "islam"},
    {"id": "together", "name": "Gemeinsam glauben", "emoji": "🤝", "religion": ""},
]


def _faith_set(value):
    return {item for item in str(value or "").split(",") if item in {"christian", "islam"}}


def _faith_allowed(target, faith):
    channel = next((item for item in FAITH_CHANNELS if item["id"] == target), None)
    return channel is not None and bool(faith) and (not channel["religion"] or channel["religion"] in faith)
ADDICTION_NAMES = {channel["id"]: channel["name"] for channel in SOCIAL_CHANNELS}
ONLINE_SECONDS = 90
MAX_FRIENDS = 200
REACTIONS = {
    "💪", "❤️", "🙏", "🔥", "🫂", "👍", "👏", "🙌", "😂", "😊", "🥰", "😢", "😮", "🤝", "💯", "✨",
    "🌱", "🏆", "⭐", "🎉", "💚", "💙", "🌈", "☀️", "🕊️", "🤲", "✝️", "☪️", "👀", "😴",
}
REPORT_REASONS = {"spam", "harassment", "dealing", "danger", "other"}
OFFER_TIMEOUT = 45          # seconds a trusted person has to answer
SEARCH_LIMIT = 20 * 60      # stop searching after 20 minutes
SESSION_SECONDS = 5 * 60    # a crisis chat runs in 5-minute rounds
DECIDE_SECONDS = 120        # time both sides have to say "keep talking"
ANONYMOUS = {"seeker": "Hilfesuchende Person", "helper": "Vertrauensperson"}
COMMUNITY_TIPS = [
    "Lange Sitzungen am Bildschirm erhöhen bei vielen das Verlangen. Steh jede Stunde kurz auf.",
    "Schlechter Schlaf ist einer der häufigsten Rückfall-Auslöser. Ab 23 Uhr: Bildschirm aus.",
    "Hunger, Wut, Einsamkeit, Müdigkeit (HALT) – prüfe kurz, was davon gerade zutrifft.",
    "Verlangen dauert meist 15–30 Minuten. Plane für diese Zeit etwas, das deine Hände beschäftigt.",
    "Die ersten zwei Wochen und Wochenend-Abende sind für viele die schwierigsten Zeiten.",
]
from challenges import CHALLENGES, CHALLENGE_IDS, CATEGORIES as CHALLENGE_CATEGORIES  # noqa: E402
QUOTES = [
    ["Du musst nicht den ganzen Weg sehen. Nur den nächsten Schritt.", "Reşo"],
    ["Es ist nie „nur einmal“. Bleib dran.", "Reşo"],
    ["Das Verlangen geht vorbei – ob du nachgibst oder nicht.", "Reşo"],
    ["Du musst heute nicht perfekt sein. Nur nüchtern.", "Reşo"],
    ["Nüchtern ist nicht langweilig. Nüchtern ist echt.", "Reşo"],
    ["Heute Nein sagen heißt morgen klar aufwachen.", "Reşo"],
    ["Kein Rausch ist so gut wie ein klarer Morgen.", "Reşo"],
    ["Wer ein Warum zum Leben hat, erträgt fast jedes Wie.", "Friedrich Nietzsche"],
    ["Wir leiden öfter in der Vorstellung als in der Wirklichkeit.", "Seneca"],
    ["Was uns im Weg steht, wird zum Weg.", "Marc Aurel"],
    ["Fall siebenmal hin, steh achtmal auf.", "Japanisches Sprichwort"],
]
URL_PATTERN = re.compile(r"(https?://|www\.)\S+", re.IGNORECASE)
write_times = {}


# ---------------------------------------------------------------- models
class CommunityProfileDB(Base):
    __tablename__ = "community_profiles"
    author_id = Column(String(32), primary_key=True)
    public_id = Column(String(10), unique=True, index=True, nullable=False)
    name = Column(String(32), nullable=False)
    last_seen = Column(Float, nullable=False, default=0.0)
    show_online = Column(Integer, nullable=False, default=1)
    addiction = Column(String(20), nullable=True)
    helper_enabled = Column(Integer, nullable=True, default=0)
    helper_schedule = Column(Text, nullable=True)
    tz_offset = Column(Integer, nullable=True, default=0)
    helper_cooldown_until = Column(Float, nullable=True, default=0.0)
    helpful_count = Column(Integer, nullable=True, default=0)
    unhelpful_count = Column(Integer, nullable=True, default=0)


class FriendshipDB(Base):
    __tablename__ = "community_friendships"
    id = Column(Integer, primary_key=True, index=True)
    requester = Column(String(10), nullable=False, index=True)
    addressee = Column(String(10), nullable=False, index=True)
    status = Column(String(10), nullable=False, default="pending")
    created_at = Column(Float, nullable=False)
    __table_args__ = (UniqueConstraint("requester", "addressee", name="uq_friendship_pair"),)


class ChatMessageDB(Base):
    __tablename__ = "community_messages"
    id = Column(Integer, primary_key=True, index=True)
    room = Column(String(32), nullable=False, index=True)
    sender = Column(String(10), nullable=False)
    sender_name = Column(String(32), nullable=False)
    text = Column(String(1000), nullable=False)
    created_at = Column(Float, nullable=False)
    media_type = Column(String(32), nullable=True)
    media_data = Column(Text, nullable=True)
    reply_to = Column(Integer, nullable=True)


class BlockDB(Base):
    __tablename__ = "community_blocks"
    id = Column(Integer, primary_key=True)
    blocker = Column(String(10), nullable=False, index=True)
    blocked = Column(String(10), nullable=False, index=True)
    created_at = Column(Float, nullable=False)
    __table_args__ = (UniqueConstraint("blocker", "blocked", name="uq_block_pair"),)


class ReportDB(Base):
    __tablename__ = "community_reports"
    id = Column(Integer, primary_key=True)
    reporter = Column(String(10), nullable=False, index=True)
    target = Column(String(10), nullable=False, index=True)
    message_id = Column(Integer, nullable=True)
    message_text = Column(String(1000), nullable=True)
    reason = Column(String(20), nullable=False)
    note = Column(String(500), nullable=True)
    created_at = Column(Float, nullable=False)


class MessageReactionDB(Base):
    __tablename__ = "community_message_reactions"
    id = Column(Integer, primary_key=True)
    message_id = Column(Integer, nullable=False, index=True)
    code = Column(String(10), nullable=False)
    emoji = Column(String(16), nullable=False)
    __table_args__ = (UniqueConstraint("message_id", "code", "emoji", name="uq_message_reaction"),)


class ChallengeParticipantDB(Base):
    __tablename__ = "community_challenge_participants"
    id = Column(Integer, primary_key=True)
    challenge_id = Column(String(20), nullable=False, index=True)
    code = Column(String(10), nullable=False, index=True)
    name = Column(String(32), nullable=False)
    joined_at = Column(Float, nullable=False)
    done_days = Column(Text, nullable=False, default="[]")
    last_done_at = Column(Float, nullable=True)
    __table_args__ = (UniqueConstraint("challenge_id", "code", name="uq_challenge_member"),)


class HelpRequestDB(Base):
    __tablename__ = "community_help_requests"
    id = Column(Integer, primary_key=True, index=True)
    seeker = Column(String(10), nullable=False, index=True)
    seeker_name = Column(String(32), nullable=False)
    topic = Column(String(20), nullable=True)
    note = Column(String(300), nullable=True)
    status = Column(String(12), nullable=False, index=True)  # searching, offered, accepted, ended, cancelled, expired
    helper = Column(String(10), nullable=True, index=True)
    helper_name = Column(String(32), nullable=True)
    offered_at = Column(Float, nullable=True)
    tried = Column(Text, nullable=False, default="[]")
    events = Column(Text, nullable=False, default="[]")
    created_at = Column(Float, nullable=False)
    last_wait_note = Column(Float, nullable=True)
    accepted_at = Column(Float, nullable=True)
    session_ends_at = Column(Float, nullable=True)
    decide_started = Column(Float, nullable=True)
    votes = Column(Text, nullable=True)
    feedback = Column(String(20), nullable=True)


Base.metadata.create_all(bind=engine)


def _ensure_columns():
    """create_all never alters existing tables – add new nullable columns by hand."""
    wanted = {
        "community_profiles": {
            "addiction": "VARCHAR(20)", "helper_enabled": "INTEGER", "helper_schedule": "TEXT",
            "tz_offset": "INTEGER", "helper_cooldown_until": "FLOAT",
            "helpful_count": "INTEGER", "unhelpful_count": "INTEGER",
        },
        "community_help_requests": {
            "accepted_at": "FLOAT", "session_ends_at": "FLOAT", "decide_started": "FLOAT",
            "votes": "TEXT", "feedback": "VARCHAR(20)",
        },
        "community_messages": {"media_type": "VARCHAR(32)", "media_data": "TEXT", "reply_to": "INTEGER"},
    }
    inspector = inspect(engine)
    with engine.begin() as connection:
        for table, columns in wanted.items():
            existing = {column["name"] for column in inspector.get_columns(table)}
            for name, sql_type in columns.items():
                if name not in existing:
                    connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}"))


_ensure_columns()


# ---------------------------------------------------------------- schemas
class SocialBaseSchema(BaseModel):
    author_id: str
    author_name: str
    show_online: bool = True
    addiction: str = ""
    helper_enabled: Optional[bool] = None
    helper_schedule: Optional[str] = None
    tz_offset: Optional[int] = None
    faith: str = ""


class SyncSchema(SocialBaseSchema):
    room: str = ""
    after: int = 0


class FriendSchema(SocialBaseSchema):
    action: str
    code: str


class MessageSchema(SocialBaseSchema):
    room: str
    text: str = ""
    reply_to: Optional[int] = None
    media_type: Optional[str] = None
    media_data: Optional[str] = None


class BlockSchema(SocialBaseSchema):
    action: str
    code: str = ""


class ReportSchema(SocialBaseSchema):
    code: str
    reason: str
    message_id: Optional[int] = None
    note: str = ""


class DeleteSchema(SocialBaseSchema):
    message_id: int


class ReactSchema(SocialBaseSchema):
    message_id: int
    emoji: str


class ChallengeSchema(SocialBaseSchema):
    action: str = "list"
    id: str = ""


class HelpSchema(SocialBaseSchema):
    action: str
    id: Optional[int] = None
    decision: str = ""
    note: str = ""
    report: str = ""
    block: bool = False
    pause_minutes: int = 60


# ---------------------------------------------------------------- helpers
def public_id(author_id):
    return hashlib.sha256(f"reso-friend:{author_id.lower()}".encode()).hexdigest()[:10].upper()


def _code(code):
    cleaned = "".join(character for character in str(code) if character.isalnum()).upper()
    if len(cleaned) != 10 or any(character not in "0123456789ABCDEF" for character in cleaned):
        raise HTTPException(status_code=400, detail="Der Freundescode besteht aus 10 Zeichen (0-9, A-F).")
    return cleaned


def _rate_limit(request: Request, bucket: str, limit: int, window: int = 60):
    now = time.monotonic()
    key = (client_ip(request), bucket)
    stamps = write_times.setdefault(key, deque())
    while stamps and now - stamps[0] > window:
        stamps.popleft()
    if len(stamps) >= limit:
        raise HTTPException(status_code=429, detail="Bitte etwas langsamer.")
    stamps.append(now)
    if len(write_times) > 20000:
        for stale in [k for k, v in write_times.items() if not v or now - v[-1] > 3600]:
            write_times.pop(stale, None)


def _profile(data, db):
    name = _validate_forum_identity(data.author_id, data.author_name)
    author_id = data.author_id.lower()
    profile = db.query(CommunityProfileDB).filter(CommunityProfileDB.author_id == author_id).first()
    if profile is None:
        profile = CommunityProfileDB(author_id=author_id, public_id=public_id(author_id), helper_enabled=0, helper_cooldown_until=0.0)
        db.add(profile)
    profile.name = name
    profile.last_seen = time.time()
    profile.show_online = 1 if data.show_online else 0
    if data.addiction in SOCIAL_CHANNEL_IDS:
        profile.addiction = data.addiction
    if data.helper_enabled is not None:
        profile.helper_enabled = 1 if data.helper_enabled else 0
    if data.helper_schedule is not None:
        try:
            schedule = json.loads(data.helper_schedule) if data.helper_schedule else {}
        except ValueError:
            schedule = None
        if len(data.helper_schedule) > 300 or not isinstance(schedule, dict):
            raise HTTPException(status_code=400, detail="Ungültige Verfügbarkeit.")
        profile.helper_schedule = data.helper_schedule
    if data.tz_offset is not None and -900 <= data.tz_offset <= 900:
        profile.tz_offset = data.tz_offset
    db.commit()
    return profile


def _friendship(db, first, second):
    return db.query(FriendshipDB).filter(
        ((FriendshipDB.requester == first) & (FriendshipDB.addressee == second))
        | ((FriendshipDB.requester == second) & (FriendshipDB.addressee == first))
    ).first()


def _blocked_between(db, first, second):
    return db.query(BlockDB).filter(
        ((BlockDB.blocker == first) & (BlockDB.blocked == second))
        | ((BlockDB.blocker == second) & (BlockDB.blocked == first))
    ).first() is not None


def _blocked_by_me(db, me):
    return {row.blocked for row in db.query(BlockDB).filter(BlockDB.blocker == me).all()}


def _resolve_room(room, me, db, write=False, faith=""):
    """Storage key of a room the caller may read (and, with write=True, post to)."""
    kind, _, target = str(room).partition(":")
    if kind == "c" and target in SOCIAL_CHANNEL_IDS:
        return f"c:{target}"
    if kind == "f":
        if not _faith_allowed(target, _faith_set(faith)):
            raise HTTPException(status_code=403, detail="Dieser Raum ist nur mit aktiviertem Bereich Glaube sichtbar.")
        return f"f:{target}"
    if kind == "d":
        friend = _code(target)
        relation = _friendship(db, me, friend)
        if relation is None or relation.status != "accepted" or _blocked_between(db, me, friend):
            raise HTTPException(status_code=403, detail="Direktnachrichten sind nur unter Freunden möglich.")
        return "d:" + ":".join(sorted((me, friend)))
    if kind == "h" and target.isdigit():
        request = db.query(HelpRequestDB).filter(HelpRequestDB.id == int(target)).first()
        if request is None or me not in {request.seeker, request.helper} or request.status not in {"accepted", "deciding", "ended"}:
            raise HTTPException(status_code=403, detail="Dieser Krisen-Chat ist nicht verfügbar.")
        if write and (request.status != "accepted" or time.time() >= (request.session_ends_at or 0)):
            raise HTTPException(status_code=403, detail="Die Gesprächszeit ist vorbei.")
        return f"h:{request.id}"
    raise HTTPException(status_code=400, detail="Unbekannter Chat-Raum.")


def _anonymous_roles(rows, db):
    """Crisis chats never reveal who is talking: map real codes to role labels."""
    rooms = {row.room for row in rows if row.room.startswith("h:")}
    roles = {}
    for room in rooms:
        request = db.query(HelpRequestDB).filter(HelpRequestDB.id == int(room[2:])).first()
        if request:
            roles[room] = {request.seeker: "seeker", request.helper: "helper"}
    return roles


def _messages_payload(rows, me, db):
    roles = _anonymous_roles(rows, db)
    ids = [row.id for row in rows]
    reactions = {}
    if ids:
        for reaction in db.query(MessageReactionDB).filter(MessageReactionDB.message_id.in_(ids)).all():
            entry = reactions.setdefault(reaction.message_id, {"counts": {}, "mine": []})
            entry["counts"][reaction.emoji] = entry["counts"].get(reaction.emoji, 0) + 1
            if reaction.code == me:
                entry["mine"].append(reaction.emoji)
    # a short preview of the message being answered (only from the same room)
    reply_ids = {row.reply_to for row in rows if row.reply_to}
    replies = {}
    if reply_ids:
        for original in db.query(ChatMessageDB).filter(ChatMessageDB.id.in_(reply_ids)).all():
            replies[original.id] = original

    def reply_payload(row):
        original = replies.get(row.reply_to)
        if original is None or original.room != row.room:
            return None
        return {"id": original.id, "sender_name": sender(original)[1], "text": (original.text or "🖼️")[:140]}

    def sender(row):
        role = roles.get(row.room, {}).get(row.sender)
        if role:
            return role.upper(), ANONYMOUS[role]
        return row.sender, row.sender_name

    return [{
        "id": row.id,
        "sender_code": sender(row)[0],
        "sender_name": sender(row)[1],
        "text": row.text,
        "media_type": row.media_type,
        "media_data": row.media_data,
        "has_link": bool(URL_PATTERN.search(row.text or "")),
        "created_at": row.created_at,
        "mine": row.sender == me,
        "reactions": reactions.get(row.id, {}).get("counts", {}),
        "my_reactions": reactions.get(row.id, {}).get("mine", []),
        "reply": reply_payload(row) if row.reply_to else None,
    } for row in rows]


# Chats don't live forever: group, faith and crisis rooms keep 7 days, private messages 2 months.
RETENTION_SECONDS = {"c": 7 * 86400, "f": 7 * 86400, "h": 7 * 86400, "d": 60 * 86400}
_last_cleanup = 0.0


def _cleanup_old_messages(db, now=None):
    global _last_cleanup
    now = now or time.time()
    if now - _last_cleanup < 600:  # at most every 10 minutes
        return 0
    _last_cleanup = now
    removed = 0
    for prefix, age in RETENTION_SECONDS.items():
        ids = [row_id for (row_id,) in db.query(ChatMessageDB.id).filter(ChatMessageDB.room.like(f"{prefix}:%"), ChatMessageDB.created_at < now - age).limit(5000).all()]
        if ids:
            db.query(MessageReactionDB).filter(MessageReactionDB.message_id.in_(ids)).delete(synchronize_session=False)
            removed += db.query(ChatMessageDB).filter(ChatMessageDB.id.in_(ids)).delete(synchronize_session=False)
    if removed:
        db.commit()
    return removed


def _events(request):
    try:
        return json.loads(request.events or "[]")
    except ValueError:
        return []


def _add_event(request, message, kind="info"):
    events = _events(request)
    events.append({"t": time.time(), "text": message, "kind": kind})
    request.events = json.dumps(events[-30:])


def _available_by_schedule(profile, now):
    if not profile.helper_schedule:
        return True
    try:
        schedule = json.loads(profile.helper_schedule)
    except ValueError:
        return True
    if not isinstance(schedule, dict):  # older rows may hold anything – never let one profile break matching
        return True
    local = datetime.fromtimestamp(now, tz=timezone.utc) + timedelta(minutes=profile.tz_offset or 0)
    days = schedule.get("days")
    if isinstance(days, list) and days and local.weekday() not in days:
        return False
    start, end = schedule.get("from"), schedule.get("to")
    if not (isinstance(start, str) and isinstance(end, str) and re.fullmatch(r"\d\d:\d\d", start) and re.fullmatch(r"\d\d:\d\d", end)):
        return True
    current = local.strftime("%H:%M")
    return start <= current < end if start <= end else current >= start or current < end  # overnight window


def _match_helper(request, db, now):
    tried = set(json.loads(request.tried or "[]"))
    busy = {row.helper for row in db.query(HelpRequestDB).filter(HelpRequestDB.status.in_(["offered", "accepted", "deciding"])).all() if row.helper}
    previous = db.query(HelpRequestDB).filter(HelpRequestDB.seeker == request.seeker, HelpRequestDB.helper.isnot(None), HelpRequestDB.id != request.id).order_by(HelpRequestDB.id.desc()).first()
    candidates = [
        profile for profile in db.query(CommunityProfileDB).filter(
            CommunityProfileDB.helper_enabled == 1,
            CommunityProfileDB.last_seen > now - ONLINE_SECONDS,
            CommunityProfileDB.public_id != request.seeker,
        ).all()
        if profile.public_id not in tried
        and profile.public_id not in busy
        and (profile.helper_cooldown_until or 0) < now
        and _available_by_schedule(profile, now)
        and not _blocked_between(db, profile.public_id, request.seeker)
    ]
    # A different person each time, when there is a choice.
    fresh = [profile for profile in candidates if not previous or profile.public_id != previous.helper]
    pool = fresh or candidates
    if not pool:
        if not request.last_wait_note or now - request.last_wait_note > 30:
            request.last_wait_note = now
            _add_event(request, "Gerade ist niemand frei – wir suchen weiter. Du bist nicht allein.", "wait")
        return
    helper = random.choice(pool)
    request.status = "offered"
    request.helper = helper.public_id
    request.helper_name = helper.name
    request.offered_at = now
    _add_event(request, "Eine Vertrauensperson wurde angefragt …", "offer")


def _advance(request, db):
    """Lazy state machine, run whenever the seeker or a helper polls."""
    now = time.time()
    if request.status in {"searching", "offered"} and now - request.created_at > SEARCH_LIMIT:
        request.status = "expired"
        _add_event(request, "Leider hat sich niemand gemeldet. Bitte ruf die TelefonSeelsorge an: 0800 111 0 111 (kostenlos, 24/7).", "end")
    elif request.status == "offered" and now - (request.offered_at or now) > OFFER_TIMEOUT:
        tried = json.loads(request.tried or "[]") + [request.helper]
        request.tried = json.dumps(tried)
        request.status, request.helper, request.helper_name = "searching", None, None
        _add_event(request, "Keine Antwort – wir fragen eine andere Vertrauensperson.", "retry")
    elif request.status == "accepted" and now >= (request.session_ends_at or now):
        request.status = "deciding"
        request.decide_started = now
        request.votes = "{}"
        _add_event(request, "Die 5 Minuten sind um. Möchtet ihr weiterreden? Beide müssen zustimmen.", "decide")
    elif request.status == "deciding" and now - (request.decide_started or now) > DECIDE_SECONDS:
        request.status = "ended"
        _add_event(request, "Keine Entscheidung – der Chat ist beendet. Pass auf dich auf. 💙", "end")
    if request.status == "searching":
        _match_helper(request, db, now)
    db.commit()


def _help_payload(request, me):
    role = "seeker" if request.seeker == me else "helper"
    votes = json.loads(request.votes or "{}")
    now = time.time()
    return {
        "id": request.id,
        "status": request.status,
        "role": role,
        "topic": ADDICTION_NAMES.get(request.topic or "", "Allgemein"),
        "note": request.note or "",
        "room": f"h:{request.id}" if request.status in {"accepted", "deciding", "ended"} else "",
        "events": _events(request),
        "seconds_left": max(0, int(OFFER_TIMEOUT - (now - (request.offered_at or 0)))) if request.status == "offered" else None,
        "session_left": max(0, int((request.session_ends_at or now) - now)) if request.status == "accepted" else None,
        "decide_left": max(0, int(DECIDE_SECONDS - (now - (request.decide_started or now)))) if request.status == "deciding" else None,
        "my_vote": votes.get(role),
        "other_voted": ("helper" if role == "seeker" else "seeker") in votes,
        "feedback_given": bool(request.feedback),
    }


def _open_help_for(me, db):
    return db.query(HelpRequestDB).filter(
        ((HelpRequestDB.seeker == me) & HelpRequestDB.status.in_(["searching", "offered", "accepted", "deciding"]))
        | ((HelpRequestDB.helper == me) & HelpRequestDB.status.in_(["offered", "accepted", "deciding"]))
    ).order_by(HelpRequestDB.id.desc()).all()


# ---------------------------------------------------------------- routes
@app.get("/community/insights")
def community_insights(db: Session = Depends(get_db)):
    now = time.time()
    return {
        "tips": COMMUNITY_TIPS,
        "config": {"session_warn_default": 180, "late_night_from": 23, "late_night_to": 5, "early_recovery_days": 14},
        "community": {
            "online": db.query(CommunityProfileDB).filter(CommunityProfileDB.last_seen > now - ONLINE_SECONDS).count(),
            "helpers_online": db.query(CommunityProfileDB).filter(CommunityProfileDB.helper_enabled == 1, CommunityProfileDB.last_seen > now - ONLINE_SECONDS).count(),
            "crisis_chats_now": db.query(HelpRequestDB).filter(HelpRequestDB.status.in_(["accepted", "deciding"])).count(),
        },
        "updated": now,
    }


@app.get("/community/quotes")
def community_quotes():
    return {"quotes": QUOTES}


@app.post("/community/social/sync")
def social_sync(data: SyncSchema, db: Session = Depends(get_db)):
    profile = _profile(data, db)
    me = profile.public_id
    now = time.time()
    _cleanup_old_messages(db, now)
    relations = db.query(FriendshipDB).filter((FriendshipDB.requester == me) | (FriendshipDB.addressee == me)).all()
    others = [r.addressee if r.requester == me else r.requester for r in relations]
    blocked = _blocked_by_me(db, me)
    profiles = {p.public_id: p for p in db.query(CommunityProfileDB).filter(CommunityProfileDB.public_id.in_(others + list(blocked))).all()} if others or blocked else {}
    friends, incoming, outgoing = [], [], []
    for relation in relations:
        code = relation.addressee if relation.requester == me else relation.requester
        other = profiles.get(code)
        entry = {"code": code, "name": other.name if other else "Unbekannt",
                 "helpful": (other.helpful_count or 0) if other else 0, "unhelpful": (other.unhelpful_count or 0) if other else 0}
        if relation.status == "accepted":
            last = db.query(ChatMessageDB.id).filter(ChatMessageDB.room == "d:" + ":".join(sorted((me, code)))).order_by(ChatMessageDB.id.desc()).first()
            entry["online"] = bool(other and other.show_online and now - other.last_seen < ONLINE_SECONDS)
            entry["last_message_id"] = last[0] if last else 0
            friends.append(entry)
        elif relation.requester == me:
            outgoing.append(entry)
        else:
            incoming.append(entry)
    friends.sort(key=lambda item: (not item["online"], item["name"].lower()))

    messages, room_key, recent_ids = [], "", []
    if data.room:
        room_key = _resolve_room(data.room, me, db, faith=data.faith)
        query = db.query(ChatMessageDB).filter(ChatMessageDB.room == room_key)
        if blocked:
            query = query.filter(ChatMessageDB.sender.notin_(blocked))
        if data.after > 0:
            rows = query.filter(ChatMessageDB.id > data.after).order_by(ChatMessageDB.id.asc()).limit(100).all()
        else:
            rows = list(reversed(query.order_by(ChatMessageDB.id.desc()).limit(60).all()))
        messages = _messages_payload(rows, me, db)
        # ids still present lets clients drop messages someone deleted
        recent_ids = [row_id for (row_id,) in query.with_entities(ChatMessageDB.id).order_by(ChatMessageDB.id.desc()).limit(80).all()]

    help_items = []
    for request in _open_help_for(me, db):
        _advance(request, db)
        if request.status in {"searching", "offered", "accepted", "deciding"} and me in {request.seeker, request.helper}:
            help_items.append(_help_payload(request, me))
    online = db.query(CommunityProfileDB).filter(CommunityProfileDB.last_seen > now - ONLINE_SECONDS).count()
    online_by_channel = {}
    for (addiction,) in db.query(CommunityProfileDB.addiction).filter(CommunityProfileDB.last_seen > now - ONLINE_SECONDS).all():
        if addiction:
            online_by_channel[addiction] = online_by_channel.get(addiction, 0) + 1
    return {
        "me": {"code": me, "name": profile.name, "helper_enabled": bool(profile.helper_enabled),
               "helpful": profile.helpful_count or 0, "unhelpful": profile.unhelpful_count or 0},
        "friends": friends,
        "incoming": incoming,
        "outgoing": outgoing,
        "blocked": [{"code": code, "name": profiles[code].name if code in profiles else "Unbekannt"} for code in blocked],
        "channels": SOCIAL_CHANNELS,
        "faith_channels": [channel for channel in FAITH_CHANNELS if _faith_allowed(channel["id"], _faith_set(data.faith))],
        "online": online,
        "online_by_channel": online_by_channel,
        "helpers_online": db.query(CommunityProfileDB).filter(CommunityProfileDB.helper_enabled == 1, CommunityProfileDB.last_seen > now - ONLINE_SECONDS).count(),
        "room": data.room if room_key else "",
        "recent_ids": recent_ids,
        "messages": messages,
        "help": help_items,
    }


@app.post("/community/social/friends")
def social_friends(data: FriendSchema, request: Request, db: Session = Depends(get_db)):
    _rate_limit(request, "friends", 20)
    me = _profile(data, db).public_id
    code = _code(data.code)
    if code == me:
        raise HTTPException(status_code=400, detail="Das ist dein eigener Freundescode.")
    relation = _friendship(db, me, code)
    if data.action == "request":
        if db.query(CommunityProfileDB).filter(CommunityProfileDB.public_id == code).first() is None:
            raise HTTPException(status_code=404, detail="Zu diesem Code wurde niemand gefunden.")
        if _blocked_between(db, me, code):
            raise HTTPException(status_code=403, detail="Mit dieser Person ist keine Verbindung möglich.")
        if relation is None:
            if db.query(FriendshipDB).filter((FriendshipDB.requester == me) | (FriendshipDB.addressee == me)).count() >= MAX_FRIENDS:
                raise HTTPException(status_code=400, detail="Du hast die maximale Anzahl an Kontakten erreicht.")
            db.add(FriendshipDB(requester=me, addressee=code, status="pending", created_at=time.time()))
            db.commit()
            return {"status": "pending"}
        if relation.status == "pending" and relation.addressee == me:
            relation.status = "accepted"
            db.commit()
        return {"status": relation.status}
    if data.action == "accept":
        if relation is None or relation.addressee != me:
            raise HTTPException(status_code=404, detail="Keine offene Anfrage von diesem Code.")
        relation.status = "accepted"
        db.commit()
        return {"status": "accepted"}
    if data.action == "remove":
        if relation is not None:
            db.delete(relation)
            db.commit()
        return {"status": "removed"}
    raise HTTPException(status_code=400, detail="Unbekannte Aktion.")


@app.post("/community/social/messages")
def social_message(data: MessageSchema, request: Request, db: Session = Depends(get_db)):
    _rate_limit(request, "message", 30)
    profile = _profile(data, db)
    text_value = data.text.replace("\r\n", "\n").strip()
    media_type, media_data = _validate_forum_media(data.media_type, data.media_data)
    if len(text_value) > 1000 or any(not c.isprintable() and c not in "\n\t" for c in text_value):
        raise HTTPException(status_code=400, detail="Nachrichten dürfen höchstens 1000 Zeichen enthalten.")
    if not text_value and not media_data:
        raise HTTPException(status_code=400, detail="Schreib etwas oder hänge ein Bild an.")
    if media_data:
        _rate_limit(request, "media", 15, 3600)  # images are big – a few per hour keep the database from filling up
    room = _resolve_room(data.room, profile.public_id, db, write=True, faith=data.faith)
    reply_to = None
    if data.reply_to:
        original = db.query(ChatMessageDB).filter(ChatMessageDB.id == data.reply_to).first()
        if original is not None and original.room == room:  # answers only inside the same conversation
            reply_to = original.id
    message = ChatMessageDB(room=room, sender=profile.public_id, sender_name=profile.name, text=text_value,
                            created_at=time.time(), media_type=media_type, media_data=media_data, reply_to=reply_to)
    db.add(message)
    db.commit()
    db.refresh(message)
    return {"message": _messages_payload([message], profile.public_id, db)[0]}


@app.post("/community/social/messages/delete")
def social_delete_message(data: DeleteSchema, request: Request, db: Session = Depends(get_db)):
    _rate_limit(request, "delete", 30)
    me = _profile(data, db).public_id
    message = db.query(ChatMessageDB).filter(ChatMessageDB.id == data.message_id).first()
    if message is None or message.sender != me:
        raise HTTPException(status_code=404, detail="Nur eigene Nachrichten lassen sich löschen.")
    db.query(MessageReactionDB).filter(MessageReactionDB.message_id == message.id).delete()
    db.delete(message)
    db.commit()
    return {"deleted": data.message_id}


@app.post("/community/social/react")
def social_react(data: ReactSchema, request: Request, db: Session = Depends(get_db)):
    _rate_limit(request, "react", 60)
    me = _profile(data, db).public_id
    if data.emoji not in REACTIONS:
        raise HTTPException(status_code=400, detail="Diese Reaktion gibt es nicht.")
    message = db.query(ChatMessageDB).filter(ChatMessageDB.id == data.message_id).first()
    if message is None:
        raise HTTPException(status_code=404, detail="Nachricht nicht gefunden.")
    kind = message.room.split(":")[0]
    if kind == "d" and me not in message.room.split(":")[1:]:
        raise HTTPException(status_code=403, detail="Kein Zugriff auf diese Nachricht.")
    if kind in {"h", "f"}:
        _resolve_room(message.room, me, db, faith=data.faith)
    existing = db.query(MessageReactionDB).filter_by(message_id=message.id, code=me, emoji=data.emoji).first()
    if existing:
        db.delete(existing)
    else:
        db.add(MessageReactionDB(message_id=message.id, code=me, emoji=data.emoji))
    db.commit()
    return {"message": _messages_payload([message], me, db)[0]}


@app.post("/community/social/block")
def social_block(data: BlockSchema, db: Session = Depends(get_db)):
    me = _profile(data, db).public_id
    if data.action == "list":
        return {"blocked": sorted(_blocked_by_me(db, me))}
    code = _code(data.code)
    if code == me:
        raise HTTPException(status_code=400, detail="Du kannst dich nicht selbst blockieren.")
    existing = db.query(BlockDB).filter_by(blocker=me, blocked=code).first()
    if data.action == "block":
        if existing is None:
            db.add(BlockDB(blocker=me, blocked=code, created_at=time.time()))
        relation = _friendship(db, me, code)
        if relation is not None:
            db.delete(relation)
        db.commit()
        return {"status": "blocked"}
    if data.action == "unblock":
        if existing is not None:
            db.delete(existing)
            db.commit()
        return {"status": "unblocked"}
    raise HTTPException(status_code=400, detail="Unbekannte Aktion.")


@app.post("/community/social/report")
def social_report(data: ReportSchema, request: Request, db: Session = Depends(get_db)):
    _rate_limit(request, "report", 20, 3600)
    me = _profile(data, db).public_id
    code = _code(data.code)
    if data.reason not in REPORT_REASONS:
        raise HTTPException(status_code=400, detail="Bitte wähle einen Grund.")
    message_text = None
    if data.message_id is not None:
        message = db.query(ChatMessageDB).filter(ChatMessageDB.id == data.message_id, ChatMessageDB.sender == code).first()
        message_text = message.text if message else None
    db.add(ReportDB(reporter=me, target=code, message_id=data.message_id, message_text=message_text,
                    reason=data.reason, note=data.note[:500], created_at=time.time()))
    db.commit()
    return {"status": "reported"}


@app.post("/community/social/challenges")
def social_challenges(data: ChallengeSchema, db: Session = Depends(get_db)):
    profile = _profile(data, db)
    me = profile.public_id
    today = (datetime.now(timezone.utc) + timedelta(minutes=profile.tz_offset or 0)).date().isoformat()
    if data.action != "list":
        if data.id not in CHALLENGE_IDS:
            raise HTTPException(status_code=404, detail="Challenge nicht gefunden.")
        member = db.query(ChallengeParticipantDB).filter_by(challenge_id=data.id, code=me).first()
        if data.action == "join" and member is None:
            db.add(ChallengeParticipantDB(challenge_id=data.id, code=me, name=profile.name, joined_at=time.time(), done_days="[]"))
        elif data.action == "leave" and member is not None:
            db.delete(member)
        elif data.action == "checkin":
            if member is None:
                raise HTTPException(status_code=400, detail="Tritt der Challenge zuerst bei.")
            days = json.loads(member.done_days or "[]")
            if today not in days:
                days.append(today)
                member.done_days = json.dumps(days[-400:])
                member.last_done_at = time.time()
                member.name = profile.name
        db.commit()
    # one query for all participants instead of one per challenge (there are ~300)
    stats = {}
    for member in db.query(ChallengeParticipantDB).all():
        entry = stats.setdefault(member.challenge_id, {"participants": 0, "today": 0, "mine": None})
        days = json.loads(member.done_days or "[]")
        entry["participants"] += 1
        entry["today"] += today in days
        if member.code == me:
            entry["mine"] = days
    result = []
    for challenge in CHALLENGES:
        entry = stats.get(challenge["id"], {"participants": 0, "today": 0, "mine": None})
        done = entry["mine"] or []
        result.append({
            **challenge,
            "participants": entry["participants"],
            "done_today_total": entry["today"],
            "joined": entry["mine"] is not None,
            "my_days": len(done),
            "done_today": today in done,
        })
    feed_rows = db.query(ChallengeParticipantDB).filter(ChallengeParticipantDB.last_done_at.isnot(None)).order_by(ChallengeParticipantDB.last_done_at.desc()).limit(12).all()
    titles = {challenge["id"]: challenge for challenge in CHALLENGES}
    feed = [{
        "name": row.name, "challenge": titles[row.challenge_id]["title"], "emoji": titles[row.challenge_id]["emoji"],
        "day": len(json.loads(row.done_days or "[]")), "at": row.last_done_at, "mine": row.code == me,
    } for row in feed_rows if row.challenge_id in titles]
    return {"challenges": result, "feed": feed, "categories": [{"id": key, "emoji": emoji, "name": name} for key, (emoji, name) in CHALLENGE_CATEGORIES.items()]}


@app.post("/community/social/help")
def social_help(data: HelpSchema, request: Request, db: Session = Depends(get_db)):
    profile = _profile(data, db)
    me = profile.public_id
    if data.action == "request":
        _rate_limit(request, "help", 6, 3600)
        existing = db.query(HelpRequestDB).filter(HelpRequestDB.seeker == me, HelpRequestDB.status.in_(["searching", "offered", "accepted", "deciding"])).first()
        if existing:
            _advance(existing, db)
            return {"help": _help_payload(existing, me)}
        if len(data.note) > 300:
            raise HTTPException(status_code=400, detail="Die Nachricht darf höchstens 300 Zeichen haben.")
        help_request = HelpRequestDB(seeker=me, seeker_name=profile.name, topic=profile.addiction or "general", note=data.note.strip(),
                                     status="searching", tried="[]", events="[]", created_at=time.time())
        _add_event(help_request, "Wir suchen eine Vertrauensperson für dich …", "search")
        db.add(help_request)
        db.commit()
        _advance(help_request, db)
        return {"help": _help_payload(help_request, me)}

    if data.action == "pause":  # a helper chooses how long they do not want to be asked
        minutes = max(1, min(int(data.pause_minutes or 0), 7 * 24 * 60))
        profile.helper_cooldown_until = time.time() + minutes * 60
        db.commit()
        return {"paused_until": profile.helper_cooldown_until}

    help_request = db.query(HelpRequestDB).filter(HelpRequestDB.id == data.id).first()
    if help_request is None or me not in {help_request.seeker, help_request.helper}:
        raise HTTPException(status_code=404, detail="Diese Anfrage gibt es nicht mehr.")
    if data.action == "status":
        _advance(help_request, db)
    elif data.action == "cancel" and help_request.seeker == me:
        if help_request.status in {"searching", "offered"}:
            help_request.status = "cancelled"
            _add_event(help_request, "Anfrage beendet.", "end")
            db.commit()
    elif data.action == "respond" and help_request.helper == me and help_request.status == "offered":
        if data.decision == "accept":
            help_request.status = "accepted"
            help_request.accepted_at = time.time()
            help_request.session_ends_at = help_request.accepted_at + SESSION_SECONDS
            _add_event(help_request, "Eine Vertrauensperson ist für dich da. Ihr habt 5 Minuten – anonym.", "accepted")
        elif data.decision == "forward":
            minutes = max(1, min(int(data.pause_minutes or 60), 7 * 24 * 60))
            profile.helper_cooldown_until = time.time() + minutes * 60
            help_request.tried = json.dumps(json.loads(help_request.tried or "[]") + [me])
            help_request.status, help_request.helper, help_request.helper_name = "searching", None, None
            _add_event(help_request, "Die Vertrauensperson ist gerade beschäftigt – wir fragen jemand anderen.", "retry")
            _advance(help_request, db)
        else:
            raise HTTPException(status_code=400, detail="Unbekannte Antwort.")
        db.commit()
    elif data.action == "end" and help_request.status in {"accepted", "deciding"}:
        help_request.status = "ended"
        _add_event(help_request, "Der Chat wurde beendet. Pass auf dich auf. 💙", "end")
        db.commit()
    elif data.action == "vote" and help_request.status == "deciding":
        role = "seeker" if help_request.seeker == me else "helper"
        votes = json.loads(help_request.votes or "{}")
        votes[role] = data.decision == "continue"
        help_request.votes = json.dumps(votes)
        if votes[role] is False:
            help_request.status = "ended"
            _add_event(help_request, "Der Chat wurde beendet. Danke, dass ihr füreinander da wart. 💙", "end")
        elif votes.get("seeker") and votes.get("helper"):
            help_request.status = "accepted"
            help_request.session_ends_at = time.time() + SESSION_SECONDS
            help_request.votes = "{}"
            _add_event(help_request, "Ihr redet weiter – weitere 5 Minuten.", "accepted")
        db.commit()
    elif data.action == "feedback" and help_request.seeker == me and help_request.status == "ended" and help_request.helper:
        if help_request.feedback:
            raise HTTPException(status_code=409, detail="Du hast schon eine Rückmeldung gegeben.")
        if data.decision not in {"helpful", "not_helpful"}:
            raise HTTPException(status_code=400, detail="Bitte wähle hilfreich oder nicht hilfreich.")
        helper = db.query(CommunityProfileDB).filter(CommunityProfileDB.public_id == help_request.helper).first()
        help_request.feedback = data.decision
        if helper:
            if data.decision == "helpful":
                helper.helpful_count = (helper.helpful_count or 0) + 1
            else:
                helper.unhelpful_count = (helper.unhelpful_count or 0) + 1
        if data.report in REPORT_REASONS:
            db.add(ReportDB(reporter=me, target=help_request.helper, reason=data.report, note=f"Krisen-Chat {help_request.id}: {data.note[:400]}", created_at=time.time()))
        if data.block and not db.query(BlockDB).filter_by(blocker=me, blocked=help_request.helper).first():
            db.add(BlockDB(blocker=me, blocked=help_request.helper, created_at=time.time()))
        db.commit()
    elif data.action not in {"status", "cancel", "respond", "end", "vote", "feedback"}:
        raise HTTPException(status_code=400, detail="Unbekannte Aktion.")
    return {"help": _help_payload(help_request, me)}
