import customtkinter as ctk
import pystray
from PIL import ImageTk
import threading
import sys
import time
import math
import queue
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from pynput import keyboard

from timer import FocusTimer
from monitor import BadBehaviorMonitor
from stats import StatsManager
from icon import create_app_icon
from ai_motivator import MotivationManager
from discord_rpc import DiscordRPCManager

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("dark-blue")

class ResoApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Reşo : You vs You")
        self.geometry("820x720")
        self.resizable(False, False)

        # Icon oben links & Taskleiste
        self.pil_icon = create_app_icon()
        self.tk_icon = ImageTk.PhotoImage(self.pil_icon)
        self.wm_iconphoto(True, self.tk_icon)

        self.stats_manager = StatsManager()
        self.motivation_manager = MotivationManager(self.stats_manager)
        self.discord_rpc = DiscordRPCManager()

        self.lockout_end_time = 0
        self.pin_unlocked = False
        self.pending_deletions = {}
        self.hotkey_listener = None

        self.target_processes = ["chrome.exe", "msedge.exe", "firefox.exe", "discord.exe"]
        self.monitor = BadBehaviorMonitor(self.stats_manager, self.target_processes)
        self.monitor.start_monitoring()

        self.focus_timer = FocusTimer(
            update_callback=self.update_timer_display,
            finish_callback=self.on_timer_finished
        )

        self.tray_icon = None
        self.setup_tray()

        self.create_widgets()
        self.update_stats_display()
        self.refresh_community_stats()

        # Globaler Hotkey für den Panic-Button starten
        self.setup_panic_hotkey_listener()

        self.protocol("WM_DELETE_WINDOW", self.hide_to_tray)

    def setup_tray(self):
        menu = pystray.Menu(
            pystray.MenuItem("Reşo öffnen", self.show_from_tray, default=True),
            pystray.MenuItem("25 Min. Fokus Quick-Start", lambda: self.start_timer_action(25)),
            pystray.MenuItem("Beenden", self.quit_app)
        )
        self.tray_icon = pystray.Icon("ResoApp", self.pil_icon, "Reşo : You vs You", menu)
        threading.Thread(target=self.tray_icon.run, daemon=True).start()

    def hide_to_tray(self):
        self.withdraw()

    def show_from_tray(self, icon=None, item=None):
        self.deiconify()
        self.lift()
        self.focus_force()

    def quit_app(self, icon=None, item=None):
        if self.tray_icon:
            self.tray_icon.stop()
        self.motivation_manager.stop_scheduler()
        self.discord_rpc.close()
        self.monitor.notify_app_closing()
        self.destroy()
        sys.exit()

    def create_widgets(self):
        # Header
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.pack(fill="x", padx=20, pady=(15, 5))

        self.title_label = ctk.CTkLabel(self.header_frame, text="REŞO : YOU VS YOU", font=ctk.CTkFont(size=24, weight="bold"), text_color="#FF4D4D")
        self.title_label.pack(anchor="w")

        self.lbl_level = ctk.CTkLabel(self.header_frame, text=f"Rang: {self.stats_manager.get_stats().get('level', 'Disziplin-Novize')}", font=ctk.CTkFont(size=12, weight="bold"), text_color="#FFA500")
        self.lbl_level.pack(anchor="w")

        # Tabs
        self.tabview = ctk.CTkTabview(self, width=780, height=600)
        self.tabview.pack(pady=10)

        self.tab_timer = self.tabview.add("Fokus Timer")
        self.tab_pause = self.tabview.add("KI-Pausen & Prävention")
        self.tab_stats = self.tabview.add("Statistik & Analytics")
        self.tab_settings = self.tabview.add("Sperr-Regeln & PIN")

        # --- TAB 1: TIMER & PANIC ---
        self.timer_label = ctk.CTkLabel(self.tab_timer, text="25:00", font=ctk.CTkFont(size=56, weight="bold"))
        self.timer_label.pack(pady=(20, 10))

        self.time_slider = ctk.CTkSlider(self.tab_timer, from_=5, to=120, number_of_steps=23, command=self.slider_event)
        self.time_slider.set(25)
        self.time_slider.pack(pady=10)

        self.slider_val_label = ctk.CTkLabel(self.tab_timer, text="Dauer: 25 Minuten", font=ctk.CTkFont(size=14))
        self.slider_val_label.pack(pady=5)

        self.btn_start_timer = ctk.CTkButton(self.tab_timer, text="Fokus starten", fg_color="#28a745", hover_color="#218838", command=lambda: self.start_timer_action())
        self.btn_start_timer.pack(pady=10)

        # Panic Button mit konfigurierbarem Hotkey-Info
        panic_frame = ctk.CTkFrame(self.tab_timer, fg_color="#2b2b2b")
        panic_frame.pack(fill="x", padx=40, pady=20)
        ctk.CTkLabel(panic_frame, text="🚨 Notfall-Panic-Button", font=ctk.CTkFont(size=14, weight="bold"), text_color="#FF4D4D").pack(pady=(10, 2))
        self.lbl_hotkey_info = ctk.CTkLabel(panic_frame, text=f"Tastenkürzel: {self.stats_manager.get_stats().get('panic_hotkey', '<ctrl>+<alt>+x')}", font=ctk.CTkFont(size=11), text_color="gray")
        self.lbl_hotkey_info.pack(pady=(0, 5))
        ctk.CTkButton(panic_frame, text="Jetzt Bildschirm sperren", fg_color="#dc3545", hover_color="#c82333", command=self.trigger_panic).pack(pady=(0, 10))

        # --- TAB 2: KI-PAUSEN ---
        lbl_pause_title = ctk.CTkLabel(self.tab_pause, text="Bildschirm-Pausen & KI-Motivator", font=ctk.CTkFont(size=16, weight="bold"))
        lbl_pause_title.pack(anchor="w", padx=20, pady=(10, 5))

        preset_frame = ctk.CTkFrame(self.tab_pause, fg_color="transparent")
        preset_frame.pack(fill="x", padx=20, pady=5)

        ctk.CTkButton(preset_frame, text="🟢 Sanft (Gering)", fg_color="#28a745", command=lambda: self.apply_preset("light")).pack(side="left", expand=True, padx=5)
        ctk.CTkButton(preset_frame, text="🟡 Ausgewogen (Mittel)", fg_color="#ffc107", text_color="black", command=lambda: self.apply_preset("medium")).pack(side="left", expand=True, padx=5)
        ctk.CTkButton(preset_frame, text="🔴 Strikter Detox (Hoch)", fg_color="#dc3545", command=lambda: self.apply_preset("strict")).pack(side="left", expand=True, padx=5)

        settings_box = ctk.CTkFrame(self.tab_pause, fg_color="#2b2b2b")
        settings_box.pack(fill="x", padx=20, pady=15)
        ctk.CTkRadioButton(settings_box, text="Zufälliger Bereich (10 - 20 Min)", variable=ctk.StringVar(value="random"), value="random").pack(anchor="w", padx=15, pady=15)
        
        self.btn_toggle_motivation = ctk.CTkButton(self.tab_pause, text="KI-Erinnerungen aktivieren", fg_color="#17a2b8", command=self.toggle_motivation)
        self.btn_toggle_motivation.pack(pady=10)

        # --- TAB 3: STATISTIK & ANALYTICS (Geld, Zeit, Heatmap, Uhrzeiten) ---
        self.stats_scroll = ctk.CTkScrollableFrame(self.tab_stats, width=740, height=500, fg_color="transparent")
        self.stats_scroll.pack(fill="both", expand=True, padx=5, pady=5)

        # 1. Geld & Zeit Ersparnis Card
        self.card_savings = ctk.CTkFrame(self.stats_scroll, fg_color="#1e2d24", border_color="#28a745", border_width=2)
        self.card_savings.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(self.card_savings, text="💎 GEWONNENE ZEIT & GELD-ERSPARNIS", font=ctk.CTkFont(size=13, weight="bold"), text_color="#28a745").pack(anchor="w", padx=15, pady=(10, 2))
        self.lbl_savings_detail = ctk.CTkLabel(self.card_savings, text="⏳ 0 Std. gerettet  |  💶 0,00 € Ersparnis", font=ctk.CTkFont(size=16, weight="bold"))
        self.lbl_savings_detail.pack(anchor="w", padx=15, pady=(0, 5))

        rate_frame = ctk.CTkFrame(self.card_savings, fg_color="transparent")
        rate_frame.pack(fill="x", padx=15, pady=(0, 10))
        ctk.CTkLabel(rate_frame, text="Dein Stundensatz (€):", font=ctk.CTkFont(size=11)).pack(side="left", padx=(0, 5))
        self.entry_rate = ctk.CTkEntry(rate_frame, width=60, font=ctk.CTkFont(size=11))
        self.entry_rate.insert(0, str(self.stats_manager.get_hourly_rate()))
        self.entry_rate.pack(side="left", padx=5)
        ctk.CTkButton(rate_frame, text="Speichern", width=70, height=20, fg_color="#28a745", command=self.save_hourly_rate).pack(side="left")

        # 2. Streak & Metriken Grid
        self.card_streak = ctk.CTkFrame(self.stats_scroll, fg_color="#2b2b2b")
        self.card_streak.pack(fill="x", padx=10, pady=8)
        self.lbl_streak_full = ctk.CTkLabel(self.card_streak, text="🔥 Aktuelle Streak: 0 Tage  |  🏆 Rekord: 0 Tage", font=ctk.CTkFont(size=14, weight="bold"), text_color="#FFA500")
        self.lbl_streak_full.pack(anchor="w", padx=15, pady=12)

        # 3. Heatmap Card
        self.card_heatmap = ctk.CTkFrame(self.stats_scroll, fg_color="#2b2b2b")
        self.card_heatmap.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(self.card_heatmap, text="📅 Fokus-Aktivität (GitHub-Style Heatmap):", font=ctk.CTkFont(size=13, weight="bold")).pack(anchor="w", padx=15, pady=(10, 5))

        self.card_community = ctk.CTkFrame(self.stats_scroll, fg_color="#2b2b2b")
        self.card_community.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(self.card_community, text="Community-Fokus", font=ctk.CTkFont(size=13, weight="bold")).pack(anchor="w", padx=15, pady=(10, 3))
        self.lbl_community_stats = ctk.CTkLabel(self.card_community, text="Community-Statistik wird geladen ...", font=ctk.CTkFont(size=12), text_color="gray")
        self.lbl_community_stats.pack(anchor="w", padx=15, pady=(0, 10))

        # 4. Rückfall-Uhrzeiten Analyse Card
        self.card_hours = ctk.CTkFrame(self.stats_scroll, fg_color="#2b2b2b")
        self.card_hours.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(self.card_hours, text="⏰ Rückfall-Uhrzeiten-Analyse (Kritische Zeiten):", font=ctk.CTkFont(size=13, weight="bold"), text_color="#FF6B6B").pack(anchor="w", padx=15, pady=(10, 5))
        self.lbl_hours_detail = ctk.CTkLabel(self.card_hours, text="Noch keine Vorfälle erfasst.", font=ctk.CTkFont(size=12), text_color="gray")
        self.lbl_hours_detail.pack(anchor="w", padx=15, pady=(0, 10))

        # --- TAB 4: SPERR-REGELN, PIN & SETTINGS ---
        self.setup_settings_tab()

    def render_heatmap(self):
        old_canvas = getattr(self, "heatmap_canvas", None)
        if old_canvas:
            old_canvas.get_tk_widget().destroy()
        old_figure = getattr(self, "heatmap_figure", None)
        if old_figure:
            plt.close(old_figure)
        fig, ax = plt.subplots(figsize=(6.5, 1.4), dpi=90)
        fig.patch.set_facecolor('#2b2b2b')
        ax.set_facecolor('#1f1f1f')

        daily_data = self.stats_manager.get_stats().get("daily_activity", {})
        dates = [(datetime.today() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(27, -1, -1)]
        values = [daily_data.get(d, 0) for d in dates]

        ax.bar(range(len(values)), values, color=['#28a745' if v > 0 else '#3a3a3a' for v in values], width=0.7)
        ax.axis('off')

        canvas = FigureCanvasTkAgg(fig, master=self.card_heatmap)
        canvas.draw()
        canvas.get_tk_widget().pack(fill="x", padx=15, pady=(0, 10))
        self.heatmap_figure = fig
        self.heatmap_canvas = canvas

    def setup_settings_tab(self):
        for widget in self.tab_settings.winfo_children():
            widget.destroy()

        stored_pin = self.stats_manager.get_stats().get("pin_code", "")

        if stored_pin and not self.pin_unlocked:
            pin_frame = ctk.CTkFrame(self.tab_settings, fg_color="#2b2b2b")
            pin_frame.pack(expand=True, padx=40, pady=40)

            ctk.CTkLabel(pin_frame, text="🔒 PIN-Schutz Aktiviert", font=ctk.CTkFont(size=16, weight="bold")).pack(pady=(20, 10))
            self.entry_pin_input = ctk.CTkEntry(pin_frame, show="*", width=140, justify="center", font=ctk.CTkFont(size=18))
            self.entry_pin_input.pack(pady=10)

            self.btn_unlock = ctk.CTkButton(pin_frame, text="Freischalten", fg_color="#28a745", command=self.unlock_settings)
            self.btn_unlock.pack(pady=15)
            if time.time() < self.lockout_end_time:
                self.entry_pin_input.configure(state="disabled", fg_color="#441111")
                self.btn_unlock.configure(state="disabled")
                self.run_cooldown_countdown()
        else:
            ctk.CTkLabel(self.tab_settings, text="Sperrwörter verwalten:", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", padx=20, pady=(15, 5))

            add_word_frame = ctk.CTkFrame(self.tab_settings, fg_color="transparent")
            add_word_frame.pack(fill="x", padx=20, pady=5)

            self.entry_new_word = ctk.CTkEntry(add_word_frame, placeholder_text="Neues Sperrwort...", width=470)
            self.entry_new_word.pack(side="left", padx=(0, 10))
            ctk.CTkButton(add_word_frame, text="Hinzufügen", fg_color="#28a745", width=120, command=self.add_trigger_word).pack(side="left")

            self.words_scroll_frame = ctk.CTkScrollableFrame(self.tab_settings, width=680, height=150, fg_color="#2b2b2b")
            self.words_scroll_frame.pack(padx=20, pady=10)
            self.refresh_words_list()

            # Extra Einstellungen (PIN, Webhook, Hotkey)
            extra_box = ctk.CTkFrame(self.tab_settings, fg_color="transparent")
            extra_box.pack(fill="x", padx=20, pady=10)

            self.entry_new_pin = ctk.CTkEntry(extra_box, placeholder_text="Neuer PIN (4 Ziffern)", width=150, show="*")
            self.entry_new_pin.pack(side="left", padx=(0, 5))
            ctk.CTkButton(extra_box, text="PIN Speichern", width=110, fg_color="#17a2b8", command=self.save_new_pin).pack(side="left", padx=(0, 15))

            self.entry_webhook = ctk.CTkEntry(extra_box, placeholder_text="Discord Webhook URL", width=220)
            self.entry_webhook.insert(0, self.stats_manager.get_stats().get("webhook_url", ""))
            self.entry_webhook.pack(side="left", padx=(0, 5))
            ctk.CTkButton(extra_box, text="Webhook", width=80, fg_color="#28a745", command=self.save_webhook_url).pack(side="left")

            hotkey_frame = ctk.CTkFrame(self.tab_settings, fg_color="transparent")
            hotkey_frame.pack(fill="x", padx=20, pady=(0, 10))
            ctk.CTkLabel(hotkey_frame, text="Panic-Hotkey:", width=100, anchor="w").pack(side="left", padx=(0, 5))
            self.entry_panic_hotkey = ctk.CTkEntry(hotkey_frame, width=200, placeholder_text="<ctrl>+<alt>+x")
            self.entry_panic_hotkey.insert(0, self.stats_manager.get_stats().get("panic_hotkey", "<ctrl>+<alt>+x"))
            self.entry_panic_hotkey.pack(side="left", padx=(0, 5))
            ctk.CTkButton(hotkey_frame, text="Hotkey speichern", width=130, fg_color="#17a2b8", command=self.save_panic_hotkey).pack(side="left")
            self.lbl_hotkey_status = ctk.CTkLabel(hotkey_frame, text="", text_color="gray")
            self.lbl_hotkey_status.pack(side="left", padx=8)

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
            self.lbl_hotkey_status.configure(text="Hotkey fehlt", text_color="#FF6B6B")
            return

        try:
            new_listener = keyboard.GlobalHotKeys({hotkey: self.trigger_panic})
            new_listener.start()
        except Exception:
            self.lbl_hotkey_status.configure(text="Ungültiger Hotkey", text_color="#FF6B6B")
            return

        old_listener = self.hotkey_listener
        self.hotkey_listener = new_listener
        if old_listener:
            old_listener.stop()
        self.stats_manager.set_panic_hotkey(hotkey)
        self.lbl_hotkey_info.configure(text=f"Tastenkürzel: {hotkey}")
        self.lbl_hotkey_status.configure(text="Gespeichert", text_color="#28a745")

    def trigger_panic(self):
        import os
        if sys.platform == "win32":
            os.system("rundll32.exe user32.dll,LockWorkStation")

    def refresh_community_stats(self):
        self.community_stats_queue = queue.Queue()
        threading.Thread(
            target=lambda: self.community_stats_queue.put(self.stats_manager.get_community_stats()),
            daemon=True,
        ).start()
        self.after(100, self._poll_community_stats)

    def _poll_community_stats(self):
        try:
            data = self.community_stats_queue.get_nowait()
        except queue.Empty:
            self.after(100, self._poll_community_stats)
            return

        if data is None:
            self.lbl_community_stats.configure(text="Community-Statistik derzeit nicht verfügbar.")
            return
        self.lbl_community_stats.configure(
            text=(
                f"{data.get('total_active_users', 0)} aktive Nutzer  |  "
                f"{data.get('total_community_focus_minutes', 0)} Fokus-Min.  |  "
                f"{data.get('community_streak_hours', 0)} Streak-Stunden"
            )
        )

    def save_hourly_rate(self):
        try:
            val = float(self.entry_rate.get().replace(",", "."))
            if val >= 0:
                self.stats_manager.set_hourly_rate(val)
                self.update_stats_display()
        except ValueError:
            pass

    def apply_preset(self, t): pass
    def toggle_motivation(self):
        if self.motivation_manager.is_running:
            self.motivation_manager.stop_scheduler()
            self.btn_toggle_motivation.configure(text="KI-Erinnerungen aktivieren", fg_color="#17a2b8")
        else:
            self.motivation_manager.start_scheduler(mode="random", min_rand=10, max_rand=20)
            self.btn_toggle_motivation.configure(text="KI-Erinnerungen aktiv (Stoppen)", fg_color="#dc3545")

    def refresh_words_list(self):
        for w in self.words_scroll_frame.winfo_children(): w.destroy()
        for word in self.stats_manager.get_trigger_words():
            row = ctk.CTkFrame(self.words_scroll_frame, fg_color="transparent")
            row.pack(fill="x", pady=2, padx=5)
            ctk.CTkLabel(row, text=word).pack(side="left", padx=10)
            if word in self.pending_deletions:
                pending = self.pending_deletions[word]
                pending["label"] = ctk.CTkLabel(row, text="Löschung wird vorbereitet ...", text_color="#ffc107")
                pending["label"].pack(side="right", padx=8)
                ctk.CTkButton(row, text="Abbrechen", width=80, height=22, command=lambda x=word: self.cancel_delayed_removal(x)).pack(side="right", padx=5)
                if pending["after_id"] is None:
                    self._update_delayed_removal(word)
            else:
                ctk.CTkButton(row, text="Löschen", width=70, height=22, fg_color="#dc3545", command=lambda x=word: self.delayed_remove_trigger_word(x)).pack(side="right", padx=10)

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

    def slider_event(self, value):
        val = int(value)
        self.slider_val_label.configure(text=f"Dauer: {val} Minuten")
        if not self.focus_timer.is_running:
            self.timer_label.configure(text=f"{val:02d}:00")

    def start_timer_action(self, custom_mins=None):
        if not self.focus_timer.is_running:
            mins = custom_mins if custom_mins else int(self.time_slider.get())
            self.focus_timer.start(mins)
            self.btn_start_timer.configure(text="Fokus läuft...", fg_color="#dc3545")
            self.discord_rpc.update_presence("Im Fokus-Modus", f"Konzentriert für {mins} Min.")

    def update_timer_display(self, time_str):
        self.after(0, lambda: self.timer_label.configure(text=time_str))

    def on_timer_finished(self, minutes):
        self.stats_manager.add_timer_session(minutes)
        self.after(0, self.reset_timer_ui)
        self.after(0, self.update_stats_display)

    def reset_timer_ui(self):
        self.btn_start_timer.configure(text="Fokus starten", fg_color="#28a745")
        val = int(self.time_slider.get())
        self.timer_label.configure(text=f"{val:02d}:00")
        self.discord_rpc.update_presence("Bereit", "Wartet auf nächste Session")

    def update_stats_display(self):
        data = self.stats_manager.get_stats()
        saved_hours, saved_money = self.stats_manager.calculate_savings()
        
        # Ersparnis anzeigen
        self.lbl_savings_detail.configure(
            text=f"⏳ {saved_hours} Std. gerettet  |  💶 {saved_money:,.2f} € Ersparnis".replace(",", "X").replace(".", ",").replace("X", ".")
        )
        self.lbl_level.configure(text=f"Rang: {data.get('level', 'Disziplin-Novize')}")
        self.lbl_streak_full.configure(text=f"🔥 Aktuelle Streak: {data.get('streak', 0)} Tage  |  🏆 Rekord: {data.get('longest_streak', 0)} Tage")

        # Rückfall-Uhrzeiten darstellen
        incident_hours = data.get("incident_hours", {})
        if incident_hours:
            sorted_hours = sorted(incident_hours.items(), key=lambda x: x[1], reverse=True)
            text_str = " | ".join([f"{h}: {c}x" for h, c in sorted_hours[:3]])
            self.lbl_hours_detail.configure(text=f"Haupt-Risikazeiten: {text_str}", text_color="#FF4D4D")
        else:
            self.lbl_hours_detail.configure(text="Noch keine Vorfälle erfasst. Sauber!", text_color="gray")

        self.render_heatmap()