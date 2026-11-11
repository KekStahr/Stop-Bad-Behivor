from .shared import *


class TimerWidgetsMixin:
    def build_timer_widgets(self):
        # --- TAB 1: TIMER & PANIC ---
        timer_scroll = ctk.CTkScrollableFrame(self.tab_timer, fg_color="transparent")
        timer_scroll.pack(fill="both", expand=True, padx=5, pady=5)

        timer_card = ctk.CTkFrame(timer_scroll, fg_color=CARD_BG, corner_radius=15, border_color=CARD_BORDER, border_width=1)
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
        pause_card = ctk.CTkFrame(timer_scroll, fg_color=CARD_BG, corner_radius=15, border_color=CARD_BORDER, border_width=1)
        pause_card.pack(fill="x", padx=15, pady=(0, 15))

        lbl_pause_title = ctk.CTkLabel(pause_card, text="KI-Pausen während des Fokus-Timers", font=ctk.CTkFont(size=18, weight="bold"))
        lbl_pause_title.pack(anchor="w", padx=25, pady=(20, 15))

        preset_frame = ctk.CTkFrame(pause_card, fg_color="transparent")
        preset_frame.pack(fill="x", padx=25, pady=10)

        ctk.CTkButton(preset_frame, text="🟢 Sanft (Gering)", fg_color="#2E7D32", hover_color="#1B5E20", height=40, corner_radius=8, command=lambda: self.apply_preset("light")).pack(side="left", expand=True, padx=5)
        ctk.CTkButton(preset_frame, text="🟡 Ausgewogen (Mittel)", fg_color="#F57F17", text_color="white", hover_color="#F57F00", height=40, corner_radius=8, command=lambda: self.apply_preset("medium")).pack(side="left", expand=True, padx=5)
        ctk.CTkButton(preset_frame, text="🔴 Strikter Detox (Hoch)", fg_color=ACCENT_RED, hover_color="#CC3D3D", height=40, corner_radius=8, command=lambda: self.apply_preset("strict")).pack(side="left", expand=True, padx=5)

        settings_box = ctk.CTkFrame(pause_card, fg_color="#16161A", corner_radius=10)
        settings_box.pack(fill="x", padx=25, pady=20)
        self.lbl_pause_interval = ctk.CTkLabel(
            settings_box,
            text="",
            font=ctk.CTkFont(size=14),
            text_color=TEXT_SECONDARY,
        )
        self.lbl_pause_interval.pack(anchor="w", padx=24, pady=20)
        
        self.btn_toggle_motivation = ctk.CTkButton(
            pause_card, 
            text="",
            font=ctk.CTkFont(size=15, weight="bold"),
            fg_color=ACCENT_BLUE, 
            hover_color="#008B9B", 
            height=42, 
            width=240, 
            corner_radius=10, 
            command=self.toggle_motivation
        )
        self.btn_toggle_motivation.pack(pady=15)
        ctk.CTkLabel(
            pause_card,
            text="Die Erinnerungen laufen nur während einer aktiven Fokus-Session.",
            font=ctk.CTkFont(size=12),
            text_color=TEXT_SECONDARY,
        ).pack(pady=(0, 14))
        self.apply_preset(
            self.stats_manager.get_stats().get("ai_pause_preset", "medium"),
            persist=False,
        )
        self._update_motivation_button()

