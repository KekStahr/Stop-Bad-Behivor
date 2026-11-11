from .shared import *


class StreakStatsMixin:
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
    def get_detailed_streak_components(self) -> dict:
        start_value = self.data.get("streak_start_iso")
        if not isinstance(start_value, str) or not start_value:
            start_dt = None
        else:
            try:
                start_dt = datetime.fromisoformat(start_value)
            except ValueError:
                start_dt = None

        units = (
            ("years", 365 * 24 * 60 * 60),
            ("months", 30 * 24 * 60 * 60),
            ("weeks", 7 * 24 * 60 * 60),
            ("days", 24 * 60 * 60),
            ("hours", 60 * 60),
            ("minutes", 60),
            ("seconds", 1),
        )
        if start_dt is None:
            return {name: 0 for name, _ in units}

        if start_dt.tzinfo is not None:
            start_dt = start_dt.astimezone().replace(tzinfo=None)
        remaining = max(0, int((datetime.now() - start_dt).total_seconds()))
        components = {}
        for name, seconds_per_unit in units:
            components[name], remaining = divmod(remaining, seconds_per_unit)
        return components
    def get_detailed_streak(self) -> str:
        components = self.get_detailed_streak_components()
        units = (
            ("years", "Jahr", "Jahre"),
            ("months", "Monat", "Monate"),
            ("weeks", "Woche", "Wochen"),
            ("days", "Tag", "Tage"),
            ("hours", "Stunde", "Stunden"),
            ("minutes", "Minute", "Minuten"),
            ("seconds", "Sekunde", "Sekunden"),
        )
        parts = [
            f"{components[name]} {singular if components[name] == 1 else plural}"
            for name, singular, plural in units
            if components[name]
        ]
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
