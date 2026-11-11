from .shared import *


class SupportChatWindow(ctk.CTkToplevel):
    MAX_MESSAGE_LENGTH = 1000
    MAX_IMAGE_SIZE = 500 * 1024
    QUICK_STICKERS = ("💪 Weiter so!", "🫂 Du schaffst das", "🎯 Zurück zum Fokus")

    def __init__(self, master, server_url, role="seeker", on_close=None, stats_manager=None):
        super().__init__(master)
        self.title("🤝 Reşo : Anonymer Community-Support")
        self.geometry("520x760")
        self.minsize(440, 620)
        self.resizable(True, True)
        self.attributes("-topmost", True)
        self.configure(fg_color=BG_DARK)
        self.role = role
        self.stats_manager = stats_manager
        self.server_url = server_url
        self.on_close_callback = on_close
        self.closed = False
        self.ws_app = None
        self.events = queue.Queue()
        self.chat_images = []
        self.chat_crypto = None

        self.lbl_status = ctk.CTkLabel(
            self,
            text="Noch nicht verbunden",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=ACCENT_ORANGE,
        )
        self.lbl_status.pack(pady=(15, 5))
        ctk.CTkLabel(
            self,
            text=(
                "Es werden keine Namen oder Kontodaten an den Chatpartner gesendet. "
                "Beim Verbinden werden dein Rang und deine Streak als Profil geteilt. "
                "Profil, Nachrichten, Sticker und PNG/JPEG-Bilder (max. 500 KB) "
                "werden Ende-zu-Ende verschlüsselt; der Chatserver kann die Inhalte "
                "nicht lesen. Vergleicht den Sicherheits-Fingerabdruck über einen "
                "anderen Kanal, um einen manipulierten Schlüsselaustausch zu erkennen. "
                "Gesprächspartner sind nicht verifiziert; der Serverbetreiber kann "
                "Verbindungsmetadaten sehen. Teile keine persönlichen Angaben. "
                "Kein Krisen- oder professioneller Beratungsdienst."
            ),
            font=ctk.CTkFont(size=12),
            text_color=TEXT_SECONDARY,
            wraplength=470,
            justify="center",
        ).pack(padx=20, pady=(0, 10))
        self.chat_box = ctk.CTkTextbox(
            self,
            height=320,
            fg_color=CARD_BG,
            text_color=TEXT_PRIMARY,
            font=ctk.CTkFont(size=12),
            wrap="word",
        )
        self.chat_box.pack(fill="both", expand=True, padx=20, pady=8)
        self.chat_box.configure(state="disabled")
        ctk.CTkLabel(
            self,
            text="Nachrichten werden nicht in der App gespeichert.",
            font=ctk.CTkFont(size=12),
            text_color=TEXT_SECONDARY,
        ).pack()

        self.btn_connect = ctk.CTkButton(
            self,
            text="Anonym beitreten",
            fg_color=ACCENT_GREEN,
            hover_color="#1B5E20",
            command=self.connect_to_chat,
        )
        self.btn_connect.pack(fill="x", padx=20, pady=(10, 5))

        input_frame = ctk.CTkFrame(self, fg_color="transparent")
        input_frame.pack(fill="x", padx=20, pady=(5, 5))
        emoji_frame = ctk.CTkFrame(self, fg_color="transparent")
        emoji_frame.pack(fill="x", padx=20, pady=(0, 5))
        for emoji in ("😊", "💪", "❤️", "🙏", "🎯"):
            ctk.CTkButton(
                emoji_frame,
                text=emoji,
                width=42,
                height=30,
                fg_color=CARD_BG,
                hover_color=CARD_BORDER,
                command=lambda value=emoji: self.insert_emoji(value),
            ).pack(side="left", padx=(0, 5))
        self.btn_image = ctk.CTkButton(
            emoji_frame,
            text="Bild senden",
            width=100,
            height=30,
            fg_color=CARD_BG,
            hover_color=CARD_BORDER,
            command=self.select_image,
            state="disabled",
        )
        self.btn_image.pack(side="right")

        sticker_frame = ctk.CTkFrame(self, fg_color="transparent")
        sticker_frame.pack(fill="x", padx=20, pady=(0, 5))
        for sticker in self.QUICK_STICKERS:
            ctk.CTkButton(
                sticker_frame,
                text=sticker,
                height=28,
                fg_color=CARD_BG,
                hover_color=CARD_BORDER,
                command=lambda value=sticker: self.send_sticker(value),
                state="disabled",
            ).pack(side="left", padx=(0, 5))
        self.sticker_buttons = sticker_frame.winfo_children()
        self.entry_msg = ctk.CTkEntry(
            input_frame,
            placeholder_text="Nachricht (max. 1000 Zeichen)",
            height=38,
            state="disabled",
        )
        self.entry_msg.pack(side="left", fill="x", expand=True, padx=(0, 8))
        self.entry_msg.bind("<Return>", lambda _event: self.send_message())
        self.btn_send = ctk.CTkButton(
            input_frame,
            text="Senden",
            fg_color=ACCENT_GREEN,
            hover_color="#1B5E20",
            width=90,
            height=38,
            command=self.send_message,
            state="disabled",
        )
        self.btn_send.pack(side="left")
        ctk.CTkButton(
            self,
            text="Chat verlassen",
            fg_color=CARD_BORDER,
            hover_color="#3A3A46",
            command=self.destroy,
        ).pack(fill="x", padx=20, pady=(5, 12))

        self.protocol("WM_DELETE_WINDOW", self.destroy)
        self.after(100, self._poll_events)

    def connect_to_chat(self):
        if self.ws_app is not None:
            return
        self.chat_crypto = EncryptedChatSession()
        self._set_chat_controls_enabled(False)
        self.btn_connect.configure(state="disabled", text="Verbindung wird aufgebaut ...")
        threading.Thread(target=self._run_websocket, daemon=True).start()

    def _run_websocket(self):
        try:
            def on_message(_ws, raw_message):
                try:
                    packet = json.loads(raw_message)
                except (TypeError, ValueError):
                    self.events.put(("error", "Ungültige Servernachricht erhalten."))
                    return
                if isinstance(packet, dict):
                    self.events.put(("packet", packet))

            def on_error(_ws, _error):
                self.events.put(("error", "Verbindung zum Community-Chat fehlgeschlagen."))

            def on_close(_ws, _status, _message):
                self.events.put(("closed", None))

            ws_app = websocket.WebSocketApp(
                self.server_url,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close,
            )
            self.ws_app = ws_app
            ws_app.run_forever(
                suppress_origin=True,
                ping_interval=25,
                ping_timeout=10,
            )
        except (websocket.WebSocketException, OSError, RuntimeError, ValueError) as error:
            self.events.put(
                (
                    "error",
                    f"Verbindung zum Community-Chat fehlgeschlagen ({type(error).__name__}).",
                )
            )

    def _poll_events(self):
        if self.closed:
            return
        while True:
            try:
                event, payload = self.events.get_nowait()
            except queue.Empty:
                break
            if event == "packet":
                self._handle_packet(payload)
            elif event == "error":
                self.ws_app = None
                self.lbl_status.configure(text=payload, text_color=ACCENT_RED)
                self.btn_connect.configure(state="normal", text="Erneut versuchen")
            elif event == "closed":
                self.ws_app = None
                self.chat_crypto = None
                self.lbl_status.configure(
                    text="Verbindung beendet",
                    text_color=TEXT_SECONDARY,
                )
                self._set_chat_controls_enabled(False)
                self.btn_connect.configure(state="normal", text="Erneut versuchen")
        self.after(100, self._poll_events)

    def _handle_packet(self, packet):
        packet_type = packet.get("type")
        if packet_type == "waiting":
            self.lbl_status.configure(
                text="Suche anonymen Gesprächspartner ...",
                text_color=ACCENT_ORANGE,
            )
        elif packet_type == "connected":
            self.lbl_status.configure(
                text="Partner gefunden · Verschlüsselung wird aufgebaut ...",
                text_color=ACCENT_ORANGE,
            )
            self._set_chat_controls_enabled(False)
            self.log_system("Partner gefunden. Der sichere Kanal wird eingerichtet.")
            if self.chat_crypto is None:
                self.chat_crypto = EncryptedChatSession()
            self.send_packet(
                {"type": "key_exchange", "public_key": self.chat_crypto.public_key}
            )
        elif packet_type == "key_exchange":
            if (
                self.chat_crypto is None
                or packet.get("role") not in {"seeker", "helper"}
                or packet.get("role") == self.role
            ):
                self._reject_chat_key()
                return
            try:
                fingerprint = self.chat_crypto.establish(packet.get("public_key"))
            except ValueError:
                self._reject_chat_key()
                return
            self.lbl_status.configure(
                text="Ende-zu-Ende verschlüsselt · Fingerprint vergleichen",
                text_color=ACCENT_GREEN,
            )
            self.log_system(
                "Ende-zu-Ende-Verschlüsselung aktiv. Sicherheits-Fingerprint: "
                f"{fingerprint}. Vergleicht ihn über einen anderen Kanal."
            )
            self._set_chat_controls_enabled(True)
            self.send_user_info()
        elif packet_type == "secure_message":
            if (
                self.chat_crypto is None
                or not self.chat_crypto.is_ready
                or packet.get("role") not in {"seeker", "helper"}
                or packet.get("role") == self.role
            ):
                self._reject_chat_key()
                return
            try:
                content = self.chat_crypto.decrypt(packet.get("envelope"))
            except ValueError:
                self.log_system(
                    "Eine Nachricht konnte nicht authentifiziert werden; "
                    "der sichere Chat wird beendet."
                )
                if self.ws_app is not None:
                    self.ws_app.close()
                return
            if content.get("type") not in {
                "user_info",
                "message",
                "sticker",
                "image",
            }:
                self.log_system("Ein ungültiger verschlüsselter Inhalt wurde ignoriert.")
                return
            content["role"] = packet.get("role")
            self._handle_chat_content(content)
        elif packet_type in {"user_info", "message", "sticker", "image"}:
            self.log_system(
                "Unverschlüsselte Chat-Inhalte wurden abgewiesen. "
                "Bitte aktualisiere die Chat-App."
            )
            if self.ws_app is not None:
                self.ws_app.close()
        else:
            self._handle_chat_content(packet)

    def _handle_chat_content(self, packet):
        packet_type = packet.get("type")
        if packet_type == "user_info":
            username = packet.get("username", "Community-Mitglied")
            rank = packet.get("rank", "Rang unbekannt")
            streak = packet.get("streak", 0)
            if (
                not isinstance(username, str)
                or not isinstance(rank, str)
                or len(username) > 40
                or len(rank) > 80
                or not username.isprintable()
                or not rank.isprintable()
                or not isinstance(streak, int)
                or isinstance(streak, bool)
                or not 0 <= streak <= 100000
            ):
                self.log_system("Ein ungültiges Profil wurde ignoriert.")
                return
            self.log_system(
                f"Profil (freiwillige Selbstauskunft): {username} · {rank} · {streak} Tage Streak"
            )
        elif packet_type == "message":
            text = packet.get("text")
            if (
                isinstance(text, str)
                and len(text) <= self.MAX_MESSAGE_LENGTH
                and text.isprintable()
            ):
                self.log_chat(self._sender_label(packet), text)
        elif packet_type == "sticker":
            text = packet.get("text")
            if (
                isinstance(text, str)
                and len(text) <= self.MAX_MESSAGE_LENGTH
                and text.isprintable()
            ):
                self.log_chat(f"{self._sender_label(packet)} · Sticker", text)
        elif packet_type == "image":
            self._show_received_image(packet)
        elif packet_type == "disconnected":
            self.lbl_status.configure(text="Partner hat den Chat verlassen.", text_color=ACCENT_RED)
            self.log_system("Die andere Person hat den Chat verlassen.")
            self.chat_crypto = None
            self._set_chat_controls_enabled(False)
        elif packet_type == "error":
            self.lbl_status.configure(
                text=str(packet.get("message", "Chatfehler.")),
                text_color=ACCENT_RED,
            )

    def _set_chat_controls_enabled(self, enabled):
        state = "normal" if enabled else "disabled"
        for widget in (self.entry_msg, self.btn_send, self.btn_image):
            widget.configure(state=state)
        for button in self.sticker_buttons:
            button.configure(state=state)

    def _reject_chat_key(self):
        self.lbl_status.configure(
            text="Verschlüsselung fehlgeschlagen · Verbindung wird beendet",
            text_color=ACCENT_RED,
        )
        self._set_chat_controls_enabled(False)
        if self.ws_app is not None:
            self.ws_app.close()

    def log_system(self, text):
        self._append_chat(f"[System]: {text}")

    def log_chat(self, sender, text):
        self._append_chat(f"{sender}: {text}")

    def _append_chat(self, text):
        self.chat_box.configure(state="normal")
        self.chat_box.insert("end", f"{text}\n")
        self.chat_box.see("end")
        self.chat_box.configure(state="disabled")

    def _sender_label(self, packet):
        return "Du" if packet.get("role") == self.role else "Partner"

    def send_packet(self, packet):
        if not self.ws_app:
            return False
        if packet.get("type") == "key_exchange":
            outgoing = packet
        elif self.chat_crypto is not None and self.chat_crypto.is_ready:
            try:
                outgoing = {
                    "type": "secure_message",
                    "envelope": self.chat_crypto.encrypt(packet),
                }
            except (TypeError, ValueError, RuntimeError) as error:
                self.lbl_status.configure(
                    text=f"Nachricht konnte nicht verschlüsselt werden ({type(error).__name__}).",
                    text_color=ACCENT_RED,
                )
                return False
        else:
            self.lbl_status.configure(
                text="Sicherer Chatkanal wird noch aufgebaut.",
                text_color=ACCENT_ORANGE,
            )
            return False
        try:
            self.ws_app.send(json.dumps(outgoing))
        except (websocket.WebSocketException, OSError, RuntimeError, ValueError) as error:
            self.lbl_status.configure(
                text=f"Nachricht konnte nicht gesendet werden ({type(error).__name__}).",
                text_color=ACCENT_RED,
            )
            return False
        return True

    def send_user_info(self):
        if not self.stats_manager:
            return
        profile = self.stats_manager.get_user_rank_and_badges()
        self.send_packet(
            {
                "type": "user_info",
                "username": "Disziplin-Partner",
                "rank": profile["rank"],
                "streak": profile["streak"],
            }
        )

    def insert_emoji(self, emoji):
        self.entry_msg.insert("end", emoji)
        self.entry_msg.focus_set()

    def send_sticker(self, sticker):
        if self.send_packet({"type": "sticker", "text": sticker}):
            self.log_chat("Du · Sticker", sticker)

    def select_image(self):
        path = filedialog.askopenfilename(
            parent=self,
            title="Bild für den Community-Chat auswählen",
            filetypes=(("PNG- und JPEG-Bilder", "*.png *.jpg *.jpeg"),),
        )
        if not path:
            return
        try:
            with Image.open(path) as image:
                image_format = image.format
                if image.width * image.height > 16_000_000:
                    raise ValueError("Das Bild darf höchstens 16 Megapixel haben.")
                image.verify()
            with open(path, "rb") as image_file:
                image_bytes = image_file.read(self.MAX_IMAGE_SIZE + 1)
            if len(image_bytes) > self.MAX_IMAGE_SIZE:
                raise ValueError("Das Bild darf höchstens 500 KB groß sein.")
            content_type = {"PNG": "image/png", "JPEG": "image/jpeg"}.get(image_format)
            if content_type is None:
                raise ValueError("Nur PNG- und JPEG-Bilder werden unterstützt.")
        except (OSError, ValueError) as error:
            self.lbl_status.configure(text=f"Bild konnte nicht geladen werden: {error}", text_color=ACCENT_RED)
            return
        packet = {
            "type": "image",
            "content_type": content_type,
            "image_data": base64.b64encode(image_bytes).decode("ascii"),
        }
        if self.send_packet(packet):
            self.log_system("Du hast ein Bild gesendet.")

    def _show_received_image(self, packet):
        image_data = packet.get("image_data")
        content_type = packet.get("content_type")
        if not isinstance(image_data, str) or content_type not in {"image/png", "image/jpeg"}:
            self.log_system("Ein ungültiges Bild wurde nicht angezeigt.")
            return
        max_encoded_size = ((self.MAX_IMAGE_SIZE + 2) // 3) * 4
        if len(image_data) > max_encoded_size:
            self.log_system("Ein zu großes Bild wurde nicht angezeigt.")
            return
        try:
            image_bytes = base64.b64decode(image_data, validate=True)
            if len(image_bytes) > self.MAX_IMAGE_SIZE:
                raise ValueError("Bild überschreitet das Größenlimit.")
            with Image.open(io.BytesIO(image_bytes)) as image:
                expected_format = "PNG" if content_type == "image/png" else "JPEG"
                if image.format != expected_format:
                    raise ValueError("Bildformat stimmt nicht mit dem Inhaltstyp überein.")
                if image.width * image.height > 16_000_000:
                    raise ValueError("Bild überschreitet das Pixel-Limit.")
                image.thumbnail((360, 240))
                display_image = image.copy()
            photo = ImageTk.PhotoImage(display_image)
        except (OSError, ValueError, binascii.Error, Image.DecompressionBombError):
            self.log_system("Ein ungültiges Bild wurde nicht angezeigt.")
            return
        self.chat_box.configure(state="normal")
        self.chat_box.insert("end", f"{self._sender_label(packet)} hat ein Bild gesendet:\n")
        self.chat_box._textbox.image_create("end", image=photo)
        self.chat_box.insert("end", "\n")
        self.chat_box.see("end")
        self.chat_box.configure(state="disabled")
        self.chat_images.append(photo)

    def send_message(self):
        message = self.entry_msg.get().strip()
        if not message or len(message) > self.MAX_MESSAGE_LENGTH:
            if len(message) > self.MAX_MESSAGE_LENGTH:
                self.lbl_status.configure(
                    text="Nachrichtenlimit: maximal 1000 Zeichen.",
                    text_color=ACCENT_RED,
                )
            return
        if not self.send_packet({"type": "message", "text": message}):
            return
        self.log_chat("Du", message)
        self.entry_msg.delete(0, "end")

    def destroy(self):
        if self.closed:
            return
        self.closed = True
        if self.ws_app is not None:
            try:
                self.ws_app.close()
            except websocket.WebSocketException:
                pass
        super().destroy()
        if self.on_close_callback:
            callback, self.on_close_callback = self.on_close_callback, None
            callback()
