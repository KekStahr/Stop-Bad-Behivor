from .shared import *


class CommunityWidgetsMixin:
    def build_community_widgets(self):
        self.community_forum = CommunityForum(
            self.tab_community,
            stats_manager=self.stats_manager,
        )
        self.community_forum.pack(fill="both", expand=True, padx=5, pady=5)

