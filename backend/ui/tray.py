from .shared import *



class TrayMixin:
    def setup_tray(self):
        menu = pystray.Menu(
            pystray.MenuItem("Reşo öffnen", self.show_from_tray, default=True),
            pystray.MenuItem("25 Min. Fokus Quick-Start", lambda: self.start_timer_action(25)),
            pystray.MenuItem("Beenden (30 Min. Wartezeit)", self.quit_app),
        )
        self.tray_icon = pystray.Icon("ResoApp", self.pil_icon, "Reşo : You vs You", menu)
        threading.Thread(target=self.tray_icon.run, daemon=True).start()
    def hide_to_tray(self):
        self.withdraw()
    def _begin_shutdown_countdown(self):
        if self.is_shutting_down:
            self._show_home_hub()
            return

        self.is_shutting_down = True
        self.shutdown_deadline = time.monotonic() + 30 * 60
        self.stats_manager.set_shutdown_deadline(time.time() + 30 * 60)
        self._show_home_hub()
        self._run_shutdown_countdown()
    def quit_app(self, icon=None, item=None):
        self.after(0, self._begin_shutdown_countdown)
    def _run_shutdown_countdown(self):
        if not self.is_shutting_down:
            return
        self.shutdown_remaining_seconds = max(
            0,
            int(self.shutdown_deadline - time.monotonic()),
        )
        if self.tray_icon is not None:
            minutes, seconds = divmod(self.shutdown_remaining_seconds, 60)
            self.tray_icon.title = (
                f"Reşo — Beenden in {minutes:02d}:{seconds:02d}"
            )
        self._update_shutdown_status()
        if self.shutdown_remaining_seconds == 0:
            self.execute_final_quit()
            return
        self.shutdown_after_id = self.after(1000, self._run_shutdown_countdown)
    def _update_shutdown_status(self):
        if not hasattr(self, "shutdown_status_frame"):
            return
        if not self.is_shutting_down:
            self.shutdown_status_frame.pack_forget()
            return
        minutes, seconds = divmod(self.shutdown_remaining_seconds, 60)
        self.shutdown_status_label.configure(
            text=f"Das Programm wird in {minutes:02d}:{seconds:02d} beendet."
        )
        if not self.shutdown_status_frame.winfo_manager():
            self.shutdown_status_frame.pack(
                fill="x",
                padx=10,
                pady=(0, 8),
                before=self.home_metrics_frame,
            )
    def cancel_shutdown_countdown(self):
        if not self.is_shutting_down:
            return
        if self.shutdown_after_id is not None:
            self.after_cancel(self.shutdown_after_id)
            self.shutdown_after_id = None
        self.is_shutting_down = False
        self.shutdown_deadline = 0.0
        self.shutdown_remaining_seconds = 0
        self.stats_manager.set_shutdown_deadline(None)
        if self.tray_icon is not None:
            self.tray_icon.title = "Reşo : You vs You"
        self._update_shutdown_status()
    def execute_final_quit(self):
        self.is_shutting_down = False
        self.shutdown_deadline = 0.0
        self.shutdown_after_id = None
        if self.web_api is not None:
            self.web_api.close()
            self.web_api = None
        self.stats_manager.set_shutdown_deadline(None)
        if self.tray_icon:
            self.tray_icon.stop()
        if self._streak_ticker_id is not None:
            self.after_cancel(self._streak_ticker_id)
            self._streak_ticker_id = None
        for callback_id in (
            self._home_flame_animation_id,
            self._home_clock_animation_id,
        ):
            if callback_id is not None:
                self.after_cancel(callback_id)
        self._home_flame_animation_id = None
        self._home_clock_animation_id = None
        self.motivation_manager.stop_scheduler()
        self.discord_rpc.close()
        self.monitor.stop_whitelist_enforcement()
        self.monitor.stop_monitoring()
        if self.hotkey_listener is not None:
            self.hotkey_listener.stop()
            self.hotkey_listener = None
        self.focus_timer.stop()
        self.monitor.notify_app_closing()
        self.quit()
        self.destroy()
    def show_from_tray(self, icon=None, item=None):
        self.after(0, self._show_home_hub)
        if self.is_shutting_down:
            return
        if not self.stats_manager.get_stats().get("codex_completed", False):
            self.after(200, self.show_startup_prompts)
        else:
            self.after(200, self.check_sunday_report_popup)
    def _show_home_hub(self):
        self.deiconify()
        self.lift()
        self.focus_force()
        self.tabview.set("🏠 Home")
        self._update_shutdown_status()
