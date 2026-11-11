from .shared import *



class AnalyticsMixin:
    def render_weekday_heatmap(self, parent_container):
        old_canvas = getattr(self, "matrix_canvas", None)
        if old_canvas:
            old_canvas.get_tk_widget().destroy()
        old_figure = getattr(self, "matrix_figure", None)
        if old_figure:
            plt.close(old_figure)

        matrix_data = self.stats_manager.get_stats().get("weekday_hour_matrix", {})
        grid = [[0 for _ in range(24)] for _ in range(7)]
        for day_key, hours in matrix_data.items():
            try:
                day = int(day_key)
            except (TypeError, ValueError):
                continue
            if not 0 <= day < 7 or not isinstance(hours, dict):
                continue
            for hour_key, count in hours.items():
                try:
                    hour = int(hour_key)
                    value = max(0, int(count))
                except (TypeError, ValueError):
                    continue
                if 0 <= hour < 24:
                    grid[day][hour] = value

        fig, ax = plt.subplots(figsize=(6.8, 2.0), dpi=90)
        fig.patch.set_facecolor(CARD_BG)
        ax.set_facecolor(BG_DARK)
        ax.imshow(grid, cmap="Reds", aspect="auto", interpolation="nearest")
        ax.set_yticks(range(7))
        ax.set_yticklabels(
            ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
            color=TEXT_SECONDARY,
            fontsize=10,
        )
        ax.set_xticks(range(0, 24, 3))
        ax.set_xticklabels(
            [f"{hour}h" for hour in range(0, 24, 3)],
            color=TEXT_SECONDARY,
            fontsize=10,
        )
        ax.tick_params(length=0)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_color(CARD_BORDER)
        ax.spines["bottom"].set_color(CARD_BORDER)
        fig.tight_layout()
        canvas = FigureCanvasTkAgg(fig, master=parent_container)
        canvas.draw()
        canvas.get_tk_widget().pack(fill="x", padx=15, pady=(0, 12))
        self.matrix_figure = fig
        self.matrix_canvas = canvas
    def render_dopamine_curve(
        self, parent_container, trigger_type="medium", elapsed_mins=10
    ):
        old_canvas = getattr(self, "dopamine_canvas", None)
        if old_canvas:
            old_canvas.get_tk_widget().destroy()
        old_figure = getattr(self, "dopamine_figure", None)
        if old_figure:
            plt.close(old_figure)

        stats_data = self.stats_manager.get_stats()
        trigger_at = stats_data.get("last_trigger_at")
        if trigger_at:
            try:
                triggered = datetime.fromisoformat(trigger_at)
                elapsed_mins = max(
                    0.0, (datetime.now() - triggered).total_seconds() / 60.0
                )
            except (TypeError, ValueError):
                pass

        profile = self.stats_manager.get_dopamine_level(0, trigger_type)
        half_life = profile["half_life_mins"]
        peak = profile["current_spike"]
        times = [120 * index / 199 for index in range(200)]
        curve = [
            100 + peak * (0.5 ** (minutes / half_life))
            for minutes in times
        ]
        current = self.stats_manager.get_dopamine_level(
            elapsed_mins, trigger_type
        )

        fig, ax = plt.subplots(figsize=(6.8, 2.2), dpi=95)
        fig.patch.set_facecolor(CARD_BG)
        ax.set_facecolor(BG_DARK)
        ax.axhline(
            100,
            color=ACCENT_GREEN,
            linestyle="--",
            alpha=0.7,
            label="Modell-Baseline (100%)",
        )
        ax.plot(times, curve, color=ACCENT_RED, linewidth=2.5, label="Modellkurve")
        ax.fill_between(times, 100, curve, color=ACCENT_RED, alpha=0.15)
        ax.scatter(
            [min(elapsed_mins, 120)],
            [current["total_level"]],
            color=ACCENT_ORANGE,
            s=45,
            zorder=5,
            label="Aktueller Modellwert",
        )
        ax.set_xlim(0, 120)
        ax.set_ylim(80, peak + 120)
        ax.set_xlabel("Vergangene Zeit (Minuten)", color=TEXT_SECONDARY, fontsize=10)
        ax.set_ylabel("Modellwert (%)", color=TEXT_SECONDARY, fontsize=10)
        ax.tick_params(colors=TEXT_SECONDARY, labelsize=10)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_color(CARD_BORDER)
        ax.spines["bottom"].set_color(CARD_BORDER)
        ax.legend(
            facecolor=CARD_BG,
            edgecolor="none",
            labelcolor=TEXT_PRIMARY,
            fontsize=9,
            loc="upper right",
        )
        fig.tight_layout()
        canvas = FigureCanvasTkAgg(fig, master=parent_container)
        canvas.draw()
        canvas.get_tk_widget().pack(fill="x", padx=15, pady=(0, 10))
        self.dopamine_figure = fig
        self.dopamine_canvas = canvas

        if trigger_at:
            self.lbl_dopamine_status.configure(
                text=(
                    f"Modell: {current['total_level']}% · "
                    f"Normalisierung: {current['recovery_percent']}% · "
                    f"Profil: {trigger_type}"
                ),
                text_color=ACCENT_GREEN,
            )
        else:
            self.lbl_dopamine_status.configure(
                text="Kein Trigger erfasst · illustrative Modellkurve",
                text_color=TEXT_SECONDARY,
            )
    def render_discounting_chart(self, parent_container):
        old_canvas = getattr(self, "discount_canvas", None)
        if old_canvas:
            old_canvas.get_tk_widget().destroy()
        old_figure = getattr(self, "discount_figure", None)
        if old_figure:
            plt.close(old_figure)

        discount_data = self.stats_manager.calculate_hyperbolic_discounting(
            A=100.0, k=0.2, max_days=30
        )
        fig, ax = plt.subplots(figsize=(6.8, 1.8), dpi=90)
        fig.patch.set_facecolor(CARD_BG)
        ax.set_facecolor(BG_DARK)
        ax.plot(
            discount_data["days"],
            discount_data["values"],
            color=ACCENT_ORANGE,
            linewidth=2.5,
            label="Subjektiver Modellwert",
        )
        ax.fill_between(
            discount_data["days"],
            0,
            discount_data["values"],
            color=ACCENT_ORANGE,
            alpha=0.1,
        )
        ax.set_title(
            "Verzögerung (Tage) vs. modellierter Wert",
            color=TEXT_SECONDARY,
            fontsize=11,
            loc="left",
        )
        ax.set_xlabel("Tage", color=TEXT_SECONDARY, fontsize=10)
        ax.set_ylabel("Wert", color=TEXT_SECONDARY, fontsize=10)
        ax.tick_params(colors=TEXT_SECONDARY, labelsize=10)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_color(CARD_BORDER)
        ax.spines["bottom"].set_color(CARD_BORDER)
        ax.legend(
            facecolor=CARD_BG,
            edgecolor="none",
            labelcolor=TEXT_PRIMARY,
            fontsize=9,
            loc="upper right",
        )
        fig.tight_layout()
        canvas = FigureCanvasTkAgg(fig, master=parent_container)
        canvas.draw()
        canvas.get_tk_widget().pack(fill="x", padx=15, pady=(0, 12))
        self.discount_figure = fig
        self.discount_canvas = canvas
