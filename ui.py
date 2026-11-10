import customtkinter as ctk
import pystray
from PIL import ImageTk
import threading
import sys
import time
import math
import queue
from datetime import date, datetime, timedelta
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from pynput import keyboard

from timer import FocusTimer
from monitor import BadBehaviorMonitor
from stats import StatsManager
from icon import create_app_icon
from ai_motivator import MotivationManager
from discord_rpc import DiscordRPCManager
from autostart import is_autostart_enabled, setup_autostart

# Design-Konfiguration
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("dark-blue")

# Farbpalette für echtes Premium-Feeling
BG_DARK = "#121212"
CARD_BG = "#1E1E24"
CARD_BORDER = "#2A2A35"
ACCENT_RED = "#FF4D4D"
ACCENT_GREEN = "#2E7D32"
ACCENT_ORANGE = "#FF9800"
ACCENT_BLUE = "#00ADB5"
TEXT_PRIMARY = "#FFFFFF"
TEXT_SECONDARY = "#A0A0AA"

class ResoApp(ctk.CTk):
    def __init__(self, start_hidden=False):
        super().__init__()

        self.title("Reşo : You vs You")
        self.geometry("860x740")
        self.resizable(False, False)
        self.configure(fg_color=BG_DARK)
        if start_hidden:
            self.withdraw()

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
        self.whitelist_enabled = bool(
            self.stats_manager.get_stats().get("whitelist_mode_enabled", False)
        )

        self.focus_timer = FocusTimer(
            update_callback=self.update_timer_display,
            finish_callback=self.on_timer_finished
        )

        self.tray_icon = None
        self.setup_tray()

        self.create_widgets()
        self.update_stats_display()
        self.refresh_community_stats()
        if (
            self.stats_manager.get_stats().get("account_id")
            and self.stats_manager.get_stats().get("cloud_backup_initialized")
        ):
            self.after(100, self.sync_cloud_on_startup)

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
        self.monitor.stop_whitelist_enforcement()
        self.monitor.notify_app_closing()
        self.destroy()
        sys.exit()

    def create_widgets(self):
        # Header Area
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.pack(fill="x", padx=25, pady=(20, 10))

        self.title_label = ctk.CTkLabel(
            self.header_frame, 
            text="REŞO : YOU VS YOU", 
            font=ctk.CTkFont(size=26, weight="bold"), 
            text_color=ACCENT_RED
        )
        self.title_label.pack(anchor="w")

        self.lbl_level = ctk.CTkLabel(
            self.header_frame, 
            text=f"Rang: {self.stats_manager.get_stats().get('level', 'Disziplin-Novize')}", 
            font=ctk.CTkFont(size=13, weight="bold"), 
            text_color=ACCENT_ORANGE
        )
        self.lbl_level.pack(anchor="w", pady=(2, 0))

        # Modern Custom Tabs
        self.tabview = ctk.CTkTabview(
            self, 
            width=810, 
            height=630, 
            fg_color=BG_DARK, 
            segmented_button_fg_color=CARD_BG,
            segmented_button_selected_color=ACCENT_RED,
            segmented_button_selected_hover_color="#CC3D3D",
            segmented_button_unselected_color=CARD_BG,
            segmented_button_unselected_hover_color=CARD_BORDER
        )
        self.tabview.pack(pady=(0, 15), padx=25)

        self.tab_timer = self.tabview.add("⏱️ Fokus Timer")
        self.tab_pause = self.tabview.add("🧠 KI-Pausen")
        self.tab_stats = self.tabview.add("📊 Analytics")
        self.tab_settings = self.tabview.add("⚙️ Einstellungen")

        # --- TAB 1: TIMER & PANIC ---
        timer_card = ctk.CTkFrame(self.tab_timer, fg_color=CARD_BG, corner_radius=15, border_color=CARD_BORDER, border_width=1)
        timer_card.pack(fill="both", expand=True, padx=15, pady=15)

        self.timer_label = ctk.CTkLabel(timer_card, text="25:00", font=ctk.CTkFont(size=72, weight="bold"), text_color=TEXT_PRIMARY)
        self.timer_label.pack(pady=(35, 10))

        default_timer_mins = int(self.stats_manager.get_stats().get("default_timer_mins", 25))
        self.time_slider = ctk.CTkSlider(
            timer_card, 
            from_=5, 
            to=120, 
            number_of_steps=23, 
            command=self.slider_event, 
            button_color=ACCENT_RED, 
            button_hover_color="#CC3D3D",
            progress_color=ACCENT_RED
        )
        self.time_slider.set(default_timer_mins)
        self.time_slider.pack(pady=15, padx=80, fill="x")

        self.slider_val_label = ctk.CTkLabel(timer_card, text=f"Dauer: {default_timer_mins} Minuten", font=ctk.CTkFont(size=15), text_color=TEXT_SECONDARY)
        self.slider_val_label.pack(pady=5)

        self.btn_start_timer = ctk.CTkButton(
            timer_card, 
            text="Fokus starten", 
            font=ctk.CTkFont(size=16, weight="bold"),
            height=45, 
            width=220, 
            corner_radius=10,
            fg_color=ACCENT_GREEN, 
            hover_color="#1B5E20", 
            command=lambda: self.start_timer_action()
        )
        self.btn_start_timer.pack(pady=20)

        # Panic Box
        panic_frame = ctk.CTkFrame(timer_card, fg_color="#261A1A", corner_radius=12, border_color="#591A1A", border_width=1)
        panic_frame.pack(fill="x", padx=50, pady=(10, 20))
        
        ctk.CTkLabel(panic_frame, text="🚨 Notfall-Panic-Button", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_RED).pack(pady=(12, 2))
        self.lbl_hotkey_info = ctk.CTkLabel(panic_frame, text=f"Tastenkürzel: {self.stats_manager.get_stats().get('panic_hotkey', '<ctrl>+<alt>+x')}", font=ctk.CTkFont(size=11), text_color=TEXT_SECONDARY)
        self.lbl_hotkey_info.pack(pady=(0, 8))
        
        ctk.CTkButton(
            panic_frame, 
            text="Jetzt Bildschirm sperren", 
            fg_color=ACCENT_RED, 
            hover_color="#CC3D3D", 
            height=35,
            corner_radius=8,
            command=self.trigger_panic
        ).pack(pady=(0, 12))

        # --- TAB 2: KI-PAUSEN ---
        pause_card = ctk.CTkFrame(self.tab_pause, fg_color=CARD_BG, corner_radius=15, border_color=CARD_BORDER, border_width=1)
        pause_card.pack(fill="both", expand=True, padx=15, pady=15)

        lbl_pause_title = ctk.CTkLabel(pause_card, text="Bildschirm-Pausen & KI-Motivator", font=ctk.CTkFont(size=18, weight="bold"))
        lbl_pause_title.pack(anchor="w", padx=25, pady=(20, 15))

        preset_frame = ctk.CTkFrame(pause_card, fg_color="transparent")
        preset_frame.pack(fill="x", padx=25, pady=10)

        ctk.CTkButton(preset_frame, text="🟢 Sanft (Gering)", fg_color="#2E7D32", hover_color="#1B5E20", height=40, corner_radius=8, command=lambda: self.apply_preset("light")).pack(side="left", expand=True, padx=5)
        ctk.CTkButton(preset_frame, text="🟡 Ausgewogen (Mittel)", fg_color="#F57F17", text_color="white", hover_color="#F57F00", height=40, corner_radius=8, command=lambda: self.apply_preset("medium")).pack(side="left", expand=True, padx=5)
        ctk.CTkButton(preset_frame, text="🔴 Strikter Detox (Hoch)", fg_color=ACCENT_RED, hover_color="#CC3D3D", height=40, corner_radius=8, command=lambda: self.apply_preset("strict")).pack(side="left", expand=True, padx=5)

        settings_box = ctk.CTkFrame(pause_card, fg_color="#16161A", corner_radius=10)
        settings_box.pack(fill="x", padx=25, pady=20)
        ctk.CTkRadioButton(settings_box, text="Zufälliger Pausen-Bereich (10 - 20 Min)", variable=ctk.StringVar(value="random"), value="random", fg_color=ACCENT_BLUE).pack(anchor="w", padx=20, pady=20)
        
        self.btn_toggle_motivation = ctk.CTkButton(
            pause_card, 
            text="KI-Erinnerungen aktivieren", 
            font=ctk.CTkFont(size=15, weight="bold"),
            fg_color=ACCENT_BLUE, 
            hover_color="#008B9B", 
            height=42, 
            width=240, 
            corner_radius=10, 
            command=self.toggle_motivation
        )
        self.btn_toggle_motivation.pack(pady=15)

        # --- TAB 3: STATISTIK & ANALYTICS ---
        self.stats_scroll = ctk.CTkScrollableFrame(self.tab_stats, width=760, height=520, fg_color="transparent")
        self.stats_scroll.pack(fill="both", expand=True, padx=5, pady=5)

        # 1. Geld & Zeit Ersparnis Card
        self.card_savings = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_savings.pack(fill="x", padx=10, pady=8)
        
        ctk.CTkLabel(self.card_savings, text="💎 GEWONNENE ZEIT & ERSPARNIS", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_GREEN).pack(anchor="w", padx=20, pady=(15, 5))
        self.lbl_savings_detail = ctk.CTkLabel(self.card_savings, text="⏳ 0 Std. gerettet  |  💶 0,00 € Ersparnis", font=ctk.CTkFont(size=18, weight="bold"))
        self.lbl_savings_detail.pack(anchor="w", padx=20, pady=(0, 5))
        
        self.lbl_daily_expense_info = ctk.CTkLabel(self.card_savings, text="Tägliche Ausgaben-Ersparnis: 0,00 €", font=ctk.CTkFont(size=12), text_color=TEXT_SECONDARY)
        self.lbl_daily_expense_info.pack(anchor="w", padx=20, pady=(0, 15))

        # 2. Streak Card
        self.card_streak = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_streak.pack(fill="x", padx=10, pady=8)
        self.lbl_streak_full = ctk.CTkLabel(self.card_streak, text="🔥 Aktuelle Streak: 0 Tage  |  🏆 Rekord: 0 Tage", font=ctk.CTkFont(size=15, weight="bold"), text_color=ACCENT_ORANGE)
        self.lbl_streak_full.pack(anchor="w", padx=20, pady=15)

        # 3. Heatmap Card
        self.card_heatmap = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_heatmap.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(self.card_heatmap, text="📅 Fokus-Aktivität (Heatmap):", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", padx=20, pady=(12, 5))

        # 4. Community Card
        self.card_community = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_community.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(self.card_community, text="🌐 Community-Fokus", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", padx=20, pady=(12, 3))
        self.lbl_community_stats = ctk.CTkLabel(self.card_community, text="Community-Statistik wird geladen ...", font=ctk.CTkFont(size=12), text_color=TEXT_SECONDARY)
        self.lbl_community_stats.pack(anchor="w", padx=20, pady=(0, 15))

        # 5. Rückfall-Uhrzeiten Card
        self.card_hours = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_hours.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(self.card_hours, text="⏰ Critical Risk Hours (Analysen):", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_RED).pack(anchor="w", padx=20, pady=(12, 5))
        self.lbl_hours_detail = ctk.CTkLabel(self.card_hours, text="Noch keine Vorfälle erfasst.", font=ctk.CTkFont(size=12), text_color=TEXT_SECONDARY)
        self.lbl_hours_detail.pack(anchor="w", padx=20, pady=(0, 15))

        # --- TAB 4: EINSTELLUNGEN & SPERR-REGELN ---
        self.setup_settings_tab()

    def setup_settings_tab(self):
        for widget in self.tab_settings.winfo_children():
            widget.destroy()

        stored_pin = self.stats_manager.get_stats().get("pin_code", "")

        if stored_pin and not self.pin_unlocked:
            pin_frame = ctk.CTkFrame(self.tab_settings, fg_color=CARD_BG, corner_radius=15, border_color=CARD_BORDER, border_width=1)
            pin_frame.pack(expand=True, padx=40, pady=40)

            ctk.CTkLabel(pin_frame, text="🔒 PIN-Schutz Aktiviert", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=(25, 10))
            self.entry_pin_input = ctk.CTkEntry(pin_frame, show="*", width=160, justify="center", font=ctk.CTkFont(size=20), height=40)
            self.entry_pin_input.pack(pady=10)

            self.btn_unlock = ctk.CTkButton(pin_frame, text="Freischalten", fg_color=ACCENT_GREEN, hover_color="#1B5E20", height=38, width=140, command=self.unlock_settings)
            self.btn_unlock.pack(pady=20)
            
            if time.time() < self.lockout_end_time:
                self.entry_pin_input.configure(state="disabled", fg_color="#441111")
                self.btn_unlock.configure(state="disabled")
                self.run_cooldown_countdown()
        else:
            settings_scroll = ctk.CTkScrollableFrame(self.tab_settings, width=760, height=520, fg_color="transparent")
            settings_scroll.pack(fill="both", expand=True, padx=5, pady=5)

            # --- SEKTION 1: ALLGEMEIN & FINANZEN ---
            sec1 = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec1.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec1, text="💰 Finanzen & Wert-Einstellungen", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_BLUE).pack(anchor="w", padx=20, pady=(15, 10))

            f1 = ctk.CTkFrame(sec1, fg_color="transparent")
            f1.pack(fill="x", padx=20, pady=5)
            ctk.CTkLabel(f1, text="Dein Stundensatz (€):", width=180, anchor="w").pack(side="left")
            self.entry_rate = ctk.CTkEntry(f1, width=100)
            self.entry_rate.insert(0, str(self.stats_manager.get_hourly_rate()))
            self.entry_rate.pack(side="left", padx=10)

            f2 = ctk.CTkFrame(sec1, fg_color="transparent")
            f2.pack(fill="x", padx=20, pady=5)
            ctk.CTkLabel(f2, text="Geschätzte Ausgaben / Tag (€):", width=180, anchor="w").pack(side="left")
            self.entry_daily_expense = ctk.CTkEntry(f2, width=100)
            self.entry_daily_expense.insert(0, str(self.stats_manager.get_stats().get("daily_expense", 0.0)))
            self.entry_daily_expense.pack(side="left", padx=10)

            f3 = ctk.CTkFrame(sec1, fg_color="transparent")
            f3.pack(fill="x", padx=20, pady=5)
            ctk.CTkLabel(f3, text="Standard Fokus-Timer (Min):", width=180, anchor="w").pack(side="left")
            self.entry_default_timer = ctk.CTkEntry(f3, width=100)
            self.entry_default_timer.insert(0, str(self.stats_manager.get_stats().get("default_timer_mins", 25)))
            self.entry_default_timer.pack(side="left", padx=10)

            ctk.CTkButton(sec1, text="Werte speichern", fg_color=ACCENT_GREEN, hover_color="#1B5E20", height=32, command=self.save_general_settings).pack(anchor="e", padx=20, pady=15)

            # --- SEKTION 2: SECURITY & HOTKEY ---
            sec2 = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec2.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec2, text="🔒 Sicherheit & Hotkey", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_ORANGE).pack(anchor="w", padx=20, pady=(15, 10))

            f_pin = ctk.CTkFrame(sec2, fg_color="transparent")
            f_pin.pack(fill="x", padx=20, pady=5)
            self.entry_new_pin = ctk.CTkEntry(f_pin, placeholder_text="Neuer PIN (4 Ziffern)", width=180, show="*")
            self.entry_new_pin.pack(side="left", padx=(0, 10))
            ctk.CTkButton(f_pin, text="PIN Speichern", width=120, fg_color=ACCENT_BLUE, hover_color="#008B9B", command=self.save_new_pin).pack(side="left")

            f_hk = ctk.CTkFrame(sec2, fg_color="transparent")
            f_hk.pack(fill="x", padx=20, pady=5)
            self.entry_panic_hotkey = ctk.CTkEntry(f_hk, width=180, placeholder_text="<ctrl>+<alt>+x")
            self.entry_panic_hotkey.insert(0, self.stats_manager.get_stats().get("panic_hotkey", "<ctrl>+<alt>+x"))
            self.entry_panic_hotkey.pack(side="left", padx=(0, 10))
            ctk.CTkButton(f_hk, text="Panic-Hotkey speichern", width=150, fg_color=ACCENT_BLUE, hover_color="#008B9B", command=self.save_panic_hotkey).pack(side="left")

            # --- SEKTION: NOTFALL-PARTNER (WEBHOOK) ---
            sec_partner = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec_partner.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec_partner, text="🤝 Notfall-Partner (Accountability Partner)", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_GREEN).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(sec_partner, text="Trage hier einen Discord-Webhook ein. Bei einem Trigger-Vorfall wird\nautomatisch eine anonyme Warnung an deinen Partner gesendet.", font=ctk.CTkFont(size=11), text_color=TEXT_SECONDARY).pack(anchor="w", padx=20, pady=(0, 10))

            f_partner = ctk.CTkFrame(sec_partner, fg_color="transparent")
            f_partner.pack(fill="x", padx=20, pady=(0, 15))

            self.entry_webhook = ctk.CTkEntry(f_partner, placeholder_text="https://discord.com/api/webhooks/...", width=450)
            self.entry_webhook.insert(0, self.stats_manager.get_stats().get("webhook_url", ""))
            self.entry_webhook.pack(side="left", padx=(0, 10))

            ctk.CTkButton(f_partner, text="Speichern", width=100, fg_color=ACCENT_GREEN, hover_color="#1B5E20", command=self.save_webhook_url).pack(side="left")

            # --- SEKTION: SYSTEM & AUTOSTART ---
            sec_sys = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec_sys.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec_sys, text="💻 System & Autostart", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_BLUE).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(sec_sys, text="Lässt Reşo beim Hochfahren von Windows automatisch im System-Tray starten.", font=ctk.CTkFont(size=11), text_color=TEXT_SECONDARY).pack(anchor="w", padx=20, pady=(0, 10))

            f_sys = ctk.CTkFrame(sec_sys, fg_color="transparent")
            f_sys.pack(fill="x", padx=20, pady=(0, 15))

            self.autostart_enabled = is_autostart_enabled()
            self.autostart_switch = ctk.CTkSwitch(
                f_sys,
                text="Mit Windows starten (Silent Mode)",
                command=self.toggle_autostart,
            )
            self.autostart_switch.pack(anchor="w")
            if self.autostart_enabled:
                self.autostart_switch.select()
            if sys.platform != "win32":
                self.autostart_switch.configure(state="disabled")

            # --- SEKTION: WHITELIST-MODUS ---
            sec_wl = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec_wl.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec_wl, text="🛡️ Whitelist-Modus (Fokus-Schutz)", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_GREEN).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(
                sec_wl,
                text="Während des Fokus-Timers werden nur bekannte Ablenkungsprozesse "
                     "(Chrome, Edge, Firefox, Discord) geprüft. Andere Apps und "
                     "Systemprozesse bleiben unberührt.",
                font=ctk.CTkFont(size=11),
                text_color=TEXT_SECONDARY,
                wraplength=680,
                justify="left",
            ).pack(anchor="w", padx=20, pady=(0, 10))

            f_wl = ctk.CTkFrame(sec_wl, fg_color="transparent")
            f_wl.pack(fill="x", padx=20, pady=(0, 15))

            self.whitelist_switch = ctk.CTkSwitch(
                f_wl,
                text="Whitelist-Modus bei Fokus aktivieren",
                command=self.toggle_whitelist_preference,
            )
            self.whitelist_switch.pack(anchor="w", pady=(0, 10))
            if self.whitelist_enabled:
                self.whitelist_switch.select()

            self.entry_whitelisted_apps = ctk.CTkEntry(
                f_wl,
                placeholder_text="Freigegebene Namen, z. B. chrome.exe, discord.exe",
                width=500,
            )
            whitelisted_apps = self.stats_manager.get_stats().get(
                "whitelisted_apps",
                [
                    "code.exe",
                    "winword.exe",
                    "excel.exe",
                    "powerpnt.exe",
                    "python.exe",
                    "pycharm64.exe",
                    "notepad.exe",
                    "resoapp.exe",
                ],
            )
            self.entry_whitelisted_apps.insert(0, ", ".join(whitelisted_apps))
            self.entry_whitelisted_apps.pack(side="left", padx=(0, 10))
            ctk.CTkButton(
                f_wl,
                text="Apps speichern",
                width=120,
                fg_color=ACCENT_GREEN,
                hover_color="#1B5E20",
                command=self.save_whitelisted_apps,
            ).pack(side="left")

            # --- SEKTION: CLOUD-BACKUP & ACCOUNT ---
            sec_cloud = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec_cloud.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec_cloud, text="☁️ Cloud-Backup & Account-Sync", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_BLUE).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(
                sec_cloud,
                text="Sichere deinen Fortschritt mit Google. PIN und Discord-Webhook "
                     "werden nicht in die Cloud übertragen. Die Wiederherstellung "
                     "überschreibt lokale Fortschrittsdaten.",
                font=ctk.CTkFont(size=11),
                text_color=TEXT_SECONDARY,
                wraplength=680,
                justify="left",
            ).pack(anchor="w", padx=20, pady=(0, 10))

            f_cloud = ctk.CTkFrame(sec_cloud, fg_color="transparent")
            f_cloud.pack(fill="x", padx=20, pady=(0, 15))

            account_email = self.stats_manager.get_stats().get("google_account_email", "")
            account_id = self.stats_manager.get_stats().get("account_id", "")
            initial_status = (
                (
                    f"Verbunden als {account_email or account_id}; "
                    "Backup wird synchronisiert"
                    if self.stats_manager.get_stats().get("cloud_backup_initialized")
                    else f"Verbunden als {account_email or account_id}; Backup noch nicht eingerichtet"
                )
                if account_id
                else "Nicht verbunden"
            )
            self.lbl_cloud_status = ctk.CTkLabel(
                f_cloud,
                text=f"Status: {initial_status}",
                font=ctk.CTkFont(size=12, weight="bold"),
                text_color=ACCENT_GREEN if account_id else TEXT_SECONDARY,
                wraplength=680,
            )
            self.lbl_cloud_status.pack(anchor="w", pady=(0, 10))

            cloud_buttons = ctk.CTkFrame(f_cloud, fg_color="transparent")
            cloud_buttons.pack(fill="x")
            self.btn_google_connect = ctk.CTkButton(
                cloud_buttons,
                text="Mit Google verbinden",
                fg_color="#4285F4",
                hover_color="#3367D6",
                command=self.connect_google_account,
                state="disabled" if account_id else "normal",
            )
            self.btn_google_connect.pack(side="left", padx=(0, 8))
            self.btn_cloud_backup = ctk.CTkButton(
                cloud_buttons,
                text="Jetzt sichern",
                fg_color=ACCENT_GREEN,
                hover_color="#1B5E20",
                command=self.sync_cloud_backup,
                state="normal" if account_id else "disabled",
            )
            self.btn_cloud_backup.pack(side="left", padx=(0, 8))
            self.btn_cloud_restore = ctk.CTkButton(
                cloud_buttons,
                text="Aus Cloud wiederherstellen",
                fg_color=ACCENT_BLUE,
                hover_color="#008B9B",
                command=self.restore_cloud_backup,
                state="normal" if account_id else "disabled",
            )
            self.btn_cloud_restore.pack(side="left", padx=(0, 8))
            self.btn_google_disconnect = ctk.CTkButton(
                cloud_buttons,
                text="Trennen",
                fg_color=CARD_BORDER,
                hover_color="#40404A",
                command=self.disconnect_google_account,
                state="normal" if account_id else "disabled",
            )
            self.btn_google_disconnect.pack(side="left")

            # --- SEKTION 3: SPERRWÖRTER ---
            sec3 = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec3.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec3, text="🚫 Sperrwörter verwalten", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_RED).pack(anchor="w", padx=20, pady=(15, 10))

            add_word_frame = ctk.CTkFrame(sec3, fg_color="transparent")
            add_word_frame.pack(fill="x", padx=20, pady=5)

            self.entry_new_word = ctk.CTkEntry(add_word_frame, placeholder_text="Neues Sperrwort...", width=450)
            self.entry_new_word.pack(side="left", padx=(0, 10))
            ctk.CTkButton(add_word_frame, text="Hinzufügen", fg_color=ACCENT_GREEN, hover_color="#1B5E20", width=120, command=self.add_trigger_word).pack(side="left")

            self.words_scroll_frame = ctk.CTkScrollableFrame(sec3, width=680, height=180, fg_color="#16161A", corner_radius=8)
            self.words_scroll_frame.pack(padx=20, pady=15)
            self.refresh_words_list()

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
        self.lbl_cloud_status.configure(
            text="Status: Google-Anmeldung wird im Browser gestartet ...",
            text_color=TEXT_SECONDARY,
        )
        self.btn_google_connect.configure(state="disabled")

        def finish_login():
            try:
                from google_oauth import login_with_google

                userinfo, token_data = login_with_google()
                self.stats_manager.connect_google_account(userinfo, token_data)
                email = userinfo.get("email") or userinfo["sub"]
                message = (
                    f"Verbunden als {email}. Wähle jetzt „Jetzt sichern“ "
                    "oder „Aus Cloud wiederherstellen“."
                )
                color = ACCENT_GREEN
                self.after(0, lambda: self._update_cloud_connection_ui(message, color))
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
        ax.set_facecolor('#121212')

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

    def apply_preset(self, t): pass

    def toggle_motivation(self):
        if self.motivation_manager.is_running:
            self.motivation_manager.stop_scheduler()
            self.btn_toggle_motivation.configure(text="KI-Erinnerungen aktivieren", fg_color=ACCENT_BLUE)
        else:
            self.motivation_manager.start_scheduler(mode="random", min_rand=10, max_rand=20)
            self.btn_toggle_motivation.configure(text="KI-Erinnerungen aktiv (Stoppen)", fg_color=ACCENT_RED)

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

    def slider_event(self, value):
        val = int(value)
        self.slider_val_label.configure(text=f"Dauer: {val} Minuten")
        if not self.focus_timer.is_running:
            self.timer_label.configure(text=f"{val:02d}:00")

    def start_timer_action(self, custom_mins=None):
        if not self.focus_timer.is_running:
            mins = custom_mins if custom_mins else int(self.time_slider.get())
            self.focus_timer.start(mins)
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
        self.monitor.stop_whitelist_enforcement()
        self.btn_start_timer.configure(text="Fokus starten", fg_color=ACCENT_GREEN, hover_color="#1B5E20")
        val = int(self.time_slider.get())
        self.timer_label.configure(text=f"{val:02d}:00")
        self.discord_rpc.update_presence("Bereit", "Wartet auf nächste Session")

    def update_stats_display(self):
        data = self.stats_manager.get_stats()
        saved_hours, saved_money = self.stats_manager.calculate_savings()
        
        streak = data.get("streak", 0)
        daily_expense = data.get("daily_expense", 0.0)
        saved_habit_money = streak * daily_expense
        total_money = saved_money + saved_habit_money

        # Ersparnis anzeigen
        self.lbl_savings_detail.configure(
            text=f"⏳ {saved_hours} Std. gerettet  |  💶 {total_money:,.2f} € Gesamt-Ersparnis".replace(",", "X").replace(".", ",").replace("X", ".")
        )
        self.lbl_daily_expense_info.configure(
            text=f"Davon Ersparnis durch gestoppte Ausgaben ({streak} Tage): {saved_habit_money:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")
        )
        
        self.lbl_level.configure(text=f"Rang: {data.get('level', 'Disziplin-Novize')}")
        self.lbl_streak_full.configure(text=f"🔥 Aktuelle Streak: {streak} Tage  |  🏆 Rekord: {data.get('longest_streak', 0)} Tage")

        # Rückfall-Uhrzeiten darstellen
        incident_hours = data.get("incident_hours", {})
        if incident_hours:
            sorted_hours = sorted(incident_hours.items(), key=lambda x: x[1], reverse=True)
            text_str = " | ".join([f"{h}: {c}x" for h, c in sorted_hours[:3]])
            self.lbl_hours_detail.configure(text=f"Haupt-Risikazeiten: {text_str}", text_color=ACCENT_RED)
        else:
            self.lbl_hours_detail.configure(text="Noch keine Vorfälle erfasst. Sauber!", text_color=TEXT_SECONDARY)

        self.render_heatmap()