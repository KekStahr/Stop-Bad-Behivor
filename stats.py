import json
import logging
import os
import threading
from datetime import datetime, date
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
                    data.setdefault("trigger_stats", {})
                    data.setdefault("daily_activity", {})
                    data.setdefault("daily_moods", {})
                    data.setdefault("cloud_backup_initialized", False)
                    data.setdefault("cloud_backup_dirty", False)
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
            "last_active_date": str(date.today()),
            "trigger_words": ["porno", "casino", "aufschieben", "gambling", "cheat"],
            "trigger_stats": {},
            "daily_activity": {},
            "daily_moods": {},
            "cloud_backup_initialized": False,
            "cloud_backup_dirty": False,
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
        if streak >= 30: self.data["level"] = "👑 Meister der Kontrolle"
        elif streak >= 14: self.data["level"] = "⚔️ Schatten-Krieger"
        elif streak >= 7: self.data["level"] = "🛡️ Fokus-Wächter"
        else: self.data["level"] = "🌱 Disziplin-Novize"
        
        self.save_data()

    def add_timer_session(self, minutes, mood_score=2):
        self.data["timer_activations"] += 1
        self.data["total_focus_minutes"] += minutes
        today_str = str(date.today())
        daily = self.data.setdefault("daily_activity", {})
        daily[today_str] = daily.get(today_str, 0) + minutes
        daily_moods = self.data.setdefault("daily_moods", {})
        daily_moods.setdefault(today_str, []).append(mood_score)
        self.update_streak()
        self.save_data()

    def add_prevented_habit(self, word=""):
        self.data["habits_prevented"] += 1
        if word:
            stats = self.data.setdefault("trigger_stats", {})
            stats[word] = stats.get(word, 0) + 1
            
        # Rückfall-Uhrzeiten erfassen
        current_hour = datetime.now().strftime("%H:00 Uhr")
        hours = self.data.setdefault("incident_hours", {})
        hours[current_hour] = hours.get(current_hour, 0) + 1
        
        self.update_streak()
        self.save_data()

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