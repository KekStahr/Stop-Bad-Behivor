from .shared import *



class TimerMixin:
    def slider_event(self, value):
        val = int(value)
        self.slider_val_label.configure(text=f"Dauer: {val} Minuten")
        if not self.focus_timer.is_running:
            self.timer_label.configure(text=f"{val:02d}:00")
    def start_timer_action(self, custom_mins=None):
        if not self.focus_timer.is_running:
            mins = custom_mins if custom_mins else int(self.time_slider.get())
            self.focus_timer.start(mins)
            if self.ai_pauses_enabled:
                self.motivation_manager.start_scheduler(
                    mode="random",
                    min_rand=self.ai_pause_min,
                    max_rand=self.ai_pause_max,
                )
            self.btn_start_timer.configure(text="Fokus läuft...", fg_color=ACCENT_RED, hover_color="#CC3D3D")
            self.discord_rpc.update_presence("Im Fokus-Modus", f"Konzentriert für {mins} Min.")
            if self.whitelist_enabled:
                self.monitor.set_whitelist_mode(
                    True,
                    self.stats_manager.get_stats().get("whitelisted_apps", []),
                )
                self.monitor.start_whitelist_enforcement()
    def update_timer_display(self, time_str):
        self.after(0, lambda: self.timer_label.configure(text=time_str))
    def on_timer_finished(self, minutes):
        self.motivation_manager.stop_scheduler()
        self.stats_manager.add_timer_session(minutes, mood_score=2)
        self.after(0, self.reset_timer_ui)
        self.after(0, self.update_stats_display)
        self.after(100, lambda: self.show_mood_dialog(minutes))
    def show_mood_dialog(self, minutes):
        dialog = ctk.CTkToplevel(self)
        dialog.title("Fokus-Check")
        dialog.geometry("380x280")
        dialog.resizable(False, False)
        dialog.attributes("-topmost", True)
        dialog.grab_set()

        ctk.CTkLabel(
            dialog,
            text="🎯 Session beendet!",
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color=ACCENT_GREEN,
        ).pack(pady=(20, 5))
        ctk.CTkLabel(
            dialog,
            text=f"Du hast {minutes} Minuten fokussiert.\nWie konzentriert warst du?",
            font=ctk.CTkFont(size=13),
            text_color=TEXT_SECONDARY,
        ).pack(pady=(0, 15))

        btn_frame = ctk.CTkFrame(dialog, fg_color="transparent")
        btn_frame.pack(fill="x", padx=20, pady=10)

        def rate_and_close(score):
            today_str = str(date.today())
            daily_moods = self.stats_manager.data.setdefault("daily_moods", {})
            if today_str in daily_moods and daily_moods[today_str]:
                daily_moods[today_str][-1] = score
                self.stats_manager.save_data()
            self.update_stats_display()
            dialog.destroy()

        ctk.CTkButton(
            btn_frame,
            text="🔴 Unfokussiert",
            fg_color="#C62828",
            hover_color="#B71C1C",
            width=100,
            command=lambda: rate_and_close(0),
        ).pack(side="left", expand=True, padx=2)
        ctk.CTkButton(
            btn_frame,
            text="🟡 Geht so",
            fg_color="#F57F17",
            hover_color="#E65100",
            width=100,
            command=lambda: rate_and_close(1),
        ).pack(side="left", expand=True, padx=2)
        ctk.CTkButton(
            btn_frame,
            text="🟢 Top Fokus",
            fg_color=ACCENT_GREEN,
            hover_color="#1B5E20",
            width=100,
            command=lambda: rate_and_close(2),
        ).pack(side="left", expand=True, padx=2)
    def reset_timer_ui(self):
        self.motivation_manager.stop_scheduler()
        self.monitor.stop_whitelist_enforcement()
        self.btn_start_timer.configure(text="Fokus starten", fg_color=ACCENT_GREEN, hover_color="#1B5E20")
        val = int(self.time_slider.get())
        self.timer_label.configure(text=f"{val:02d}:00")
        self.discord_rpc.update_presence("Bereit", "Wartet auf nächste Session")
