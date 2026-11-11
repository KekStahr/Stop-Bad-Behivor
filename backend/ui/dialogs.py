from .shared import *
from .chat import SupportChatWindow



class DialogsMixin:
    def show_reframing_dialog(self, trigger_word):
        if self.reframing_dialog_active:
            return
        self.reframing_dialog_active = True
        dialog = ctk.CTkToplevel(self)
        dialog.title("🧠 Kognitive Reframing-Matrix")
        dialog.geometry("420x390")
        dialog.resizable(False, False)
        dialog.attributes("-topmost", True)
        dialog.grab_set()
        dialog.configure(fg_color=BG_DARK)
        dialog.protocol(
            "WM_DELETE_WINDOW",
            lambda: self._close_reframing_dialog(dialog),
        )

        ctk.CTkLabel(
            dialog,
            text="⚠️ TRIGGER ABGEFANGEN",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color=ACCENT_RED,
        ).pack(pady=(20, 5))
        ctk.CTkLabel(
            dialog,
            text=f"Wort: '{trigger_word}' wurde abgefangen.\n"
                 "Welcher emotionale Auslöser steckt dahinter?",
            font=ctk.CTkFont(size=12),
            text_color=TEXT_SECONDARY,
            justify="center",
            wraplength=360,
        ).pack(pady=(0, 15))

        emotions = ["Einsamkeit", "Stress", "Frustration", "Langeweile", "Gewohnheit"]
        selected_emotion = ctk.StringVar(value="Stress")
        radio_frame = ctk.CTkFrame(dialog, fg_color=CARD_BG, corner_radius=10)
        radio_frame.pack(fill="x", padx=25, pady=5)

        for emotion in emotions:
            ctk.CTkRadioButton(
                radio_frame,
                text=emotion,
                variable=selected_emotion,
                value=emotion,
                fg_color=ACCENT_RED,
            ).pack(anchor="w", padx=20, pady=5)

        def save_and_close():
            try:
                self.stats_manager.add_reframing_entry(
                    selected_emotion.get(), trigger_word
                )
            except (OSError, ValueError) as error:
                from tkinter import messagebox

                messagebox.showerror("Reframing", f"Eintrag konnte nicht gespeichert werden: {error}", parent=dialog)
                return
            self.update_stats_display()
            self._close_reframing_dialog(dialog)

        ctk.CTkButton(
            dialog,
            text="Reframing abspeichern & weitergehen",
            fg_color=ACCENT_GREEN,
            hover_color="#1B5E20",
            height=38,
            corner_radius=8,
            command=save_and_close,
        ).pack(pady=15, padx=25, fill="x")
    def handle_trigger_event(self, word):
        def show_intervention():
            settings = self.stats_manager.get_community_settings()
            if settings["auto_connect_trigger"]:
                self.trigger_community_support_chat(
                    role="seeker",
                    on_close=lambda: self.after(
                        0,
                        lambda: self.show_shadow_letter_popup(word),
                    ),
                )
            else:
                self.show_shadow_letter_popup(word)

        self.after(0, show_intervention)
    def trigger_community_support_chat(self, role="seeker", on_close=None):
        settings = self.stats_manager.get_community_settings()
        if role == "helper" and not settings["allow_helper_mode"]:
            return
        try:
            server_url = self.stats_manager.get_support_chat_url(role)
        except ValueError:
            return
        SupportChatWindow(
            self,
            server_url=server_url,
            role=role,
            on_close=on_close,
            stats_manager=self.stats_manager,
        )
    def show_shadow_letter_popup(self, trigger_word):
        if self.shadow_letter_dialog_active:
            return
        self.shadow_letter_dialog_active = True
        codex = self.stats_manager.get_codex()
        letter = self.stats_manager.get_shadow_letter()

        win = ctk.CTkToplevel(self)
        win.title("📜 Schatten-Self: Brief an dein Zukunfts-Ich")
        win.geometry("480x500")
        win.resizable(False, False)
        win.attributes("-topmost", True)
        win.grab_set()
        win.configure(fg_color=BG_DARK)

        def close_letter(open_rescue=False):
            if win.winfo_exists():
                win.grab_release()
                win.destroy()
            self.shadow_letter_dialog_active = False
            if open_rescue:
                self.after(
                    100,
                    lambda: self.show_relapse_rescue_dialog(trigger_word),
                )

        win.protocol(
            "WM_DELETE_WINDOW",
            lambda: close_letter(open_rescue=True),
        )
        ctk.CTkLabel(
            win,
            text="✉️ DEIN EIGENER AUFRUF",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color=ACCENT_ORANGE,
        ).pack(pady=(18, 5))
        ctk.CTkLabel(
            win,
            text="In einem klaren Moment hast du diese Worte für dich festgehalten:",
            font=ctk.CTkFont(size=11),
            text_color=TEXT_SECONDARY,
            justify="center",
            wraplength=420,
        ).pack(padx=25, pady=(0, 10))
        ctk.CTkLabel(
            win,
            text=codex["identity"],
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color=ACCENT_BLUE,
            wraplength=420,
            justify="center",
        ).pack(padx=25, pady=(0, 8))
        ctk.CTkLabel(
            win,
            text=codex["rules"],
            font=ctk.CTkFont(size=11),
            text_color=TEXT_SECONDARY,
            wraplength=420,
            justify="left",
        ).pack(anchor="w", padx=30, pady=(0, 8))

        txt_box = ctk.CTkTextbox(
            win,
            width=420,
            height=190,
            fg_color=CARD_BG,
            text_color=TEXT_PRIMARY,
            font=ctk.CTkFont(size=13),
            wrap="word",
        )
        txt_box.pack(padx=30, pady=5)
        txt_box.insert("1.0", letter)
        txt_box.configure(state="disabled")
        ctk.CTkButton(
            win,
            text="Weiter — Comeback-Moment anzeigen",
            fg_color=ACCENT_GREEN,
            hover_color="#1B5E20",
            height=38,
            command=lambda: close_letter(open_rescue=True),
        ).pack(pady=12, padx=30, fill="x")
    def handle_stress_event(self):
        self.after(0, self.show_stress_warning_popup)
    def show_stress_warning_popup(self):
        if self.stress_dialog_active:
            return
        self.stress_dialog_active = True

        win = ctk.CTkToplevel(self)
        win.title("🧠 Tipp-Rhythmus-Erinnerung")
        win.geometry("420x280")
        win.resizable(False, False)
        win.attributes("-topmost", True)
        win.grab_set()
        win.configure(fg_color=BG_DARK)

        def close_warning():
            if win.winfo_exists():
                win.grab_release()
                win.destroy()
            self.stress_dialog_active = False

        win.protocol("WM_DELETE_WINDOW", close_warning)
        ctk.CTkLabel(
            win,
            text="⚡ Sehr schneller Tipp-Rhythmus erkannt",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color=ACCENT_ORANGE,
            wraplength=370,
        ).pack(pady=(22, 8))
        ctk.CTkLabel(
            win,
            text=(
                "Das ist nur eine grobe Rhythmus-Heuristik, keine "
                "Stressmessung. Möchtest du kurz innehalten und 30 Sekunden "
                "ruhig atmen?"
            ),
            font=ctk.CTkFont(size=12),
            text_color=TEXT_PRIMARY,
            justify="center",
            wraplength=360,
        ).pack(padx=25, pady=(5, 20))

        def begin_breathing():
            breathe_button.configure(
                text="Atme ruhig ... noch 30 Sekunden",
                state="disabled",
            )
            win.after(30000, close_warning)

        breathe_button = ctk.CTkButton(
            win,
            text="30 Sekunden durchatmen",
            fg_color=ACCENT_ORANGE,
            hover_color="#E68900",
            height=38,
            command=begin_breathing,
        )
        breathe_button.pack(padx=30, fill="x")
    def show_relapse_rescue_dialog(self, trigger_word):
        if self.rescue_dialog_active:
            return
        self.rescue_dialog_active = True
        data = self.stats_manager.get_rescue_motivation_data()

        rescue_win = ctk.CTkToplevel(self)
        rescue_win.title("🔥 Reşo : Comeback & Motivations-Rescue")
        rescue_win.geometry("540x650")
        rescue_win.resizable(False, False)
        rescue_win.attributes("-topmost", True)
        rescue_win.grab_set()
        rescue_win.configure(fg_color=BG_DARK)
        rescue_win.protocol(
            "WM_DELETE_WINDOW",
            lambda: close_rescue(),
        )

        scroll = ctk.CTkScrollableFrame(
            rescue_win,
            width=500,
            height=600,
            fg_color="transparent",
        )
        scroll.pack(fill="both", expand=True, padx=20, pady=20)

        ctk.CTkLabel(
            scroll,
            text="🛡️ DEIN COMEBACK-MOMENT",
            font=ctk.CTkFont(size=22, weight="bold"),
            text_color=ACCENT_ORANGE,
        ).pack(pady=(10, 2))
        ctk.CTkLabel(
            scroll,
            text=(
                "Ein starker Impuls ist ein Moment, keine Entscheidung. "
                "Du darfst innehalten und deinen nächsten Schritt wählen."
            ),
            font=ctk.CTkFont(size=12),
            text_color=TEXT_SECONDARY,
            justify="center",
            wraplength=460,
        ).pack(pady=(0, 15))

        card_achieved = ctk.CTkFrame(
            scroll,
            fg_color=CARD_BG,
            corner_radius=12,
            border_color=ACCENT_GREEN,
            border_width=1,
        )
        card_achieved.pack(fill="x", padx=5, pady=8)
        ctk.CTkLabel(
            card_achieved,
            text="🏆 Das hast du bereits aufgebaut:",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=ACCENT_GREEN,
        ).pack(anchor="w", padx=20, pady=(15, 8))
        achieved_text = (
            f"🔥 Aktuelle Streak: {data['streak']} Tage\n"
            f"⏳ Gerettete Lebenszeit: {data['saved_hours']} Stunden\n"
            f"💶 Gesamtersparnis & Wert: "
            f"{self._format_euro(data['saved_money'])}\n"
            f"🎖️ Erreichter Rang: {data['level']}"
        )
        ctk.CTkLabel(
            card_achieved,
            text=achieved_text,
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color=TEXT_PRIMARY,
            justify="left",
        ).pack(anchor="w", padx=20, pady=(0, 15))

        card_future = ctk.CTkFrame(
            scroll,
            fg_color=CARD_BG,
            corner_radius=12,
            border_color="#591A1A",
            border_width=1,
        )
        card_future.pack(fill="x", padx=5, pady=8)
        ctk.CTkLabel(
            card_future,
            text="⚖️ Zwei mögliche nächste Schritte:",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=ACCENT_RED,
        ).pack(anchor="w", padx=20, pady=(15, 8))

        divergence_text = (
            "🟢 PFAD A — Jetzt innehalten:\n"
            "Unterbrich den Autopiloten, atme kurz durch und nutze den Moment, "
            "um herauszufinden, was du gerade brauchst. Ein kleiner bewusster "
            "Schritt kann dir helfen, bei deinem Ziel zu bleiben.\n\n"
            "🟠 PFAD B — Dem Impuls folgen:\n"
            "Das kann sich kurzfristig erleichternd anfühlen, aber auch von "
            "dem abbringen, was dir wichtig ist. Es macht deine bisherigen "
            "Fortschritte nicht ungeschehen: Du kannst jederzeit neu ansetzen."
        )
        ctk.CTkLabel(
            card_future,
            text=divergence_text,
            font=ctk.CTkFont(size=11),
            text_color=TEXT_SECONDARY,
            justify="left",
            wraplength=440,
        ).pack(anchor="w", padx=20, pady=(0, 15))

        def close_rescue():
            if rescue_win.winfo_exists():
                rescue_win.grab_release()
                rescue_win.destroy()
            self.rescue_dialog_active = False

        def choose_path_a():
            close_rescue()
            self.after(100, lambda: self.show_reframing_dialog(trigger_word))

        ctk.CTkButton(
            scroll,
            text="Ich wähle Pfad A — innehalten und weitergehen",
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color=ACCENT_GREEN,
            hover_color="#1B5E20",
            height=45,
            corner_radius=10,
            command=choose_path_a,
        ).pack(fill="x", padx=5, pady=20)
    def show_constructive_reflection_dialog(self):
        dialog = ctk.CTkToplevel(self)
        dialog.title("🌱 Konstruktive Lernreflexion")
        dialog.geometry("440x380")
        dialog.resizable(False, False)
        dialog.attributes("-topmost", True)
        dialog.grab_set()
        dialog.configure(fg_color=BG_DARK)

        ctk.CTkLabel(
            dialog,
            text="Ein Rückschlag ist Datenmaterial, kein Urteil.",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color=ACCENT_ORANGE,
            wraplength=390,
        ).pack(pady=(20, 5))
        ctk.CTkLabel(
            dialog,
            text="Was war der Auslöser – und was könnte dir beim nächsten Mal helfen?",
            font=ctk.CTkFont(size=11),
            text_color=TEXT_SECONDARY,
            wraplength=390,
            justify="center",
        ).pack(pady=(0, 18))

        ctk.CTkLabel(
            dialog,
            text="Was war die Situation oder der Auslöser?",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=TEXT_PRIMARY,
        ).pack(anchor="w", padx=25)
        entry_cause = ctk.CTkEntry(
            dialog,
            placeholder_text="z. B. Übermüdung oder Stress",
            width=390,
        )
        entry_cause.pack(padx=25, pady=(5, 15))

        ctk.CTkLabel(
            dialog,
            text="Was möchtest du beim nächsten Mal anders machen?",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=TEXT_PRIMARY,
        ).pack(anchor="w", padx=25)
        entry_action = ctk.CTkEntry(
            dialog,
            placeholder_text="z. B. Das Handy abends außer Reichweite legen",
            width=390,
        )
        entry_action.pack(padx=25, pady=(5, 15))

        def submit_reflection():
            cause = entry_cause.get().strip()
            action = entry_action.get().strip()
            if not cause or not action:
                from tkinter import messagebox

                messagebox.showerror(
                    "Lernreflexion",
                    "Bitte fülle beide Felder aus oder schließe das Fenster.",
                    parent=dialog,
                )
                return
            try:
                self.stats_manager.save_relapse_reflection(cause, action)
            except (OSError, ValueError) as error:
                from tkinter import messagebox

                messagebox.showerror(
                    "Lernreflexion",
                    f"Reflexion konnte nicht gespeichert werden: {error}",
                    parent=dialog,
                )
                return
            dialog.destroy()

        ctk.CTkButton(
            dialog,
            text="Reflexion speichern",
            fg_color=ACCENT_GREEN,
            hover_color="#1B5E20",
            height=38,
            command=submit_reflection,
        ).pack(pady=(5, 15), padx=25, fill="x")
    def _close_reframing_dialog(self, dialog):
        self.reframing_dialog_active = False
        dialog.destroy()