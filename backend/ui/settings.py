from .shared import *



class SettingsMixin:
    def toggle_autostart(self):
        enabled = self.autostart_switch.get() == 1
        if setup_autostart(enabled):
            self.autostart_enabled = enabled
            return

        if self.autostart_enabled:
            self.autostart_switch.select()
        else:
            self.autostart_switch.deselect()
    def toggle_whitelist_preference(self):
        self.whitelist_enabled = self.whitelist_switch.get() == 1
        self.stats_manager.data["whitelist_mode_enabled"] = self.whitelist_enabled
        self.stats_manager.save_data()

        if not self.focus_timer.is_running:
            return
        if self.whitelist_enabled:
            self.monitor.set_whitelist_mode(
                True, self.stats_manager.get_stats().get("whitelisted_apps", [])
            )
            self.monitor.start_whitelist_enforcement()
        else:
            self.monitor.stop_whitelist_enforcement()
    def save_whitelisted_apps(self):
        apps = [
            app.strip().lower()
            for app in self.entry_whitelisted_apps.get().split(",")
            if app.strip()
        ]
        if not apps:
            from tkinter import messagebox

            messagebox.showerror(
                "Whitelist",
                "Bitte gib mindestens einen freigegebenen Prozessnamen ein.",
            )
            return

        self.stats_manager.data["whitelisted_apps"] = apps
        self.stats_manager.save_data()
        if self.focus_timer.is_running and self.whitelist_enabled:
            self.monitor.set_whitelist_mode(True, apps)
    def connect_google_account(self):
        from backend.integrations.google_oauth import (
            is_google_oauth_configured,
            open_google_oauth_setup,
        )

        if not is_google_oauth_configured():
            try:
                browser_opened = open_google_oauth_setup()
            except Exception as error:
                self.lbl_cloud_status.configure(
                    text=f"Google-OAuth-Einrichtung konnte nicht geöffnet werden: {error}",
                    text_color=ACCENT_RED,
                )
                return
            message = (
                "GOOGLE_OAUTH_CLIENT_ID fehlt. "
                "Im geöffneten Google Cloud Console-Bereich einen OAuth-Client "
                "vom Typ „Desktop-App“ erstellen, die Client-ID setzen und Reşo "
                "neu starten. Danach öffnet „Mit Google verbinden“ die "
                "Google-Anmeldeseite zur Zustimmung."
            )
            if not browser_opened:
                message += " Der Browser konnte nicht automatisch geöffnet werden."
            self.lbl_cloud_status.configure(
                text=f"Status: {message}",
                text_color=ACCENT_ORANGE,
            )
            return

        self.lbl_cloud_status.configure(
            text="Status: Google-Browser wird geöffnet ... Bitte anmelden.",
            text_color=TEXT_SECONDARY,
        )
        self.btn_google_connect.configure(state="disabled")

        def finish_login():
            try:
                from backend.integrations.google_oauth import login_with_google

                userinfo, token_data = login_with_google()
                self.stats_manager.connect_google_account(userinfo, token_data)
                email = userinfo.get("email") or userinfo.get("sub", "Google-Konto")
                if self.stats_manager.sync_full_backup():
                    message = (
                        f"Verbunden als {email}. Cloud-Daten wurden automatisch "
                        "synchronisiert."
                    )
                    color = ACCENT_GREEN
                    self.after(0, self._apply_restored_cloud_backup)
                else:
                    message = (
                        f"Verbunden als {email}; Cloud-Sync fehlgeschlagen: "
                        f"{self.stats_manager.last_cloud_backup_error or 'Unbekannter Fehler'}"
                    )
                    color = ACCENT_RED
                self.after(
                    0,
                    lambda message=message, color=color: self._update_cloud_connection_ui(
                        message,
                        color,
                        True,
                    ),
                )
            except Exception as error:
                self.after(
                    0,
                    lambda error=error: self._update_cloud_connection_ui(
                        f"Anmeldung fehlgeschlagen: {error}", ACCENT_RED, False
                    ),
                )

        threading.Thread(target=finish_login, daemon=True).start()
    def _update_cloud_connection_ui(self, message, color, connected=True):
        self.lbl_cloud_status.configure(text=f"Status: {message}", text_color=color)
        self.btn_google_connect.configure(state="disabled" if connected else "normal")
        for button in (self.btn_cloud_backup, self.btn_cloud_restore, self.btn_google_disconnect):
            button.configure(state="normal" if connected else "disabled")
    def sync_cloud_backup(self):
        self.lbl_cloud_status.configure(text="Status: Backup wird hochgeladen ...", text_color=TEXT_SECONDARY)

        def upload():
            success = self.stats_manager.upload_full_backup()
            if success:
                email = self.stats_manager.get_stats().get("google_account_email", "")
                message, color = f"Synchronisiert als {email}", ACCENT_GREEN
            else:
                message = f"Backup fehlgeschlagen: {self.stats_manager.last_cloud_backup_error}"
                color = ACCENT_RED
            self.after(0, lambda: self.lbl_cloud_status.configure(text=f"Status: {message}", text_color=color))

        threading.Thread(target=upload, daemon=True).start()
    def sync_cloud_on_startup(self):
        def synchronize():
            success = self.stats_manager.sync_full_backup()
            if success:
                self.after(0, self.update_stats_display)

        threading.Thread(target=synchronize, daemon=True).start()
    def restore_cloud_backup(self):
        from tkinter import messagebox

        if not messagebox.askyesno(
            "Cloud-Backup wiederherstellen",
            "Lokale Fortschrittsdaten werden durch das Cloud-Backup überschrieben. "
            "PIN und Webhook bleiben lokal erhalten. Fortfahren?",
        ):
            return

        self.lbl_cloud_status.configure(text="Status: Backup wird wiederhergestellt ...", text_color=TEXT_SECONDARY)

        def restore():
            success = self.stats_manager.download_full_backup()
            if success:
                message, color = "Cloud-Backup wiederhergestellt.", ACCENT_GREEN
                self.after(0, self._apply_restored_cloud_backup)
            else:
                message = f"Wiederherstellung fehlgeschlagen: {self.stats_manager.last_cloud_backup_error}"
                color = ACCENT_RED
            self.after(0, lambda: self.lbl_cloud_status.configure(text=f"Status: {message}", text_color=color))

        threading.Thread(target=restore, daemon=True).start()
    def _apply_restored_cloud_backup(self):
        self.monitor.update_trigger_words(self.stats_manager.get_trigger_words())
        if self.hotkey_listener:
            self.hotkey_listener.stop()
        self.setup_panic_hotkey_listener()
        self.setup_settings_tab()
        self.update_stats_display()
    def disconnect_google_account(self):
        from tkinter import messagebox

        if not messagebox.askyesno(
            "Google-Verbindung trennen",
            "Der Google-Zugriff wird widerrufen und lokal entfernt. "
            "Das Cloud-Backup bleibt bestehen.",
        ):
            return
        try:
            self.stats_manager.disconnect_google_account()
            self.lbl_cloud_status.configure(text="Status: Nicht verbunden", text_color=TEXT_SECONDARY)
            self.btn_google_connect.configure(state="normal")
            self.btn_cloud_backup.configure(state="disabled")
            self.btn_cloud_restore.configure(state="disabled")
            self.btn_google_disconnect.configure(state="disabled")
        except Exception as error:
            self.lbl_cloud_status.configure(
                text=f"Status: Trennen fehlgeschlagen: {error}",
                text_color=ACCENT_RED,
            )
    def save_general_settings(self):
        try:
            rate_val = float(self.entry_rate.get().replace(",", "."))
            if rate_val >= 0:
                self.stats_manager.set_hourly_rate(rate_val)
        except ValueError:
            pass

        try:
            expense_val = float(self.entry_daily_expense.get().replace(",", "."))
            if expense_val >= 0:
                self.stats_manager.data["daily_expense"] = expense_val
                self.stats_manager.save_data()
        except ValueError:
            pass

        try:
            timer_val = int(self.entry_default_timer.get())
            if 1 <= timer_val <= 180:
                self.stats_manager.data["default_timer_mins"] = timer_val
                self.stats_manager.save_data()
                self.time_slider.set(timer_val)
                self.slider_val_label.configure(text=f"Dauer: {timer_val} Minuten")
                if not self.focus_timer.is_running:
                    self.timer_label.configure(text=f"{timer_val:02d}:00")
        except ValueError:
            pass

        self.update_stats_display()
    def render_heatmap(self):
        old_canvas = getattr(self, "heatmap_canvas", None)
        if old_canvas:
            old_canvas.get_tk_widget().destroy()
        old_figure = getattr(self, "heatmap_figure", None)
        if old_figure:
            plt.close(old_figure)
            
        fig, ax = plt.subplots(figsize=(6.8, 1.4), dpi=90)
        fig.patch.set_facecolor(CARD_BG)
        ax.set_facecolor(CARD_BG)

        stats_data = self.stats_manager.get_stats()
        daily_data = stats_data.get("daily_activity", {})
        daily_moods = stats_data.get("daily_moods", {})
        dates = [(datetime.today() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(27, -1, -1)]

        values = []
        colors = []
        for day in dates:
            minutes = daily_data.get(day, 0)
            values.append(minutes)
            if minutes == 0:
                colors.append("#2A2A35")
                continue

            moods = daily_moods.get(day, [2])
            average_mood = sum(moods) / len(moods) if moods else 2
            if average_mood < 0.8:
                colors.append("#C62828")
            elif average_mood < 1.6:
                colors.append("#F57F17")
            else:
                colors.append("#2E7D32")

        ax.bar(range(len(values)), values, color=colors, width=0.7)
        ax.axis('off')

        canvas = FigureCanvasTkAgg(fig, master=self.card_heatmap)
        canvas.draw()
        canvas.get_tk_widget().pack(fill="x", padx=15, pady=(0, 12))
        self.heatmap_figure = fig
        self.heatmap_canvas = canvas
    def unlock_settings(self):
        if time.time() < self.lockout_end_time:
            return
        if self.stats_manager.verify_pin(self.entry_pin_input.get()):
            self.pin_unlocked = True
            self.setup_settings_tab()
        else:
            self.lockout_end_time = time.time() + 300  # 5 Min Cooldown
            self.entry_pin_input.delete(0, "end")
            self.entry_pin_input.configure(state="disabled", fg_color="#441111")
            self.btn_unlock.configure(state="disabled")
            self.run_cooldown_countdown()
    def run_cooldown_countdown(self):
        remaining = math.ceil(self.lockout_end_time - time.time())
        if remaining > 0:
            mins, secs = divmod(remaining, 60)
            self.entry_pin_input.configure(placeholder_text=f"Gesperrt! {mins:02d}:{secs:02d}")
            self.after(1000, self.run_cooldown_countdown)
        else:
            self.entry_pin_input.configure(state="normal", placeholder_text="PIN eingeben...", fg_color="#212121")
            self.btn_unlock.configure(state="normal")
    def save_new_pin(self):
        p = self.entry_new_pin.get().strip()
        if len(p) >= 4:
            self.stats_manager.set_pin(p)
            self.setup_settings_tab()
    def save_webhook_url(self):
        url = self.entry_webhook.get().strip()
        self.stats_manager.set_webhook(url)
    def setup_panic_hotkey_listener(self):
        hotkey = self.stats_manager.get_stats().get("panic_hotkey", "<ctrl>+<alt>+x")
        try:
            self.hotkey_listener = keyboard.GlobalHotKeys({hotkey: self.trigger_panic})
            self.hotkey_listener.start()
        except Exception:
            self.hotkey_listener = None
    def save_panic_hotkey(self):
        hotkey = self.entry_panic_hotkey.get().strip()
        if not hotkey:
            return

        try:
            new_listener = keyboard.GlobalHotKeys({hotkey: self.trigger_panic})
            new_listener.start()
        except Exception:
            return

        old_listener = self.hotkey_listener
        self.hotkey_listener = new_listener
        if old_listener:
            old_listener.stop()
        self.stats_manager.set_panic_hotkey(hotkey)
        self.lbl_hotkey_info.configure(text=f"Tastenkürzel: {hotkey}")
    def trigger_panic(self):
        import os
        if sys.platform == "win32":
            os.system("rundll32.exe user32.dll,LockWorkStation")
    def toggle_motivation(self):
        self.ai_pauses_enabled = not self.ai_pauses_enabled
        self.stats_manager.data["ai_pauses_enabled"] = self.ai_pauses_enabled
        self.stats_manager.save_data()
        if self.ai_pauses_enabled and self.focus_timer.is_running:
            self.motivation_manager.start_scheduler(
                mode="random",
                min_rand=self.ai_pause_min,
                max_rand=self.ai_pause_max,
            )
        else:
            self.motivation_manager.stop_scheduler()
        self._update_motivation_button()
    def _update_motivation_button(self):
        if not hasattr(self, "btn_toggle_motivation"):
            return
        enabled = self.ai_pauses_enabled
        self.btn_toggle_motivation.configure(
            text="KI-Pausen: aktiviert" if enabled else "KI-Pausen: deaktiviert",
            fg_color=ACCENT_GREEN if enabled else ACCENT_BLUE,
        )
    def apply_preset(self, preset, persist=True):
        intervals = {
            "light": (20, 30, "Sanft"),
            "medium": (10, 20, "Ausgewogen"),
            "strict": (5, 10, "Häufig"),
        }
        if preset not in intervals:
            preset = "medium"
        self.ai_pause_min, self.ai_pause_max, label = intervals[preset]
        if persist:
            self.stats_manager.data["ai_pause_min"] = self.ai_pause_min
            self.stats_manager.data["ai_pause_max"] = self.ai_pause_max
            self.stats_manager.data["ai_pause_preset"] = preset
            self.stats_manager.save_data()
        if hasattr(self, "lbl_pause_interval"):
            self.lbl_pause_interval.configure(
                text=(
                    f"{label}: zufällige Erinnerung alle "
                    f"{self.ai_pause_min}–{self.ai_pause_max} Minuten"
                )
            )
        if self.ai_pauses_enabled and self.focus_timer.is_running:
            self.motivation_manager.start_scheduler(
                mode="random",
                min_rand=self.ai_pause_min,
                max_rand=self.ai_pause_max,
            )
    def refresh_words_list(self):
        for w in self.words_scroll_frame.winfo_children(): w.destroy()
        for word in self.stats_manager.get_trigger_words():
            row = ctk.CTkFrame(self.words_scroll_frame, fg_color="transparent")
            row.pack(fill="x", pady=3, padx=5)
            ctk.CTkLabel(row, text=word, font=ctk.CTkFont(weight="bold")).pack(side="left", padx=10)
            if word in self.pending_deletions:
                pending = self.pending_deletions[word]
                pending["label"] = ctk.CTkLabel(row, text="Löschung wird vorbereitet ...", text_color=ACCENT_ORANGE)
                pending["label"].pack(side="right", padx=8)
                ctk.CTkButton(row, text="Abbrechen", width=80, height=24, command=lambda x=word: self.cancel_delayed_removal(x)).pack(side="right", padx=5)
                if pending["after_id"] is None:
                    self._update_delayed_removal(word)
            else:
                ctk.CTkButton(row, text="Löschen", width=70, height=24, fg_color=ACCENT_RED, hover_color="#CC3D3D", command=lambda x=word: self.delayed_remove_trigger_word(x)).pack(side="right", padx=10)
    def delayed_remove_trigger_word(self, word):
        from tkinter import messagebox
        if word in self.pending_deletions:
            return
        if messagebox.askyesno("Impuls-Sperre", f"Das Sperrwort '{word}' wird erst nach 5 Minuten entfernt. Möchtest du fortfahren?"):
            self.pending_deletions[word] = {
                "deadline": time.monotonic() + 300,
                "after_id": None,
                "label": None,
            }
            self.refresh_words_list()
    def _update_delayed_removal(self, word):
        pending = self.pending_deletions.get(word)
        if not pending:
            return
        pending["after_id"] = None
        remaining = max(0, math.ceil(pending["deadline"] - time.monotonic()))
        if remaining == 0:
            self.pending_deletions.pop(word, None)
            self.remove_trigger_word(word)
            return
        mins, secs = divmod(remaining, 60)
        label = pending.get("label")
        if label and label.winfo_exists():
            label.configure(text=f"Entfernung in {mins:02d}:{secs:02d}")
        pending["after_id"] = self.after(1000, lambda: self._update_delayed_removal(word))
    def cancel_delayed_removal(self, word):
        pending = self.pending_deletions.pop(word, None)
        if pending and pending.get("after_id"):
            self.after_cancel(pending["after_id"])
        self.refresh_words_list()
    def add_trigger_word(self):
        nw = self.entry_new_word.get().strip().lower()
        if nw:
            words = self.stats_manager.get_trigger_words()
            if nw not in words:
                words.append(nw)
                self.stats_manager.save_trigger_words(words)
                self.monitor.update_trigger_words(words)
                self.refresh_words_list()
                self.entry_new_word.delete(0, "end")
    def remove_trigger_word(self, word):
        words = self.stats_manager.get_trigger_words()
        if word in words:
            pending = self.pending_deletions.pop(word, None)
            if pending and pending.get("after_id"):
                self.after_cancel(pending["after_id"])
            words.remove(word)
            self.stats_manager.save_trigger_words(words)
            self.monitor.update_trigger_words(words)
            self.refresh_words_list()
