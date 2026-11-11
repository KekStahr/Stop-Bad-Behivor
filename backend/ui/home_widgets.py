from .shared import *


class HomeWidgetsMixin:
    def build_home_widgets(self):
        self.home_scroll = ctk.CTkScrollableFrame(
            self.tab_home,
            fg_color="transparent",
        )
        self.home_scroll.pack(fill="both", expand=True, padx=10, pady=10)

        welcome_frame = ctk.CTkFrame(self.home_scroll, fg_color="transparent")
        welcome_frame.pack(fill="x", padx=10, pady=(4, 12))
        welcome_frame.grid_columnconfigure(0, weight=1)
        welcome_frame.grid_columnconfigure(1, weight=0)

        welcome_copy = ctk.CTkFrame(welcome_frame, fg_color="transparent")
        welcome_copy.grid(row=0, column=0, sticky="w")
        self.lbl_home_welcome = ctk.CTkLabel(
            welcome_copy,
            text="",
            font=ctk.CTkFont(size=27, weight="bold"),
            text_color=TEXT_PRIMARY,
            wraplength=460,
            justify="left",
        )
        self.lbl_home_welcome.pack(anchor="w")
        self.lbl_home_rank = ctk.CTkLabel(
            welcome_copy,
            text="Rang wird geladen ...",
            font=ctk.CTkFont(size=15),
            text_color=TEXT_SECONDARY,
        )
        self.lbl_home_rank.pack(anchor="w", pady=(3, 0))

        streak_card = ctk.CTkFrame(
            welcome_frame,
            fg_color="#2C2520",
            corner_radius=14,
            border_color=ACCENT_ORANGE,
            border_width=1,
        )
        streak_card.grid(row=0, column=1, sticky="e", padx=(12, 0))
        self.home_flame_label = ctk.CTkLabel(
            streak_card,
            text="🔥",
            font=ctk.CTkFont(size=25),
            text_color=ACCENT_ORANGE,
        )
        self.home_flame_label.pack(side="left", padx=(14, 7), pady=10)
        self.lbl_home_streak = ctk.CTkLabel(
            streak_card,
            text="0 Sekunden",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=ACCENT_ORANGE,
            wraplength=230,
            justify="left",
        )
        self.lbl_home_streak.pack(side="left", padx=(0, 14), pady=10)

        self.shutdown_status_frame = ctk.CTkFrame(
            self.home_scroll,
            fg_color="#2C2520",
            corner_radius=14,
            border_color=ACCENT_ORANGE,
            border_width=1,
        )
        shutdown_status_content = ctk.CTkFrame(
            self.shutdown_status_frame,
            fg_color="transparent",
        )
        shutdown_status_content.pack(
            fill="x",
            padx=18,
            pady=14,
        )
        self.shutdown_status_label = ctk.CTkLabel(
            shutdown_status_content,
            text="Das Programm wird in 30:00 beendet.",
            font=ctk.CTkFont(size=17, weight="bold"),
            text_color=ACCENT_ORANGE,
            anchor="w",
        )
        self.shutdown_status_label.pack(side="left", fill="x", expand=True)
        ctk.CTkButton(
            shutdown_status_content,
            text="Countdown stoppen",
            width=190,
            height=40,
            fg_color=ACCENT_GREEN,
            hover_color="#24A847",
            command=self.cancel_shutdown_countdown,
        ).pack(side="right", padx=(12, 0))

        self.home_overview_frame = ctk.CTkFrame(
            self.home_scroll,
            fg_color="transparent",
        )
        self.home_overview_frame.pack(fill="x", padx=10, pady=8)
        self.home_overview_frame.grid_columnconfigure(0, weight=1)
        self.home_time_card = ctk.CTkFrame(
            self.home_overview_frame,
            fg_color=CARD_BG,
            corner_radius=16,
            border_color=CARD_BORDER,
            border_width=1,
        )
        self.home_time_card.grid(row=0, column=0, sticky="ew")
        clock_header = ctk.CTkFrame(self.home_time_card, fg_color="transparent")
        clock_header.pack(fill="x", padx=20, pady=(14, 8))
        ctk.CTkLabel(
            clock_header,
            text="⏱  Nüchtern seit",
            font=ctk.CTkFont(size=17, weight="bold"),
            text_color=TEXT_PRIMARY,
        ).pack(side="left")
        ctk.CTkLabel(
            clock_header,
            text="● Echtzeit-Stoppuhr",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=ACCENT_GREEN,
        ).pack(side="right")
        duration_rows = ctk.CTkFrame(self.home_time_card, fg_color="transparent")
        duration_rows.pack(fill="x", padx=14, pady=(0, 14))
        for column in range(4):
            duration_rows.grid_columnconfigure(column, weight=1, uniform="home_clock")
        self.home_duration_labels = {}
        self.home_duration_progress = {}
        self.home_duration_progress_values = {}
        self.home_duration_progress_targets = {}
        for column, (key, title) in enumerate((
            ("days", "TAGE"),
            ("hours", "STUNDEN"),
            ("minutes", "MINUTEN"),
            ("seconds", "SEKUNDEN"),
        )):
            row_frame = ctk.CTkFrame(
                duration_rows,
                fg_color="#242427",
                corner_radius=12,
            )
            row_frame.grid(row=0, column=column, sticky="nsew", padx=4)
            row_frame.grid_rowconfigure(0, weight=1)
            row_frame.grid_columnconfigure(0, weight=1)
            value_label = ctk.CTkLabel(
                row_frame,
                text="0",
                font=ctk.CTkFont(size=24, weight="bold"),
                text_color=ACCENT_BLUE,
            )
            value_label.grid(row=0, column=0, sticky="ew", padx=8, pady=(9, 0))
            unit_label = ctk.CTkLabel(
                row_frame,
                text=title,
                font=ctk.CTkFont(size=11, weight="bold"),
                text_color=TEXT_SECONDARY,
            )
            unit_label.grid(row=1, column=0, sticky="ew", padx=4, pady=(0, 6))
            progress = ctk.CTkProgressBar(
                row_frame,
                height=4,
                progress_color=ACCENT_BLUE,
                fg_color=CARD_BORDER,
            )
            progress.grid(row=2, column=0, sticky="ew", padx=10, pady=(0, 9))
            progress.set(0)
            self.home_duration_labels[key] = value_label
            self.home_duration_progress[key] = progress
            self.home_duration_progress_values[key] = 0.0
            self.home_duration_progress_targets[key] = 0.0

        action_card = ctk.CTkFrame(
            self.home_scroll,
            fg_color=CARD_BG,
            corner_radius=16,
            border_color=CARD_BORDER,
            border_width=1,
        )
        action_card.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(
            action_card,
            text="⚡ Sofort-Aktionen",
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color=TEXT_PRIMARY,
        ).pack(anchor="w", padx=20, pady=(12, 10))
        self.home_actions_frame = ctk.CTkFrame(
            action_card,
            fg_color="transparent",
        )
        self.home_actions_frame.pack(fill="x", padx=14, pady=(0, 14))
        for column in range(3):
            self.home_actions_frame.grid_columnconfigure(column, weight=1)
        ctk.CTkButton(
            self.home_actions_frame,
            text="🚀 Fokus · 25 Min.",
            fg_color=ACCENT_GREEN,
            hover_color="#1B5E20",
            height=44,
            command=lambda: self.start_timer_action(25),
        ).grid(row=0, column=0, sticky="ew", padx=(0, 5))
        ctk.CTkButton(
            self.home_actions_frame,
            text="🚨 Bildschirm sperren",
            fg_color=ACCENT_RED,
            hover_color="#CC3D3D",
            height=44,
            command=self.trigger_panic,
        ).grid(row=0, column=1, sticky="ew", padx=5)
        ctk.CTkButton(
            self.home_actions_frame,
            text="⚠️ Streak zurücksetzen",
            fg_color="#8B0000",
            hover_color="#5C0000",
            height=44,
            command=self.confirm_streak_reset,
        ).grid(row=0, column=2, sticky="ew", padx=(5, 0))
        self.home_actions_frame.bind("<Configure>", self._layout_home_actions)
        self._home_actions_layout = None

        self.home_summary_card = ctk.CTkFrame(
            self.home_scroll,
            fg_color=CARD_BG,
            corner_radius=16,
            border_color=CARD_BORDER,
            border_width=1,
        )
        self.home_summary_card.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(
            self.home_summary_card,
            text="💎 Gesparte Zeit & Geld",
            font=ctk.CTkFont(size=17, weight="bold"),
            text_color=ACCENT_GREEN,
        ).pack(anchor="w", padx=20, pady=(18, 8))
        ring_details = ctk.CTkFrame(
            self.home_summary_card,
            fg_color="transparent",
        )
        ring_details.pack(fill="x", padx=12, pady=(0, 8))
        self.home_savings_canvas = ctk.CTkCanvas(
            ring_details,
            width=190,
            height=190,
            bg=CARD_BG,
            highlightthickness=0,
            borderwidth=0,
        )
        self.home_savings_canvas.pack(side="left", padx=(0, 8))
        self.home_savings_canvas.create_arc(
            15,
            15,
            175,
            175,
            start=90,
            extent=359,
            style="arc",
            outline=CARD_BORDER,
            width=12,
        )
        self.home_money_ring = self.home_savings_canvas.create_arc(
            15,
            15,
            175,
            175,
            start=90,
            extent=0,
            style="arc",
            outline=ACCENT_GREEN,
            width=12,
        )
        self.home_savings_canvas.create_arc(
            39,
            39,
            151,
            151,
            start=90,
            extent=359,
            style="arc",
            outline=CARD_BORDER,
            width=10,
        )
        self.home_time_ring = self.home_savings_canvas.create_arc(
            39,
            39,
            151,
            151,
            start=90,
            extent=0,
            style="arc",
            outline=ACCENT_BLUE,
            width=10,
        )
        self.home_savings_canvas.create_text(
            95,
            91,
            text="Sparziel",
            fill=TEXT_PRIMARY,
            font=("Segoe UI", 11, "bold"),
        )
        self.home_savings_canvas.create_text(
            95,
            111,
            text="24 Std.",
            fill=TEXT_SECONDARY,
            font=("Segoe UI", 10),
        )
        ring_text = ctk.CTkFrame(ring_details, fg_color="transparent")
        ring_text.pack(side="left", fill="both", expand=True)
        self.lbl_home_savings = ctk.CTkLabel(
            ring_text,
            text="0,0 Std. gerettet",
            font=ctk.CTkFont(size=25, weight="bold"),
            text_color=ACCENT_BLUE,
            anchor="w",
        )
        self.lbl_home_savings.pack(anchor="w", padx=8, pady=(7, 2))
        self.lbl_home_money = ctk.CTkLabel(
            ring_text,
            text="0,00 €",
            font=ctk.CTkFont(size=22, weight="bold"),
            text_color=ACCENT_GREEN,
            anchor="w",
        )
        self.lbl_home_money.pack(anchor="w", padx=8, pady=(0, 4))
        self.lbl_home_ring_summary = ctk.CTkLabel(
            ring_text,
            text="Geld: 0 % vom Sparziel\nZeit: 0 % eines Tages",
            font=ctk.CTkFont(size=12),
            text_color=TEXT_SECONDARY,
            anchor="w",
            justify="left",
        )
        self.lbl_home_ring_summary.pack(anchor="w", padx=8, pady=(0, 5))
        ctk.CTkLabel(
            ring_text,
            text="Entspricht ungefähr",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=TEXT_SECONDARY,
        ).pack(anchor="w", padx=8, pady=(3, 3))
        self.lbl_home_opportunity = ctk.CTkLabel(
            ring_text,
            text="Wird berechnet ...",
            font=ctk.CTkFont(size=13),
            text_color=TEXT_SECONDARY,
            wraplength=430,
            justify="left",
        )
        self.lbl_home_opportunity.pack(anchor="w", padx=8, pady=(0, 10))

        goal_frame = ctk.CTkFrame(
            self.home_summary_card,
            fg_color="#242427",
            corner_radius=12,
        )
        goal_frame.pack(fill="x", padx=14, pady=(0, 14))
        ctk.CTkLabel(
            goal_frame,
            text="🎯 Dein Sparziel",
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color=ACCENT_ORANGE,
        ).pack(anchor="w", padx=14, pady=(10, 4))
        goal_content = ctk.CTkFrame(goal_frame, fg_color="transparent")
        goal_content.pack(fill="x", padx=14, pady=(0, 10))
        goal_content.grid_columnconfigure(0, weight=3)
        goal_content.grid_columnconfigure(1, weight=2)
        self.lbl_home_goal = ctk.CTkLabel(
            goal_content,
            text="Sparziel wird geladen ...",
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color=TEXT_PRIMARY,
            wraplength=520,
            justify="left",
            anchor="w",
        )
        self.lbl_home_goal.grid(row=0, column=0, sticky="ew", padx=(0, 16))
        goal_progress_frame = ctk.CTkFrame(goal_content, fg_color="transparent")
        self.home_goal_progress_frame = goal_progress_frame
        goal_progress_frame.grid(row=0, column=1, sticky="ew")
        goal_progress_frame.grid_columnconfigure(0, weight=1)
        self.progress_home_goal = ctk.CTkProgressBar(
            goal_progress_frame,
            progress_color=ACCENT_GREEN,
            fg_color=CARD_BORDER,
        )
        self.progress_home_goal.grid(row=0, column=0, sticky="ew", pady=(3, 4))
        self.lbl_home_goal_eta = ctk.CTkLabel(
            goal_progress_frame,
            text="",
            font=ctk.CTkFont(size=12),
            text_color=TEXT_SECONDARY,
            wraplength=360,
            justify="left",
            anchor="w",
        )
        self.lbl_home_goal_eta.grid(row=1, column=0, sticky="ew")

        goal_content.bind("<Configure>", self._layout_home_goal)
        self._home_goal_layout = None

        self.home_metrics_frame = ctk.CTkFrame(
            self.home_scroll,
            fg_color="transparent",
        )
        self.home_metrics_frame.pack(fill="x", padx=10, pady=8)
        for column in range(2):
            self.home_metrics_frame.grid_columnconfigure(
                column,
                weight=1,
                uniform="home_metrics",
            )
        box_quest = ctk.CTkFrame(
            self.home_metrics_frame,
            fg_color=CARD_BG,
            corner_radius=12,
            border_color=CARD_BORDER,
            border_width=1,
        )
        self.home_quest_card = box_quest
        box_quest.grid(row=0, column=0, sticky="nsew", padx=(0, 5))
        ctk.CTkLabel(
            box_quest,
            text="🎯 Monats-Challenge",
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color=ACCENT_ORANGE,
        ).pack(anchor="w", padx=15, pady=(12, 4))
        self.lbl_home_quest = ctk.CTkLabel(
            box_quest,
            text="Lade Challenge ...",
            font=ctk.CTkFont(size=12),
            text_color=TEXT_SECONDARY,
            wraplength=380,
            justify="left",
        )
        self.lbl_home_quest.pack(anchor="w", padx=15, pady=(0, 12))

        card_home_stoic = ctk.CTkFrame(
            self.home_metrics_frame,
            fg_color=CARD_BG,
            corner_radius=16,
            border_color=ACCENT_BLUE,
            border_width=1,
        )
        self.home_stoic_card = card_home_stoic
        card_home_stoic.grid(row=0, column=1, sticky="nsew", padx=(5, 0))
        ctk.CTkLabel(
            card_home_stoic,
            text="🏛️ Stoischer Leitsatz des Tages",
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color=ACCENT_BLUE,
        ).pack(anchor="w", padx=20, pady=(12, 4))
        self.lbl_home_stoic = ctk.CTkLabel(
            card_home_stoic,
            text="",
            font=ctk.CTkFont(size=12, slant="italic"),
            text_color=TEXT_PRIMARY,
            wraplength=380,
            justify="left",
        )
        self.lbl_home_stoic.pack(anchor="w", padx=20, pady=(0, 12))

        self.home_metrics_frame.bind("<Configure>", self._layout_home_metrics)
        self._home_metrics_layout = None

