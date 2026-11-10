import json
import os
from datetime import datetime, date
import requests

DATA_FILE = "stats_data.json"
CLOUD_URL = "https://stop-bad-behivor-q1d4.onrender.com/sync"
COMMUNITY_URL = CLOUD_URL.rsplit("/sync", 1)[0] + "/community"

class StatsManager:
    def __init__(self):
        self.data = self.load_data()

    def load_data(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r") as f:
                    data = json.load(f)
                    data.setdefault("trigger_words", ["porno", "casino", "aufschieben", "gambling", "cheat"])
                    data.setdefault("longest_streak", data.get("streak", 0))
                    data.setdefault("trigger_stats", {})
                    data.setdefault("daily_activity", {})
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
            "incident_hours": {},
            "hourly_rate": 25.0,
            "pin_code": "",
            "webhook_url": "",
            "panic_hotkey": "<ctrl>+<alt>+x",
            "level": "Disziplin-Novize"
        }

    def save_data(self):
        with open(DATA_FILE, "w") as f:
            json.dump(self.data, f, indent=4)
        self.sync_with_cloud()

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

    def add_timer_session(self, minutes):
        self.data["timer_activations"] += 1
        self.data["total_focus_minutes"] += minutes
        today_str = str(date.today())
        daily = self.data.setdefault("daily_activity", {})
        daily[today_str] = daily.get(today_str, 0) + minutes
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