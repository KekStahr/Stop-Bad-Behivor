from .shared import *


class AnalyticsStatsMixin:
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
