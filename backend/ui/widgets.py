from .shared import *



class WidgetsMixin:
    def _apply_apple_widget_style(self, root=None):
        root = root or self
        for widget in root.winfo_children():
            if isinstance(widget, ctk.CTkBaseClass):
                try:
                    font = widget.cget("font")
                except ValueError:
                    font = None
                if isinstance(font, ctk.CTkFont) and font.cget("size") < 13:
                    widget.configure(
                        font=ctk.CTkFont(
                            family=font.cget("family"),
                            size=13,
                            weight=font.cget("weight"),
                            slant=font.cget("slant"),
                            underline=font.cget("underline"),
                            overstrike=font.cget("overstrike"),
                        )
                    )

                if type(widget) is ctk.CTkFrame:
                    if widget.cget("fg_color") != "transparent":
                        widget.configure(
                            corner_radius=max(16, widget.cget("corner_radius")),
                            border_color=CARD_BORDER,
                            border_width=max(1, widget.cget("border_width")),
                        )
                elif isinstance(widget, ctk.CTkButton):
                    widget.configure(
                        corner_radius=max(12, widget.cget("corner_radius"))
                    )

            self._apply_apple_widget_style(widget)
    def create_widgets(self):
        self.tabview = ctk.CTkTabview(
            self, 
            width=810, 
            height=630, 
            fg_color="transparent",
            corner_radius=18,
            segmented_button_fg_color=CARD_BG,
            segmented_button_selected_color=ACCENT_BLUE,
            segmented_button_selected_hover_color="#0066CC",
            segmented_button_unselected_color=CARD_BG,
            segmented_button_unselected_hover_color=CARD_BORDER,
            segmented_button_font=ctk.CTkFont(size=14, weight="bold"),
            command=self.on_tab_changed,
            anchor="s",
        )
        self.tabview.pack(fill="both", expand=True, pady=(12, 12), padx=26)

        self.tab_home = self.tabview.add("🏠 Home")
        self.tab_timer = self.tabview.add("⏱️ Fokus & Pausen")
        self.tab_community = self.tabview.add("🤝 Community")
        self.tab_stats = self.tabview.add("📊 Analytics")
        self.tab_settings = self.tabview.add("⚙️ Einstellungen")

        self.build_home_widgets()
        self.build_timer_widgets()
        self.build_community_widgets()
        self.build_analytics_widgets()
        # --- TAB 4: EINSTELLUNGEN & SPERR-REGELN ---
        self.setup_settings_tab()
