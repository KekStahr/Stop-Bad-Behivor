from .shared import *



class CommunityMixin:
    def refresh_community_stats(self):
        self.community_stats_queue = queue.Queue()
        threading.Thread(
            target=lambda: self.community_stats_queue.put(self.stats_manager.get_community_stats()),
            daemon=True,
        ).start()
        self.after(100, self._poll_community_stats)
    def refresh_community_leaderboard(self):
        self.lbl_leaderboard_content.configure(
            text="Lade Community-Rangliste ...",
            text_color=TEXT_SECONDARY,
        )

        def fetch_leaderboard():
            data = self.stats_manager.get_community_leaderboard()
            self.after(0, lambda: self._show_community_leaderboard(data))

        threading.Thread(target=fetch_leaderboard, daemon=True).start()
    def _show_community_leaderboard(self, leaderboard):
        if not leaderboard:
            self.lbl_leaderboard_content.configure(
                text="Rangliste derzeit offline oder keine Daten verfügbar.",
                text_color=TEXT_SECONDARY,
            )
            return

        lines = []
        for item in leaderboard:
            try:
                rank = int(item["rank"])
                streak = int(item["streak"])
                focus_minutes = int(item["focus_minutes"])
            except (KeyError, TypeError, ValueError):
                continue
            lines.append(
                f"#{rank} | Fokus-Krieger #{rank} — 🔥 {streak} Tage "
                f"Streak ({focus_minutes} Fokus-Min.)"
            )
        self.lbl_leaderboard_content.configure(
            text="\n".join(lines) or "Noch keine Ranglistendaten verfügbar.",
            text_color=TEXT_PRIMARY if lines else TEXT_SECONDARY,
        )
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
