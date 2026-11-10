import json
import os
from datetime import datetime, date

DATA_FILE = "stats_data.json"

class StatsManager:
    def __init__(self):
        self.data = self.load_data()

    def load_data(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r") as f:
                    data = json.load(f)
                    if "trigger_words" not in data:
                        data["trigger_words"] = ["porno", "casino", "aufschieben", "gambling", "cheat"]
                    if "longest_streak" not in data:
                        data["longest_streak"] = data.get("streak", 0)
                    if "trigger_stats" not in data:
                        data["trigger_stats"] = {}
                    return data
            except:
                pass
        return {
            "timer_activations": 0,
            "total_focus_minutes": 0,
            "habits_prevented": 0,
            "streak": 0,
            "longest_streak": 0,
            "last_active_date": str(date.today()),
            "trigger_words": ["porno", "casino", "aufschieben", "gambling", "cheat"],
            "trigger_stats": {}
        }

    def save_data(self):
        with open(DATA_FILE, "w") as f:
            json.dump(self.data, f, indent=4)

    def update_streak(self):
        today_str = str(date.today())
        last_date = self.data.get("last_active_date", today_str)
        
        try:
            last_d = datetime.strptime(last_date, "%Y-%m-%d").date()
        except:
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
            
        self.save_data()

    def add_timer_session(self, minutes):
        self.data["timer_activations"] += 1
        self.data["total_focus_minutes"] += minutes
        self.update_streak()
        self.save_data()

    def add_prevented_habit(self, word=""):
        self.data["habits_prevented"] += 1
        if word:
            stats = self.data.setdefault("trigger_stats", {})
            stats[word] = stats.get(word, 0) + 1
        self.update_streak()
        self.save_data()

    def get_stats(self):
        return self.data

    def get_trigger_words(self):
        return self.data.get("trigger_words", [])

    def save_trigger_words(self, words):
        self.data["trigger_words"] = words
        self.save_data()