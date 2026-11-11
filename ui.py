import customtkinter as ctk
import pystray
from PIL import Image, ImageTk
import threading
import sys
import time
import math
import queue
import logging
from pathlib import Path
import base64
import binascii
import io
import json
from tkinter import filedialog
import websocket
from datetime import date, datetime, timedelta
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from pynput import keyboard
import importlib.util


def _load_local_module(module_name):
    try:
        module = __import__(module_name, fromlist=["*"])
        return module
    except ImportError:
        module_path = Path(__file__).resolve().parent / f"{module_name}.py"
        if not module_path.exists():
            raise

        spec = importlib.util.spec_from_file_location(module_name, module_path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Unable to load module '{module_name}' from '{module_path}'")

        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
        return module


FocusTimer = _load_local_module("timer").FocusTimer
BadBehaviorMonitor = _load_local_module("monitor").BadBehaviorMonitor
StatsManager = _load_local_module("stats").StatsManager
EncryptedChatSession = _load_local_module("chat_crypto").EncryptedChatSession
create_app_icon = _load_local_module("icon").create_app_icon
MotivationManager = _load_local_module("ai_motivator").MotivationManager
DiscordRPCManager = _load_local_module("discord_rpc").DiscordRPCManager
is_autostart_enabled = _load_local_module("autostart").is_autostart_enabled
setup_autostart = _load_local_module("autostart").setup_autostart
CommunityForum = _load_local_module("community_forum").CommunityForum
LocalWebApi = _load_local_module("web_api").LocalWebApi

# Design-Konfiguration
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme(str(Path(__file__).with_name("apple_dark.json")))
ctk.set_widget_scaling(1.2)

BG_DARK = "#111113"
CARD_BG = "#1C1C1E"
CARD_BORDER = "#38383A"
ACCENT_RED = "#FF453A"
ACCENT_GREEN = "#30D158"
ACCENT_ORANGE = "#FF9F0A"
ACCENT_BLUE = "#0A84FF"
TEXT_PRIMARY = "#F5F5F7"
TEXT_SECONDARY = "#A1A1A6"

plt.rcParams.update(
    {
        "font.family": "sans-serif",
        "font.sans-serif": ["Segoe UI", "Arial", "DejaVu Sans"],
        "text.color": TEXT_SECONDARY,
        "axes.labelcolor": TEXT_SECONDARY,
        "xtick.color": TEXT_SECONDARY,
        "ytick.color": TEXT_SECONDARY,
    }
)


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


class ResoApp(ctk.CTk):
    def __init__(self, start_hidden=False):
        super().__init__()

        self.title("Reşo : You vs You")
        self.geometry("1120x900")
        self.minsize(960, 760)
        self.resizable(True, True)
        self.configure(fg_color=BG_DARK)
        self.start_hidden = start_hidden
        if start_hidden:
            self.withdraw()

        # Icon oben links & Taskleiste
        self.pil_icon = create_app_icon()
        self.tk_icon = ImageTk.PhotoImage(self.pil_icon)
        self.wm_iconphoto(True, self.tk_icon)

        self.stats_manager = StatsManager()
        self.motivation_manager = MotivationManager(self.stats_manager)
        self.discord_rpc = DiscordRPCManager()

        self.lockout_end_time = 0
        self.pin_unlocked = False
        self.pending_deletions = {}
        self.hotkey_listener = None
        self.reframing_dialog_active = False
        self.rescue_dialog_active = False
        self.shadow_letter_dialog_active = False
        self.stress_dialog_active = False
        self.is_shutting_down = False
        self.shutdown_remaining_seconds = 0
        self.shutdown_deadline = 0.0
        self.shutdown_after_id = None
        self._home_flame_animation_id = None
        self._home_flame_animation_phase = 0
        self._home_clock_animation_id = None
        self._home_clock_animation_started_at = 0.0
        self._home_clock_progress_starts = {}
        self.ai_pauses_enabled = bool(
            self.stats_manager.get_stats().get("ai_pauses_enabled", False)
        )
        self.ai_pause_min = int(self.stats_manager.get_stats().get("ai_pause_min", 10))
        self.ai_pause_max = int(self.stats_manager.get_stats().get("ai_pause_max", 20))
        persisted_deadline = self.stats_manager.get_shutdown_deadline()
        if persisted_deadline is not None:
            remaining = persisted_deadline - time.time()
            if remaining > 0:
                self.is_shutting_down = True
                self.shutdown_deadline = time.monotonic() + remaining
                self.withdraw()
            else:
                self.stats_manager.set_shutdown_deadline(None)

        self.target_processes = ["chrome.exe", "msedge.exe", "firefox.exe", "discord.exe"]
        self.monitor = BadBehaviorMonitor(self.stats_manager, self.target_processes)
        self.whitelist_enabled = bool(
            self.stats_manager.get_stats().get("whitelist_mode_enabled", False)
        )

        self.focus_timer = FocusTimer(
            update_callback=self.update_timer_display,
            finish_callback=self.on_timer_finished
        )

        self.tray_icon = None
        self.setup_tray()

        self.create_widgets()
        self._apply_apple_widget_style()
        self.monitor.on_trigger_callback = self.handle_trigger_event
        self.monitor.on_stress_callback = self.handle_stress_event
        self.monitor.start_monitoring()
        self.update_stats_display()
        self.refresh_stoic_quote()
        self._streak_ticker_id = self.after(1000, self._live_ticker)
        self._home_flame_animation_id = self.after(250, self._animate_home_flame)
        if self.is_shutting_down:
            self.after(0, self._show_home_hub)
            self.after(0, self._run_shutdown_countdown)
        if not self.start_hidden and not self.is_shutting_down:
            self.after(800, self.show_startup_prompts)
        self.refresh_community_stats()
        self.refresh_community_leaderboard()
        if (
            self.stats_manager.get_stats().get("account_id")
            and self.stats_manager.get_stats().get("cloud_backup_initialized")
        ):
            self.after(100, self.sync_cloud_on_startup)

        # Globaler Hotkey für den Panic-Button starten
        self.setup_panic_hotkey_listener()
        self._web_api_requests = queue.Queue()
        self.web_api = None
        if "--web-api" in sys.argv:
            self.web_api = LocalWebApi(self._queue_web_api_request)
            self.after(25, self._poll_web_api_requests)

        self.protocol("WM_DELETE_WINDOW", self.hide_to_tray)

    def _queue_web_api_request(self, method, path, body, response, result):
        if method == "GET" and path == "/api/community":
            threading.Thread(
                target=self._load_web_community,
                args=(response, result),
                daemon=True,
            ).start()
            return
        self._web_api_requests.put((method, path, body, response, result))

    def _load_web_community(self, response, result):
        try:
            result["status"] = 200
            result["body"] = {
                "stats": self.stats_manager.get_community_stats(),
                "leaderboard": self.stats_manager.get_community_leaderboard(),
            }
        except Exception:
            logging.exception("Community-Daten konnten nicht geladen werden.")
            result["status"] = 500
            result["body"] = {"error": "Community-Daten konnten nicht geladen werden."}
        finally:
            response.set()

    def _poll_web_api_requests(self):
        while True:
            try:
                method, path, body, response, result = self._web_api_requests.get_nowait()
            except queue.Empty:
                break
            try:
                result["status"], result["body"] = self._handle_web_api_request(
                    method,
                    path,
                    body,
                )
            except (TypeError, ValueError, KeyError) as error:
                result["status"] = 400
                result["body"] = {"error": str(error)}
            except Exception:
                logging.exception("Lokale Web-Anfrage konnte nicht verarbeitet werden.")
                result["status"] = 500
                result["body"] = {"error": "Die Anfrage konnte nicht verarbeitet werden."}
            finally:
                response.set()
        if self.web_api is not None:
            self.after(25, self._poll_web_api_requests)

    def _handle_web_api_request(self, method, path, body):
        if method == "GET" and path == "/api/dashboard":
            data = self.stats_manager.get_stats()
            saved_hours, saved_money = self.stats_manager.calculate_savings()
            goal = self.stats_manager.get_savings_progress()
            rank = self.stats_manager.get_user_rank_and_badges()
            opportunity = self.stats_manager.get_opportunity_equivalents()
            streak_time = self.stats_manager.get_detailed_streak_components()
            user_name = data.get("community_author_name", "")
            return 200, {
                "name": user_name if isinstance(user_name, str) else "",
                "rank": rank["rank"],
                "streak": rank["streak"],
                "longestStreak": rank["longest"],
                "streakTime": streak_time,
                "totalFocusMinutes": data.get("total_focus_minutes", 0),
                "habitsPrevented": data.get("habits_prevented", 0),
                "savedHours": saved_hours,
                "savedMoney": saved_money + rank["streak"] * data.get("daily_expense", 0),
                "savingsGoal": goal,
                "opportunity": opportunity,
                "quote": self.stats_manager.get_stoic_quote(),
                "timer": self._web_timer_state(),
                "badges": rank["badges"],
            }

        if method == "GET" and path == "/api/analytics":
            data = self.stats_manager.get_stats()
            return 200, {
                "dailyActivity": data.get("daily_activity", {}),
                "dailyIncidents": data.get("daily_incidents", {}),
                "triggerStats": data.get("trigger_stats", {}),
                "totalFocusMinutes": data.get("total_focus_minutes", 0),
                "habitsPrevented": data.get("habits_prevented", 0),
                "opportunity": self.stats_manager.get_opportunity_equivalents(),
                "savings": self.stats_manager.calculate_savings(),
            }

        if method == "GET" and path == "/api/settings":
            data = self.stats_manager.get_stats()
            goal = data.get("savings_goal", {})
            return 200, {
                "hourlyRate": self.stats_manager.get_hourly_rate(),
                "dailyExpense": data.get("daily_expense", 0.0),
                "defaultTimer": data.get("default_timer_mins", 25),
                "goalName": goal.get("name", "Traum-Erfüllung"),
                "goalAmount": goal.get("target_amount", 100.0),
                "triggerWords": self.stats_manager.get_trigger_words(),
                "stressDetection": bool(data.get("stress_detection_enabled", False)),
                "whitelistEnabled": self.whitelist_enabled,
            }

        if method == "GET" and path == "/api/community":
            return 200, {
                "stats": self.stats_manager.get_community_stats(),
                "leaderboard": self.stats_manager.get_community_leaderboard(),
            }

        if method == "POST" and path == "/api/app/show":
            self.show_from_tray()
            return 200, {"shown": True}

        if method == "POST" and path == "/api/app/quit":
            self.after(100, self.execute_final_quit)
            return 200, {"stopping": True}

        if method == "POST" and path == "/api/timer/start":
            minutes = body.get("minutes")
            if isinstance(minutes, bool) or not isinstance(minutes, int) or not 1 <= minutes <= 180:
                raise ValueError("Der Fokus-Timer muss zwischen 1 und 180 Minuten liegen.")
            if self.focus_timer.is_running:
                return 409, {"error": "Es läuft bereits ein Fokus-Timer."}
            self.time_slider.set(minutes)
            self.slider_val_label.configure(text=f"Dauer: {minutes} Minuten")
            self.start_timer_action(minutes)
            return 200, {"timer": self._web_timer_state()}

        if method == "POST" and path == "/api/timer/stop":
            self.focus_timer.stop()
            self.reset_timer_ui()
            return 200, {"timer": self._web_timer_state()}

        if method == "POST" and path == "/api/settings":
            self._save_web_settings(body)
            return 200, {"settings": self._web_settings_state()}

        return 404, {"error": "Unbekannter API-Endpunkt."}

    def _web_timer_state(self):
        return {
            "running": self.focus_timer.is_running,
            "remainingSeconds": max(0, int(self.focus_timer.remaining_seconds)),
            "durationMinutes": int(self.focus_timer.total_duration_minutes),
        }

    def _web_settings_state(self):
        data = self.stats_manager.get_stats()
        goal = data.get("savings_goal", {})
        return {
            "hourlyRate": self.stats_manager.get_hourly_rate(),
            "dailyExpense": data.get("daily_expense", 0.0),
            "defaultTimer": data.get("default_timer_mins", 25),
            "goalName": goal.get("name", "Traum-Erfüllung"),
            "goalAmount": goal.get("target_amount", 100.0),
            "triggerWords": self.stats_manager.get_trigger_words(),
            "stressDetection": bool(data.get("stress_detection_enabled", False)),
            "whitelistEnabled": self.whitelist_enabled,
        }

    def _save_web_settings(self, body):
        rate = (
            self._web_number(body["hourlyRate"], "Stundensatz", 0, 10000)
            if "hourlyRate" in body
            else None
        )
        expense = (
            self._web_number(body["dailyExpense"], "Tagesausgaben", 0, 1000000)
            if "dailyExpense" in body
            else None
        )
        minutes = body.get("defaultTimer")
        if minutes is not None and (
            isinstance(minutes, bool) or not isinstance(minutes, int) or not 1 <= minutes <= 180
        ):
            raise ValueError("Der Standard-Timer muss zwischen 1 und 180 Minuten liegen.")
        savings_goal = None
        if "savingsGoal" in body:
            goal = body["savingsGoal"]
            if not isinstance(goal, dict):
                raise ValueError("Das Sparziel hat ein ungültiges Format.")
            name = goal.get("name")
            if not isinstance(name, str):
                raise ValueError("Der Name des Sparziels muss Text sein.")
            amount = self._web_number(
                goal.get("amount"),
                "Sparziel",
                0.01,
                100000000,
            )
            savings_goal = (name, amount)
        cleaned_words = None
        if "triggerWords" in body:
            words = body["triggerWords"]
            if not isinstance(words, list) or not 1 <= len(words) <= 50:
                raise ValueError("Bitte gib 1 bis 50 Trigger-Wörter an.")
            cleaned_words = []
            for word in words:
                if not isinstance(word, str):
                    raise ValueError("Trigger-Wörter müssen Text sein.")
                word = word.strip().lower()
                if not 2 <= len(word) <= 40 or not word.isprintable():
                    raise ValueError("Trigger-Wörter müssen 2 bis 40 druckbare Zeichen enthalten.")
                if word not in cleaned_words:
                    cleaned_words.append(word)
        stress_detection = body.get("stressDetection")
        if "stressDetection" in body and not isinstance(stress_detection, bool):
            raise ValueError("Die Stress-Erkennung muss ein Wahr/Falsch-Wert sein.")

        if rate is not None:
            self.stats_manager.set_hourly_rate(rate)
        if expense is not None:
            self.stats_manager.data["daily_expense"] = expense
            self.stats_manager.save_data()
        if minutes is not None:
            self.stats_manager.data["default_timer_mins"] = minutes
            self.stats_manager.save_data()
            self.time_slider.set(minutes)
            self.slider_val_label.configure(text=f"Dauer: {minutes} Minuten")
            if not self.focus_timer.is_running:
                self.timer_label.configure(text=f"{minutes:02d}:00")
        if savings_goal is not None:
            self.stats_manager.set_savings_goal(*savings_goal)
        if cleaned_words is not None:
            self.stats_manager.save_trigger_words(cleaned_words)
            self.monitor.update_trigger_words(cleaned_words)
        if stress_detection is not None:
            self.stats_manager.data["stress_detection_enabled"] = stress_detection
            self.stats_manager.save_data()
            self.monitor.set_stress_detection(stress_detection)
        self.update_stats_display()

    @staticmethod
    def _web_number(value, label, minimum, maximum):
        if isinstance(value, bool):
            raise ValueError(f"{label} muss eine gültige Zahl sein.")
        try:
            number = float(value)
        except (TypeError, ValueError) as error:
            raise ValueError(f"{label} muss eine gültige Zahl sein.") from error
        if not math.isfinite(number) or not minimum <= number <= maximum:
            raise ValueError(f"{label} muss zwischen {minimum} und {maximum} liegen.")
        return number

    def setup_tray(self):
        menu = pystray.Menu(
            pystray.MenuItem("Reşo öffnen", self.show_from_tray, default=True),
            pystray.MenuItem("25 Min. Fokus Quick-Start", lambda: self.start_timer_action(25)),
            pystray.MenuItem("Beenden (30 Min. Wartezeit)", self.quit_app),
        )
        self.tray_icon = pystray.Icon("ResoApp", self.pil_icon, "Reşo : You vs You", menu)
        threading.Thread(target=self.tray_icon.run, daemon=True).start()

    def hide_to_tray(self):
        self.withdraw()

    def _begin_shutdown_countdown(self):
        if self.is_shutting_down:
            self._show_home_hub()
            return

        self.is_shutting_down = True
        self.shutdown_deadline = time.monotonic() + 30 * 60
        self.stats_manager.set_shutdown_deadline(time.time() + 30 * 60)
        self._show_home_hub()
        self._run_shutdown_countdown()

    def quit_app(self, icon=None, item=None):
        self.after(0, self._begin_shutdown_countdown)

    def _run_shutdown_countdown(self):
        if not self.is_shutting_down:
            return
        self.shutdown_remaining_seconds = max(
            0,
            int(self.shutdown_deadline - time.monotonic()),
        )
        if self.tray_icon is not None:
            minutes, seconds = divmod(self.shutdown_remaining_seconds, 60)
            self.tray_icon.title = (
                f"Reşo — Beenden in {minutes:02d}:{seconds:02d}"
            )
        self._update_shutdown_status()
        if self.shutdown_remaining_seconds == 0:
            self.execute_final_quit()
            return
        self.shutdown_after_id = self.after(1000, self._run_shutdown_countdown)

    def _update_shutdown_status(self):
        if not hasattr(self, "shutdown_status_frame"):
            return
        if not self.is_shutting_down:
            self.shutdown_status_frame.pack_forget()
            return
        minutes, seconds = divmod(self.shutdown_remaining_seconds, 60)
        self.shutdown_status_label.configure(
            text=f"Das Programm wird in {minutes:02d}:{seconds:02d} beendet."
        )
        if not self.shutdown_status_frame.winfo_manager():
            self.shutdown_status_frame.pack(
                fill="x",
                padx=10,
                pady=(0, 8),
                before=self.home_metrics_frame,
            )

    def cancel_shutdown_countdown(self):
        if not self.is_shutting_down:
            return
        if self.shutdown_after_id is not None:
            self.after_cancel(self.shutdown_after_id)
            self.shutdown_after_id = None
        self.is_shutting_down = False
        self.shutdown_deadline = 0.0
        self.shutdown_remaining_seconds = 0
        self.stats_manager.set_shutdown_deadline(None)
        if self.tray_icon is not None:
            self.tray_icon.title = "Reşo : You vs You"
        self._update_shutdown_status()

    def execute_final_quit(self):
        self.is_shutting_down = False
        self.shutdown_deadline = 0.0
        self.shutdown_after_id = None
        if self.web_api is not None:
            self.web_api.close()
            self.web_api = None
        self.stats_manager.set_shutdown_deadline(None)
        if self.tray_icon:
            self.tray_icon.stop()
        if self._streak_ticker_id is not None:
            self.after_cancel(self._streak_ticker_id)
            self._streak_ticker_id = None
        for callback_id in (
            self._home_flame_animation_id,
            self._home_clock_animation_id,
        ):
            if callback_id is not None:
                self.after_cancel(callback_id)
        self._home_flame_animation_id = None
        self._home_clock_animation_id = None
        self.motivation_manager.stop_scheduler()
        self.discord_rpc.close()
        self.monitor.stop_whitelist_enforcement()
        self.monitor.stop_monitoring()
        if self.hotkey_listener is not None:
            self.hotkey_listener.stop()
            self.hotkey_listener = None
        self.focus_timer.stop()
        self.monitor.notify_app_closing()
        self.quit()
        self.destroy()

    def show_from_tray(self, icon=None, item=None):
        self.after(0, self._show_home_hub)
        if self.is_shutting_down:
            return
        if not self.stats_manager.get_stats().get("codex_completed", False):
            self.after(200, self.show_startup_prompts)
        else:
            self.after(200, self.check_sunday_report_popup)

    def _show_home_hub(self):
        self.deiconify()
        self.lift()
        self.focus_force()
        self.tabview.set("🏠 Home")
        self._update_shutdown_status()

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

        self.community_forum = CommunityForum(
            self.tab_community,
            stats_manager=self.stats_manager,
        )
        self.community_forum.pack(fill="both", expand=True, padx=5, pady=5)

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

        # --- TAB 4: EINSTELLUNGEN & SPERR-REGELN ---
        self.setup_settings_tab()

    def setup_settings_tab(self):
        for widget in self.tab_settings.winfo_children():
            widget.destroy()

        stored_pin = self.stats_manager.get_stats().get("pin_code", "")

        if stored_pin and not self.pin_unlocked:
            pin_frame = ctk.CTkFrame(self.tab_settings, fg_color=CARD_BG, corner_radius=15, border_color=CARD_BORDER, border_width=1)
            pin_frame.pack(expand=True, padx=40, pady=40)

            ctk.CTkLabel(pin_frame, text="🔒 PIN-Schutz Aktiviert", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=(25, 10))
            self.entry_pin_input = ctk.CTkEntry(pin_frame, show="*", width=160, justify="center", font=ctk.CTkFont(size=20), height=40)
            self.entry_pin_input.pack(pady=10)

            self.btn_unlock = ctk.CTkButton(pin_frame, text="Freischalten", fg_color=ACCENT_GREEN, hover_color="#1B5E20", height=38, width=140, command=self.unlock_settings)
            self.btn_unlock.pack(pady=20)
            
            if time.time() < self.lockout_end_time:
                self.entry_pin_input.configure(state="disabled", fg_color="#441111")
                self.btn_unlock.configure(state="disabled")
                self.run_cooldown_countdown()
        else:
            settings_scroll = ctk.CTkScrollableFrame(self.tab_settings, width=760, height=520, fg_color="transparent")
            settings_scroll.pack(fill="both", expand=True, padx=5, pady=5)

            # --- SEKTION 1: ALLGEMEIN & FINANZEN ---
            sec1 = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec1.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec1, text="💰 Finanzen & Wert-Einstellungen", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_BLUE).pack(anchor="w", padx=20, pady=(15, 10))

            f1 = ctk.CTkFrame(sec1, fg_color="transparent")
            f1.pack(fill="x", padx=20, pady=5)
            ctk.CTkLabel(f1, text="Dein Stundensatz (€):", width=180, anchor="w").pack(side="left")
            self.entry_rate = ctk.CTkEntry(f1, width=100)
            self.entry_rate.insert(0, str(self.stats_manager.get_hourly_rate()))
            self.entry_rate.pack(side="left", padx=10)

            f2 = ctk.CTkFrame(sec1, fg_color="transparent")
            f2.pack(fill="x", padx=20, pady=5)
            ctk.CTkLabel(f2, text="Geschätzte Ausgaben / Tag (€):", width=180, anchor="w").pack(side="left")
            self.entry_daily_expense = ctk.CTkEntry(f2, width=100)
            self.entry_daily_expense.insert(0, str(self.stats_manager.get_stats().get("daily_expense", 0.0)))
            self.entry_daily_expense.pack(side="left", padx=10)

            f3 = ctk.CTkFrame(sec1, fg_color="transparent")
            f3.pack(fill="x", padx=20, pady=5)
            ctk.CTkLabel(f3, text="Standard Fokus-Timer (Min):", width=180, anchor="w").pack(side="left")
            self.entry_default_timer = ctk.CTkEntry(f3, width=100)
            self.entry_default_timer.insert(0, str(self.stats_manager.get_stats().get("default_timer_mins", 25)))
            self.entry_default_timer.pack(side="left", padx=10)

            ctk.CTkButton(sec1, text="Werte speichern", fg_color=ACCENT_GREEN, hover_color="#1B5E20", height=32, command=self.save_general_settings).pack(anchor="e", padx=20, pady=15)

            # --- SEKTION 2: SECURITY & HOTKEY ---
            sec2 = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec2.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec2, text="🔒 Sicherheit & Hotkey", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_ORANGE).pack(anchor="w", padx=20, pady=(15, 10))

            f_pin = ctk.CTkFrame(sec2, fg_color="transparent")
            f_pin.pack(fill="x", padx=20, pady=5)
            self.entry_new_pin = ctk.CTkEntry(f_pin, placeholder_text="Neuer PIN (4 Ziffern)", width=180, show="*")
            self.entry_new_pin.pack(side="left", padx=(0, 10))
            ctk.CTkButton(f_pin, text="PIN Speichern", width=120, fg_color=ACCENT_BLUE, hover_color="#008B9B", command=self.save_new_pin).pack(side="left")

            f_hk = ctk.CTkFrame(sec2, fg_color="transparent")
            f_hk.pack(fill="x", padx=20, pady=5)
            self.entry_panic_hotkey = ctk.CTkEntry(f_hk, width=180, placeholder_text="<ctrl>+<alt>+x")
            self.entry_panic_hotkey.insert(0, self.stats_manager.get_stats().get("panic_hotkey", "<ctrl>+<alt>+x"))
            self.entry_panic_hotkey.pack(side="left", padx=(0, 10))
            ctk.CTkButton(f_hk, text="Panic-Hotkey speichern", width=150, fg_color=ACCENT_BLUE, hover_color="#008B9B", command=self.save_panic_hotkey).pack(side="left")

            sec_streak_time = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec_streak_time.pack(fill="x", padx=10, pady=8)
            ctk.CTkLabel(
                sec_streak_time,
                text="⏱️ Streak-Startzeitpunkt anpassen",
                font=ctk.CTkFont(size=14, weight="bold"),
                text_color=ACCENT_ORANGE,
            ).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(
                sec_streak_time,
                text="Startzeit bei Bedarf manuell korrigieren (JJJJ-MM-TT HH:MM:SS):",
                font=ctk.CTkFont(size=11),
                text_color=TEXT_SECONDARY,
            ).pack(anchor="w", padx=20, pady=(0, 10))
            f_streak_time = ctk.CTkFrame(sec_streak_time, fg_color="transparent")
            f_streak_time.pack(fill="x", padx=20, pady=(0, 15))

            current_start = self.stats_manager.get_stats().get("streak_start_iso", "")
            try:
                formatted_start = datetime.fromisoformat(current_start).strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
            except (TypeError, ValueError):
                formatted_start = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self.entry_streak_start = ctk.CTkEntry(
                f_streak_time,
                width=240,
                placeholder_text="JJJJ-MM-TT HH:MM:SS",
            )
            self.entry_streak_start.insert(0, formatted_start)
            self.entry_streak_start.pack(side="left", padx=(0, 10))
            ctk.CTkButton(
                f_streak_time,
                text="Zeitpunkt speichern",
                width=150,
                fg_color=ACCENT_GREEN,
                hover_color="#1B5E20",
                command=self.save_custom_streak_time,
            ).pack(side="left")

            # --- SEKTION: NOTFALL-PARTNER (WEBHOOK) ---
            sec_partner = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec_partner.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec_partner, text="🤝 Notfall-Partner (Accountability Partner)", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_GREEN).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(sec_partner, text="Trage hier einen Discord-Webhook ein. Bei einem Trigger-Vorfall wird\nautomatisch eine anonyme Warnung an deinen Partner gesendet.", font=ctk.CTkFont(size=11), text_color=TEXT_SECONDARY).pack(anchor="w", padx=20, pady=(0, 10))

            f_partner = ctk.CTkFrame(sec_partner, fg_color="transparent")
            f_partner.pack(fill="x", padx=20, pady=(0, 15))

            self.entry_webhook = ctk.CTkEntry(f_partner, placeholder_text="https://discord.com/api/webhooks/...", width=450)
            self.entry_webhook.insert(0, self.stats_manager.get_stats().get("webhook_url", ""))
            self.entry_webhook.pack(side="left", padx=(0, 10))

            ctk.CTkButton(f_partner, text="Speichern", width=100, fg_color=ACCENT_GREEN, hover_color="#1B5E20", command=self.save_webhook_url).pack(side="left")

            # --- SEKTION: SYSTEM & AUTOSTART ---
            sec_sys = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec_sys.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec_sys, text="💻 System & Autostart", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_BLUE).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(sec_sys, text="Lässt Reşo beim Hochfahren von Windows automatisch im System-Tray starten.", font=ctk.CTkFont(size=11), text_color=TEXT_SECONDARY).pack(anchor="w", padx=20, pady=(0, 10))

            f_sys = ctk.CTkFrame(sec_sys, fg_color="transparent")
            f_sys.pack(fill="x", padx=20, pady=(0, 15))

            self.autostart_enabled = is_autostart_enabled()
            self.autostart_switch = ctk.CTkSwitch(
                f_sys,
                text="Mit Windows starten (Silent Mode)",
                command=self.toggle_autostart,
            )
            self.autostart_switch.pack(anchor="w")
            if self.autostart_enabled:
                self.autostart_switch.select()
            if sys.platform != "win32":
                self.autostart_switch.configure(state="disabled")

            # --- SEKTION: WHITELIST-MODUS ---
            sec_wl = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec_wl.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec_wl, text="🛡️ Whitelist-Modus (Fokus-Schutz)", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_GREEN).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(
                sec_wl,
                text="Während des Fokus-Timers werden nur bekannte Ablenkungsprozesse "
                     "(Chrome, Edge, Firefox, Discord) geprüft. Andere Apps und "
                     "Systemprozesse bleiben unberührt.",
                font=ctk.CTkFont(size=11),
                text_color=TEXT_SECONDARY,
                wraplength=680,
                justify="left",
            ).pack(anchor="w", padx=20, pady=(0, 10))

            f_wl = ctk.CTkFrame(sec_wl, fg_color="transparent")
            f_wl.pack(fill="x", padx=20, pady=(0, 15))

            self.whitelist_switch = ctk.CTkSwitch(
                f_wl,
                text="Whitelist-Modus bei Fokus aktivieren",
                command=self.toggle_whitelist_preference,
            )
            self.whitelist_switch.pack(anchor="w", pady=(0, 10))
            if self.whitelist_enabled:
                self.whitelist_switch.select()

            self.entry_whitelisted_apps = ctk.CTkEntry(
                f_wl,
                placeholder_text="Freigegebene Namen, z. B. chrome.exe, discord.exe",
                width=500,
            )
            whitelisted_apps = self.stats_manager.get_stats().get(
                "whitelisted_apps",
                [
                    "code.exe",
                    "winword.exe",
                    "excel.exe",
                    "powerpnt.exe",
                    "python.exe",
                    "pycharm64.exe",
                    "notepad.exe",
                    "resoapp.exe",
                ],
            )
            self.entry_whitelisted_apps.insert(0, ", ".join(whitelisted_apps))
            self.entry_whitelisted_apps.pack(side="left", padx=(0, 10))
            ctk.CTkButton(
                f_wl,
                text="Apps speichern",
                width=120,
                fg_color=ACCENT_GREEN,
                hover_color="#1B5E20",
                command=self.save_whitelisted_apps,
            ).pack(side="left")

            sec_personal = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec_personal.pack(fill="x", padx=10, pady=8)
            ctk.CTkLabel(
                sec_personal,
                text="📜 Codex der Disziplin & Schatten-Brief",
                font=ctk.CTkFont(size=14, weight="bold"),
                text_color=ACCENT_BLUE,
            ).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(
                sec_personal,
                text=(
                    "Deine persönlichen Texte bleiben lokal auf diesem Gerät und "
                    "werden nicht in die Cloud synchronisiert."
                ),
                font=ctk.CTkFont(size=11),
                text_color=TEXT_SECONDARY,
                wraplength=680,
                justify="left",
            ).pack(anchor="w", padx=20, pady=(0, 10))
            codex_inputs = ctk.CTkFrame(sec_personal, fg_color="transparent")
            codex_inputs.pack(fill="x", padx=20, pady=(0, 15))

            current_codex = self.stats_manager.get_codex()
            ctk.CTkLabel(
                codex_inputs,
                text="Deine Identität:",
                font=ctk.CTkFont(size=11, weight="bold"),
            ).pack(anchor="w")
            self.entry_identity = ctk.CTkEntry(
                codex_inputs,
                placeholder_text="Wer möchtest du in starken Momenten sein?",
                width=500,
            )
            self.entry_identity.pack(anchor="w", pady=(3, 10))
            self.entry_identity.insert(0, current_codex["identity"])

            ctk.CTkLabel(
                codex_inputs,
                text="Deine selbst gewählten Grundregeln:",
                font=ctk.CTkFont(size=11, weight="bold"),
            ).pack(anchor="w")
            self.txt_codex_rules = ctk.CTkTextbox(
                codex_inputs,
                width=500,
                height=75,
            )
            self.txt_codex_rules.pack(anchor="w", pady=(3, 10))
            self.txt_codex_rules.insert("1.0", current_codex["rules"])

            ctk.CTkLabel(
                codex_inputs,
                text="Brief an dein Zukunfts-Ich:",
                font=ctk.CTkFont(size=11, weight="bold"),
            ).pack(anchor="w")
            self.txt_shadow_letter = ctk.CTkTextbox(
                codex_inputs,
                width=500,
                height=100,
            )
            self.txt_shadow_letter.pack(anchor="w", pady=(3, 10))
            self.txt_shadow_letter.insert(
                "1.0",
                self.stats_manager.get_shadow_letter(),
            )
            ctk.CTkButton(
                codex_inputs,
                text="Codex & Brief speichern",
                fg_color=ACCENT_GREEN,
                hover_color="#1B5E20",
                command=self.save_personal_manifest,
            ).pack(anchor="w", pady=(0, 12))

            self.stress_detection_switch = ctk.CTkSwitch(
                codex_inputs,
                text="Optionale Tipp-Rhythmus-Erinnerung aktivieren",
                command=self.toggle_stress_detection,
            )
            self.stress_detection_switch.pack(anchor="w", pady=(2, 3))
            if self.monitor.stress_detection_enabled:
                self.stress_detection_switch.select()
            ctk.CTkLabel(
                codex_inputs,
                text=(
                    "Aus Datenschutzgründen standardmäßig aus. Bei Aktivierung "
                    "werden nur Zeitabstände ausgewertet, keine Tasteninhalte "
                    "gespeichert. Das ist eine grobe Tipp-Rhythmus-Heuristik, "
                    "keine medizinische Stress- oder Biofeedback-Messung."
                ),
                font=ctk.CTkFont(size=10),
                text_color=TEXT_SECONDARY,
                wraplength=680,
                justify="left",
            ).pack(anchor="w", pady=(0, 3))

            sec_comm = ctk.CTkFrame(
                settings_scroll,
                fg_color=CARD_BG,
                corner_radius=12,
                border_color=CARD_BORDER,
                border_width=1,
            )
            sec_comm.pack(fill="x", padx=10, pady=8)
            ctk.CTkLabel(
                sec_comm,
                text="🤝 Anonymer Community-Support-Chat",
                font=ctk.CTkFont(size=14, weight="bold"),
                text_color=ACCENT_GREEN,
            ).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(
                sec_comm,
                text=(
                    "Bei einem Trigger kann ein Zustimmungsfenster zum anonymen "
                    "Chat erscheinen. Als Helfer trittst du nur über den "
                    "Analytics-Button bewusst bei."
                ),
                font=ctk.CTkFont(size=11),
                text_color=TEXT_SECONDARY,
                wraplength=680,
                justify="left",
            ).pack(anchor="w", padx=20, pady=(0, 10))
            comm_settings = self.stats_manager.get_community_settings()
            community_switches = ctk.CTkFrame(sec_comm, fg_color="transparent")
            community_switches.pack(fill="x", padx=20, pady=(0, 15))
            self.sw_auto_chat = ctk.CTkSwitch(
                community_switches,
                text="Bei abgefangenem Trigger Support-Chat anbieten",
                command=self.save_community_settings,
            )
            self.sw_auto_chat.pack(anchor="w", pady=(0, 8))
            if comm_settings["auto_connect_trigger"]:
                self.sw_auto_chat.select()
            self.sw_helper_mode = ctk.CTkSwitch(
                community_switches,
                text="Als anonymer Helfer verfügbar sein",
                command=self.save_community_settings,
            )
            self.sw_helper_mode.pack(anchor="w", pady=(0, 8))
            if comm_settings["allow_helper_mode"]:
                self.sw_helper_mode.select()
            ctk.CTkLabel(
                community_switches,
                text=(
                    "Die Chat-Verbindung startet erst nach deiner Bestätigung. "
                    "Profil, Nachrichten, Sticker und Bilder werden Ende-zu-Ende "
                    "verschlüsselt; der Server kann Inhalte nicht lesen. Vergleicht "
                    "den Sicherheits-Fingerprint über einen anderen Kanal, da ein "
                    "manipulierter Server Schlüssel austauschen könnte. Es werden "
                    "keine Kontodaten mit dem Chatpartner geteilt; der Server sieht "
                    "Verbindungsmetadaten. Gesprächspartner sind nicht verifiziert. "
                    "Teile keine persönlichen Daten. Nachrichten werden nicht "
                    "gespeichert; kein Krisen- oder professioneller Beratungsdienst."
                ),
                font=ctk.CTkFont(size=10),
                text_color=TEXT_SECONDARY,
                wraplength=680,
                justify="left",
            ).pack(anchor="w")

            # --- SEKTION: CLOUD-BACKUP & ACCOUNT ---
            sec_cloud = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec_cloud.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec_cloud, text="☁️ Cloud-Backup & Account-Sync", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_BLUE).pack(anchor="w", padx=20, pady=(15, 5))
            ctk.CTkLabel(
                sec_cloud,
                text="Sichere deinen Fortschritt mit Google. PIN und Discord-Webhook "
                     "werden nicht in die Cloud übertragen. Die Wiederherstellung "
                     "überschreibt lokale Fortschrittsdaten. Emotionale Reframing- "
                     "und Trigger-Zeitdaten sowie Codex, Zukunftsbrief und "
                     "Tipp-Rhythmus-Einstellung bleiben aus Datenschutzgründen lokal. "
                     "Google meldet dich an und verknüpft dein Konto mit dem Reşo-"
                     "Cloud-Backup; es wird kein Google-Drive-Zugriff angefordert. "
                     "Dafür muss ein Google OAuth Desktop-Client eingerichtet sein "
                     "(siehe README.md).",
                font=ctk.CTkFont(size=11),
                text_color=TEXT_SECONDARY,
                wraplength=680,
                justify="left",
            ).pack(anchor="w", padx=20, pady=(0, 10))

            f_cloud = ctk.CTkFrame(sec_cloud, fg_color="transparent")
            f_cloud.pack(fill="x", padx=20, pady=(0, 15))

            account_email = self.stats_manager.get_stats().get("google_account_email", "")
            account_id = self.stats_manager.get_stats().get("account_id", "")
            initial_status = (
                (
                    f"Verbunden als {account_email or account_id}; "
                    "Backup wird synchronisiert"
                    if self.stats_manager.get_stats().get("cloud_backup_initialized")
                    else f"Verbunden als {account_email or account_id}; Backup noch nicht eingerichtet"
                )
                if account_id
                else "Nicht verbunden"
            )
            self.lbl_cloud_status = ctk.CTkLabel(
                f_cloud,
                text=f"Status: {initial_status}",
                font=ctk.CTkFont(size=12, weight="bold"),
                text_color=ACCENT_GREEN if account_id else TEXT_SECONDARY,
                wraplength=680,
            )
            self.lbl_cloud_status.pack(anchor="w", pady=(0, 10))

            cloud_buttons = ctk.CTkFrame(f_cloud, fg_color="transparent")
            cloud_buttons.pack(fill="x")
            self.btn_google_connect = ctk.CTkButton(
                cloud_buttons,
                text="Mit Google verbinden",
                fg_color="#4285F4",
                hover_color="#3367D6",
                command=self.connect_google_account,
                state="disabled" if account_id else "normal",
            )
            self.btn_google_connect.pack(side="left", padx=(0, 8))
            self.btn_cloud_backup = ctk.CTkButton(
                cloud_buttons,
                text="Jetzt sichern",
                fg_color=ACCENT_GREEN,
                hover_color="#1B5E20",
                command=self.sync_cloud_backup,
                state="normal" if account_id else "disabled",
            )
            self.btn_cloud_backup.pack(side="left", padx=(0, 8))
            self.btn_cloud_restore = ctk.CTkButton(
                cloud_buttons,
                text="Aus Cloud wiederherstellen",
                fg_color=ACCENT_BLUE,
                hover_color="#008B9B",
                command=self.restore_cloud_backup,
                state="normal" if account_id else "disabled",
            )
            self.btn_cloud_restore.pack(side="left", padx=(0, 8))
            self.btn_google_disconnect = ctk.CTkButton(
                cloud_buttons,
                text="Trennen",
                fg_color=CARD_BORDER,
                hover_color="#40404A",
                command=self.disconnect_google_account,
                state="normal" if account_id else "disabled",
            )
            self.btn_google_disconnect.pack(side="left")

            # --- SEKTION 3: SPERRWÖRTER ---
            sec3 = ctk.CTkFrame(settings_scroll, fg_color=CARD_BG, corner_radius=12, border_color=CARD_BORDER, border_width=1)
            sec3.pack(fill="x", padx=10, pady=8)

            ctk.CTkLabel(sec3, text="🚫 Sperrwörter verwalten", font=ctk.CTkFont(size=14, weight="bold"), text_color=ACCENT_RED).pack(anchor="w", padx=20, pady=(15, 10))

            add_word_frame = ctk.CTkFrame(sec3, fg_color="transparent")
            add_word_frame.pack(fill="x", padx=20, pady=5)

            self.entry_new_word = ctk.CTkEntry(add_word_frame, placeholder_text="Neues Sperrwort...", width=450)
            self.entry_new_word.pack(side="left", padx=(0, 10))
            ctk.CTkButton(add_word_frame, text="Hinzufügen", fg_color=ACCENT_GREEN, hover_color="#1B5E20", width=120, command=self.add_trigger_word).pack(side="left")

            self.words_scroll_frame = ctk.CTkScrollableFrame(sec3, width=680, height=180, fg_color="#16161A", corner_radius=8)
            self.words_scroll_frame.pack(padx=20, pady=15)
            self.refresh_words_list()

        self._apply_apple_widget_style(self.tab_settings)

    def toggle_autostart(self):
        enabled = self.autostart_switch.get() == 1
        if setup_autostart(enabled):
            self.autostart_enabled = enabled
            return

        if self.autostart_enabled:
            self.autostart_switch.select()
        else:
            self.autostart_switch.deselect()

    def toggle_whitelist_preference(self):
        self.whitelist_enabled = self.whitelist_switch.get() == 1
        self.stats_manager.data["whitelist_mode_enabled"] = self.whitelist_enabled
        self.stats_manager.save_data()

        if not self.focus_timer.is_running:
            return
        if self.whitelist_enabled:
            self.monitor.set_whitelist_mode(
                True, self.stats_manager.get_stats().get("whitelisted_apps", [])
            )
            self.monitor.start_whitelist_enforcement()
        else:
            self.monitor.stop_whitelist_enforcement()

    def save_whitelisted_apps(self):
        apps = [
            app.strip().lower()
            for app in self.entry_whitelisted_apps.get().split(",")
            if app.strip()
        ]
        if not apps:
            from tkinter import messagebox

            messagebox.showerror(
                "Whitelist",
                "Bitte gib mindestens einen freigegebenen Prozessnamen ein.",
            )
            return

        self.stats_manager.data["whitelisted_apps"] = apps
        self.stats_manager.save_data()
        if self.focus_timer.is_running and self.whitelist_enabled:
            self.monitor.set_whitelist_mode(True, apps)

    def connect_google_account(self):
        from importlib import import_module

        try:
            google_oauth = import_module("google_oauth")
        except ModuleNotFoundError:
            self.lbl_cloud_status.configure(
                text="Google-Anmeldung ist nicht verfügbar (google_oauth-Modul fehlt).",
                text_color=ACCENT_RED,
            )
            return

        if not google_oauth.is_google_oauth_configured():
            try:
                browser_opened = google_oauth.open_google_oauth_setup()
            except Exception as error:
                self.lbl_cloud_status.configure(
                    text=f"Google-OAuth-Einrichtung konnte nicht geöffnet werden: {error}",
                    text_color=ACCENT_RED,
                )
                return
            message = (
                "GOOGLE_OAUTH_CLIENT_ID fehlt. "
                "Im geöffneten Google Cloud Console-Bereich einen OAuth-Client "
                "vom Typ „Desktop-App“ erstellen, die Client-ID setzen und Reşo "
                "neu starten. Danach öffnet „Mit Google verbinden“ die "
                "Google-Anmeldeseite zur Zustimmung."
            )
            if not browser_opened:
                message += " Der Browser konnte nicht automatisch geöffnet werden."
            self.lbl_cloud_status.configure(
                text=f"Status: {message}",
                text_color=ACCENT_ORANGE,
            )
            return

        self.lbl_cloud_status.configure(
            text="Status: Google-Browser wird geöffnet ... Bitte anmelden.",
            text_color=TEXT_SECONDARY,
        )
        self.btn_google_connect.configure(state="disabled")

        def finish_login():
            try:
                userinfo, token_data = google_oauth.login_with_google()
                self.stats_manager.connect_google_account(userinfo, token_data)
                email = userinfo.get("email") or userinfo.get("sub", "Google-Konto")
                if self.stats_manager.sync_full_backup():
                    message = (
                        f"Verbunden als {email}. Cloud-Daten wurden automatisch "
                        "synchronisiert."
                    )
                    color = ACCENT_GREEN
                    self.after(0, self._apply_restored_cloud_backup)
                else:
                    message = (
                        f"Verbunden als {email}; Cloud-Sync fehlgeschlagen: "
                        f"{self.stats_manager.last_cloud_backup_error or 'Unbekannter Fehler'}"
                    )
                    color = ACCENT_RED
                self.after(
                    0,
                    lambda message=message, color=color: self._update_cloud_connection_ui(
                        message,
                        color,
                        True,
                    ),
                )
            except Exception as error:
                self.after(
                    0,
                    lambda error=error: self._update_cloud_connection_ui(
                        f"Anmeldung fehlgeschlagen: {error}", ACCENT_RED, False
                    ),
                )

        threading.Thread(target=finish_login, daemon=True).start()

    def _update_cloud_connection_ui(self, message, color, connected=True):
        self.lbl_cloud_status.configure(text=f"Status: {message}", text_color=color)
        self.btn_google_connect.configure(state="disabled" if connected else "normal")
        for button in (self.btn_cloud_backup, self.btn_cloud_restore, self.btn_google_disconnect):
            button.configure(state="normal" if connected else "disabled")

    def sync_cloud_backup(self):
        self.lbl_cloud_status.configure(text="Status: Backup wird hochgeladen ...", text_color=TEXT_SECONDARY)

        def upload():
            success = self.stats_manager.upload_full_backup()
            if success:
                email = self.stats_manager.get_stats().get("google_account_email", "")
                message, color = f"Synchronisiert als {email}", ACCENT_GREEN
            else:
                message = f"Backup fehlgeschlagen: {self.stats_manager.last_cloud_backup_error}"
                color = ACCENT_RED
            self.after(0, lambda: self.lbl_cloud_status.configure(text=f"Status: {message}", text_color=color))

        threading.Thread(target=upload, daemon=True).start()

    def sync_cloud_on_startup(self):
        def synchronize():
            success = self.stats_manager.sync_full_backup()
            if success:
                self.after(0, self.update_stats_display)

        threading.Thread(target=synchronize, daemon=True).start()

    def restore_cloud_backup(self):
        from tkinter import messagebox

        if not messagebox.askyesno(
            "Cloud-Backup wiederherstellen",
            "Lokale Fortschrittsdaten werden durch das Cloud-Backup überschrieben. "
            "PIN und Webhook bleiben lokal erhalten. Fortfahren?",
        ):
            return

        self.lbl_cloud_status.configure(text="Status: Backup wird wiederhergestellt ...", text_color=TEXT_SECONDARY)

        def restore():
            success = self.stats_manager.download_full_backup()
            if success:
                message, color = "Cloud-Backup wiederhergestellt.", ACCENT_GREEN
                self.after(0, self._apply_restored_cloud_backup)
            else:
                message = f"Wiederherstellung fehlgeschlagen: {self.stats_manager.last_cloud_backup_error}"
                color = ACCENT_RED
            self.after(0, lambda: self.lbl_cloud_status.configure(text=f"Status: {message}", text_color=color))

        threading.Thread(target=restore, daemon=True).start()

    def _apply_restored_cloud_backup(self):
        self.monitor.update_trigger_words(self.stats_manager.get_trigger_words())
        if self.hotkey_listener:
            self.hotkey_listener.stop()
        self.setup_panic_hotkey_listener()
        self.setup_settings_tab()
        self.update_stats_display()

    def disconnect_google_account(self):
        from tkinter import messagebox

        if not messagebox.askyesno(
            "Google-Verbindung trennen",
            "Der Google-Zugriff wird widerrufen und lokal entfernt. "
            "Das Cloud-Backup bleibt bestehen.",
        ):
            return
        try:
            self.stats_manager.disconnect_google_account()
            self.lbl_cloud_status.configure(text="Status: Nicht verbunden", text_color=TEXT_SECONDARY)
            self.btn_google_connect.configure(state="normal")
            self.btn_cloud_backup.configure(state="disabled")
            self.btn_cloud_restore.configure(state="disabled")
            self.btn_google_disconnect.configure(state="disabled")
        except Exception as error:
            self.lbl_cloud_status.configure(
                text=f"Status: Trennen fehlgeschlagen: {error}",
                text_color=ACCENT_RED,
            )

    def save_general_settings(self):
        try:
            rate_val = float(self.entry_rate.get().replace(",", "."))
            if rate_val >= 0:
                self.stats_manager.set_hourly_rate(rate_val)
        except ValueError:
            pass

        try:
            expense_val = float(self.entry_daily_expense.get().replace(",", "."))
            if expense_val >= 0:
                self.stats_manager.data["daily_expense"] = expense_val
                self.stats_manager.save_data()
        except ValueError:
            pass

        try:
            timer_val = int(self.entry_default_timer.get())
            if 1 <= timer_val <= 180:
                self.stats_manager.data["default_timer_mins"] = timer_val
                self.stats_manager.save_data()
                self.time_slider.set(timer_val)
                self.slider_val_label.configure(text=f"Dauer: {timer_val} Minuten")
                if not self.focus_timer.is_running:
                    self.timer_label.configure(text=f"{timer_val:02d}:00")
        except ValueError:
            pass

        self.update_stats_display()

    def render_heatmap(self):
        old_canvas = getattr(self, "heatmap_canvas", None)
        if old_canvas:
            old_canvas.get_tk_widget().destroy()
        old_figure = getattr(self, "heatmap_figure", None)
        if old_figure:
            plt.close(old_figure)
            
        fig, ax = plt.subplots(figsize=(6.8, 1.4), dpi=90)
        fig.patch.set_facecolor(CARD_BG)
        ax.set_facecolor(CARD_BG)

        stats_data = self.stats_manager.get_stats()
        daily_data = stats_data.get("daily_activity", {})
        daily_moods = stats_data.get("daily_moods", {})
        dates = [(datetime.today() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(27, -1, -1)]

        values = []
        colors = []
        for day in dates:
            minutes = daily_data.get(day, 0)
            values.append(minutes)
            if minutes == 0:
                colors.append("#2A2A35")
                continue

            moods = daily_moods.get(day, [2])
            average_mood = sum(moods) / len(moods) if moods else 2
            if average_mood < 0.8:
                colors.append("#C62828")
            elif average_mood < 1.6:
                colors.append("#F57F17")
            else:
                colors.append("#2E7D32")

        ax.bar(range(len(values)), values, color=colors, width=0.7)
        ax.axis('off')

        canvas = FigureCanvasTkAgg(fig, master=self.card_heatmap)
        canvas.draw()
        canvas.get_tk_widget().pack(fill="x", padx=15, pady=(0, 12))
        self.heatmap_figure = fig
        self.heatmap_canvas = canvas

    def unlock_settings(self):
        if time.time() < self.lockout_end_time:
            return
        if self.stats_manager.verify_pin(self.entry_pin_input.get()):
            self.pin_unlocked = True
            self.setup_settings_tab()
        else:
            self.lockout_end_time = time.time() + 300  # 5 Min Cooldown
            self.entry_pin_input.delete(0, "end")
            self.entry_pin_input.configure(state="disabled", fg_color="#441111")
            self.btn_unlock.configure(state="disabled")
            self.run_cooldown_countdown()

    def run_cooldown_countdown(self):
        remaining = math.ceil(self.lockout_end_time - time.time())
        if remaining > 0:
            mins, secs = divmod(remaining, 60)
            self.entry_pin_input.configure(placeholder_text=f"Gesperrt! {mins:02d}:{secs:02d}")
            self.after(1000, self.run_cooldown_countdown)
        else:
            self.entry_pin_input.configure(state="normal", placeholder_text="PIN eingeben...", fg_color="#212121")
            self.btn_unlock.configure(state="normal")

    def save_new_pin(self):
        p = self.entry_new_pin.get().strip()
        if len(p) >= 4:
            self.stats_manager.set_pin(p)
            self.setup_settings_tab()

    def save_webhook_url(self):
        url = self.entry_webhook.get().strip()
        self.stats_manager.set_webhook(url)

    def setup_panic_hotkey_listener(self):
        hotkey = self.stats_manager.get_stats().get("panic_hotkey", "<ctrl>+<alt>+x")
        try:
            self.hotkey_listener = keyboard.GlobalHotKeys({hotkey: self.trigger_panic})
            self.hotkey_listener.start()
        except Exception:
            self.hotkey_listener = None

    def save_panic_hotkey(self):
        hotkey = self.entry_panic_hotkey.get().strip()
        if not hotkey:
            return

        try:
            new_listener = keyboard.GlobalHotKeys({hotkey: self.trigger_panic})
            new_listener.start()
        except Exception:
            return

        old_listener = self.hotkey_listener
        self.hotkey_listener = new_listener
        if old_listener:
            old_listener.stop()
        self.stats_manager.set_panic_hotkey(hotkey)
        self.lbl_hotkey_info.configure(text=f"Tastenkürzel: {hotkey}")

    def trigger_panic(self):
        import os
        if sys.platform == "win32":
            os.system("rundll32.exe user32.dll,LockWorkStation")

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

    def toggle_motivation(self):
        self.ai_pauses_enabled = not self.ai_pauses_enabled
        self.stats_manager.data["ai_pauses_enabled"] = self.ai_pauses_enabled
        self.stats_manager.save_data()
        if self.ai_pauses_enabled and self.focus_timer.is_running:
            self.motivation_manager.start_scheduler(
                mode="random",
                min_rand=self.ai_pause_min,
                max_rand=self.ai_pause_max,
            )
        else:
            self.motivation_manager.stop_scheduler()
        self._update_motivation_button()

    def _update_motivation_button(self):
        if not hasattr(self, "btn_toggle_motivation"):
            return
        enabled = self.ai_pauses_enabled
        self.btn_toggle_motivation.configure(
            text="KI-Pausen: aktiviert" if enabled else "KI-Pausen: deaktiviert",
            fg_color=ACCENT_GREEN if enabled else ACCENT_BLUE,
        )

    def apply_preset(self, preset, persist=True):
        intervals = {
            "light": (20, 30, "Sanft"),
            "medium": (10, 20, "Ausgewogen"),
            "strict": (5, 10, "Häufig"),
        }
        if preset not in intervals:
            preset = "medium"
        self.ai_pause_min, self.ai_pause_max, label = intervals[preset]
        if persist:
            self.stats_manager.data["ai_pause_min"] = self.ai_pause_min
            self.stats_manager.data["ai_pause_max"] = self.ai_pause_max
            self.stats_manager.data["ai_pause_preset"] = preset
            self.stats_manager.save_data()
        if hasattr(self, "lbl_pause_interval"):
            self.lbl_pause_interval.configure(
                text=(
                    f"{label}: zufällige Erinnerung alle "
                    f"{self.ai_pause_min}–{self.ai_pause_max} Minuten"
                )
            )
        if self.ai_pauses_enabled and self.focus_timer.is_running:
            self.motivation_manager.start_scheduler(
                mode="random",
                min_rand=self.ai_pause_min,
                max_rand=self.ai_pause_max,
            )

    def refresh_words_list(self):
        for w in self.words_scroll_frame.winfo_children(): w.destroy()
        for word in self.stats_manager.get_trigger_words():
            row = ctk.CTkFrame(self.words_scroll_frame, fg_color="transparent")
            row.pack(fill="x", pady=3, padx=5)
            ctk.CTkLabel(row, text=word, font=ctk.CTkFont(weight="bold")).pack(side="left", padx=10)
            if word in self.pending_deletions:
                pending = self.pending_deletions[word]
                pending["label"] = ctk.CTkLabel(row, text="Löschung wird vorbereitet ...", text_color=ACCENT_ORANGE)
                pending["label"].pack(side="right", padx=8)
                ctk.CTkButton(row, text="Abbrechen", width=80, height=24, command=lambda x=word: self.cancel_delayed_removal(x)).pack(side="right", padx=5)
                if pending["after_id"] is None:
                    self._update_delayed_removal(word)
            else:
                ctk.CTkButton(row, text="Löschen", width=70, height=24, fg_color=ACCENT_RED, hover_color="#CC3D3D", command=lambda x=word: self.delayed_remove_trigger_word(x)).pack(side="right", padx=10)

    def delayed_remove_trigger_word(self, word):
        from tkinter import messagebox
        if word in self.pending_deletions:
            return
        if messagebox.askyesno("Impuls-Sperre", f"Das Sperrwort '{word}' wird erst nach 5 Minuten entfernt. Möchtest du fortfahren?"):
            self.pending_deletions[word] = {
                "deadline": time.monotonic() + 300,
                "after_id": None,
                "label": None,
            }
            self.refresh_words_list()

    def _update_delayed_removal(self, word):
        pending = self.pending_deletions.get(word)
        if not pending:
            return
        pending["after_id"] = None
        remaining = max(0, math.ceil(pending["deadline"] - time.monotonic()))
        if remaining == 0:
            self.pending_deletions.pop(word, None)
            self.remove_trigger_word(word)
            return
        mins, secs = divmod(remaining, 60)
        label = pending.get("label")
        if label and label.winfo_exists():
            label.configure(text=f"Entfernung in {mins:02d}:{secs:02d}")
        pending["after_id"] = self.after(1000, lambda: self._update_delayed_removal(word))

    def cancel_delayed_removal(self, word):
        pending = self.pending_deletions.pop(word, None)
        if pending and pending.get("after_id"):
            self.after_cancel(pending["after_id"])
        self.refresh_words_list()

    def add_trigger_word(self):
        nw = self.entry_new_word.get().strip().lower()
        if nw:
            words = self.stats_manager.get_trigger_words()
            if nw not in words:
                words.append(nw)
                self.stats_manager.save_trigger_words(words)
                self.monitor.update_trigger_words(words)
                self.refresh_words_list()
                self.entry_new_word.delete(0, "end")

    def remove_trigger_word(self, word):
        words = self.stats_manager.get_trigger_words()
        if word in words:
            pending = self.pending_deletions.pop(word, None)
            if pending and pending.get("after_id"):
                self.after_cancel(pending["after_id"])
            words.remove(word)
            self.stats_manager.save_trigger_words(words)
            self.monitor.update_trigger_words(words)
            self.refresh_words_list()

    def slider_event(self, value):
        val = int(value)
        self.slider_val_label.configure(text=f"Dauer: {val} Minuten")
        if not self.focus_timer.is_running:
            self.timer_label.configure(text=f"{val:02d}:00")

    def start_timer_action(self, custom_mins=None):
        if not self.focus_timer.is_running:
            mins = custom_mins if custom_mins else int(self.time_slider.get())
            self.focus_timer.start(mins)
            if self.ai_pauses_enabled:
                self.motivation_manager.start_scheduler(
                    mode="random",
                    min_rand=self.ai_pause_min,
                    max_rand=self.ai_pause_max,
                )
            self.btn_start_timer.configure(text="Fokus läuft...", fg_color=ACCENT_RED, hover_color="#CC3D3D")
            self.discord_rpc.update_presence("Im Fokus-Modus", f"Konzentriert für {mins} Min.")
            if self.whitelist_enabled:
                self.monitor.set_whitelist_mode(
                    True,
                    self.stats_manager.get_stats().get("whitelisted_apps", []),
                )
                self.monitor.start_whitelist_enforcement()

    def update_timer_display(self, time_str):
        self.after(0, lambda: self.timer_label.configure(text=time_str))

    def on_timer_finished(self, minutes):
        self.motivation_manager.stop_scheduler()
        self.stats_manager.add_timer_session(minutes, mood_score=2)
        self.after(0, self.reset_timer_ui)
        self.after(0, self.update_stats_display)
        self.after(100, lambda: self.show_mood_dialog(minutes))

    def show_mood_dialog(self, minutes):
        dialog = ctk.CTkToplevel(self)
        dialog.title("Fokus-Check")
        dialog.geometry("380x280")
        dialog.resizable(False, False)
        dialog.attributes("-topmost", True)
        dialog.grab_set()

        ctk.CTkLabel(
            dialog,
            text="🎯 Session beendet!",
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color=ACCENT_GREEN,
        ).pack(pady=(20, 5))
        ctk.CTkLabel(
            dialog,
            text=f"Du hast {minutes} Minuten fokussiert.\nWie konzentriert warst du?",
            font=ctk.CTkFont(size=13),
            text_color=TEXT_SECONDARY,
        ).pack(pady=(0, 15))

        btn_frame = ctk.CTkFrame(dialog, fg_color="transparent")
        btn_frame.pack(fill="x", padx=20, pady=10)

        def rate_and_close(score):
            today_str = str(date.today())
            daily_moods = self.stats_manager.data.setdefault("daily_moods", {})
            if today_str in daily_moods and daily_moods[today_str]:
                daily_moods[today_str][-1] = score
                self.stats_manager.save_data()
            self.update_stats_display()
            dialog.destroy()

        ctk.CTkButton(
            btn_frame,
            text="🔴 Unfokussiert",
            fg_color="#C62828",
            hover_color="#B71C1C",
            width=100,
            command=lambda: rate_and_close(0),
        ).pack(side="left", expand=True, padx=2)
        ctk.CTkButton(
            btn_frame,
            text="🟡 Geht so",
            fg_color="#F57F17",
            hover_color="#E65100",
            width=100,
            command=lambda: rate_and_close(1),
        ).pack(side="left", expand=True, padx=2)
        ctk.CTkButton(
            btn_frame,
            text="🟢 Top Fokus",
            fg_color=ACCENT_GREEN,
            hover_color="#1B5E20",
            width=100,
            command=lambda: rate_and_close(2),
        ).pack(side="left", expand=True, padx=2)

    def reset_timer_ui(self):
        self.motivation_manager.stop_scheduler()
        self.monitor.stop_whitelist_enforcement()
        self.btn_start_timer.configure(text="Fokus starten", fg_color=ACCENT_GREEN, hover_color="#1B5E20")
        val = int(self.time_slider.get())
        self.timer_label.configure(text=f"{val:02d}:00")
        self.discord_rpc.update_presence("Bereit", "Wartet auf nächste Session")

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