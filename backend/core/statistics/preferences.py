from .shared import *


class PreferenceStatsMixin:
    def set_hourly_rate(self, rate: float):
        self.data["hourly_rate"] = float(rate)
        self.save_data()
    def get_shutdown_deadline(self):
        deadline = self.data.get("shutdown_deadline_epoch")
        if deadline is None:
            return None
        if (
            isinstance(deadline, bool)
            or not isinstance(deadline, (int, float))
            or not math.isfinite(deadline)
        ):
            logging.warning("Ungültiger gespeicherter Beenden-Countdown wurde ignoriert.")
            return None
        return float(deadline)
    def set_shutdown_deadline(self, deadline):
        if deadline is not None and (
            isinstance(deadline, bool)
            or not isinstance(deadline, (int, float))
            or not math.isfinite(deadline)
        ):
            raise ValueError("Der Beenden-Countdown muss ein gültiger Zeitstempel sein.")
        self.data["shutdown_deadline_epoch"] = deadline
        self._write_local_data()
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