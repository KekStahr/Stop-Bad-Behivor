from .shared import *


class AnalyticsWidgetsMixin:
    def build_analytics_widgets(self):
        # --- TAB 3: STATISTIK & ANALYTICS ---
        self.stats_scroll = ctk.CTkScrollableFrame(self.tab_stats, fg_color="transparent")
        self.stats_scroll.pack(fill="both", expand=True, padx=5, pady=5)

        self.card_stoic = ctk.CTkFrame(
            self.stats_scroll,
            fg_color=CARD_BG,
            corner_radius=12,
            border_color=ACCENT_BLUE,
            border_width=1,
        )
        self.card_stoic.pack(fill="x", padx=10, pady=8)
        stoic_header = ctk.CTkFrame(self.card_stoic, fg_color="transparent")
        stoic_header.pack(fill="x", padx=20, pady=(15, 2))
        ctk.CTkLabel(
            stoic_header,
            text="🏛️ Zweifel-Terminator · Stoischer Leitsatz",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=ACCENT_BLUE,
        ).pack(side="left")
        ctk.CTkButton(
            stoic_header,
            text="Neuer Leitsatz",
            width=110,
            height=28,
            fg_color=ACCENT_BLUE,
            hover_color="#008B9B",
            command=self.refresh_stoic_quote,
        ).pack(side="right")
        self.lbl_stoic_quote = ctk.CTkLabel(
            self.card_stoic,
            text=self.stats_manager.get_stoic_quote(),
            font=ctk.CTkFont(size=13, slant="italic"),
            text_color=TEXT_PRIMARY,
            wraplength=680,
            justify="left",
        )
        self.lbl_stoic_quote.pack(anchor="w", padx=20, pady=(4, 15))

        self.card_quest = ctk.CTkFrame(
            self.stats_scroll,
            fg_color=CARD_BG,
            corner_radius=12,
            border_color=ACCENT_ORANGE,
            border_width=1,
        )
        self.card_quest.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(
            self.card_quest,
            text="🎯 Saisonale Disziplin-Challenge · Monats-Quest",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=ACCENT_ORANGE,
        ).pack(anchor="w", padx=20, pady=(15, 5))
        self.lbl_quest_detail = ctk.CTkLabel(
            self.card_quest,
            text="Monats-Quest wird geladen ...",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=TEXT_PRIMARY,
            justify="left",
            wraplength=680,
        )
        self.lbl_quest_detail.pack(anchor="w", padx=20, pady=(0, 8))
        self.progress_monthly_challenge = ctk.CTkProgressBar(
            self.card_quest,
            progress_color=ACCENT_ORANGE,
            fg_color=CARD_BORDER,
        )
        self.progress_monthly_challenge.pack(fill="x", padx=20, pady=(0, 15))

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

        self.card_matrix = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_matrix.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(
            self.card_matrix,
            text="🗺️ Trigger-Matrix (Wochentage & Uhrzeiten)",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=ACCENT_RED,
        ).pack(anchor="w", padx=20, pady=(15, 2))
        ctk.CTkLabel(
            self.card_matrix,
            text="Abgefangene Trigger-Versuche nach Wochentag und Stunde "
                 "(keine Aussage über tatsächliche Rückfälle).",
            font=ctk.CTkFont(size=11),
            text_color=TEXT_SECONDARY,
            wraplength=680,
            justify="left",
        ).pack(anchor="w", padx=20, pady=(0, 5))

        self.card_dopamine = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_dopamine.pack(fill="x", padx=10, pady=8)
        dopamine_header = ctk.CTkFrame(self.card_dopamine, fg_color="transparent")
        dopamine_header.pack(fill="x", padx=20, pady=(12, 2))
        ctk.CTkLabel(
            dopamine_header,
            text="🧪 Dopamin-Halbwertzeit-Modell",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=ACCENT_ORANGE,
        ).pack(side="left")
        self.lbl_dopamine_status = ctk.CTkLabel(
            dopamine_header,
            text="Modellwert – keine Messung",
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color=TEXT_SECONDARY,
        )
        self.lbl_dopamine_status.pack(side="right")
        ctk.CTkLabel(
            self.card_dopamine,
            text="Illustrative exponentielle Kurve ab einem erfassten Trigger; "
                 "kein gemessener oder klinischer Dopaminwert.",
            font=ctk.CTkFont(size=11),
            text_color=TEXT_SECONDARY,
            wraplength=680,
            justify="left",
        ).pack(anchor="w", padx=20, pady=(0, 3))

        self.card_reframing = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_reframing.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(
            self.card_reframing,
            text="🧠 Kognitive Reframing-Matrix (Muster-Erkennung)",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=ACCENT_BLUE,
        ).pack(anchor="w", padx=20, pady=(15, 5))
        self.lbl_reframing_summary = ctk.CTkLabel(
            self.card_reframing,
            text="Noch keine emotionalen Auslöser erfasst.",
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color=TEXT_PRIMARY,
            wraplength=680,
            justify="left",
        )
        self.lbl_reframing_summary.pack(anchor="w", padx=20, pady=(0, 15))
        ctk.CTkButton(
            self.card_reframing,
            text="Lernreflexion festhalten",
            width=190,
            fg_color=ACCENT_BLUE,
            hover_color="#008B9B",
            command=self.show_constructive_reflection_dialog,
        ).pack(anchor="e", padx=20, pady=(0, 12))

        self.card_opportunity = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_opportunity.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(
            self.card_opportunity,
            text="🌱 Fokuszeit in reale Errungenschaften übersetzen",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=ACCENT_GREEN,
        ).pack(anchor="w", padx=20, pady=(15, 2))
        ctk.CTkLabel(
            self.card_opportunity,
            text="Anschauliche Äquivalente deiner Fokus- und geretteten Zeit:",
            font=ctk.CTkFont(size=11),
            text_color=TEXT_SECONDARY,
        ).pack(anchor="w", padx=20, pady=(0, 5))
        self.lbl_opportunity_detail = ctk.CTkLabel(
            self.card_opportunity,
            text="📚 0 Seiten  |  🏃 0 km  |  📖 0 Bücher",
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color=TEXT_PRIMARY,
        )
        self.lbl_opportunity_detail.pack(anchor="w", padx=20, pady=(0, 15))

        self.card_badges = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_badges.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(
            self.card_badges,
            text="🎖️ Ränge & Meilenstein-Badges",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=ACCENT_ORANGE,
        ).pack(anchor="w", padx=20, pady=(15, 2))
        self.lbl_badges_detail = ctk.CTkLabel(
            self.card_badges,
            text="Lade Badges ...",
            font=ctk.CTkFont(size=12),
            text_color=TEXT_PRIMARY,
            wraplength=680,
            justify="left",
        )
        self.lbl_badges_detail.pack(anchor="w", padx=20, pady=(0, 15))

        self.card_savings_goal = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_savings_goal.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(
            self.card_savings_goal,
            text="🎯 Visuelle Sparziel-Spardose",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=ACCENT_GREEN,
        ).pack(anchor="w", padx=20, pady=(15, 2))
        self.lbl_savings_status = ctk.CTkLabel(
            self.card_savings_goal,
            text="Sparziel wird geladen ...",
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color=TEXT_PRIMARY,
            wraplength=680,
            justify="left",
        )
        self.lbl_savings_status.pack(anchor="w", padx=20, pady=(5, 5))
        self.progress_savings_goal = ctk.CTkProgressBar(
            self.card_savings_goal,
            progress_color=ACCENT_GREEN,
            fg_color=CARD_BORDER,
        )
        self.progress_savings_goal.pack(fill="x", padx=20, pady=(0, 10))
        goal_input = ctk.CTkFrame(self.card_savings_goal, fg_color="transparent")
        goal_input.pack(fill="x", padx=20, pady=(0, 15))
        self.entry_goal_name = ctk.CTkEntry(
            goal_input,
            placeholder_text="Traum-Ziel (z. B. neues Buch)",
            width=260,
        )
        self.entry_goal_name.pack(side="left", padx=(0, 10))
        self.entry_goal_amount = ctk.CTkEntry(
            goal_input,
            placeholder_text="Betrag (€)",
            width=110,
        )
        self.entry_goal_amount.pack(side="left", padx=(0, 10))
        ctk.CTkButton(
            goal_input,
            text="Ziel setzen",
            fg_color=ACCENT_GREEN,
            hover_color="#1B5E20",
            width=100,
            command=self.save_user_savings_goal,
        ).pack(side="left")

        self.card_discounting = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_discounting.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(
            self.card_discounting,
            text="📉 Hyperbolische Diskontierung (Present Bias)",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=ACCENT_ORANGE,
        ).pack(anchor="w", padx=20, pady=(15, 2))
        ctk.CTkLabel(
            self.card_discounting,
            text="Illustratives Modell: Wie ein verzögertes Ziel subjektiv an Wert verliert.",
            font=ctk.CTkFont(size=11),
            text_color=TEXT_SECONDARY,
            wraplength=680,
            justify="left",
        ).pack(anchor="w", padx=20, pady=(0, 2))
        self.render_discounting_chart(self.card_discounting)

        # 4. Community Card
        self.card_community = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_community.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(self.card_community, text="🌐 Community-Fokus", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", padx=20, pady=(12, 3))
        self.lbl_community_stats = ctk.CTkLabel(self.card_community, text="Community-Statistik wird geladen ...", font=ctk.CTkFont(size=12), text_color=TEXT_SECONDARY)
        self.lbl_community_stats.pack(anchor="w", padx=20, pady=(0, 15))
        helper_settings = self.stats_manager.get_community_settings()
        self.btn_join_as_helper = ctk.CTkButton(
            self.card_community,
            text="🤝 Als anonymer Helfer beitreten",
            fg_color=ACCENT_GREEN,
            hover_color="#1B5E20",
            command=lambda: self.trigger_community_support_chat(role="helper"),
            state="normal" if helper_settings["allow_helper_mode"] else "disabled",
        )
        self.btn_join_as_helper.pack(anchor="w", padx=20, pady=(0, 15))

        self.card_leaderboard = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_leaderboard.pack(fill="x", padx=10, pady=8)
        leaderboard_header = ctk.CTkFrame(self.card_leaderboard, fg_color="transparent")
        leaderboard_header.pack(fill="x", padx=20, pady=(15, 5))
        ctk.CTkLabel(
            leaderboard_header,
            text="🏆 Anonyme Community-Rangliste (Top-Streaks)",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=ACCENT_ORANGE,
        ).pack(side="left")
        self.btn_refresh_leaderboard = ctk.CTkButton(
            leaderboard_header,
            text="Aktualisieren",
            width=100,
            height=28,
            fg_color=ACCENT_BLUE,
            hover_color="#008B9B",
            command=self.refresh_community_leaderboard,
        )
        self.btn_refresh_leaderboard.pack(side="right")
        self.lbl_leaderboard_content = ctk.CTkLabel(
            self.card_leaderboard,
            text="Lade Community-Rangliste ...",
            font=ctk.CTkFont(size=12),
            text_color=TEXT_SECONDARY,
            justify="left",
            anchor="w",
        )
        self.lbl_leaderboard_content.pack(anchor="w", padx=20, pady=(0, 15), fill="x")

        # 5. Rückfall-Uhrzeiten Card
        self.card_hours = ctk.CTkFrame(self.stats_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
        self.card_hours.pack(fill="x", padx=10, pady=8)
        ctk.CTkLabel(self.card_hours, text="⏰ Critical Risk Hours (Analysen):", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_RED).pack(anchor="w", padx=20, pady=(12, 5))
        self.lbl_hours_detail = ctk.CTkLabel(self.card_hours, text="Noch keine Vorfälle erfasst.", font=ctk.CTkFont(size=12), text_color=TEXT_SECONDARY)
        self.lbl_hours_detail.pack(anchor="w", padx=20, pady=(0, 15))

