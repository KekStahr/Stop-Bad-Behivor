from .shared import *



class ApiMixin:
    def _queue_web_api_request(self, method, path, body, response, result):
        if method == "GET" and path == "/api/community":
            threading.Thread(
                target=self._load_web_community,
                args=(response, result),
                daemon=True,
            ).start()
            return
        self._web_api_requests.put((method, path, body, response, result))
    def _load_web_community(self, response, result):
        try:
            result["status"] = 200
            result["body"] = {
                "stats": self.stats_manager.get_community_stats(),
                "leaderboard": self.stats_manager.get_community_leaderboard(),
            }
        except Exception:
            logging.exception("Community-Daten konnten nicht geladen werden.")
            result["status"] = 500
            result["body"] = {"error": "Community-Daten konnten nicht geladen werden."}
        finally:
            response.set()
    def _poll_web_api_requests(self):
        while True:
            try:
                method, path, body, response, result = self._web_api_requests.get_nowait()
            except queue.Empty:
                break
            try:
                result["status"], result["body"] = self._handle_web_api_request(
                    method,
                    path,
                    body,
                )
            except (TypeError, ValueError, KeyError) as error:
                result["status"] = 400
                result["body"] = {"error": str(error)}
            except Exception:
                logging.exception("Lokale Web-Anfrage konnte nicht verarbeitet werden.")
                result["status"] = 500
                result["body"] = {"error": "Die Anfrage konnte nicht verarbeitet werden."}
            finally:
                response.set()
        if self.web_api is not None:
            self.after(25, self._poll_web_api_requests)
    def _handle_web_api_request(self, method, path, body):
        if method == "GET" and path == "/api/dashboard":
            data = self.stats_manager.get_stats()
            saved_hours, saved_money = self.stats_manager.calculate_savings()
            goal = self.stats_manager.get_savings_progress()
            rank = self.stats_manager.get_user_rank_and_badges()
            opportunity = self.stats_manager.get_opportunity_equivalents()
            streak_time = self.stats_manager.get_detailed_streak_components()
            user_name = data.get("community_author_name", "")
            return 200, {
                "name": user_name if isinstance(user_name, str) else "",
                "rank": rank["rank"],
                "streak": rank["streak"],
                "longestStreak": rank["longest"],
                "streakTime": streak_time,
                "totalFocusMinutes": data.get("total_focus_minutes", 0),
                "habitsPrevented": data.get("habits_prevented", 0),
                "savedHours": saved_hours,
                "savedMoney": saved_money + rank["streak"] * data.get("daily_expense", 0),
                "savingsGoal": goal,
                "opportunity": opportunity,
                "quote": self.stats_manager.get_stoic_quote(),
                "timer": self._web_timer_state(),
                "badges": rank["badges"],
            }

        if method == "GET" and path == "/api/analytics":
            data = self.stats_manager.get_stats()
            return 200, {
                "dailyActivity": data.get("daily_activity", {}),
                "dailyIncidents": data.get("daily_incidents", {}),
                "triggerStats": data.get("trigger_stats", {}),
                "totalFocusMinutes": data.get("total_focus_minutes", 0),
                "habitsPrevented": data.get("habits_prevented", 0),
                "opportunity": self.stats_manager.get_opportunity_equivalents(),
                "savings": self.stats_manager.calculate_savings(),
            }

        if method == "GET" and path == "/api/settings":
            data = self.stats_manager.get_stats()
            goal = data.get("savings_goal", {})
            return 200, {
                "hourlyRate": self.stats_manager.get_hourly_rate(),
                "dailyExpense": data.get("daily_expense", 0.0),
                "defaultTimer": data.get("default_timer_mins", 25),
                "goalName": goal.get("name", "Traum-Erfüllung"),
                "goalAmount": goal.get("target_amount", 100.0),
                "triggerWords": self.stats_manager.get_trigger_words(),
                "stressDetection": bool(data.get("stress_detection_enabled", False)),
                "whitelistEnabled": self.whitelist_enabled,
            }

        if method == "GET" and path == "/api/community":
            return 200, {
                "stats": self.stats_manager.get_community_stats(),
                "leaderboard": self.stats_manager.get_community_leaderboard(),
            }

        if method == "POST" and path == "/api/app/show":
            self.show_from_tray()
            return 200, {"shown": True}

        if method == "POST" and path == "/api/app/quit":
            self.after(100, self.execute_final_quit)
            return 200, {"stopping": True}

        if method == "POST" and path == "/api/timer/start":
            minutes = body.get("minutes")
            if isinstance(minutes, bool) or not isinstance(minutes, int) or not 1 <= minutes <= 180:
                raise ValueError("Der Fokus-Timer muss zwischen 1 und 180 Minuten liegen.")
            if self.focus_timer.is_running:
                return 409, {"error": "Es läuft bereits ein Fokus-Timer."}
            self.time_slider.set(minutes)
            self.slider_val_label.configure(text=f"Dauer: {minutes} Minuten")
            self.start_timer_action(minutes)
            return 200, {"timer": self._web_timer_state()}

        if method == "POST" and path == "/api/timer/stop":
            self.focus_timer.stop()
            self.reset_timer_ui()
            return 200, {"timer": self._web_timer_state()}

        if method == "POST" and path == "/api/streak/reset":
            self.stats_manager.reset_streak()
            self.update_stats_display()
            return 200, {"streakTime": self.stats_manager.get_detailed_streak_components()}

        if method == "POST" and path == "/api/settings":
            self._save_web_settings(body)
            return 200, {"settings": self._web_settings_state()}

        return 404, {"error": "Unbekannter API-Endpunkt."}
    def _web_timer_state(self):
        return {
            "running": self.focus_timer.is_running,
            "remainingSeconds": max(0, int(self.focus_timer.remaining_seconds)),
            "durationMinutes": int(self.focus_timer.total_duration_minutes),
        }
    def _web_settings_state(self):
        data = self.stats_manager.get_stats()
        goal = data.get("savings_goal", {})
        return {
            "hourlyRate": self.stats_manager.get_hourly_rate(),
            "dailyExpense": data.get("daily_expense", 0.0),
            "defaultTimer": data.get("default_timer_mins", 25),
            "goalName": goal.get("name", "Traum-Erfüllung"),
            "goalAmount": goal.get("target_amount", 100.0),
            "triggerWords": self.stats_manager.get_trigger_words(),
            "stressDetection": bool(data.get("stress_detection_enabled", False)),
            "whitelistEnabled": self.whitelist_enabled,
        }
    def _save_web_settings(self, body):
        rate = (
            self._web_number(body["hourlyRate"], "Stundensatz", 0, 10000)
            if "hourlyRate" in body
            else None
        )
        expense = (
            self._web_number(body["dailyExpense"], "Tagesausgaben", 0, 1000000)
            if "dailyExpense" in body
            else None
        )
        minutes = body.get("defaultTimer")
        if minutes is not None and (
            isinstance(minutes, bool) or not isinstance(minutes, int) or not 1 <= minutes <= 180
        ):
            raise ValueError("Der Standard-Timer muss zwischen 1 und 180 Minuten liegen.")
        savings_goal = None
        if "savingsGoal" in body:
            goal = body["savingsGoal"]
            if not isinstance(goal, dict):
                raise ValueError("Das Sparziel hat ein ungültiges Format.")
            name = goal.get("name")
            if not isinstance(name, str):
                raise ValueError("Der Name des Sparziels muss Text sein.")
            amount = self._web_number(
                goal.get("amount"),
                "Sparziel",
                0.01,
                100000000,
            )
            savings_goal = (name, amount)
        cleaned_words = None
        if "triggerWords" in body:
            words = body["triggerWords"]
            if not isinstance(words, list) or not 1 <= len(words) <= 50:
                raise ValueError("Bitte gib 1 bis 50 Trigger-Wörter an.")
            cleaned_words = []
            for word in words:
                if not isinstance(word, str):
                    raise ValueError("Trigger-Wörter müssen Text sein.")
                word = word.strip().lower()
                if not 2 <= len(word) <= 40 or not word.isprintable():
                    raise ValueError("Trigger-Wörter müssen 2 bis 40 druckbare Zeichen enthalten.")
                if word not in cleaned_words:
                    cleaned_words.append(word)
        stress_detection = body.get("stressDetection")
        if "stressDetection" in body and not isinstance(stress_detection, bool):
            raise ValueError("Die Stress-Erkennung muss ein Wahr/Falsch-Wert sein.")

        if rate is not None:
            self.stats_manager.set_hourly_rate(rate)
        if expense is not None:
            self.stats_manager.data["daily_expense"] = expense
            self.stats_manager.save_data()
        if minutes is not None:
            self.stats_manager.data["default_timer_mins"] = minutes
            self.stats_manager.save_data()
            self.time_slider.set(minutes)
            self.slider_val_label.configure(text=f"Dauer: {minutes} Minuten")
            if not self.focus_timer.is_running:
                self.timer_label.configure(text=f"{minutes:02d}:00")
        if savings_goal is not None:
            self.stats_manager.set_savings_goal(*savings_goal)
        if cleaned_words is not None:
            self.stats_manager.save_trigger_words(cleaned_words)
            self.monitor.update_trigger_words(cleaned_words)
        if stress_detection is not None:
            self.stats_manager.data["stress_detection_enabled"] = stress_detection
            self.stats_manager.save_data()
            self.monitor.set_stress_detection(stress_detection)
        self.update_stats_display()
    def _web_number(value, label, minimum, maximum):
        if isinstance(value, bool):
            raise ValueError(f"{label} muss eine gültige Zahl sein.")
        try:
            number = float(value)
        except (TypeError, ValueError) as error:
            raise ValueError(f"{label} muss eine gültige Zahl sein.") from error
        if not math.isfinite(number) or not minimum <= number <= maximum:
            raise ValueError(f"{label} muss zwischen {minimum} und {maximum} liegen.")
        return number
