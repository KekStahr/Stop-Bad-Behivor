from .shared import *



class SettingsWidgetsMixin:
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

            sec_streak_time = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec_streak_time.pack(fill="x", padx=10, pady=8)
            ctk.CTkLabel(
                sec_streak_time,
                text="⏱️ Streak-Startzeitpunkt anpassen",
                font=ctk.CTkFont(size=14, weight="bold"),
                text_color=ACCENT_ORANGE,
            ).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(
                sec_streak_time,
                text="Startzeit bei Bedarf manuell korrigieren (JJJJ-MM-TT HH:MM:SS):",
                font=ctk.CTkFont(size=11),
                text_color=TEXT_SECONDARY,
            ).pack(anchor="w", padx=20, pady=(0, 10))
            f_streak_time = ctk.CTkFrame(sec_streak_time, fg_color="transparent")
            f_streak_time.pack(fill="x", padx=20, pady=(0, 15))

            current_start = self.stats_manager.get_stats().get("streak_start_iso", "")
            try:
                formatted_start = datetime.fromisoformat(current_start).strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
            except (TypeError, ValueError):
                formatted_start = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self.entry_streak_start = ctk.CTkEntry(
                f_streak_time,
                width=240,
                placeholder_text="JJJJ-MM-TT HH:MM:SS",
            )
            self.entry_streak_start.insert(0, formatted_start)
            self.entry_streak_start.pack(side="left", padx=(0, 10))
            ctk.CTkButton(
                f_streak_time,
                text="Zeitpunkt speichern",
                width=150,
                fg_color=ACCENT_GREEN,
                hover_color="#1B5E20",
                command=self.save_custom_streak_time,
            ).pack(side="left")

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

            sec_personal = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec_personal.pack(fill="x", padx=10, pady=8)
            ctk.CTkLabel(
                sec_personal,
                text="📜 Codex der Disziplin & Schatten-Brief",
                font=ctk.CTkFont(size=14, weight="bold"),
                text_color=ACCENT_BLUE,
            ).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(
                sec_personal,
                text=(
                    "Deine persönlichen Texte bleiben lokal auf diesem Gerät und "
                    "werden nicht in die Cloud synchronisiert."
                ),
                font=ctk.CTkFont(size=11),
                text_color=TEXT_SECONDARY,
                wraplength=680,
                justify="left",
            ).pack(anchor="w", padx=20, pady=(0, 10))
            codex_inputs = ctk.CTkFrame(sec_personal, fg_color="transparent")
            codex_inputs.pack(fill="x", padx=20, pady=(0, 15))

            current_codex = self.stats_manager.get_codex()
            ctk.CTkLabel(
                codex_inputs,
                text="Deine Identität:",
                font=ctk.CTkFont(size=11, weight="bold"),
            ).pack(anchor="w")
            self.entry_identity = ctk.CTkEntry(
                codex_inputs,
                placeholder_text="Wer möchtest du in starken Momenten sein?",
                width=500,
            )
            self.entry_identity.pack(anchor="w", pady=(3, 10))
            self.entry_identity.insert(0, current_codex["identity"])

            ctk.CTkLabel(
                codex_inputs,
                text="Deine selbst gewählten Grundregeln:",
                font=ctk.CTkFont(size=11, weight="bold"),
            ).pack(anchor="w")
            self.txt_codex_rules = ctk.CTkTextbox(
                codex_inputs,
                width=500,
                height=75,
            )
            self.txt_codex_rules.pack(anchor="w", pady=(3, 10))
            self.txt_codex_rules.insert("1.0", current_codex["rules"])

            ctk.CTkLabel(
                codex_inputs,
                text="Brief an dein Zukunfts-Ich:",
                font=ctk.CTkFont(size=11, weight="bold"),
            ).pack(anchor="w")
            self.txt_shadow_letter = ctk.CTkTextbox(
                codex_inputs,
                width=500,
                height=100,
            )
            self.txt_shadow_letter.pack(anchor="w", pady=(3, 10))
            self.txt_shadow_letter.insert(
                "1.0",
                self.stats_manager.get_shadow_letter(),
            )
            ctk.CTkButton(
                codex_inputs,
                text="Codex & Brief speichern",
                fg_color=ACCENT_GREEN,
                hover_color="#1B5E20",
                command=self.save_personal_manifest,
            ).pack(anchor="w", pady=(0, 12))

            self.stress_detection_switch = ctk.CTkSwitch(
                codex_inputs,
                text="Optionale Tipp-Rhythmus-Erinnerung aktivieren",
                command=self.toggle_stress_detection,
            )
            self.stress_detection_switch.pack(anchor="w", pady=(2, 3))
            if self.monitor.stress_detection_enabled:
                self.stress_detection_switch.select()
            ctk.CTkLabel(
                codex_inputs,
                text=(
                    "Aus Datenschutzgründen standardmäßig aus. Bei Aktivierung "
                    "werden nur Zeitabstände ausgewertet, keine Tasteninhalte "
                    "gespeichert. Das ist eine grobe Tipp-Rhythmus-Heuristik, "
                    "keine medizinische Stress- oder Biofeedback-Messung."
                ),
                font=ctk.CTkFont(size=10),
                text_color=TEXT_SECONDARY,
                wraplength=680,
                justify="left",
            ).pack(anchor="w", pady=(0, 3))

            sec_comm = ctk.CTkFrame(
                settings_scroll,
                fg_color=CARD_BG,
                corner_radius=12,
                border_color=CARD_BORDER,
                border_width=1,
            )
            sec_comm.pack(fill="x", padx=10, pady=8)
            ctk.CTkLabel(
                sec_comm,
                text="🤝 Anonymer Community-Support-Chat",
                font=ctk.CTkFont(size=14, weight="bold"),
                text_color=ACCENT_GREEN,
            ).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(
                sec_comm,
                text=(
                    "Bei einem Trigger kann ein Zustimmungsfenster zum anonymen "
                    "Chat erscheinen. Als Helfer trittst du nur über den "
                    "Analytics-Button bewusst bei."
                ),
                font=ctk.CTkFont(size=11),
                text_color=TEXT_SECONDARY,
                wraplength=680,
                justify="left",
            ).pack(anchor="w", padx=20, pady=(0, 10))
            comm_settings = self.stats_manager.get_community_settings()
            community_switches = ctk.CTkFrame(sec_comm, fg_color="transparent")
            community_switches.pack(fill="x", padx=20, pady=(0, 15))
            self.sw_auto_chat = ctk.CTkSwitch(
                community_switches,
                text="Bei abgefangenem Trigger Support-Chat anbieten",
                command=self.save_community_settings,
            )
            self.sw_auto_chat.pack(anchor="w", pady=(0, 8))
            if comm_settings["auto_connect_trigger"]:
                self.sw_auto_chat.select()
            self.sw_helper_mode = ctk.CTkSwitch(
                community_switches,
                text="Als anonymer Helfer verfügbar sein",
                command=self.save_community_settings,
            )
            self.sw_helper_mode.pack(anchor="w", pady=(0, 8))
            if comm_settings["allow_helper_mode"]:
                self.sw_helper_mode.select()
            ctk.CTkLabel(
                community_switches,
                text=(
                    "Die Chat-Verbindung startet erst nach deiner Bestätigung. "
                    "Profil, Nachrichten, Sticker und Bilder werden Ende-zu-Ende "
                    "verschlüsselt; der Server kann Inhalte nicht lesen. Vergleicht "
                    "den Sicherheits-Fingerprint über einen anderen Kanal, da ein "
                    "manipulierter Server Schlüssel austauschen könnte. Es werden "
                    "keine Kontodaten mit dem Chatpartner geteilt; der Server sieht "
                    "Verbindungsmetadaten. Gesprächspartner sind nicht verifiziert. "
                    "Teile keine persönlichen Daten. Nachrichten werden nicht "
                    "gespeichert; kein Krisen- oder professioneller Beratungsdienst."
                ),
                font=ctk.CTkFont(size=10),
                text_color=TEXT_SECONDARY,
                wraplength=680,
                justify="left",
            ).pack(anchor="w")

            # --- SEKTION: CLOUD-BACKUP & ACCOUNT ---
            sec_cloud = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec_cloud.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec_cloud, text="☁️ Cloud-Backup & Account-Sync", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_BLUE).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(
                sec_cloud,
                text="Sichere deinen Fortschritt mit Google. PIN und Discord-Webhook "
                     "werden nicht in die Cloud übertragen. Die Wiederherstellung "
                     "überschreibt lokale Fortschrittsdaten. Emotionale Reframing- "
                     "und Trigger-Zeitdaten sowie Codex, Zukunftsbrief und "
                     "Tipp-Rhythmus-Einstellung bleiben aus Datenschutzgründen lokal. "
                     "Google meldet dich an und verknüpft dein Konto mit dem Reşo-"
                     "Cloud-Backup; es wird kein Google-Drive-Zugriff angefordert. "
                     "Dafür muss ein Google OAuth Desktop-Client eingerichtet sein "
                     "(siehe README.md).",
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

        self._apply_apple_widget_style(self.tab_settings)
