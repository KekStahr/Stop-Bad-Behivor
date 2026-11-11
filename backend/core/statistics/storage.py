from .shared import *


class StorageMixin:
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
                    data.setdefault("shutdown_deadline_epoch", None)
                    data.setdefault("community_author_id", "")
                    data.setdefault("community_author_name", "")
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
            "shutdown_deadline_epoch": None,
            "community_author_id": "",
            "community_author_name": "",
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
