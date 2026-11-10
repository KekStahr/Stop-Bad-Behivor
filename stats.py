import json
import logging
import math
import os
import random
import threading
from datetime import datetime, date, timedelta
from urllib.parse import urlsplit, urlunsplit
import requests

DATA_FILE = "stats_data.json"
CLOUD_URL = os.getenv(
    "RESO_CLOUD_URL",
    "https://stop-bad-behivor-q1d4.onrender.com/sync",
).rstrip("/")
COMMUNITY_URL = CLOUD_URL.rsplit("/sync", 1)[0] + "/community"
BACKUP_URL = CLOUD_URL.rsplit("/sync", 1)[0] + "/user/backup"
RESTORE_URL = CLOUD_URL.rsplit("/sync", 1)[0] + "/user/restore"
PRIVATE_BACKUP_KEYS = {
    "account_id",
    "google_account_email",
    "cloud_backup_initialized",
    "cloud_backup_dirty",
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

class StatsManager:
    def __init__(self):
        self.data = self.load_data()
        self.last_cloud_backup_error = None
        self._backup_sync_lock = threading.Lock()
        self._backup_sync_pending = False
        self._backup_sync_thread = None

    def load_data(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r") as f:
                    data = json.load(f)
                    data.setdefault("trigger_words", ["porno", "casino", "aufschieben", "gambling", "cheat"])
                    data.setdefault("longest_streak", data.get("streak", 0))
                    data.setdefault("streak_start_iso", datetime.now().isoformat())
                    data.setdefault("trigger_stats", {})
                    data.setdefault("daily_activity", {})
                    data.setdefault("daily_moods", {})
                    data.setdefault("monthly_challenge_badges", [])
                    data.setdefault(
                        "savings_goal",
                        {"name": "Traum-Erfüllung", "target_amount": 100.0},
                    )
                    data.setdefault("last_sunday_report", "")
                    data.setdefault("shadow_letter", "")
                    data.setdefault("discipline_codex", {})
                    data.setdefault("stress_detection_enabled", False)
                    data.setdefault("codex_completed", False)
                    data.setdefault(
                        "community_chat_settings",
                        {
                            "auto_connect_trigger": True,
                            "allow_helper_mode": True,
                        },
                    )
                    data.setdefault("cloud_backup_initialized", False)
                    data.setdefault("cloud_backup_dirty", False)
                    data.setdefault("reframing_entries", [])
                    data.setdefault("emotion_stats", {})
                    data.setdefault("weekday_hour_matrix", {})
                    data.setdefault("daily_incidents", {})
                    data.setdefault("relapse_reflections", [])
                    data.setdefault("whitelist_mode_enabled", False)
                    data.setdefault(
                        "whitelisted_apps",
                        [
                            "code.exe",
                            "winword.exe",
                            "excel.exe",
                            "powerpnt.exe",
                            "python.exe",
                            "pycharm64.exe",
                            "notepad.exe",
                            "resoapp.exe",
                        ],
                    )
                    data.setdefault("incident_hours", {})
                    data.setdefault("hourly_rate", 25.0)
                    data.setdefault("pin_code", "")
                    data.setdefault("webhook_url", "")
                    data.setdefault("panic_hotkey", "<ctrl>+<alt>+x")
                    data.setdefault("level", "Disziplin-Novize")
                    return data
            except Exception:
                pass
        return {
            "timer_activations": 0,
            "total_focus_minutes": 0,
            "habits_prevented": 0,
            "streak": 0,
            "longest_streak": 0,
            "streak_start_iso": datetime.now().isoformat(),
            "last_active_date": str(date.today()),
            "trigger_words": ["porno", "casino", "aufschieben", "gambling", "cheat"],
            "trigger_stats": {},
            "daily_activity": {},
            "daily_moods": {},
            "monthly_challenge_badges": [],
            "savings_goal": {"name": "Traum-Erfüllung", "target_amount": 100.0},
            "last_sunday_report": "",
            "shadow_letter": "",
            "discipline_codex": {},
            "stress_detection_enabled": False,
            "codex_completed": False,
            "community_chat_settings": {
                "auto_connect_trigger": True,
                "allow_helper_mode": True,
            },
            "cloud_backup_initialized": False,
            "cloud_backup_dirty": False,
            "reframing_entries": [],
            "emotion_stats": {},
            "weekday_hour_matrix": {},
            "daily_incidents": {},
            "relapse_reflections": [],
            "whitelist_mode_enabled": False,
            "whitelisted_apps": [
                "code.exe",
                "winword.exe",
                "excel.exe",
                "powerpnt.exe",
                "python.exe",
                "pycharm64.exe",
                "notepad.exe",
                "resoapp.exe",
            ],
            "incident_hours": {},
            "hourly_rate": 25.0,
            "pin_code": "",
            "webhook_url": "",
            "panic_hotkey": "<ctrl>+<alt>+x",
            "level": "Disziplin-Novize"
        }

    def _write_local_data(self):
        with open(DATA_FILE, "w") as f:
            json.dump(self.data, f, indent=4)

    def save_data(self, sync_cloud_backup=True):
        if (
            sync_cloud_backup
            and self.data.get("account_id")
            and self.data.get("cloud_backup_initialized")
        ):
            self.data["cloud_backup_dirty"] = True
        self._write_local_data()
        self.sync_with_cloud()
        if sync_cloud_backup and self.data.get("cloud_backup_initialized"):
            self._schedule_cloud_backup()

    def _schedule_cloud_backup(self):
        if not self.data.get("account_id"):
            return
        with self._backup_sync_lock:
            self._backup_sync_pending = True
            if self._backup_sync_thread and self._backup_sync_thread.is_alive():
                return
            self._backup_sync_thread = threading.Thread(
                target=self._run_cloud_backup_queue,
                daemon=True,
            )
            self._backup_sync_thread.start()

    def _run_cloud_backup_queue(self):
        while True:
            with self._backup_sync_lock:
                if not self._backup_sync_pending:
                    self._backup_sync_thread = None
                    return
                self._backup_sync_pending = False
            self.sync_full_backup()

    def sync_full_backup(self):
        account_id = self.data.get("account_id")
        if not account_id:
            self.last_cloud_backup_error = "Kein Google-Konto verbunden."
            return False
        try:
            from google_oauth import get_google_access_token

            token = get_google_access_token(account_id)
            if self.data.get("cloud_backup_dirty"):
                return self.upload_full_backup(token)

            response = requests.get(
                RESTORE_URL,
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            if response.status_code == 404:
                return self.upload_full_backup(token)
            response.raise_for_status()
            backup = response.json().get("stats_data")
            if not isinstance(backup, dict):
                raise ValueError("Das Cloud-Backup hat ein ungültiges Format.")

            self.data.update(
                {
                    key: value
                    for key, value in backup.items()
                    if key not in PRIVATE_BACKUP_KEYS
                }
            )
            self.data["cloud_backup_initialized"] = True
            self.data["cloud_backup_dirty"] = False
            self._write_local_data()
            self.last_cloud_backup_error = None
            return True
        except Exception as error:
            self.last_cloud_backup_error = str(error)
            logging.exception("Cloud-Synchronisierung konnte nicht abgeschlossen werden.")
            return False

    def upload_full_backup(self, access_token=None):
        account_id = self.data.get("account_id")
        if not account_id:
            self.last_cloud_backup_error = "Kein Google-Konto verbunden."
            return False

        try:
            from google_oauth import get_google_access_token

            token = access_token or get_google_access_token(account_id)
            stats_data = {
                key: value
                for key, value in self.data.items()
                if key not in PRIVATE_BACKUP_KEYS
            }
            response = requests.post(
                BACKUP_URL,
                json={"stats_data": stats_data},
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            response.raise_for_status()
            self.last_cloud_backup_error = None
            self.data["cloud_backup_initialized"] = True
            self.data["cloud_backup_dirty"] = False
            self._write_local_data()
            return True
        except Exception as error:
            self.last_cloud_backup_error = str(error)
            logging.exception("Cloud-Backup konnte nicht hochgeladen werden.")
            return False

    def download_full_backup(self):
        account_id = self.data.get("account_id")
        if not account_id:
            self.last_cloud_backup_error = "Kein Google-Konto verbunden."
            return False

        try:
            from google_oauth import get_google_access_token

            token = get_google_access_token(account_id)
            response = requests.get(
                RESTORE_URL,
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            if response.status_code == 404:
                self.last_cloud_backup_error = "Für dieses Konto wurde kein Backup gefunden."
                return False
            response.raise_for_status()
            backup = response.json().get("stats_data")
            if not isinstance(backup, dict):
                raise ValueError("Das Cloud-Backup hat ein ungültiges Format.")

            self.data.update(
                {
                    key: value
                    for key, value in backup.items()
                    if key not in PRIVATE_BACKUP_KEYS
                }
            )
            self.data["cloud_backup_initialized"] = True
            self.data["cloud_backup_dirty"] = False
            self._write_local_data()
            self.last_cloud_backup_error = None
            return True
        except Exception as error:
            self.last_cloud_backup_error = str(error)
            logging.exception("Cloud-Backup konnte nicht wiederhergestellt werden.")
            return False

    def connect_google_account(self, userinfo, token_data):
        account_id = userinfo["sub"]
        refresh_token = token_data.get("refresh_token")
        if not refresh_token:
            raise ValueError("Google hat kein Refresh-Token ausgegeben.")
        from google_oauth import store_google_refresh_token

        store_google_refresh_token(account_id, refresh_token)
        self.data["account_id"] = account_id
        self.data["google_account_email"] = userinfo.get("email", "")
        self.data["cloud_backup_initialized"] = False
        self.data["cloud_backup_dirty"] = False
        self.save_data(sync_cloud_backup=False)
        return True

    def disconnect_google_account(self):
        account_id = self.data.get("account_id")
        if account_id:
            from google_oauth import revoke_google_refresh_token

            revoke_google_refresh_token(account_id)
        self.data.pop("account_id", None)
        self.data.pop("google_account_email", None)
        self.data.pop("cloud_backup_initialized", None)
        self.data.pop("cloud_backup_dirty", None)
        self.save_data(sync_cloud_backup=False)

    def sync_with_cloud(self):
        try:
            payload = {
                "username": "reso_user",
                "streak": self.data.get("streak", 0),
                "longest_streak": self.data.get("longest_streak", 0),
                "total_focus_minutes": self.data.get("total_focus_minutes", 0),
                "habits_prevented": self.data.get("habits_prevented", 0)
            }
            requests.post(CLOUD_URL, json=payload, timeout=3)
        except Exception:
            pass

    def get_community_stats(self):
        try:
            response = requests.get(COMMUNITY_URL, timeout=3)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None

    def get_community_settings(self) -> dict:
        settings = self.data.setdefault(
            "community_chat_settings",
            {
                "auto_connect_trigger": True,
                "allow_helper_mode": True,
            },
        )
        if not isinstance(settings, dict):
            settings = {
                "auto_connect_trigger": True,
                "allow_helper_mode": True,
            }
            self.data["community_chat_settings"] = settings
        return {
            "auto_connect_trigger": bool(settings.get("auto_connect_trigger", True)),
            "allow_helper_mode": bool(settings.get("allow_helper_mode", True)),
        }

    def update_community_settings(self, auto_connect: bool, allow_helper: bool):
        self.data["community_chat_settings"] = {
            "auto_connect_trigger": bool(auto_connect),
            "allow_helper_mode": bool(allow_helper),
        }
        self.save_data()

    @staticmethod
    def get_support_chat_url(role: str) -> str:
        if role not in {"seeker", "helper"}:
            raise ValueError("Unbekannte Chat-Rolle.")
        parsed = urlsplit(CLOUD_URL)
        scheme = "wss" if parsed.scheme == "https" else "ws"
        base_path = parsed.path.rsplit("/sync", 1)[0].rstrip("/")
        path = f"{base_path}/ws/support-chat/{role}"
        return urlunsplit((scheme, parsed.netloc, path, "", ""))

    def update_streak(self):
        today_str = str(date.today())
        last_date = self.data.get("last_active_date", today_str)
        try:
            last_d = datetime.strptime(last_date, "%Y-%m-%d").date()
        except Exception:
            last_d = date.today()
            
        current_d = date.today()
        delta = (current_d - last_d).days
        
        if delta == 1:
            self.data["streak"] += 1
            self.data["last_active_date"] = today_str
        elif delta > 1:
            self.data["streak"] = 1
            self.data["last_active_date"] = today_str
        elif delta == 0 and self.data["streak"] == 0:
            self.data["streak"] = 1
            
        if self.data["streak"] > self.data.get("longest_streak", 0):
            self.data["longest_streak"] = self.data["streak"]
            
        streak = self.data["streak"]
        if streak >= 30:
            self.data["level"] = "👑 Meister der inneren Zitadelle"
        elif streak >= 21:
            self.data["level"] = "⚔️ Schatten-Krieger"
        elif streak >= 14:
            self.data["level"] = "🛡️ Fokus-Wächter"
        elif streak >= 7:
            self.data["level"] = "⚡ Disziplin-Novize"
        else:
            self.data["level"] = "🌱 Willens-Anwärter"
        
        self.save_data()

    def get_detailed_streak(self) -> str:
        start_value = self.data.get("streak_start_iso")
        if not isinstance(start_value, str) or not start_value:
            return "0 Sekunden"
        try:
            start_dt = datetime.fromisoformat(start_value)
        except ValueError:
            return "0 Sekunden"

        if start_dt.tzinfo is not None:
            start_dt = start_dt.astimezone().replace(tzinfo=None)
        now = datetime.now()
        if now < start_dt:
            return "0 Sekunden"

        remaining = int((now - start_dt).total_seconds())
        units = (
            (365 * 24 * 60 * 60, "Jahr", "Jahre"),
            (30 * 24 * 60 * 60, "Monat", "Monate"),
            (24 * 60 * 60, "Tag", "Tage"),
            (60 * 60, "Stunde", "Stunden"),
            (60, "Minute", "Minuten"),
            (1, "Sekunde", "Sekunden"),
        )
        parts = []
        for seconds_per_unit, singular, plural in units:
            value, remaining = divmod(remaining, seconds_per_unit)
            if value:
                parts.append(f"{value} {singular if value == 1 else plural}")
        return ", ".join(parts) or "0 Sekunden"

    def reset_streak(self):
        now = datetime.now()
        self.data["streak_start_iso"] = now.isoformat()
        self.data["streak"] = 0
        self.data["last_active_date"] = now.date().isoformat()
        self.data["monthly_challenge_badges"] = []
        self.data["level"] = "🌱 Willens-Anwärter"
        self.save_data()

    def set_custom_streak_start(self, start_dt: datetime):
        if not isinstance(start_dt, datetime):
            raise TypeError("Der Streak-Start muss ein Datum mit Uhrzeit sein.")
        if start_dt.tzinfo is not None:
            start_dt = start_dt.astimezone().replace(tzinfo=None)
        now = datetime.now()
        if start_dt > now:
            raise ValueError("Der Streak-Start darf nicht in der Zukunft liegen.")

        self.data["streak_start_iso"] = start_dt.isoformat()
        self.data["streak"] = (now - start_dt).days
        self.data["last_active_date"] = now.date().isoformat()
        if self.data["streak"] > self.data.get("longest_streak", 0):
            self.data["longest_streak"] = self.data["streak"]
        self.save_data()

    def add_timer_session(self, minutes, mood_score=2):
        self.data["timer_activations"] += 1
        self.data["total_focus_minutes"] += minutes
        today_str = str(date.today())
        daily = self.data.setdefault("daily_activity", {})
        daily[today_str] = daily.get(today_str, 0) + minutes
        daily_moods = self.data.setdefault("daily_moods", {})
        daily_moods.setdefault(today_str, []).append(mood_score)
        self._record_monthly_challenge_badge(date.today())
        self.update_streak()
        self.save_data()

    def get_stoic_quote(self) -> str:
        quotes = [
            "„Du hast Macht über deinen Geist – nicht über äußere Ereignisse. "
            "Erkenne das, und du wirst Stärke finden.“ – Marcus Aurelius",
            "„Wir leiden öfter in unserer Fantasie als in der Realität.“ – Seneca",
            "„Schreie nicht über das, was dir begegnet, sondern frage dich, "
            "ob du es mit Tapferkeit besiegen kannst.“",
            "„Der Mensch ist nicht durch Ereignisse beunruhigt, sondern durch "
            "die Ansichten, die er sich von ihnen macht.“ – Epiktet",
            "„Schwierigkeiten stärken den Verstand, wie Arbeit den Körper stärkt.“ – Seneca",
            "„Nicht weil es schwer ist, wagen wir es nicht, sondern weil wir es "
            "nicht wagen, ist es schwer.“ – Seneca",
            "„Erlaube deinen Gedanken nicht, dich zu beherrschen. Du bist der "
            "Herr über deinen inneren Zustand.“",
        ]
        return random.choice(quotes)

    @staticmethod
    def _monthly_challenge_definition(month: int) -> dict:
        challenges = {
            1: {"title": "Neujahrs-Zitadelle", "target": 15, "desc": "Sammle im Januar 15 Fokus-Stunden."},
            2: {"title": "Eiserner Februar", "target": 20, "desc": "Sammle im Februar 20 Fokus-Stunden."},
            3: {"title": "März des Aufbruchs", "target": 25, "desc": "Sammle im März 25 Fokus-Stunden."},
            4: {"title": "April der Ausdauer", "target": 25, "desc": "Sammle im April 25 Fokus-Stunden."},
            5: {"title": "Mai der Meisterschaft", "target": 30, "desc": "Sammle im Mai 30 Fokus-Stunden."},
            6: {"title": "Juni-Fokusfestung", "target": 30, "desc": "Sammle im Juni 30 Fokus-Stunden."},
            7: {"title": "Sommer der Klarheit", "target": 30, "desc": "Sammle im Juli 30 Fokus-Stunden."},
            8: {"title": "August der Disziplin", "target": 30, "desc": "Sammle im August 30 Fokus-Stunden."},
            9: {"title": "Herbstlicher Neustart", "target": 30, "desc": "Sammle im September 30 Fokus-Stunden."},
            10: {"title": "Oktober-Wächter", "target": 35, "desc": "Sammle im Oktober 35 Fokus-Stunden."},
            11: {"title": "November-Festung", "target": 50, "desc": "Sammle im November 50 Fokus-Stunden."},
            12: {"title": "Dezember-Wächter", "target": 30, "desc": "Sammle im Dezember 30 Fokus-Stunden."},
        }
        return challenges[month]

    def _get_monthly_focus_minutes(self, month_id: str) -> int:
        daily_activity = self.data.get("daily_activity", {})
        month_minutes = 0
        for day, minutes in daily_activity.items():
            if not isinstance(day, str) or not day.startswith(f"{month_id}-"):
                continue
            try:
                month_minutes += max(0, int(minutes))
            except (TypeError, ValueError):
                continue
        return month_minutes

    def _record_monthly_challenge_badge(self, today: date):
        month_id = today.strftime("%Y-%m")
        challenge = self._monthly_challenge_definition(today.month)
        target_minutes = challenge["target"] * 60
        if self._get_monthly_focus_minutes(month_id) < target_minutes:
            return
        badge_id = f"{month_id}:focus-hours"
        badges = self.data.setdefault("monthly_challenge_badges", [])
        if badge_id not in badges:
            badges.append(badge_id)

    def get_monthly_challenge(self) -> dict:
        now = datetime.now()
        month_id = now.strftime("%Y-%m")
        challenge = self._monthly_challenge_definition(now.month)
        current_hours = round(self._get_monthly_focus_minutes(month_id) / 60.0, 1)
        target_hours = challenge["target"]
        progress = (
            min(100.0, round((current_hours / target_hours) * 100.0, 1))
            if target_hours > 0
            else 0.0
        )
        badge_id = f"{month_id}:focus-hours"
        badge_unlocked = badge_id in self.data.get("monthly_challenge_badges", [])
        return {
            "title": challenge["title"],
            "desc": challenge["desc"],
            "current": current_hours,
            "target": target_hours,
            "progress": progress,
            "badge": f"{challenge['title']} — Fokus-Meister",
            "badge_unlocked": badge_unlocked,
        }

    def add_prevented_habit(self, word=""):
        self.data["habits_prevented"] += 1
        if word:
            stats = self.data.setdefault("trigger_stats", {})
            stats[word] = stats.get(word, 0) + 1
            
        # Rückfall-Uhrzeiten erfassen
        now = datetime.now()
        current_hour = now.strftime("%H:00 Uhr")
        hours = self.data.setdefault("incident_hours", {})
        hours[current_hour] = hours.get(current_hour, 0) + 1
        weekday_hour_matrix = self.data.setdefault("weekday_hour_matrix", {})
        day_data = weekday_hour_matrix.setdefault(str(now.weekday()), {})
        hour_key = str(now.hour)
        day_data[hour_key] = day_data.get(hour_key, 0) + 1
        today = str(date.today())
        daily_incidents = self.data.setdefault("daily_incidents", {})
        daily_incidents[today] = daily_incidents.get(today, 0) + 1
        strict_triggers = {"porno", "casino", "gambling"}
        light_triggers = {"aufschieben"}
        category = (
            "strict" if word.lower() in strict_triggers
            else "light" if word.lower() in light_triggers
            else "medium"
        )
        self.data["last_trigger_at"] = datetime.now().isoformat(timespec="seconds")
        self.data["last_trigger_category"] = category

        self.update_streak()
        self.save_data()

    def save_relapse_reflection(self, trigger_cause: str, next_action: str):
        cause = trigger_cause.strip()
        action = next_action.strip()
        if not cause or not action:
            raise ValueError("Auslöser und nächster Schritt dürfen nicht leer sein.")
        reflections = self.data.setdefault("relapse_reflections", [])
        reflections.append(
            {
                "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "trigger_cause": cause,
                "next_action": action,
            }
        )
        self.save_data()

    def get_community_leaderboard(self):
        try:
            response = requests.get(
                f"{COMMUNITY_URL.rsplit('/community', 1)[0]}/community/leaderboard",
                timeout=3,
            )
            response.raise_for_status()
            leaderboard = response.json().get("leaderboard", [])
            return leaderboard if isinstance(leaderboard, list) else []
        except requests.RequestException as error:
            logging.warning("Community-Rangliste nicht verfügbar: %s", error)
            return []

    def get_dopamine_level(
        self, minutes_since_trigger: float, trigger_category: str = "medium"
    ) -> dict:
        profiles = {
            "strict": {"half_life_mins": 45.0, "peak": 250.0},
            "medium": {"half_life_mins": 25.0, "peak": 180.0},
            "light": {"half_life_mins": 15.0, "peak": 140.0},
        }
        profile = profiles.get(trigger_category, profiles["medium"])
        half_life = profile["half_life_mins"]
        peak = profile["peak"]
        elapsed = max(0.0, float(minutes_since_trigger))
        current_spike = peak * math.pow(0.5, elapsed / half_life)
        recovery = max(0.0, 100.0 - current_spike / peak * 100.0)
        return {
            "current_spike": round(current_spike, 1),
            "total_level": round(100.0 + current_spike, 1),
            "recovery_percent": round(recovery, 1),
            "half_life_mins": half_life,
        }

    def add_reframing_entry(self, emotion: str, trigger_word: str):
        weights = {
            "Einsamkeit": 3.0,
            "Stress": 2.5,
            "Frustration": 2.0,
            "Langeweile": 1.5,
            "Gewohnheit": 1.0,
        }
        if emotion not in weights:
            raise ValueError("Unbekannter emotionaler Auslöser.")

        entries = self.data.setdefault("reframing_entries", [])
        entries.append(
            {
                "timestamp": datetime.now().isoformat(timespec="seconds"),
                "emotion": emotion,
                "trigger": trigger_word,
                "weight": weights[emotion],
            }
        )
        emotion_stats = self.data.setdefault("emotion_stats", {})
        emotion_stats[emotion] = emotion_stats.get(emotion, 0) + 1
        self.save_data()

    def get_conditioning_quotient(self) -> dict:
        entries = self.data.get("reframing_entries", [])
        if not entries:
            return {"dominant_emotion": "Keine Daten", "q_score": 0.0, "breakdown": {}}

        emotion_stats = self.data.get("emotion_stats", {})
        if not emotion_stats:
            for entry in entries:
                emotion = entry.get("emotion", "Unbekannt")
                emotion_stats[emotion] = emotion_stats.get(emotion, 0) + 1
        dominant = max(emotion_stats, key=emotion_stats.get)

        parsed_entries = []
        for entry in entries:
            try:
                timestamp = datetime.fromisoformat(entry["timestamp"])
                weight = float(entry.get("weight", 2.0))
            except (KeyError, TypeError, ValueError):
                continue
            parsed_entries.append((timestamp, weight))
        parsed_entries.sort(key=lambda item: item[0])

        q_score = 0.0
        for previous, current in zip(parsed_entries, parsed_entries[1:]):
            delta_hours = max(
                (current[0] - previous[0]).total_seconds() / 3600.0,
                1.0 / 60.0,
            )
            q_score += current[1] / delta_hours

        return {
            "dominant_emotion": dominant,
            "q_score": round(q_score, 2),
            "breakdown": emotion_stats,
        }

    def get_opportunity_equivalents(self) -> dict:
        total_mins = self.data.get("total_focus_minutes", 0)
        prevented_count = self.data.get("habits_prevented", 0)
        total_saved_mins = total_mins + (prevented_count * 20)
        pages = round(total_saved_mins / 2.0, 1)
        kilometers = round(total_saved_mins / 6.0, 1)
        books = round(pages / 250.0, 2)
        return {
            "total_saved_mins": total_saved_mins,
            "pages": pages,
            "kilometers": kilometers,
            "books": books,
        }

    def calculate_hyperbolic_discounting(
        self, A: float = 100.0, k: float = 0.2, max_days: int = 30
    ) -> dict:
        if max_days < 0:
            raise ValueError("max_days darf nicht negativ sein.")
        if k < 0:
            raise ValueError("k darf nicht negativ sein.")
        days = list(range(max_days + 1))
        values = [A / (1.0 + k * day) for day in days]
        return {"days": days, "values": values}

    def set_hourly_rate(self, rate: float):
        self.data["hourly_rate"] = float(rate)
        self.save_data()

    def get_hourly_rate(self) -> float:
        return float(self.data.get("hourly_rate", 25.0))

    def calculate_savings(self):
        total_mins = self.data.get("total_focus_minutes", 0)
        prevented_count = self.data.get("habits_prevented", 0)
        total_saved_mins = total_mins + (prevented_count * 20)
        saved_hours = round(total_saved_mins / 60.0, 1)
        saved_money = round(saved_hours * self.get_hourly_rate(), 2)
        return saved_hours, saved_money

    def get_rescue_motivation_data(self) -> dict:
        streak = self.data.get("streak", 0)
        saved_hours, saved_money = self.calculate_savings()
        daily_expense = self.data.get("daily_expense", 0.0)
        rank = self.get_user_rank_and_badges()["rank"]
        total_money = saved_money + (streak * daily_expense)
        return {
            "streak": streak,
            "saved_hours": saved_hours,
            "saved_money": total_money,
            "level": rank,
        }

    def save_shadow_letter(self, letter_text: str):
        letter = letter_text.strip()
        if not letter:
            raise ValueError("Der Brief darf nicht leer sein.")
        if len(letter) > 5000:
            raise ValueError("Der Brief darf höchstens 5.000 Zeichen enthalten.")
        self.data["shadow_letter"] = letter
        self.save_data()

    def get_shadow_letter(self) -> str:
        return self.data.get("shadow_letter") or (
            "Schreibe hier deinen persönlichen Brief in einem Moment klarer Stärke. "
            "Er wird angezeigt, wenn du innehalten möchtest."
        )

    def save_codex(self, identity: str, core_rules: str):
        identity = identity.strip()
        rules = core_rules.strip()
        if not identity or not rules:
            raise ValueError("Identität und Grundregeln dürfen nicht leer sein.")
        if len(identity) > 1000 or len(rules) > 5000:
            raise ValueError("Identität oder Grundregeln sind zu lang.")
        self.data["discipline_codex"] = {
            "identity": identity,
            "rules": rules,
        }
        self.data["codex_completed"] = True
        self.save_data()

    def save_personal_manifest(
        self, identity: str, core_rules: str, letter_text: str
    ):
        identity = identity.strip()
        rules = core_rules.strip()
        letter = letter_text.strip()
        if not identity or not rules or not letter:
            raise ValueError("Identität, Grundregeln und Brief dürfen nicht leer sein.")
        if len(identity) > 1000 or len(rules) > 5000 or len(letter) > 5000:
            raise ValueError("Identität, Grundregeln oder Brief sind zu lang.")
        self.data["discipline_codex"] = {
            "identity": identity,
            "rules": rules,
        }
        self.data["shadow_letter"] = letter
        self.data["codex_completed"] = True
        self.save_data()

    def get_codex(self) -> dict:
        codex = self.data.get("discipline_codex", {})
        if not isinstance(codex, dict):
            codex = {}
        return {
            "identity": codex.get(
                "identity",
                "Ich bin ein fokussierter, unerschütterlicher Mensch.",
            ),
            "rules": codex.get(
                "rules",
                "1. Ich darf innehalten und bewusst entscheiden.\n"
                "2. Langfristige Ziele verdienen meine Aufmerksamkeit.",
            ),
        }

    def get_user_rank_and_badges(self) -> dict:
        streak = self.data.get("streak", 0)
        longest = self.data.get("longest_streak", 0)
        if streak >= 30:
            rank = "👑 Meister der inneren Zitadelle"
        elif streak >= 21:
            rank = "⚔️ Schatten-Krieger"
        elif streak >= 14:
            rank = "🛡️ Fokus-Wächter"
        elif streak >= 7:
            rank = "⚡ Disziplin-Novize"
        else:
            rank = "🌱 Willens-Anwärter"

        badges = [
            {"name": "Erster Schritt", "unlocked": streak >= 1, "desc": "1 Tag geschafft"},
            {"name": "Wochen-Sieger", "unlocked": streak >= 7, "desc": "7 Tage Streak"},
            {"name": "Eiserner Wille", "unlocked": streak >= 14, "desc": "14 Tage Streak"},
            {"name": "Unbeugsam", "unlocked": streak >= 30, "desc": "30 Tage Meister-Streak"},
        ]
        return {"rank": rank, "badges": badges, "streak": streak, "longest": longest}

    def set_savings_goal(self, goal_name: str, goal_amount: float):
        name = goal_name.strip()
        amount = float(goal_amount)
        if not name:
            raise ValueError("Bitte gib deinem Sparziel einen Namen.")
        if not math.isfinite(amount) or amount <= 0:
            raise ValueError("Der Zielbetrag muss eine positive Zahl sein.")
        self.data["savings_goal"] = {"name": name, "target_amount": amount}
        self.save_data()

    def get_savings_progress(self) -> dict:
        savings = self.data.get("savings_goal", {})
        if not isinstance(savings, dict):
            savings = {}
        name = str(savings.get("name") or "Traum-Erfüllung")
        try:
            target = float(savings.get("target_amount", 100.0))
        except (TypeError, ValueError):
            target = 100.0
        if not math.isfinite(target) or target < 0:
            target = 100.0

        _, saved_money = self.calculate_savings()
        streak = self.data.get("streak", 0)
        daily_expense = self.data.get("daily_expense", 0.0)
        total_saved = saved_money + (streak * daily_expense)
        progress = min(100.0, round((total_saved / target) * 100.0, 1)) if target > 0 else 0.0
        return {
            "name": name,
            "target": target,
            "saved": round(total_saved, 2),
            "progress": progress,
        }

    def check_sunday_report(self) -> str:
        now = datetime.now()
        if now.weekday() != 6 or now.hour < 18:
            return ""

        today = now.date()
        today_str = today.isoformat()
        if self.data.get("last_sunday_report") == today_str:
            return ""

        week_start = today - timedelta(days=today.weekday())
        daily_activity = self.data.get("daily_activity", {})
        daily_incidents = self.data.get("daily_incidents", {})
        week_minutes = 0
        week_prevented = 0
        for day_offset in range(7):
            day_str = (week_start + timedelta(days=day_offset)).isoformat()
            try:
                week_minutes += max(0, int(daily_activity.get(day_str, 0)))
                week_prevented += max(0, int(daily_incidents.get(day_str, 0)))
            except (TypeError, ValueError):
                continue
        saved_hours = round((week_minutes + week_prevented * 20) / 60.0, 1)
        rank_data = self.get_user_rank_and_badges()
        report = (
            "🏆 WÖCHENTLICHER REFLEXIONS-REPORT 🏆\n\n"
            f"Diese Woche gerettet: {saved_hours} Stunden\n"
            f"Aktuelle Streak: {rank_data['streak']} Tage\n"
            f"Erreichter Rang: {rank_data['rank']}\n\n"
            "Starker Abschluss! Bereit für die neue Woche?"
        )
        self.data["last_sunday_report"] = today_str
        self.save_data()
        return report

    def set_pin(self, new_pin):
        self.data["pin_code"] = str(new_pin)
        self.save_data()

    def verify_pin(self, input_pin):
        stored = self.data.get("pin_code", "")
        return not stored or stored == str(input_pin)

    def set_panic_hotkey(self, hotkey):
        self.data["panic_hotkey"] = str(hotkey)
        self.save_data()

    def set_webhook(self, url):
        self.data["webhook_url"] = str(url)
        self.save_data()

    def get_stats(self):
        return self.data

    def get_trigger_words(self):
        return self.data.get("trigger_words", [])

    def save_trigger_words(self, words):
        self.data["trigger_words"] = words
        self.save_data()