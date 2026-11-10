import customtkinter as ctk
import pystray
from PIL import ImageTk
import threading
import sys

from timer import FocusTimer
from monitor import BadBehaviorMonitor
from stats import StatsManager
from icon import create_app_icon
from ai_motivator import MotivationManager

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("dark-blue")

class ResoApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Reşo : You vs You")
        self.geometry("780x620")
        self.resizable(False, False)

        # 1. Nur Taskleisten- und Fenster-Icon setzen (kein riesiges R im Textbereich)
        self.pil_icon = create_app_icon()
        self.tk_icon = ImageTk.PhotoImage(self.pil_icon)
        self.wm_iconphoto(True, self.tk_icon)

        self.stats_manager = StatsManager()
        self.motivation_manager = MotivationManager(self.stats_manager)

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

        self.protocol("WM_DELETE_WINDOW", self.hide_to_tray)

    def setup_tray(self):
        menu = pystray.Menu(
            pystray.MenuItem("Reşo öffnen", self.show_from_tray, default=True),
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
        self.monitor.notify_app_closing()
        self.destroy()
        sys.exit()

    def create_widgets(self):
        # Header (Ohne großes R, sauberer Titel & Untertitel)
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.pack(fill="x", padx=20, pady=(15, 5))

        self.title_label = ctk.CTkLabel(self.header_frame, text="REŞO : YOU VS YOU", font=ctk.CTkFont(size=24, weight="bold"), text_color="#FF4D4D")
        self.title_label.pack(anchor="w")

        self.subtitle_label = ctk.CTkLabel(self.header_frame, text="Besiege deine schlechten Angewohnheiten. Jeden Tag.", font=ctk.CTkFont(size=12), text_color="gray")
        self.subtitle_label.pack(anchor="w")

        # Tabs
        self.tabview = ctk.CTkTabview(self, width=740, height=480)
        self.tabview.pack(pady=10)

        self.tab_timer = self.tabview.add("Fokus Timer")
        self.tab_pause = self.tabview.add("KI-Pausen & Prävention")
        self.tab_stats = self.tabview.add("Statistik & Streak")
        self.tab_settings = self.tabview.add("Sperr-Regeln")

        # --- TAB 1: FOKUS TIMER ---
        self.timer_label = ctk.CTkLabel(self.tab_timer, text="25:00", font=ctk.CTkFont(size=56, weight="bold"))
        self.timer_label.pack(pady=(40, 20))

        self.time_slider = ctk.CTkSlider(self.tab_timer, from_=5, to=120, number_of_steps=23, command=self.slider_event)
        self.time_slider.set(25)
        self.time_slider.pack(pady=10)

        self.slider_val_label = ctk.CTkLabel(self.tab_timer, text="Dauer: 25 Minuten", font=ctk.CTkFont(size=14))
        self.slider_val_label.pack(pady=5)

        self.btn_start_timer = ctk.CTkButton(self.tab_timer, text="Fokus starten", fg_color="#28a745", hover_color="#218838", command=self.start_timer_action)
        self.btn_start_timer.pack(pady=15)

        # --- TAB 2: KI-PAUSEN & PRÄVENTION ---
        lbl_pause_title = ctk.CTkLabel(self.tab_pause, text="Bildschirm-Pausen & KI-Motivator", font=ctk.CTkFont(size=16, weight="bold"))
        lbl_pause_title.pack(anchor="w", padx=20, pady=(10, 5))

        lbl_preset_info = ctk.CTkLabel(self.tab_pause, text="Wähle deine Präventionsstufe (Wissenschaftliches Stufenmodell):", font=ctk.CTkFont(size=12), text_color="gray")
        lbl_preset_info.pack(anchor="w", padx=20, pady=(0, 10))

        preset_frame = ctk.CTkFrame(self.tab_pause, fg_color="transparent")
        preset_frame.pack(fill="x", padx=20, pady=5)

        ctk.CTkButton(preset_frame, text="🟢 Sanft (Gering)", fg_color="#28a745", command=lambda: self.apply_preset("light")).pack(side="left", expand=True, padx=5)
        ctk.CTkButton(preset_frame, text="🟡 Ausgewogen (Mittel)", fg_color="#ffc107", text_color="black", command=lambda: self.apply_preset("medium")).pack(side="left", expand=True, padx=5)
        ctk.CTkButton(preset_frame, text="🔴 Strikter Detox (Hoch)", fg_color="#dc3545", command=lambda: self.apply_preset("strict")).pack(side="left", expand=True, padx=5)

        settings_box = ctk.CTkFrame(self.tab_pause, fg_color="#2b2b2b")
        settings_box.pack(fill="x", padx=20, pady=15)

        self.mode_var = ctk.StringVar(value="random")
        self.radio_random = ctk.CTkRadioButton(settings_box, text="Zufälliger Bereich (z.B. 10 - 20 Min)", variable=self.mode_var, value="random")
        self.radio_random.pack(anchor="w", padx=15, pady=(15, 5))

        self.rand_inputs_frame = ctk.CTkFrame(settings_box, fg_color="transparent")
        self.rand_inputs_frame.pack(anchor="w", padx=35, pady=5)
        
        ctk.CTkLabel(self.rand_inputs_frame, text="Min:").pack(side="left", padx=5)
        self.entry_min = ctk.CTkEntry(self.rand_inputs_frame, width=50)
        self.entry_min.insert(0, "10")
        self.entry_min.pack(side="left", padx=5)

        ctk.CTkLabel(self.rand_inputs_frame, text="Max:").pack(side="left", padx=5)
        self.entry_max = ctk.CTkEntry(self.rand_inputs_frame, width=50)
        self.entry_max.insert(0, "20")
        self.entry_max.pack(side="left", padx=5)
        ctk.CTkLabel(self.rand_inputs_frame, text="Minuten").pack(side="left", padx=5)

        self.radio_fixed = ctk.CTkRadioButton(settings_box, text="Fester Intervall", variable=self.mode_var, value="fixed")
        self.radio_fixed.pack(anchor="w", padx=15, pady=(10, 5))

        self.fixed_inputs_frame = ctk.CTkFrame(settings_box, fg_color="transparent")
        self.fixed_inputs_frame.pack(anchor="w", padx=35, pady=(5, 15))

        ctk.CTkLabel(self.fixed_inputs_frame, text="Alle").pack(side="left", padx=5)
        self.entry_fixed = ctk.CTkEntry(self.fixed_inputs_frame, width=50)
        self.entry_fixed.insert(0, "15")
        self.entry_fixed.pack(side="left", padx=5)
        ctk.CTkLabel(self.fixed_inputs_frame, text="Minuten").pack(side="left", padx=5)

        self.btn_toggle_motivation = ctk.CTkButton(self.tab_pause, text="KI-Erinnerungen aktivieren", fg_color="#17a2b8", hover_color="#138496", command=self.toggle_motivation)
        self.btn_toggle_motivation.pack(pady=10)

        # --- TAB 3: ERWEITERTE STATISTIK & ANALYSE (NEU & HIGH-VALUE) ---
        stats_scroll = ctk.CTkScrollableFrame(self.tab_stats, width=700, height=400, fg_color="transparent")
        stats_scroll.pack(fill="both", expand=True, padx=10, pady=10)

        # 1. Streak-Übersichtskarte
        self.card_streak = ctk.CTkFrame(stats_scroll, fg_color="#2b2b2b")
        self.card_streak.pack(fill="x", padx=10, pady=8)
        self.lbl_streak = ctk.CTkLabel(self.card_streak, text="🔥 Aktuelle Streak: 0 Tage (Rekord: 0 Tage)", font=ctk.CTkFont(size=15, weight="bold"), text_color="#FFA500")
        self.lbl_streak.pack(anchor="w", padx=15, pady=12)

        # 2. Produktivitäts-Metriken (Grid)
        metrics_grid = ctk.CTkFrame(stats_scroll, fg_color="transparent")
        metrics_grid.pack(fill="x", padx=10, pady=5)

        self.box_activations = ctk.CTkFrame(metrics_grid, fg_color="#2b2b2b", width=330, height=80)
        self.box_activations.pack(side="left", expand=True, padx=5, fill="x")
        self.lbl_activations = ctk.CTkLabel(self.box_activations, text="Timer-Sitzungen: 0", font=ctk.CTkFont(size=13, weight="bold"))
        self.lbl_activations.pack(anchor="w", padx=15, pady=(15, 2))
        self.lbl_total_mins = ctk.CTkLabel(self.box_activations, text="Gesamte Fokuszeit: 0 Min.", font=ctk.CTkFont(size=12), text_color="gray")
        self.lbl_total_mins.pack(anchor="w", padx=15, pady=(0, 15))

        self.box_prevented = ctk.CTkFrame(metrics_grid, fg_color="#2b2b2b", width=330, height=80)
        self.box_prevented.pack(side="right", expand=True, padx=5, fill="x")
        self.lbl_prevented = ctk.CTkLabel(self.box_prevented, text="Angewohnheiten gestoppt: 0", font=ctk.CTkFont(size=13, weight="bold"), text_color="#FF6B6B")
        self.lbl_prevented.pack(anchor="w", padx=15, pady=(15, 2))
        self.lbl_discipline_score = ctk.CTkLabel(self.box_prevented, text="Disziplin-Score: 100%", font=ctk.CTkFont(size=12), text_color="#28a745")
        self.lbl_discipline_score.pack(anchor="w", padx=15, pady=(0, 15))

        # 3. Trigger-Analyse Sektion
        self.card_triggers = ctk.CTkFrame(stats_scroll, fg_color="#2b2b2b")
        self.card_triggers.pack(fill="x", padx=10, pady=10)
        
        ctk.CTkLabel(self.card_triggers, text="📊 Häufigste verhinderte Trigger-Muster:", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", padx=15, pady=(12, 5))
        
        self.trigger_stats_inner = ctk.CTkFrame(self.card_triggers, fg_color="transparent")
        self.trigger_stats_inner.pack(fill="x", padx=15, pady=(0, 12))

        # --- TAB 4: SPERR-REGELN ---
        self.lbl_rules_info = ctk.CTkLabel(self.tab_settings, text="Sperrwörter hinzufügen & verwalten:", font=ctk.CTkFont(size=14, weight="bold"))
        self.lbl_rules_info.pack(anchor="w", padx=20, pady=(15, 5))

        self.add_word_frame = ctk.CTkFrame(self.tab_settings, fg_color="transparent")
        self.add_word_frame.pack(fill="x", padx=20, pady=5)

        self.entry_new_word = ctk.CTkEntry(self.add_word_frame, placeholder_text="Neues Sperrwort eingeben...", width=470)
        self.entry_new_word.pack(side="left", padx=(0, 10))

        self.btn_add_word = ctk.CTkButton(self.add_word_frame, text="Hinzufügen", fg_color="#28a745", hover_color="#218838", width=120, command=self.add_trigger_word)
        self.btn_add_word.pack(side="left")

        self.words_scroll_frame = ctk.CTkScrollableFrame(self.tab_settings, width=650, height=200, fg_color="#2b2b2b")
        self.words_scroll_frame.pack(padx=20, pady=10)

        self.refresh_words_list()

    def apply_preset(self, preset_type):
        if preset_type == "light":
            self.mode_var.set("fixed")
            self.entry_fixed.delete(0, "end")
            self.entry_fixed.insert(0, "45")
        elif preset_type == "medium":
            self.mode_var.set("random")
            self.entry_min.delete(0, "end")
            self.entry_min.insert(0, "20")
            self.entry_max.delete(0, "end")
            self.entry_max.insert(0, "40")
        elif preset_type == "strict":
            self.mode_var.set("random")
            self.entry_min.delete(0, "end")
            self.entry_min.insert(0, "10")
            self.entry_max.delete(0, "end")
            self.entry_max.insert(0, "20")

    def toggle_motivation(self):
        if self.motivation_manager.is_running:
            self.motivation_manager.stop_scheduler()
            self.btn_toggle_motivation.configure(text="KI-Erinnerungen aktivieren", fg_color="#17a2b8")
        else:
            mode = self.mode_var.get()
            try:
                min_r = int(self.entry_min.get())
                max_r = int(self.entry_max.get())
                fixed = int(self.entry_fixed.get())
            except ValueError:
                min_r, max_r, fixed = 10, 20, 15

            self.motivation_manager.start_scheduler(mode=mode, fixed_mins=fixed, min_rand=min_r, max_rand=max_r)
            self.btn_toggle_motivation.configure(text="KI-Erinnerungen AKTIV (Stoppen)", fg_color="#dc3545")

    def refresh_words_list(self):
        for widget in self.words_scroll_frame.winfo_children():
            widget.destroy()

        words = self.stats_manager.get_trigger_words()
        for word in words:
            row_frame = ctk.CTkFrame(self.words_scroll_frame, fg_color="transparent")
            row_frame.pack(fill="x", pady=2, padx=5)

            lbl = ctk.CTkLabel(row_frame, text=word, font=ctk.CTkFont(size=13))
            lbl.pack(side="left", padx=10)

            btn_del = ctk.CTkButton(row_frame, text="Löschen", width=70, height=24, fg_color="#dc3545", hover_color="#c82333",
                                    command=lambda w=word: self.remove_trigger_word(w))
            btn_del.pack(side="right", padx=10)

    def add_trigger_word(self):
        new_word = self.entry_new_word.get().strip().lower()
        if new_word:
            words = self.stats_manager.get_trigger_words()
            if new_word not in words:
                words.append(new_word)
                self.stats_manager.save_trigger_words(words)
                self.monitor.update_trigger_words(words)
                self.refresh_words_list()
                self.entry_new_word.delete(0, "end")

    def remove_trigger_word(self, word_to_remove):
        words = self.stats_manager.get_trigger_words()
        if word_to_remove in words:
            words.remove(word_to_remove)
            self.stats_manager.save_trigger_words(words)
            self.monitor.update_trigger_words(words)
            self.refresh_words_list()

    def slider_event(self, value):
        val = int(value)
        self.slider_val_label.configure(text=f"Dauer: {val} Minuten")
        if not self.focus_timer.is_running:
            self.timer_label.configure(text=f"{val:02d}:00")

    def start_timer_action(self):
        if not self.focus_timer.is_running:
            mins = int(self.time_slider.get())
            self.focus_timer.start(mins)
            self.btn_start_timer.configure(text="Fokus läuft...", fg_color="#dc3545", hover_color="#c82333")
            self.time_slider.configure(state="disabled")

    def update_timer_display(self, time_str):
        self.after(0, lambda: self.timer_label.configure(text=time_str))

    def on_timer_finished(self, minutes):
        self.stats_manager.add_timer_session(minutes)
        self.after(0, self.reset_timer_ui)
        self.after(0, self.update_stats_display)

    def reset_timer_ui(self):
        self.btn_start_timer.configure(text="Fokus starten", fg_color="#28a745", hover_color="#218838")
        self.time_slider.configure(state="normal")
        val = int(self.time_slider.get())
        self.timer_label.configure(text=f"{val:02d}:00")

    def update_stats_display(self):
        data = self.stats_manager.get_stats()
        streak = data.get('streak', 0)
        longest = data.get('longest_streak', 0)
        activations = data.get('timer_activations', 0)
        total_mins = data.get('total_focus_minutes', 0)
        prevented = data.get('habits_prevented', 0)

        self.lbl_streak.configure(text=f"🔥 Aktuelle Streak: {streak} Tage  |  🏆 Rekord: {longest} Tage")
        self.lbl_activations.configure(text=f"Timer-Sitzungen: {activations}")
        self.lbl_total_mins.configure(text=f"Gesamte Fokuszeit: {total_mins} Min. (~{round(total_mins/60, 1)} Std.)")
        self.lbl_prevented.configure(text=f"Angewohnheiten gestoppt: {prevented}")

        # Disziplin-Score Berechnung (Beispiel: Verhältnis Fokus zu Vorfällen)
        score = max(0, min(100, 100 - (prevented * 5)))
        self.lbl_discipline_score.configure(text=f"Disziplin-Score: {score}%")

        # Trigger-Statistik-Liste aktualisieren
        for widget in self.trigger_stats_inner.winfo_children():
            widget.destroy()

        trigger_stats = data.get("trigger_stats", {})
        if not trigger_stats:
            ctk.CTkLabel(self.trigger_stats_inner, text="Noch keine Trigger erfasst. Weiter so!", text_color="gray", font=ctk.CTkFont(size=12)).pack(anchor="w", pady=2)
        else:
            for word, count in sorted(trigger_stats.items(), key=lambda x: x[1], reverse=True):
                row = ctk.CTkFrame(self.trigger_stats_inner, fg_color="transparent")
                row.pack(fill="x", pady=2)
                ctk.CTkLabel(row, text=f"• '{word}'", font=ctk.CTkFont(size=13)).pack(side="left")
                ctk.CTkLabel(row, text=f"{count}x abgefangen", font=ctk.CTkFont(size=13, weight="bold"), text_color="#FF4D4D").pack(side="right")