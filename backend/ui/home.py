from .shared import *



class HomeMixin:
    def update_stats_display(self):
        data = self.stats_manager.get_stats()
        saved_hours, saved_money = self.stats_manager.calculate_savings()
        self.update_monthly_challenge_display()
        
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
        
        rank_data = self.stats_manager.get_user_rank_and_badges()
        self.lbl_streak_full.configure(text=f"🔥 Aktuelle Streak: {streak} Tage  |  🏆 Rekord: {data.get('longest_streak', 0)} Tage")
        user_name = data.get("community_author_name", "")
        if isinstance(user_name, str):
            user_name = " ".join(user_name.split())
        welcome_text = (
            f"Willkommen zurück, {user_name}!"
            if isinstance(user_name, str)
            and user_name
            and len(user_name) <= 32
            and user_name.isprintable()
            else "Willkommen zurück!"
        )
        self.lbl_home_welcome.configure(text=welcome_text)
        self.lbl_home_rank.configure(text=f"Rang: {rank_data['rank']}")
        self.lbl_home_streak.configure(text=f"{streak} Tage")
        self._update_home_sobriety_clock()
        self.lbl_home_savings.configure(text=f"{saved_hours} Std. gerettet")
        self.lbl_home_money.configure(text=self._format_euro(total_money))
        badge_summary = "  |  ".join(
            f"{'✅' if badge['unlocked'] else '🔒'} {badge['name']}"
            for badge in rank_data["badges"]
        )
        self.lbl_badges_detail.configure(
            text=f"Aktueller Rang: {rank_data['rank']}\nMeilensteine: {badge_summary}"
        )
        savings_goal = self.stats_manager.get_savings_progress()
        self.lbl_savings_status.configure(
            text=(
                f"Ziel: {savings_goal['name']} — "
                f"{self._format_euro(savings_goal['saved'])} / "
                f"{self._format_euro(savings_goal['target'])} "
                f"({str(savings_goal['progress']).replace('.', ',')}%)"
            )
        )
        self.progress_savings_goal.set(savings_goal["progress"] / 100.0)
        money_progress = min(max(savings_goal["progress"] / 100.0, 0.0), 1.0)
        time_progress = min(max(saved_hours / 24.0, 0.0), 1.0)
        self.home_savings_canvas.itemconfigure(
            self.home_money_ring,
            extent=-359 * money_progress,
        )
        self.home_savings_canvas.itemconfigure(
            self.home_time_ring,
            extent=-359 * time_progress,
        )
        self.lbl_home_ring_summary.configure(
            text=(
                f"Geld: {money_progress:.0%} vom Sparziel\n"
                f"Zeit: {time_progress:.0%} eines Tages"
            )
        )
        self.lbl_home_goal.configure(
            text=(
                f"{savings_goal['name']}  ·  "
                f"{self._format_euro(savings_goal['saved'])} von "
                f"{self._format_euro(savings_goal['target'])} "
                f"({str(savings_goal['progress']).replace('.', ',')}%)"
            )
        )
        self.progress_home_goal.set(savings_goal["progress"] / 100.0)
        amount_remaining = max(0.0, savings_goal["target"] - savings_goal["saved"])
        if amount_remaining == 0:
            goal_eta = "Ziel erreicht!"
        elif daily_expense > 0:
            days_remaining = math.ceil(amount_remaining / daily_expense)
            goal_eta = (
                f"Voraussichtlich in {days_remaining} Tagen erreicht "
                "(bei gleichbleibender täglicher Ersparnis)."
            )
        else:
            goal_eta = (
                "Für eine Zeitprognose tägliche Ausgaben-Ersparnis "
                "in den Einstellungen festlegen."
            )
        self.lbl_home_goal_eta.configure(text=goal_eta)
        opportunity = self.stats_manager.get_opportunity_equivalents()
        self.lbl_opportunity_detail.configure(
            text=(
                f"📚 {opportunity['pages']} Seiten  |  "
                f"🏃 {opportunity['kilometers']} km  |  "
                f"📖 {opportunity['books']} Bücher äquivalent"
            )
        )
        self.lbl_home_opportunity.configure(
            text=(
                f"{opportunity['pages']} Seiten · "
                f"{opportunity['kilometers']} km · "
                f"{opportunity['books']} Bücher"
            )
        )

        # Rückfall-Uhrzeiten darstellen
        incident_hours = data.get("incident_hours", {})
        if incident_hours:
            sorted_hours = sorted(incident_hours.items(), key=lambda x: x[1], reverse=True)
            text_str = " | ".join([f"{h}: {c}x" for h, c in sorted_hours[:3]])
            self.lbl_hours_detail.configure(text=f"Haupt-Risikazeiten: {text_str}", text_color=ACCENT_RED)
        else:
            self.lbl_hours_detail.configure(text="Noch keine Vorfälle erfasst. Sauber!", text_color=TEXT_SECONDARY)

        self.render_heatmap()
        self.render_weekday_heatmap(self.card_matrix)
        self.render_dopamine_curve(
            self.card_dopamine,
            trigger_type=data.get("last_trigger_category", "medium"),
        )
        q_data = self.stats_manager.get_conditioning_quotient()
        if q_data["breakdown"]:
            breakdown = " | ".join(
                f"{emotion}: {count}x"
                for emotion, count in q_data["breakdown"].items()
            )
            self.lbl_reframing_summary.configure(
                text=(
                    f"Haupt-Auslöser: {q_data['dominant_emotion']}  |  "
                    f"Zeitgewichteter Musterindex Q: {q_data['q_score']}\n"
                    f"Verteilung: {breakdown}"
                ),
                text_color=ACCENT_BLUE,
            )
        else:
            self.lbl_reframing_summary.configure(
                text="Noch keine Auslöser erfasst.",
                text_color=TEXT_SECONDARY,
            )
    def _live_ticker(self):
        data = self.stats_manager.get_stats()
        rank_data = self.stats_manager.get_user_rank_and_badges()
        self.lbl_home_rank.configure(text=f"Rang: {rank_data['rank']}")
        self.lbl_home_streak.configure(text=f"{data.get('streak', 0)} Tage")
        self._update_home_sobriety_clock()
        self._streak_ticker_id = self.after(1000, self._live_ticker)
    def confirm_streak_reset(self):
        from tkinter import messagebox

        if not messagebox.askyesno(
            "Streak zurücksetzen",
            "Möchtest du deine Streak wirklich zurücksetzen? "
            "Saisonale Badges werden zurückgesetzt; dein Streak-Rekord bleibt erhalten.",
            parent=self,
        ):
            return

        self.stats_manager.reset_streak()
        self.update_stats_display()

        dialog = ctk.CTkToplevel(self)
        dialog.title("🌱 Ein neuer Anfang")
        dialog.geometry("420x260")
        dialog.resizable(False, False)
        dialog.attributes("-topmost", True)
        dialog.grab_set()
        dialog.configure(fg_color=BG_DARK)
        ctk.CTkLabel(
            dialog,
            text="Kopf hoch! Ein Rückschlag ist kein Scheitern.",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color=ACCENT_ORANGE,
        ).pack(pady=(20, 10))
        ctk.CTkLabel(
            dialog,
            text=(
                "„Erfolg ist nicht endgültig, Misserfolg ist nicht fatal: "
                "Was zählt, ist der Mut weiterzumachen.“\n\n"
                "Atme durch, nimm deine Erkenntnisse mit und beginne Schritt "
                "für Schritt neu."
            ),
            font=ctk.CTkFont(size=12),
            text_color=TEXT_PRIMARY,
            wraplength=380,
            justify="center",
        ).pack(padx=20, pady=5)
        ctk.CTkButton(
            dialog,
            text="Verstanden, weiter geht's!",
            fg_color=ACCENT_GREEN,
            hover_color="#1B5E20",
            command=dialog.destroy,
        ).pack(pady=15)
    def save_custom_streak_time(self):
        from tkinter import messagebox

        value = self.entry_streak_start.get().strip()
        try:
            parsed_start = datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
            if parsed_start.strftime("%Y-%m-%d %H:%M:%S") != value:
                raise ValueError("Bitte nutze exakt das Format JJJJ-MM-TT HH:MM:SS.")
            self.stats_manager.set_custom_streak_start(parsed_start)
        except ValueError as error:
            messagebox.showerror(
                "Ungültiger Zeitpunkt",
                str(error) or "Bitte nutze das Format JJJJ-MM-TT HH:MM:SS.",
                parent=self,
            )
            return

        self.update_stats_display()
        messagebox.showinfo(
            "Streak aktualisiert",
            "Der Streak-Startzeitpunkt wurde gespeichert.",
            parent=self,
        )
    def on_tab_changed(self, *_):
        if self.tabview.get() in {"🏠 Home", "📊 Analytics"}:
            self.refresh_stoic_quote()
            self.update_monthly_challenge_display()
        elif self.tabview.get() == "🤝 Community":
            self.community_forum.refresh_posts()
    def refresh_stoic_quote(self):
        quote = self.stats_manager.get_stoic_quote()
        self.lbl_stoic_quote.configure(text=quote)
        self.lbl_home_stoic.configure(text=quote)
    def update_monthly_challenge_display(self):
        challenge = self.stats_manager.get_monthly_challenge()
        badge_text = (
            f"✅ Saisonales Badge freigeschaltet: {challenge['badge']}"
            if challenge["badge_unlocked"]
            else f"🔒 Saisonales Badge: {challenge['badge']}"
        )
        self.lbl_quest_detail.configure(
            text=(
                f"{challenge['title']}\n"
                f"{challenge['desc']}\n"
                f"Fortschritt: {challenge['current']} / "
                f"{challenge['target']} Fokus-Stunden "
                f"({str(challenge['progress']).replace('.', ',')}%)\n"
                f"{badge_text}"
            )
        )
        self.progress_monthly_challenge.set(challenge["progress"] / 100.0)
        self.lbl_home_quest.configure(
            text=(
                f"{challenge['title']}\n"
                f"{challenge['current']} / {challenge['target']} Std. "
                f"({str(challenge['progress']).replace('.', ',')}%)"
            )
        )
    def _layout_home_goal(self, event):
        layout = "stacked" if event.width < 650 else "columns"
        if layout == self._home_goal_layout:
            return
        self._home_goal_layout = layout
        if layout == "stacked":
            self.lbl_home_goal.grid_configure(
                row=0,
                column=0,
                columnspan=2,
                padx=0,
                pady=(0, 8),
            )
            self.home_goal_progress_frame.grid_configure(
                row=1,
                column=0,
                columnspan=2,
                padx=0,
                pady=0,
            )
        else:
            self.lbl_home_goal.grid_configure(
                row=0,
                column=0,
                columnspan=1,
                padx=(0, 16),
                pady=0,
            )
            self.home_goal_progress_frame.grid_configure(
                row=0,
                column=1,
                columnspan=1,
                padx=0,
                pady=0,
            )
    def _layout_home_metrics(self, event):
        layout = "stacked" if event.width < 760 else "columns"
        if layout == self._home_metrics_layout:
            return
        self._home_metrics_layout = layout
        if layout == "stacked":
            self.home_quest_card.grid_configure(
                row=0,
                column=0,
                columnspan=2,
                padx=0,
                pady=(0, 8),
            )
            self.home_stoic_card.grid_configure(
                row=1,
                column=0,
                columnspan=2,
                padx=0,
                pady=0,
            )
        else:
            self.home_quest_card.grid_configure(
                row=0,
                column=0,
                columnspan=1,
                padx=(0, 5),
                pady=0,
            )
            self.home_stoic_card.grid_configure(
                row=0,
                column=1,
                columnspan=1,
                padx=(5, 0),
                pady=0,
            )
    def _layout_home_actions(self, event):
        layout = "stacked" if event.width < 720 else "columns"
        if layout == self._home_actions_layout:
            return
        self._home_actions_layout = layout
        for index, button in enumerate(self.home_actions_frame.winfo_children()):
            if layout == "stacked":
                button.grid_configure(
                    row=index,
                    column=0,
                    padx=0,
                    pady=3,
                    sticky="ew",
                )
            else:
                button.grid_configure(
                    row=0,
                    column=index,
                    padx=(0, 5) if index == 0 else (5, 0) if index == 2 else 5,
                    pady=0,
                    sticky="ew",
                )
    def _update_home_sobriety_clock(self):
        components = self.stats_manager.get_detailed_streak_components()
        total_days = (
            components["years"] * 365
            + components["months"] * 30
            + components["weeks"] * 7
            + components["days"]
        )
        display_values = {
            "days": total_days,
            "hours": components["hours"],
            "minutes": components["minutes"],
            "seconds": components["seconds"],
        }
        for unit, label in self.home_duration_labels.items():
            label.configure(text=str(display_values[unit]))

        fractions = {
            "days": total_days % 30 / 30,
            "hours": (components["minutes"] * 60 + components["seconds"]) / 3600,
            "minutes": components["seconds"] / 60,
            "seconds": datetime.now().microsecond / 1_000_000,
        }
        self._home_clock_progress_starts = self.home_duration_progress_values.copy()
        self.home_duration_progress_targets = {
            unit: min(max(progress, 0.0), 1.0)
            for unit, progress in fractions.items()
        }
        self._home_clock_animation_started_at = time.monotonic()
        if self._home_clock_animation_id is None and any(
            abs(
                self.home_duration_progress_values[unit]
                - self.home_duration_progress_targets[unit]
            )
            > 0.001
            for unit in self.home_duration_progress_targets
        ):
            self._home_clock_animation_id = self.after(
                16,
                self._animate_home_clock_progress,
            )
    def _animate_home_clock_progress(self):
        elapsed = time.monotonic() - self._home_clock_animation_started_at
        progress = min(elapsed / 0.35, 1.0)
        eased_progress = 1 - (1 - progress) ** 3
        for unit, target in self.home_duration_progress_targets.items():
            start = self._home_clock_progress_starts[unit]
            value = start + (target - start) * eased_progress
            self.home_duration_progress[unit].set(value)
            self.home_duration_progress_values[unit] = value
        if progress < 1:
            self._home_clock_animation_id = self.after(
                16,
                self._animate_home_clock_progress,
            )
        else:
            self._home_clock_animation_id = None
    def _animate_home_flame(self):
        animation = (
            (25, ACCENT_ORANGE),
            (28, "#FFD60A"),
            (30, ACCENT_RED),
            (28, ACCENT_ORANGE),
        )
        size, color = animation[self._home_flame_animation_phase % len(animation)]
        self.home_flame_label.configure(
            font=ctk.CTkFont(size=size),
            text_color=color,
        )
        self._home_flame_animation_phase += 1
        self._home_flame_animation_id = self.after(
            350,
            self._animate_home_flame,
        )
    @staticmethod
    def _format_euro(value):
        return f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") + " €"
    def save_user_savings_goal(self):
        from tkinter import messagebox

        name = self.entry_goal_name.get().strip()
        try:
            amount = float(self.entry_goal_amount.get().replace(",", "."))
            self.stats_manager.set_savings_goal(name, amount)
        except (ValueError, TypeError) as error:
            messagebox.showerror("Sparziel", str(error), parent=self)
            return

        self.entry_goal_name.delete(0, "end")
        self.entry_goal_amount.delete(0, "end")
        self.update_stats_display()
    def check_sunday_report_popup(self):
        report_text = self.stats_manager.check_sunday_report()
        if report_text:
            from tkinter import messagebox

            messagebox.showinfo(
                "Sonntags-Reflexions-Report",
                report_text,
                parent=self,
            )
    def show_startup_prompts(self):
        if not self.stats_manager.get_stats().get("codex_completed", False):
            self.show_initial_codex_dialog()
            return
        self.check_sunday_report_popup()
    def show_initial_codex_dialog(self):
        dialog = ctk.CTkToplevel(self)
        dialog.title("Dein Codex der Disziplin")
        dialog.geometry("480x500")
        dialog.resizable(False, False)
        dialog.attributes("-topmost", True)
        dialog.grab_set()
        dialog.configure(fg_color=BG_DARK)
        dialog.protocol(
            "WM_DELETE_WINDOW",
            lambda: finish_setup(False),
        )

        ctk.CTkLabel(
            dialog,
            text="📜 Dein persönlicher Codex",
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color=ACCENT_BLUE,
        ).pack(pady=(20, 5))
        ctk.CTkLabel(
            dialog,
            text="Formuliere freiwillig, woran du dich in schwierigen Momenten erinnern möchtest.",
            font=ctk.CTkFont(size=11),
            text_color=TEXT_SECONDARY,
            wraplength=420,
            justify="center",
        ).pack(padx=20, pady=(0, 15))

        ctk.CTkLabel(dialog, text="Wer möchtest du sein?").pack(anchor="w", padx=25)
        identity_entry = ctk.CTkEntry(
            dialog,
            placeholder_text="Deine selbst gewählte Identität",
            width=420,
        )
        identity_entry.pack(padx=25, pady=(3, 10))
        identity_entry.insert(0, self.stats_manager.get_codex()["identity"])

        ctk.CTkLabel(dialog, text="Welche Regeln sind dir wichtig?").pack(anchor="w", padx=25)
        rules_box = ctk.CTkTextbox(dialog, width=420, height=85)
        rules_box.pack(padx=25, pady=(3, 10))
        rules_box.insert("1.0", self.stats_manager.get_codex()["rules"])

        ctk.CTkLabel(dialog, text="Dein Brief an das Zukunfts-Ich:").pack(anchor="w", padx=25)
        letter_box = ctk.CTkTextbox(dialog, width=420, height=95)
        letter_box.pack(padx=25, pady=(3, 10))
        letter_box.insert("1.0", self.stats_manager.get_shadow_letter())

        buttons = ctk.CTkFrame(dialog, fg_color="transparent")
        buttons.pack(fill="x", padx=25, pady=(5, 15))

        def finish_setup(save):
            if save:
                try:
                    self.stats_manager.save_personal_manifest(
                        identity_entry.get(),
                        rules_box.get("1.0", "end"),
                        letter_box.get("1.0", "end"),
                    )
                except (OSError, ValueError) as error:
                    from tkinter import messagebox

                    messagebox.showerror(
                        "Codex",
                        f"Dein Codex konnte nicht gespeichert werden: {error}",
                        parent=dialog,
                    )
                    return
            else:
                self.stats_manager.data["codex_completed"] = True
                self.stats_manager.save_data()
            dialog.grab_release()
            dialog.destroy()
            self.check_sunday_report_popup()

        ctk.CTkButton(
            buttons,
            text="Codex speichern",
            fg_color=ACCENT_GREEN,
            hover_color="#1B5E20",
            command=lambda: finish_setup(True),
        ).pack(side="left", expand=True, padx=(0, 5))
        ctk.CTkButton(
            buttons,
            text="Später",
            fg_color=CARD_BORDER,
            hover_color="#3A3A46",
            command=lambda: finish_setup(False),
        ).pack(side="left", expand=True, padx=(5, 0))
    def save_personal_manifest(self):
        from tkinter import messagebox

        try:
            self.stats_manager.save_personal_manifest(
                self.entry_identity.get(),
                self.txt_codex_rules.get("1.0", "end"),
                self.txt_shadow_letter.get("1.0", "end"),
            )
        except (OSError, ValueError) as error:
            messagebox.showerror(
                "Codex",
                f"Codex und Brief konnten nicht gespeichert werden: {error}",
                parent=self,
            )
            return

        self.entry_identity.configure(border_color=ACCENT_GREEN)
        messagebox.showinfo(
            "Codex",
            "Dein Codex und dein Brief wurden lokal gespeichert.",
            parent=self,
        )
    def toggle_stress_detection(self):
        enabled = bool(self.stress_detection_switch.get())
        self.monitor.set_stress_detection(enabled)
        self.stats_manager.data["stress_detection_enabled"] = enabled
        self.stats_manager.save_data()
    def save_community_settings(self):
        from tkinter import messagebox

        auto_connect = bool(self.sw_auto_chat.get())
        allow_helper = bool(self.sw_helper_mode.get())
        try:
            self.stats_manager.update_community_settings(
                auto_connect=auto_connect,
                allow_helper=allow_helper,
            )
        except OSError as error:
            messagebox.showerror(
                "Community-Chat",
                f"Einstellungen konnten nicht gespeichert werden: {error}",
                parent=self,
            )
            return
        self.btn_join_as_helper.configure(
            state="normal" if allow_helper else "disabled"
        )
